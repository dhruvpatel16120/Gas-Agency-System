import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  withMiddleware,
  parseRequestBody,
  successResponse,
} from "@/lib/api-middleware";
import { z } from "zod";
//

const adjustSchema = z.object({
  delta: z.number().int().min(-100000).max(100000),
  reason: z.string().max(200).optional(),
  type: z
    .enum(["RECEIVE", "ISSUE", "DAMAGE", "AUDIT", "CORRECTION"])
    .optional(),
  bookingId: z.string().optional(),
  batch: z
    .object({
      supplier: z.string().min(2).max(120),
      invoiceNo: z.string().max(80).optional(),
      notes: z.string().max(200).optional(),
    })
    .optional(),
});

async function getInventoryHandler() {
  const stock = await prisma.cylinderStock.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", totalAvailable: 0 },
    include: {
      adjustments: { orderBy: { createdAt: "desc" }, take: 20 },
      reservations: { take: 0 },
    },
  });
  return successResponse(stock, "Inventory loaded");
}

async function adjustInventoryHandler(request: NextRequest) {
  const payload = adjustSchema.parse(await parseRequestBody(request));
  const updated = await prisma.$transaction(async (tx) => {
    await tx.cylinderStock.upsert({
      where: { id: "default" },
      update: {},
      create: { id: "default", totalAvailable: 0 },
    });
    let batchId: string | undefined = undefined;
    if (payload.batch && payload.delta > 0) {
      const b = await tx.cylinderBatch.create({
        data: {
          supplier: payload.batch.supplier,
          invoiceNo: payload.batch.invoiceNo,
          quantity: payload.delta,
          notes: payload.batch.notes,
        },
      });
      batchId = b.id;
    }
    const next = await tx.cylinderStock.update({
      where: { id: "default" },
      data: { totalAvailable: { increment: payload.delta } },
    });
    await tx.stockAdjustment.create({
      data: {
        stockId: "default",
        delta: payload.delta,
        reason: payload.reason,
        type: payload.type || (payload.delta >= 0 ? "RECEIVE" : "ISSUE"),
        bookingId: payload.bookingId,
        batchId,
      },
    });
    return next;
  });
  return successResponse(updated, "Inventory adjusted");
}

export const GET = withMiddleware(getInventoryHandler, {
  requireAuth: true,
  requireAdmin: true,
  validateContentType: false,
});
export const POST = withMiddleware(adjustInventoryHandler, {
  requireAuth: true,
  requireAdmin: true,
  validateContentType: true,
});
