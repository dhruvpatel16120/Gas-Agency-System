import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { withMiddleware, parseRequestBody, successResponse } from '@/lib/api-middleware';
import { z } from 'zod';

const adjustmentSchema = z.object({
  delta: z.number().int().min(-100000).max(100000),
  reason: z.string().min(1).max(200),
  type: z.enum(['RECEIVE', 'ISSUE', 'DAMAGE', 'AUDIT', 'CORRECTION']),
  notes: z.string().max(500).optional(),
  adjustmentDate: z.string().optional(),
  batchId: z.string().optional(),
  bookingId: z.string().optional()
});

async function getAdjustmentsHandler() {
  try {
    const adjustments = await prisma.stockAdjustment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        batch: {
          select: {
            id: true,
            supplier: true,
            quantity: true
          }
        },
        booking: {
          select: {
            id: true,
            userName: true,
            quantity: true
          }
        }
      }
    });

    return successResponse(adjustments, 'Adjustments retrieved successfully');
  } catch (error) {
    console.error('Failed to fetch adjustments:', error);
    return successResponse([], 'Adjustments retrieved successfully');
  }
}

async function createAdjustmentHandler(request: NextRequest) {
  try {
    const body = await parseRequestBody(request);
    const validatedData = adjustmentSchema.parse(body);

    const adjustment = await prisma.$transaction(async (tx) => {
      // Create the adjustment record
      const adjustmentRecord = await tx.stockAdjustment.create({
        data: {
          stockId: 'default',
          delta: validatedData.delta,
          type: validatedData.type,
          reason: validatedData.reason,
          notes: validatedData.notes,
          batchId: validatedData.batchId,
          bookingId: validatedData.bookingId
        }
      });

      // Update the stock
      await tx.cylinderStock.update({
        where: { id: 'default' },
        data: {
          totalAvailable: {
            increment: validatedData.delta
          }
        }
      });

      return adjustmentRecord;
    });

    return successResponse(adjustment, 'Stock adjustment applied successfully');
  } catch (error) {
    console.error('Failed to create adjustment:', error);
    throw error;
  }
}

export const GET = withMiddleware(getAdjustmentsHandler, { requireAuth: true, requireAdmin: true, validateContentType: false });
export const POST = withMiddleware(createAdjustmentHandler, { requireAuth: true, requireAdmin: true, validateContentType: true });
