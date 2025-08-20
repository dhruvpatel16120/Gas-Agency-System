import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendBookingApprovalEmail, sendBookingCancelledByAdminEmail, sendBookingCancelledByUserEmail } from '@/lib/email';

// GET - Fetch individual booking
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id: bookingId } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true
          }
        },
        payments: {
          orderBy: { createdAt: 'desc' }
        },
        // Use correct relation name from Prisma schema
        assignment: {
          include: {
            partner: {
              select: {
                id: true,
                name: true,
                phone: true
              }
            }
          }
        },
        events: {
          orderBy: { createdAt: 'desc' }
        }
      }
  });

  if (!booking) {
      return NextResponse.json(
        { success: false, message: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if user can access this booking
    if (session.user.role !== 'ADMIN' && booking.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, message: 'Access denied' },
        { status: 403 }
      );
    }

    // Transform data for frontend
    const transformedBooking = {
      id: booking.id,
      userId: booking.userId,
      userName: booking.user.name,
      userEmail: booking.user.email,
      userPhone: booking.user.phone,
      userAddress: booking.user.address,
      paymentMethod: booking.paymentMethod,
      quantity: booking.quantity,
      receiverName: booking.receiverName,
      receiverPhone: booking.receiverPhone,
      status: booking.status,
      requestedAt: booking.requestedAt,
      expectedDate: booking.expectedDate,
      deliveryDate: booking.deliveryDate,
      deliveredAt: booking.deliveredAt,
      notes: booking.notes,
      paymentStatus: booking.payments[0]?.status || (booking.status === 'CANCELLED' ? 'CANCELLED' : 'PENDING'),
      paymentAmount: booking.payments[0]?.amount,
      deliveryPartnerId: booking.assignment?.partnerId,
      deliveryPartnerName: booking.assignment?.partner?.name,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt
    };

    return NextResponse.json({
      success: true,
      data: transformedBooking
    });
  } catch (error) {
    console.error('Failed to fetch booking:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch booking' },
      { status: 500 }
    );
  }
}

