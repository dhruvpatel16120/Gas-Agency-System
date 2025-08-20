import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { withMiddleware, parseRequestBody, successResponse } from '@/lib/api-middleware';
import { z } from 'zod';
import { ConflictError, NotFoundError } from '@/lib/error-handler';

const updateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().min(6).max(20).optional(),
  email: z.string().email().optional().or(z.literal('').transform(() => undefined)),
  vehicleNumber: z.string().max(50).optional(),
  serviceArea: z.string().max(120).optional(),
  capacityPerDay: z.number().int().min(1).max(500).optional(),
  isActive: z.boolean().optional(),
});

async function getPartnerHandler(_request: NextRequest, context?: Record<string, unknown>) {
  const raw = (context as any)?.params; const awaited = raw && typeof raw.then === 'function' ? await raw : raw;
  const id = (awaited?.id as string) || undefined;
  if (!id) throw new NotFoundError('Partner ID is required');
  const data = await prisma.deliveryPartner.findUnique({ where: { id }, include: { assignments: true } });
  if (!data) throw new NotFoundError('Partner not found');
  return successResponse(data, 'Partner retrieved');
}

async function updatePartnerHandler(request: NextRequest, context?: Record<string, unknown>) {
  const raw = (context as any)?.params; const awaited = raw && typeof raw.then === 'function' ? await raw : raw;
  const id = (awaited?.id as string) || undefined;
  if (!id) throw new NotFoundError('Partner ID is required');
  const body = await parseRequestBody(request);
  const payload = updateSchema.parse(body);
  const exists = await prisma.deliveryPartner.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw new NotFoundError('Partner not found');
  const updated = await prisma.deliveryPartner.update({ where: { id }, data: payload });
  return successResponse(updated, 'Partner updated');
}

async function deletePartnerHandler(_request: NextRequest, context?: Record<string, unknown>) {
  const raw = (context as any)?.params; const awaited = raw && typeof raw.then === 'function' ? await raw : raw;
  const id = (awaited?.id as string) || undefined;
  if (!id) throw new NotFoundError('Partner ID is required');
  const activeAssignments = await prisma.deliveryAssignment.count({ where: { partnerId: id, status: { in: ['ASSIGNED','PICKED_UP','OUT_FOR_DELIVERY'] } } });
  if (activeAssignments > 0) throw new ConflictError('Cannot delete partner with active assignments');
  await prisma.deliveryPartner.delete({ where: { id } });
  return successResponse(null, 'Partner deleted');
}

export const GET = withMiddleware(getPartnerHandler, { requireAuth: true, requireAdmin: true, validateContentType: false });
export const PUT = withMiddleware(updatePartnerHandler, { requireAuth: true, requireAdmin: true, validateContentType: true });
export const PATCH = withMiddleware(updatePartnerHandler, { requireAuth: true, requireAdmin: true, validateContentType: true });
export const DELETE = withMiddleware(deletePartnerHandler, { requireAuth: true, requireAdmin: true, validateContentType: false });


