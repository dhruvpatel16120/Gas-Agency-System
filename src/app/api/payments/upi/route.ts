import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withMiddleware, parseRequestBody } from '@/lib/api-middleware';

// GET: fetch invoice details and UPI info
async function getUPIInvoice(request: NextRequest) {
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
      user: { select: { name: true, email: true, address: true, phone: true } },
    },
  });
  if (!booking) return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
  if (booking.status === 'CANCELLED') return NextResponse.json({ success: false, message: 'Booking is cancelled' }, { status: 400 });

  const payment = await (prisma as any).payment.findFirst({ where: { bookingId }, select: { id: true, amount: true, status: true } });
  const settings = await (prisma as any).systemSettings.findUnique({ where: { id: 'default' } });

  return NextResponse.json({ success: true, data: { booking, payment, settings } });
}

// POST: verify UPI payment (admin or mocked gateway callback)
async function confirmUPIPayment(request: NextRequest) {
  const body = await parseRequestBody(request);
  const { bookingId, upiTxnId } = body as { bookingId?: string; upiTxnId?: string };
  if (!bookingId || !upiTxnId) {
    return NextResponse.json({ success: false, message: 'bookingId and upiTxnId are required' }, { status: 400 });
  }

  // Verify booking eligibility
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { status: true } });
  if (!booking) return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
  if (booking.status === 'CANCELLED') return NextResponse.json({ success: false, message: 'Booking is cancelled. Payment not accepted.' }, { status: 400 });

  // Find the latest payment record for this booking and update it
  const existing = await (prisma as any).payment.findFirst({
    where: { bookingId },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ success: false, message: 'Payment record not found for this booking' }, { status: 404 });
  }

  const updated = await (prisma as any).payment.update({ where: { id: existing.id }, data: { status: 'SUCCESS', upiTxnId } });

  return NextResponse.json({ success: true, data: updated, message: 'Payment verified successfully' });
}

export const GET = withMiddleware(getUPIInvoice, { requireAuth: true });
export const POST = withMiddleware(confirmUPIPayment, { requireAuth: true, validateContentType: true });


