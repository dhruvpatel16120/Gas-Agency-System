import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { withMiddleware, successResponse } from '@/lib/api-middleware';

async function listContactsHandler(request: NextRequest) {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10)));
  const status = url.searchParams.get('status') || undefined;
  const search = (url.searchParams.get('search') || '').trim();

  const where: any = {};
  if (status && ['NEW', 'OPEN', 'RESOLVED', 'ARCHIVED'].includes(status)) where.status = status;
  if (search) {
    where.OR = [
      { subject: { contains: search, mode: 'insensitive' } },
      { message: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const total = await (prisma as any).contactMessage.count({ where });
  const items = await (prisma as any).contactMessage.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
    select: {
      id: true,
      subject: true,
      status: true,
      createdAt: true,
      lastRepliedAt: true,
      category: true,
      priority: true,
      user: { select: { id: true, name: true, email: true } },
      _count: { select: { replies: true } },
    },
  });

  return successResponse({
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  }, 'Contacts retrieved');
}

export const GET = withMiddleware(listContactsHandler, { requireAuth: true, requireAdmin: true, validateContentType: false });


