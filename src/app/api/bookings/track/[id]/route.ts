import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withMiddleware } from '@/lib/api-middleware';

async function getTrackingHandler(_request: NextRequest, context?: Record<string, unknown>) {
  // Next.js 15 may pass params as a Promise; support both
  const rawParams = (context as any)?.params;
  const awaitedParams = rawParams && typeof rawParams.then === 'function' ? await rawParams : rawParams;
  const id = awaitedParams?.id as string | undefined;
  if (!id) {
    return NextResponse.json({ success: false, message: 'Booking ID is required' }, { status: 400 });
  }

  const booking = await (prisma as any).booking.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      paymentMethod: true,
      receiverName: true,
      expectedDate: true,
      quantity: true,
      deliveryDate: true,
      deliveredAt: true,
      requestedAt: true,
      updatedAt: true,
      notes: true,
      userId: true,
    },
  });

  if (!booking) {
    return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
  }

  let events = await (prisma as any).bookingEvent.findMany({
    where: { bookingId: id },
    orderBy: { createdAt: 'asc' },
    select: { id: true, status: true, title: true, description: true, createdAt: true },
  });

  // Fallback: synthesize basic events when none exist (older bookings)
  if (!events || events.length === 0) {
    const now = new Date(booking.updatedAt || booking.requestedAt);
    const addMinutes = (d: Date, m: number) => new Date(d.getTime() + m * 60000);
    const synthesized: { status: string; title: string; ts: Date }[] = [
      { status: 'PENDING', title: 'Started', ts: booking.requestedAt },
      { status: 'PENDING', title: 'Booking Requested', ts: addMinutes(booking.requestedAt, 1) },
    ];
    if (['APPROVED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(booking.status)) synthesized.push({ status: 'APPROVED', title: 'Admin Approved', ts: addMinutes(now, 2) });
    if (['OUT_FOR_DELIVERY', 'DELIVERED'].includes(booking.status)) synthesized.push({ status: 'OUT_FOR_DELIVERY', title: 'Out for Delivery', ts: addMinutes(now, 3) });
    if (booking.status === 'DELIVERED') synthesized.push({ status: 'DELIVERED', title: 'Delivered', ts: booking.deliveredAt || addMinutes(now, 4) });
    if (booking.status === 'CANCELLED') synthesized.push({ status: 'CANCELLED', title: 'Cancelled', ts: addMinutes(now, 2) });

    events = synthesized.map((e, idx) => ({ id: `${id}-synth-${idx}`, status: e.status, title: e.title, description: null, createdAt: e.ts.toISOString() }));
  }

  return NextResponse.json({ success: true, data: { booking, events } });
}

export const GET = withMiddleware(getTrackingHandler, { requireAuth: true });


