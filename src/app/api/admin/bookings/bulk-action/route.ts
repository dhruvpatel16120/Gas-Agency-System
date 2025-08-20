import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withMiddleware, parseRequestBody } from '@/lib/api-middleware';
import { z } from 'zod';
import { sendBookingApprovalEmail, sendBookingCancelledByAdminEmail } from '@/lib/email';

// POST - Perform bulk actions on bookings
async function bulkActionHandler(request: NextRequest): Promise<NextResponse> {
  try {
    const schema = z.object({
      action: z.enum(['approve', 'assign-delivery', 'cancel']),
      bookingIds: z.array(z.string().min(1)).min(1),
      additionalData: z
        .object({ partnerId: z.string().min(1).optional(), reason: z.string().trim().min(1).optional(), notes: z.string().optional() })
        .optional(),
    });

    const { action, bookingIds, additionalData } = schema.parse(await parseRequestBody(request));

    // Hard stop if any selected bookings are already delivered
    const deliveredCount = await prisma.booking.count({ where: { id: { in: bookingIds }, status: 'DELIVERED' } });
    if (deliveredCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'One or more selected bookings are already delivered. Service is fulfilled; bulk actions are not allowed.',
        },
        { status: 400 }
      );
    }

    let updatedCount = 0;
    const errors: string[] = [];

    switch (action) {
      case 'approve':
        // Approve only pending bookings (cannot approve CANCELLED/DELIVERED/OUT_FOR_DELIVERY)
        const approveEligible = await prisma.booking.findMany({
          where: { id: { in: bookingIds }, status: 'PENDING' },
          select: { 
            id: true,
            paymentMethod: true,
            payments: {
              select: {
                status: true,
                method: true
              }
            }
          },
        });
        
        if (approveEligible.length === 0) {
          return NextResponse.json({ success: false, message: 'No eligible bookings to approve' }, { status: 400 });
        }

        // Check UPI payment status - only allow approval if payment is SUCCESS
        const upiBookingsWithoutSuccessPayment = approveEligible.filter(booking => 
          booking.paymentMethod === 'UPI' && 
          !booking.payments.some(payment => payment.method === 'UPI' && payment.status === 'SUCCESS')
        );

        if (upiBookingsWithoutSuccessPayment.length > 0) {
          const bookingIds = upiBookingsWithoutSuccessPayment.map(b => b.id);
          return NextResponse.json({ 
            success: false, 
            message: `Cannot approve UPI bookings with pending/failed payments. Booking IDs: ${bookingIds.join(', ')}. Please ensure UPI payments are confirmed before approval.` 
          }, { status: 400 });
        }

        // Filter out UPI bookings without successful payment
        const finalApproveEligible = approveEligible.filter(booking => 
          !(booking.paymentMethod === 'UPI' && 
            !booking.payments.some(payment => payment.method === 'UPI' && payment.status === 'SUCCESS'))
        );

        if (finalApproveEligible.length === 0) {
          return NextResponse.json({ 
            success: false, 
            message: 'No eligible bookings to approve after payment validation' 
          }, { status: 400 });
        }

        await prisma.booking.updateMany({
          where: { id: { in: finalApproveEligible.map(b => b.id) } },
          data: { status: 'APPROVED', updatedAt: new Date() },
        });
        updatedCount = finalApproveEligible.length;

        // Create events for approved bookings
        await prisma.bookingEvent.createMany({
          data: bookingIds.map(bookingId => ({
            bookingId,
            status: 'APPROVED',
            title: 'Booking Approved',
            description: 'Booking has been approved by admin',
            createdAt: new Date()
          }))
        });

        // Send approval emails (best effort)
        try {
          const approved = await prisma.booking.findMany({
            where: { id: { in: bookingIds } },
            select: {
              id: true,
              expectedDate: true,
              user: { select: { name: true, email: true } },
            },
          });
          for (const b of approved) {
            if (b.user?.email) {
              const deliveryDateStr = b.expectedDate ? new Date(b.expectedDate).toLocaleDateString() : 'To be scheduled';
              // Do not block the response on email send
              // eslint-disable-next-line no-await-in-loop
              await sendBookingApprovalEmail(b.user.email, b.user.name, b.id, deliveryDateStr);
            }
          }
        } catch (e) {
          console.error('Failed to send some approval emails:', e);
        }
        break;

      case 'assign-delivery':
        // Assign delivery partner to eligible bookings
        if (!additionalData?.partnerId) {
          return NextResponse.json({ success: false, message: 'Delivery partner ID is required' }, { status: 400 });
        }

        // Check partner
        const partner = await prisma.deliveryPartner.findUnique({ where: { id: additionalData.partnerId } });
        if (!partner || !partner.isActive) {
          return NextResponse.json({ success: false, message: 'Invalid or inactive delivery partner' }, { status: 400 });
        }

        // Eligible bookings: APPROVED or PENDING, not CANCELLED/DELIVERED, and not already assigned
        const eligibleForAssign = await prisma.booking.findMany({
          where: { id: { in: bookingIds }, status: { in: ['APPROVED', 'PENDING'] }, assignment: null },
          select: { id: true },
        });
        if (eligibleForAssign.length === 0) {
          return NextResponse.json({ success: false, message: 'No eligible bookings to assign' }, { status: 400 });
        }

        await prisma.$transaction([
          prisma.deliveryAssignment.createMany({
            data: eligibleForAssign.map(b => ({
              bookingId: b.id,
              partnerId: additionalData.partnerId!,
              status: 'ASSIGNED',
              assignedAt: new Date(),
              notes: additionalData?.notes || null,
            })),
          }),
          prisma.booking.updateMany({
            where: { id: { in: eligibleForAssign.map(b => b.id) } },
            data: { status: 'OUT_FOR_DELIVERY', updatedAt: new Date() },
          }),
        ]);
        updatedCount = eligibleForAssign.length;

        // Create events for delivery assignments
        await prisma.bookingEvent.createMany({
          data: bookingIds.map(bookingId => ({
            bookingId,
            status: 'OUT_FOR_DELIVERY',
            title: 'Delivery Assigned',
            description: `Delivery assigned to ${partner.name}`,
            createdAt: new Date()
          }))
        });
        break;

      case 'cancel':
        // Reason is required
        if (!additionalData?.reason || additionalData.reason.trim().length === 0) {
          return NextResponse.json({ success: false, message: 'Cancellation reason is required' }, { status: 400 });
        }
        // Eligible: not DELIVERED and not already CANCELLED
        const eligibleForCancel = await prisma.booking.findMany({
          where: { id: { in: bookingIds }, status: { notIn: ['DELIVERED', 'CANCELLED'] } },
          select: { id: true, notes: true, userId: true, quantity: true },
        });
        if (eligibleForCancel.length === 0) {
          return NextResponse.json({ success: false, message: 'No eligible bookings to cancel' }, { status: 400 });
        }
        await prisma.$transaction(async (tx) => {
          await tx.booking.updateMany({
            where: { id: { in: eligibleForCancel.map(b => b.id) } },
            data: { status: 'CANCELLED', updatedAt: new Date() },
          });
          // Mark related payments as CANCELLED (except SUCCESS)
          await tx.payment.updateMany({
            where: { bookingId: { in: eligibleForCancel.map(b => b.id) }, status: { not: 'SUCCESS' } },
            // Casting to any to avoid enum type mismatch until Prisma types are regenerated
            data: { status: 'CANCELLED' as any },
          });
          // Restore user quotas for cancelled bookings
          for (const b of eligibleForCancel) {
            // eslint-disable-next-line no-await-in-loop
            await tx.user.update({
              where: { id: b.userId },
              data: { remainingQuota: { increment: b.quantity } }
            });
          }
          // Append reason to notes
          for (const b of eligibleForCancel) {
            const prefix = b.notes ? b.notes.trim() + '\n' : '';
            // eslint-disable-next-line no-await-in-loop
            await tx.booking.update({ where: { id: b.id }, data: { notes: `${prefix}Cancellation reason: ${additionalData!.reason}` } });
          }
        });
        updatedCount = eligibleForCancel.length;

        // Create events for cancelled bookings
        await prisma.bookingEvent.createMany({
          data: bookingIds.map(bookingId => ({
            bookingId,
            status: 'CANCELLED',
            title: 'Booking Cancelled',
            description: `Booking cancelled by admin${additionalData?.reason ? `: ${additionalData.reason}` : ''}`,
            createdAt: new Date()
          }))
        });
        // Send cancellation emails to users (best effort)
        try {
          const cancelledBookings = await prisma.booking.findMany({
            where: { id: { in: bookingIds } },
            select: { 
              id: true, 
              user: { select: { name: true, email: true } },
              payments: {
                select: {
                  method: true,
                  status: true
                }
              }
            }
          });
          for (const b of cancelledBookings) {
            if (b.user?.email) {
              // eslint-disable-next-line no-await-in-loop
              await sendBookingCancelledByAdminEmail(
                b.user.email, 
                b.user.name, 
                b.id, 
                additionalData?.reason,
                b.payments[0]?.method,
                b.payments[0]?.status
              );
            }
          }
        } catch (e) {
          console.error('Failed to send some admin cancellation emails:', e);
        }
        break;

      default:
        return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${updatedCount} booking(s)`,
      data: { updatedCount, errors }
    });
  } catch (error) {
    console.error('Failed to perform bulk action:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to perform bulk action' },
      { status: 500 }
    );
  }
}

export const POST = withMiddleware(bulkActionHandler, { requireAuth: true, requireAdmin: true, validateContentType: true });