// PUT - Update booking
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id: bookingId } = await params;
    const body = await request.json();
    const {
      quantity,
      paymentMethod,
      receiverName,
      receiverPhone,
      expectedDate,
      notes,
      userAddress,
      status
    } = body;

    // Get current booking
    const currentBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { quantity: true, userId: true, status: true, notes: true }
    });

    if (!currentBooking) {
      return NextResponse.json(
        { success: false, message: 'Booking not found' },
        { status: 404 }
      );
    }

    // If the caller is a non-admin user, only allow self-cancellation when current status is PENDING or APPROVED
    if (session.user.role !== 'ADMIN') {
      const isOwner = currentBooking.userId === session.user.id;
      const wantsCancel = status === 'CANCELLED';
      const canCancelCurrent = ['PENDING', 'APPROVED'].includes(currentBooking.status as string);

      if (!isOwner || !wantsCancel || !canCancelCurrent) {
        return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
      }

      // Perform minimal cancellation update for user: do NOT allow editing other fields
      const cancelled = await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED', updatedAt: new Date() },
      });

      // Restore user quota when booking is cancelled
      try {
        await prisma.user.update({
          where: { id: currentBooking.userId },
          data: { remainingQuota: { increment: currentBooking.quantity } }
        });
      } catch (e) {
        console.error('Failed to restore user quota:', e);
        // non-fatal but log it
      }

      try {
        await prisma.bookingEvent.create({
          data: {
            bookingId,
            status: 'CANCELLED' as any,
            title: 'Booking cancelled by user',
            description: body.cancellationReason ? `Reason: ${body.cancellationReason}` : undefined,
          },
        });
      } catch (e) {
        // non-fatal
      }

      try {
        // Mark related payments as CANCELLED (except successful ones)
        await prisma.payment.updateMany({
          where: { bookingId, status: { not: 'SUCCESS' } },
          data: { status: 'CANCELLED' as any },
        });
      } catch (e) {
        // non-fatal
      }

      // Send cancellation email to user
      try {
        const user = await prisma.user.findUnique({
          where: { id: currentBooking.userId },
          select: { name: true, email: true },
        });
        if (user?.email) {
          // Get payment information for refund details
          const payment = await prisma.payment.findFirst({
            where: { bookingId: bookingId },
            select: { method: true, status: true }
          });
          await sendBookingCancelledByUserEmail(
            user.email,
            user.name,
            bookingId,
            payment?.method,
            payment?.status,
            body.cancellationReason
          );
        }
      } catch (e) {
        console.error('Failed to send user cancellation email:', e);
      }

      return NextResponse.json({ success: true, message: 'Booking cancelled', data: cancelled });
    }

    // Admin flow below
    // Handle quantity changes
    if (typeof quantity === 'number' && quantity !== currentBooking.quantity) {
      const quantityDiff = quantity - currentBooking.quantity;
      
      // Check if user has enough quota for increase
      if (quantityDiff > 0) {
        const user = await prisma.user.findUnique({
          where: { id: currentBooking.userId },
          select: { remainingQuota: true }
        });

        if (!user || user.remainingQuota < quantityDiff) {
          return NextResponse.json(
            { success: false, message: 'User quota exceeded' },
            { status: 400 }
          );
        }

        // Update user quota
        await prisma.user.update({
          where: { id: currentBooking.userId },
          data: { remainingQuota: { decrement: quantityDiff } }
        });
      } else if (quantityDiff < 0) {
        // Increase user quota if quantity decreased
        await prisma.user.update({
          where: { id: currentBooking.userId },
          data: { remainingQuota: { increment: Math.abs(quantityDiff) } }
        });
      }
    }

    // Prepare update payload
    const updateData: any = {
      quantity,
      paymentMethod,
      receiverName,
      receiverPhone,
      expectedDate: expectedDate ? new Date(expectedDate) : null,
      userAddress,
      status,
      updatedAt: new Date(),
    };

    // If notes were explicitly provided in body, use them; else, if cancelling with reason, append to existing notes
    if (typeof notes === 'string' && notes.length > 0) {
      updateData.notes = notes;
    } else if (status === 'CANCELLED' && body.cancellationReason) {
      const prefix = currentBooking.notes ? currentBooking.notes.trim() + '\n' : '';
      updateData.notes = `${prefix}Cancellation reason: ${body.cancellationReason}`;
    }

    // Update booking
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: updateData,
    });

    // Create booking event for status change
    if (status && status !== currentBooking.status) {
      await prisma.bookingEvent.create({
        data: {
          bookingId: bookingId,
          status: status,
          title: `Status updated to ${status.toLowerCase()}`,
          description: `Booking status changed from ${currentBooking.status} to ${status}`,
          createdAt: new Date()
        }
      });

      // On cancellation, update payment status and send email to user
      if (status === 'CANCELLED') {
        try {
          // Restore user quota when booking is cancelled by admin
          await prisma.user.update({
            where: { id: currentBooking.userId },
            data: { remainingQuota: { increment: currentBooking.quantity } }
          });
        } catch (e) {
          console.error('Failed to restore user quota on admin cancellation:', e);
        }

        try {
          // Mark related payments as CANCELLED (except successful ones)
          await prisma.payment.updateMany({
            where: { bookingId: bookingId, status: { not: 'SUCCESS' } },
            // Casting to any to avoid enum type mismatch until Prisma types are regenerated
            data: { status: 'CANCELLED' as any },
          });

          const user = await prisma.user.findUnique({
            where: { id: currentBooking.userId },
            select: { name: true, email: true },
          });
          if (user?.email) {
            // Get payment information for refund details
            const payment = await prisma.payment.findFirst({
              where: { bookingId: bookingId },
              select: { method: true, status: true }
            });
            await sendBookingCancelledByAdminEmail(
              user.email, 
              user.name, 
              bookingId, 
              body.cancellationReason,
              payment?.method,
              payment?.status
            );
          }
        } catch (e) {
          console.error('Failed to send booking cancellation email:', e);
        }
      }

      // When booking is approved, mark pending UPI payments as SUCCESS (COD stays pending until delivery)
      if (status === 'APPROVED') {
        try {
          await prisma.payment.updateMany({
            where: { bookingId, method: 'UPI', status: 'PENDING' },
            data: { status: 'SUCCESS' as any }
          });
        } catch (e) {
          console.error('Failed to promote UPI payment to SUCCESS on approval:', e);
        }

        try {
          const user = await prisma.user.findUnique({
            where: { id: currentBooking.userId },
            select: { name: true, email: true }
          });
          if (user?.email) {
            const deliveryDateStr = updatedBooking.expectedDate
              ? new Date(updatedBooking.expectedDate).toLocaleDateString()
              : 'To be scheduled';
            await sendBookingApprovalEmail(user.email, user.name, bookingId, deliveryDateStr);
          }
        } catch (e) {
          console.error('Failed to send booking approval email:', e);
        }
      }
    }

    // Update payment amount if quantity changed
    if (typeof quantity === 'number' && quantity !== currentBooking.quantity) {
      await prisma.payment.updateMany({
        where: { bookingId: bookingId },
        data: { amount: quantity * 1100 }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Booking updated successfully',
      data: updatedBooking
    });
  } catch (error) {
    console.error('Failed to update booking:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update booking' },
      { status: 500 }
    );
  }
}


