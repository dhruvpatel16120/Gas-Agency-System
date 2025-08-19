import { withMiddleware, successResponse } from '@/lib/api-middleware';
import { prisma } from '@/lib/db';

async function statsHandler() {
  const [total, newCount, openCount, resolvedCount, archivedCount] = await Promise.all([
    (prisma as any).contactMessage.count(),
    (prisma as any).contactMessage.count({ where: { status: 'NEW' } }),
    (prisma as any).contactMessage.count({ where: { status: 'OPEN' } }),
    (prisma as any).contactMessage.count({ where: { status: 'RESOLVED' } }),
    (prisma as any).contactMessage.count({ where: { status: 'ARCHIVED' } }),
  ]);
  return successResponse({ total, new: newCount, open: openCount, resolved: resolvedCount, archived: archivedCount }, 'Contact stats');
}

export const GET = withMiddleware(statsHandler as any, { requireAuth: true, requireAdmin: true, validateContentType: false });


