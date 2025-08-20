import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { withMiddleware, parseRequestBody, successResponse } from '@/lib/api-middleware';
import { NotFoundError } from '@/lib/error-handler';

async function getContactHandler(_request: NextRequest, context?: Record<string, unknown>) {
  const raw = (context as any)?.params;
  const awaited = raw && typeof raw.then === 'function' ? await raw : raw;
  const id = (awaited?.id as string) || undefined;
  if (!id) throw new NotFoundError('Contact ID is required');

  const item = await (prisma as any).contactMessage.findUnique({
    where: { id },
    select: {
      id: true,
      subject: true,
      message: true,
      category: true,
      priority: true,
      relatedBookingId: true,
      preferredContact: true,
      phone: true,
      status: true,
      createdAt: true,
      lastRepliedAt: true,
      user: { select: { id: true, name: true, email: true } },
      replies: {
        select: {
          id: true,
          body: true,
          isAdmin: true,
          createdAt: true,
          author: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!item) throw new NotFoundError('Contact not found');

  return successResponse(item, 'Contact retrieved');
}

async function updateContactHandler(request: NextRequest, context?: Record<string, unknown>) {
  const raw = (context as any)?.params;
  const awaited = raw && typeof raw.then === 'function' ? await raw : raw;
  const id = (awaited?.id as string) || undefined;
  if (!id) throw new NotFoundError('Contact ID is required');

  const body = await parseRequestBody<Record<string, unknown>>(request);
  const updates: Record<string, unknown> = {};
  const allowed = ['status', 'category', 'priority'] as const;
  for (const k of allowed) {
    if (Object.prototype.hasOwnProperty.call(body, k)) updates[k] = (body as any)[k];
  }
  const updated = await (prisma as any).contactMessage.update({ where: { id }, data: updates, select: { id: true, status: true, category: true, priority: true, updatedAt: true } });
  return successResponse(updated, 'Updated');
}

export const GET = withMiddleware(getContactHandler, { requireAuth: true, requireAdmin: true, validateContentType: false });
export const PUT = withMiddleware(updateContactHandler, { requireAuth: true, requireAdmin: true, validateContentType: true });


