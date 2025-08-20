import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Fetch payments for a specific booking
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id: bookingId } = await params;

    // Get payments for the booking
    const payments = await prisma.payment.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Failed to fetch payments:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}

// PUT - Update COD payment info for a booking (amount/status)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { id: bookingId } = await params;
    const body = await request.json();
    const { amount, status } = body as { amount?: number; status?: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' };

    if (typeof amount !== 'number' && !status) {
      return NextResponse.json(
        { success: false, message: 'Nothing to update. Provide amount and/or status.' },
        { status: 400 }
      );
    }

    // Ensure booking exists and is COD
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, paymentMethod: true, status: true }
    });

    if (!booking) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }

    if (booking.paymentMethod !== 'COD') {
      return NextResponse.json(
        { success: false, message: 'Payment editing is only allowed for COD bookings' },
        { status: 400 }
      );
    }

    // Find the latest payment record for the booking
    const latestPayment = await prisma.payment.findFirst({
      where: { bookingId },
      orderBy: { createdAt: 'desc' }
    });

    let updatedPayment;
    if (latestPayment) {
      updatedPayment = await prisma.payment.update({
        where: { id: latestPayment.id },
        data: {
          amount: typeof amount === 'number' ? amount : latestPayment.amount,
          status: (status || latestPayment.status) as any,
        }
      });
    } else {
      // Create a payment record if none exists yet
      updatedPayment = await prisma.payment.create({
        data: {
          bookingId,
          amount: typeof amount === 'number' ? amount : 0,
          method: 'COD',
          status: (status || 'PENDING') as any,
        }
      });
    }

    // Record an event for auditability
    try {
      await prisma.bookingEvent.create({
        data: {
          bookingId,
          status: booking.status as any,
          title: 'Payment updated',
          description: `Payment set to ${updatedPayment.status} with amount ₹${updatedPayment.amount}`,
        }
      });
    } catch (e) {
      // Non-fatal
      console.error('Failed to create booking event for payment update:', e);
    }

    return NextResponse.json({ success: true, message: 'Payment updated', data: updatedPayment });
  } catch (error) {
    console.error('Failed to update payment:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update payment' },
      { status: 500 }
    );
  }
}