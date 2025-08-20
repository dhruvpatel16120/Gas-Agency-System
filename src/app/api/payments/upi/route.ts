import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withMiddleware, parseRequestBody } from '@/lib/api-middleware';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET: fetch invoice details and UPI info
async function getUPIInvoice(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId') || undefined;
    if (!bookingId) {
      return NextResponse.json({ success: false, message: 'bookingId is required' }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        paymentMethod: true,
        status: true,
        quantity: true,
        userId: true,
        user: { select: { name: true, email: true, address: true, phone: true, id: true } },
      },
    });
    if (!booking) return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    if (booking.status === 'CANCELLED') return NextResponse.json({ success: false, message: 'Booking is cancelled' }, { status: 400 });
    if (booking.paymentMethod !== 'UPI') return NextResponse.json({ success: false, message: 'This booking is not using UPI payment' }, { status: 400 });

    // Authorization: only booking owner or admin can view
    try {
      const session = await getServerSession(authOptions);
      if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
      if (session.user.role !== 'ADMIN' && session.user.id !== booking.userId) {
        return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
      }
    } catch (e) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const payment = await (prisma as any).payment.findFirst({ where: { bookingId }, select: { id: true, amount: true, status: true } });

    const upiRegex = /^[a-zA-Z0-9._\-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{2,64}$/;
    const rawEnvUpi = (process.env.ADMIN_UPI_ID || process.env.UPI_ID || '').trim();
    const envUpi = rawEnvUpi && upiRegex.test(rawEnvUpi) ? rawEnvUpi : null;

    if (!envUpi) {
      return NextResponse.json(
        { success: false, message: 'Admin UPI ID is not configured or invalid. Please set a valid ADMIN_UPI_ID in environment.' },
        { status: 503 }
      );
    }

    return NextResponse.json({ success: true, data: { booking, payment, adminUpiId: envUpi } });
  } catch (error) {
    console.error('Failed to prepare UPI invoice:', error);
    return NextResponse.json({ success: false, message: 'Failed to prepare payment. Please try again later.' }, { status: 500 });
  }
}

// POST: verify UPI payment (admin or mocked gateway callback)
async function confirmUPIPayment(request: NextRequest) {
  try {
    const body = await parseRequestBody(request);
    const { bookingId, upiTxnId } = body as { bookingId?: string; upiTxnId?: string };
    if (!bookingId || !upiTxnId) {
      return NextResponse.json({ success: false, message: 'bookingId and upiTxnId are required' }, { status: 400 });
    }

    // Verify booking eligibility
    const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { status: true, userId: true } });
    if (!booking) return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    if (booking.status === 'CANCELLED') return NextResponse.json({ success: false, message: 'Booking is cancelled. Payment not accepted.' }, { status: 400 });

    // Only owner or admin can confirm
    try {
      const session = await getServerSession(authOptions);
      if (!session) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
      if (session.user.role !== 'ADMIN' && session.user.id !== booking.userId) {
        return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
      }
    } catch (e) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    // Find the latest payment record for this booking and update it
    const existing = await (prisma as any).payment.findFirst({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, message: 'Payment record not found for this booking' }, { status: 404 });
    }

    // Keep status pending; attach UPI reference for admin review
    const updated = await (prisma as any).payment.update({ where: { id: existing.id }, data: { upiTxnId } });

    // Fire-and-forget success email to user
    try {
      const b = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: { user: { select: { email: true, name: true } } }
      });
      const email = b?.user?.email;
      const name = b?.user?.name || 'Customer';
      if (email) {
        const subject = `Payment Submitted for Review - Booking ${bookingId}`;
        const html = `<div style=\"font-family:Arial,sans-serif;max-width:600px;margin:0 auto;\">\n          <h2 style=\"color:#065f46;\">Payment Submitted</h2>\n          <p>Hi ${name},</p>\n          <p>Your payment for booking <strong>${bookingId}</strong> has been recorded and is pending admin review.</p>\n          <div style=\"background:#fff7ed;padding:12px;border-radius:8px;margin:12px 0;border:1px solid #fed7aa;\">\n            <p><strong>Reference ID:</strong> ${upiTxnId}</p>\n            <p><strong>Status:</strong> Pending Review</p>\n          </div>\n          <p>We'll email you once it's verified and update the payment status. Please check the website periodically for updates.</p>\n        </div>`;
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { sendEmail } = require('@/lib/email');
        void sendEmail(email, subject, html);
      }
    } catch (e) {
      console.error('Failed to send payment success email:', e);
    }

    return NextResponse.json({ success: true, data: updated, message: 'Payment verified successfully' });
  } catch (error) {
    console.error('Failed to confirm UPI payment:', error);
    return NextResponse.json({ success: false, message: 'Failed to confirm payment. Please try again later.' }, { status: 500 });
  }
}

export const GET = withMiddleware(getUPIInvoice, { requireAuth: true });
export const POST = withMiddleware(confirmUPIPayment, { requireAuth: true, validateContentType: true });


