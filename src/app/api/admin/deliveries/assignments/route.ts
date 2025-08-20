import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendDeliveryStatusEmail } from '@/lib/email';

// POST - Assign a delivery partner to a booking
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId, partnerId } = body;

    if (!bookingId || !partnerId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Booking ID and partner ID are required' 
      }, { status: 400 });
    }

    // Check if booking exists and is approved
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { assignment: true }
    });

    if (!booking) {
      return NextResponse.json({ 
        success: false, 
        message: 'Booking not found' 
      }, { status: 404 });
    }

    if (booking.status !== 'APPROVED') {
      return NextResponse.json({ 
        success: false, 
        message: 'Can only assign delivery to approved bookings' 
      }, { status: 400 });
    }

    if (booking.assignment) {
      return NextResponse.json({ 
        success: false, 
        message: 'Delivery already assigned to this booking' 
      }, { status: 400 });
    }

    // Check if delivery partner exists and is active
    const partner = await prisma.deliveryPartner.findUnique({
      where: { id: partnerId }
    });

    if (!partner) {
      return NextResponse.json({ 
        success: false, 
        message: 'Delivery partner not found' 
      }, { status: 404 });
    }

    if (!partner.isActive) {
      return NextResponse.json({ 
        success: false, 
        message: 'Delivery partner is not active' 
      }, { status: 400 });
    }

    // Create delivery assignment
    const deliveryAssignment = await prisma.deliveryAssignment.create({
      data: {
        bookingId,
        partnerId,
        status: 'ASSIGNED',
        assignedAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Keep booking status as APPROVED - don't change to OUT_FOR_DELIVERY automatically
    // Admin will manually change status when delivery partner confirms pickup
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        // status: 'OUT_FOR_DELIVERY', // REMOVED - keep as APPROVED
        updatedAt: new Date()
      }
    });

    // Create booking event for delivery assignment (not status change)
    await prisma.bookingEvent.create({
      data: {
        bookingId,
        status: 'APPROVED', // Keep as APPROVED
        title: 'Delivery Assigned',
        description: `Delivery assigned to ${partner.name}. Status remains APPROVED until pickup confirmed.`
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Delivery partner assigned successfully',
      data: {
        id: deliveryAssignment.id,
        partnerId: deliveryAssignment.partnerId,
        status: deliveryAssignment.status,
        assignedAt: deliveryAssignment.assignedAt
      }
    });

  } catch (error) {
    console.error('Failed to assign delivery partner:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to assign delivery partner' },
      { status: 500 }
    );
  }
}

// PUT - Update delivery assignment status
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId, status, notes } = body;

    if (!bookingId || !status) {
      return NextResponse.json({ 
        success: false, 
        message: 'Booking ID and status are required' 
      }, { status: 400 });
    }

    // Check if delivery assignment exists
    const deliveryAssignment = await prisma.deliveryAssignment.findUnique({
      where: { bookingId },
      include: { booking: true }
    });

    if (!deliveryAssignment) {
      return NextResponse.json({ 
        success: false, 
        message: 'Delivery assignment not found' 
      }, { status: 404 });
    }

    // Update delivery assignment status
    await prisma.deliveryAssignment.update({
      where: { bookingId },
      data: {
        status,
        notes: notes || deliveryAssignment.notes,
        updatedAt: new Date()
      }
    });

    // Update booking status based on delivery status
    let newBookingStatus = deliveryAssignment.booking.status;
    
    if (status === 'PICKED_UP') {
      // When picked up, keep booking as APPROVED
      newBookingStatus = 'APPROVED';
    } else if (status === 'OUT_FOR_DELIVERY') {
      // When out for delivery, change booking status to OUT_FOR_DELIVERY
      newBookingStatus = 'OUT_FOR_DELIVERY';
    } else if (status === 'DELIVERED') {
      // When delivered, change booking status to DELIVERED
      newBookingStatus = 'DELIVERED';
    } else if (status === 'FAILED') {
      // When failed, change booking status to CANCELLED
      newBookingStatus = 'CANCELLED';
    }

    // Only update booking status if it's different
    if (newBookingStatus !== deliveryAssignment.booking.status) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: newBookingStatus,
          updatedAt: new Date()
        }
      });

      // Create booking event for status change
      await prisma.bookingEvent.create({
        data: {
          bookingId,
          status: newBookingStatus,
          title: `Delivery ${status.toLowerCase().replace('_', ' ')}`,
          description: notes || `Delivery status updated to ${status}. Booking status changed to ${newBookingStatus}.`
        }
      });
    } else {
      // Create booking event for delivery status update (no booking status change)
      await prisma.bookingEvent.create({
        data: {
          bookingId,
          status: deliveryAssignment.booking.status,
          title: `Delivery ${status.toLowerCase().replace('_', ' ')}`,
          description: notes || `Delivery status updated to ${status}.`
        }
      });
    }

    // Send email notification to customer about delivery status update
    try {
      if (deliveryAssignment.booking.userEmail) {
        await sendDeliveryStatusEmail(
          deliveryAssignment.booking.userEmail,
          deliveryAssignment.booking.userName,
          bookingId,
          status,
          notes || `Your delivery status has been updated to ${status.toLowerCase().replace('_', ' ')}.`
        );
      }
    } catch (emailError) {
      console.error('Failed to send delivery status email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Delivery status updated successfully',
      data: {
        id: deliveryAssignment.id,
        status,
        updatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Failed to update delivery status:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update delivery status' },
      { status: 500 }
    );
  }
}


