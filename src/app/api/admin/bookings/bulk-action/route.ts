import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// POST - Perform bulk actions on bookings
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, bookingIds, additionalData } = body;

    if (!action || !bookingIds || !Array.isArray(bookingIds) || bookingIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid request data' },
        { status: 400 }
      );
    }

    let updatedCount = 0;
    let errors: string[] = [];

    switch (action) {
      case 'approve':
        // Approve multiple bookings
        const approveResult = await prisma.booking.updateMany({
          where: {
            id: { in: bookingIds },
            status: 'PENDING'
          },
          data: {
            status: 'APPROVED',
            updatedAt: new Date()
          }
        });
        updatedCount = approveResult.count;

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
        break;

      case 'assign-delivery':
        // Assign delivery partner to multiple bookings
        if (!additionalData?.partnerId) {
          return NextResponse.json(
            { success: false, message: 'Delivery partner ID is required' },
            { status: 400 }
          );
        }

        // Check if partner exists and is active
        const partner = await prisma.deliveryPartner.findUnique({
          where: { id: additionalData.partnerId }
        });

        if (!partner || !partner.isActive) {
          return NextResponse.json(
            { success: false, message: 'Invalid or inactive delivery partner' },
            { status: 400 }
          );
        }

        // Create delivery assignments
        await prisma.deliveryAssignment.createMany({
          data: bookingIds.map(bookingId => ({
            bookingId,
            partnerId: additionalData.partnerId,
            status: 'ASSIGNED',
            assignedAt: new Date(),
            notes: additionalData.notes || null
          }))
        });

        // Update booking status to OUT_FOR_DELIVERY
        const deliveryResult = await prisma.booking.updateMany({
          where: {
            id: { in: bookingIds },
            status: { in: ['APPROVED', 'PENDING'] }
          },
          data: {
            status: 'OUT_FOR_DELIVERY',
            updatedAt: new Date()
          }
        });
        updatedCount = deliveryResult.count;

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
        // Cancel multiple bookings
        const cancelResult = await prisma.booking.updateMany({
          where: {
            id: { in: bookingIds },
            status: { not: 'DELIVERED' }
          },
          data: {
            status: 'CANCELLED',
            updatedAt: new Date()
          }
        });
        updatedCount = cancelResult.count;

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

        // Send cancellation emails if reason provided
        if (additionalData?.reason) {
          const cancelledBookings = await prisma.booking.findMany({
            where: { id: { in: bookingIds } },
            include: {
              user: {
                select: { name: true, email: true }
              }
            }
          });

          // Send cancellation emails (this would be handled by a background job in production)
          for (const booking of cancelledBookings) {
            console.log(`Cancellation email would be sent to ${booking.user.email} for booking ${booking.id} with reason: ${additionalData.reason}`);
          }
        }
        break;

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action' },
          { status: 400 }
        );
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
