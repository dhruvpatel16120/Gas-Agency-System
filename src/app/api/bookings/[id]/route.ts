import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Fetch individual booking
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const bookingId = params.id;

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
        deliveryAssignment: {
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
      paymentStatus: booking.payments[0]?.status || 'PENDING',
      paymentAmount: booking.payments[0]?.amount,
      deliveryPartnerId: booking.deliveryAssignment?.partnerId,
      deliveryPartnerName: booking.deliveryAssignment?.partner?.name,
      cylinderReserved: booking.cylinderReserved,
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const bookingId = params.id;
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
      select: { quantity: true, userId: true, status: true }
    });

    if (!currentBooking) {
      return NextResponse.json(
        { success: false, message: 'Booking not found' },
        { status: 404 }
      );
    }

    // Handle quantity changes
    if (quantity && quantity !== currentBooking.quantity) {
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

    // Update booking
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        quantity,
        paymentMethod,
        receiverName,
        receiverPhone,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        notes,
        userAddress,
        status,
        updatedAt: new Date()
      }
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

      // Handle cancellation with reason
      if (status === 'CANCELLED' && body.cancellationReason) {
        // Send cancellation email with reason
        console.log('Cancellation reason:', body.cancellationReason);
        // This will be handled by the email service
      }
    }

    // Update payment amount if quantity changed
    if (quantity && quantity !== currentBooking.quantity) {
      await prisma.payment.updateMany({
        where: { bookingId: bookingId },
        data: { amount: quantity * 1000 } // Assuming ₹1000 per cylinder
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


