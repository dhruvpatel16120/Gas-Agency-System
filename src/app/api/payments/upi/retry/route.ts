import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST: retry failed UPI payment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId, upiTxnId } = body as {
      bookingId: string;
      upiTxnId: string;
    };

    if (!bookingId || !upiTxnId) {
      return NextResponse.json({ success: false, message: 'Booking ID and UPI transaction ID are required' }, { status: 400 });
    }

    if (typeof upiTxnId !== 'string' || upiTxnId.trim().length < 6) {
      return NextResponse.json({ success: false, message: 'Valid UPI transaction ID is required' }, { status: 400 });
    }

    // Verify the booking belongs to the user and has a failed UPI payment
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        userId: session.user.id,
        paymentMethod: 'UPI',
        status: { not: 'CANCELLED' }
      },
      include: {
        payments: {
          where: { method: 'UPI' },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!booking) {
      return NextResponse.json({ success: false, message: 'Booking not found or not eligible for retry' }, { status: 404 });
    }

    const latestPayment = booking.payments[0];
    if (!latestPayment || latestPayment.status !== 'FAILED') {
      return NextResponse.json({ success: false, message: 'No failed UPI payment found for this booking' }, { status: 400 });
    }

    // Create a new payment record for the retry
    const newPayment = await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: latestPayment.amount,
        method: 'UPI',
        status: 'PENDING',
        upiTxnId: upiTxnId.trim(),
      },
    });

    // Update the old failed payment to show it was retried
    await prisma.payment.update({
      where: { id: latestPayment.id },
      data: { 
        upiTxnId: `${latestPayment.upiTxnId} (RETRIED - ${new Date().toISOString()})` 
      }
    });

    // Create a booking event for the payment retry
    await prisma.bookingEvent.create({
      data: {
        bookingId: booking.id,
        status: 'PENDING',
        title: 'Payment Retry',
        description: `User retried UPI payment with transaction ID: ${upiTxnId}`,
        createdAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Payment retry initiated successfully',
      data: {
        paymentId: newPayment.id,
        status: newPayment.status,
        message: 'Your payment is now pending review. You will be notified once it is confirmed.'
      }
    });

  } catch (error) {
    console.error('Payment retry error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retry payment' },
      { status: 500 }
    );
  }
}
