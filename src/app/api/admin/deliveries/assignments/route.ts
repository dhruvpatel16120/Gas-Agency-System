import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { withMiddleware, parseRequestBody, successResponse } from '@/lib/api-middleware';
import { z } from 'zod';

const listSchema = z.object({
  page: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 1)),
  limit: z.string().optional().transform((v) => (v ? Math.min(100, parseInt(v, 10)) : 10)),
  status: z.string().optional(),
  partnerId: z.string().optional(),
});

const createSchema = z.object({
  bookingId: z.string().min(1),
  partnerId: z.string().min(1),
  notes: z.string().max(500).optional(),
});

const updateSchema = z.object({
  bookingId: z.string().min(1),
  status: z.enum(['ASSIGNED','PICKED_UP','OUT_FOR_DELIVERY','DELIVERED','FAILED']),
  notes: z.string().max(500).optional(),
});

async function listAssignmentsHandler(request: NextRequest) {
  const url = new URL(request.url);
  const parsed = listSchema.parse(Object.fromEntries(url.searchParams.entries()));
  const where: any = {};
  if (parsed.status) where.status = parsed.status;
  if (parsed.partnerId) where.partnerId = parsed.partnerId;
  const total = await (prisma as any).deliveryAssignment.count({ where });
  const data = await (prisma as any).deliveryAssignment.findMany({
    where,
    include: { partner: true },
    orderBy: { assignedAt: 'desc' },
    skip: (parsed.page - 1) * parsed.limit,
    take: parsed.limit,
  });
  return successResponse({ data, pagination: { page: parsed.page, limit: parsed.limit, total, totalPages: Math.ceil(total / parsed.limit) } });
}

async function createAssignmentHandler(request: NextRequest) {
  const payload = createSchema.parse(await parseRequestBody(request));
  // Upsert assignment for booking; update booking status to OUT_FOR_DELIVERY
  const result = await (prisma as any).$transaction(async (tx: any) => {
    const assignment = await tx.deliveryAssignment.upsert({
      where: { bookingId: payload.bookingId },
      update: { partnerId: payload.partnerId, notes: payload.notes, status: 'ASSIGNED' },
      create: { bookingId: payload.bookingId, partnerId: payload.partnerId, notes: payload.notes, status: 'ASSIGNED' },
      include: { partner: true },
    });
    // Update booking phase to OUT_FOR_DELIVERY only if already APPROVED
    const booking = await tx.booking.update({ where: { id: payload.bookingId }, data: {}, select: { id: true, status: true } });
    if (booking.status === 'APPROVED') {
      await tx.booking.update({ where: { id: payload.bookingId }, data: { status: 'OUT_FOR_DELIVERY' } });
      await tx.bookingEvent.create({ data: { bookingId: payload.bookingId, status: 'OUT_FOR_DELIVERY', title: 'Out for Delivery', description: 'Assigned to delivery partner and dispatched.' } });
    }
    return assignment;
  });
  return successResponse(result, 'Assignment created');
}

async function updateAssignmentHandler(request: NextRequest) {
  const payload = updateSchema.parse(await parseRequestBody(request));
  const result = await (prisma as any).$transaction(async (tx: any) => {
    const updated = await tx.deliveryAssignment.update({ where: { bookingId: payload.bookingId }, data: { status: payload.status, notes: payload.notes } });
    // Reflect to booking status when reaching terminal states
    if (payload.status === 'OUT_FOR_DELIVERY') {
      await tx.booking.update({ where: { id: payload.bookingId }, data: { status: 'OUT_FOR_DELIVERY' } });
      await tx.bookingEvent.create({ data: { bookingId: payload.bookingId, status: 'OUT_FOR_DELIVERY', title: 'Out for Delivery', description: payload.notes || undefined } });
    }
    if (payload.status === 'DELIVERED') {
      await tx.booking.update({ where: { id: payload.bookingId }, data: { status: 'DELIVERED', deliveredAt: new Date() } });
      await tx.bookingEvent.create({ data: { bookingId: payload.bookingId, status: 'DELIVERED', title: 'Delivered', description: payload.notes || undefined } });
      await tx.stockReservation.updateMany({ where: { bookingId: payload.bookingId, status: 'RESERVED' }, data: { status: 'CONSUMED' } });
    }
    if (payload.status === 'FAILED') {
      // Release reservation
      const res = await tx.stockReservation.findUnique({ where: { bookingId: payload.bookingId } });
      if (res?.status === 'RESERVED') {
        await tx.cylinderStock.update({ where: { id: 'default' }, data: { totalAvailable: { increment: res.quantity } } });
        await tx.stockReservation.update({ where: { bookingId: payload.bookingId }, data: { status: 'RELEASED' } });
        await tx.stockAdjustment.create({ data: { stockId: 'default', delta: res.quantity, reason: `Failed delivery release for ${payload.bookingId}` } });
      }
      await tx.booking.update({ where: { id: payload.bookingId }, data: { status: 'APPROVED' } });
      await tx.bookingEvent.create({ data: { bookingId: payload.bookingId, status: 'APPROVED', title: 'Delivery Failed', description: payload.notes || 'Will reschedule.' } });
    }
    return updated;
  });
  return successResponse(result, 'Assignment updated');
}

export const GET = withMiddleware(listAssignmentsHandler, { requireAuth: true, requireAdmin: true, validateContentType: false });
export const POST = withMiddleware(createAssignmentHandler, { requireAuth: true, requireAdmin: true, validateContentType: true });
export const PUT = withMiddleware(updateAssignmentHandler, { requireAuth: true, requireAdmin: true, validateContentType: true });


