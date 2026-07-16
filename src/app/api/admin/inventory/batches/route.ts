import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  withMiddleware,
  parseRequestBody,
  successResponse,
} from "@/lib/api-middleware";
//

async function getBatchesHandler() {
  try {
    const batches = await prisma.cylinderBatch.findMany({
      orderBy: { receivedAt: "desc" },
      select: {
        id: true,
        supplier: true,
        invoiceNo: true,
        quantity: true,
        receivedAt: true,
        notes: true,
        status: true,
      },
    });

    return successResponse(batches, "Batches retrieved successfully");
  } catch (error) {
    console.error("Failed to fetch batches:", error);
    return successResponse([], "Batches retrieved successfully");
  }
}

async function createBatchHandler(request: NextRequest) {
  try {
    const body = await parseRequestBody<{
      supplier: string;
      invoiceNo?: string;
      quantity: number;
      notes?: string;
      receivedAt: string;
    }>(request);

    if (!body.supplier || typeof body.supplier !== "string" || body.supplier.trim().length < 2) {
      return successResponse({ error: "Invalid supplier name" }, "Invalid supplier name", 400);
    }

    if (typeof body.quantity !== "number" || body.quantity <= 0) {
      return successResponse({ error: "Batch quantity must be greater than 0" }, "Batch quantity must be greater than 0", 400);
    }

    const batch = await prisma.$transaction(async (tx) => {
      const b = await tx.cylinderBatch.create({
        data: {
          supplier: body.supplier,
          invoiceNo: body.invoiceNo,
          quantity: body.quantity,
          notes: body.notes,
          receivedAt: new Date(body.receivedAt),
          status: "ACTIVE",
        },
      });

      // Update stock
      await tx.cylinderStock.update({
        where: { id: "default" },
        data: {
          totalAvailable: {
            increment: body.quantity,
          },
        },
      });

      // Log stock adjustment
      await tx.stockAdjustment.create({
        data: {
          stockId: "default",
          delta: body.quantity,
          type: "RECEIVE",
          reason: `Cylinder batch received from ${body.supplier}`,
          batchId: b.id,
        },
      });

      return b;
    });

    return successResponse(batch, "Batch created successfully");
  } catch (error) {
    console.error("Failed to create batch:", error);
    return successResponse({ error: "Failed to create batch" }, "Failed to create batch", 500);
  }
}

export const GET = withMiddleware(getBatchesHandler, {
  requireAuth: true,
  requireAdmin: true,
  validateContentType: false,
});
export const POST = withMiddleware(createBatchHandler, {
  requireAuth: true,
  requireAdmin: true,
  validateContentType: true,
});
