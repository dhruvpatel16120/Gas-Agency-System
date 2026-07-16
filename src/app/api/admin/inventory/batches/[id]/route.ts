import { NextRequest } from "next/server";
import { BatchStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  withMiddleware,
  parseRequestBody,
  successResponse,
} from "@/lib/api-middleware";
import { NotFoundError, ConflictError } from "@/lib/error-handler";
//

async function getBatchHandler(
  _request: NextRequest,
  context?: Record<string, unknown>,
) {
  const raw = (context as unknown as { params?: { id?: string } | Promise<{ id?: string }> })?.params;
  const awaited =
    raw && typeof (raw as Promise<{ id?: string }>).then === "function"
      ? await (raw as Promise<{ id?: string }>)
      : (raw as { id?: string } | undefined);
  const id = awaited?.id as string | undefined;

  if (!id) throw new NotFoundError("Batch ID is required");

  try {
    const batch = await prisma.cylinderBatch.findUnique({
      where: { id },
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

    if (!batch) throw new NotFoundError("Batch not found");

    return successResponse(batch, "Batch retrieved successfully");
  } catch (error) {
    console.error("Failed to fetch batch:", error);
    throw error;
  }
}

async function updateBatchHandler(
  request: NextRequest,
  context?: Record<string, unknown>,
) {
  const rawParams = (context as unknown as { params?: { id?: string } | Promise<{ id?: string }> })?.params;
  const awaited =
    rawParams && typeof (rawParams as Promise<{ id?: string }>).then === "function"
      ? await (rawParams as Promise<{ id?: string }>)
      : (rawParams as { id?: string } | undefined);
  const id = awaited?.id as string | undefined;

  if (!id) throw new NotFoundError("Batch ID is required");

  try {
    const body = await parseRequestBody<{
      supplier: string;
      invoiceNo?: string;
      quantity: number;
      notes?: string;
      receivedAt: string;
      status: string;
    }>(request);

    if (typeof body.quantity !== "number" || body.quantity <= 0) {
      throw new ConflictError("Batch quantity must be greater than 0.");
    }

    const batch = await prisma.$transaction(async (tx) => {
      const oldBatch = await tx.cylinderBatch.findUnique({
        where: { id },
      });
      if (!oldBatch) throw new NotFoundError("Batch not found");

      const diff = body.quantity - oldBatch.quantity;
      if (diff !== 0) {
        const stock = await tx.cylinderStock.upsert({
          where: { id: "default" },
          update: {},
          create: { id: "default", totalAvailable: 0 },
        });

        if (stock.totalAvailable + diff < 0) {
          throw new ConflictError(
            `Updating batch quantity would result in negative available stock. Current available stock is ${stock.totalAvailable}, cannot decrease by ${Math.abs(diff)}.`
          );
        }

        // Update stock
        await tx.cylinderStock.update({
          where: { id: "default" },
          data: { totalAvailable: { increment: diff } },
        });

        // Log adjustment
        await tx.stockAdjustment.create({
          data: {
            stockId: "default",
            delta: diff,
            type: diff > 0 ? "RECEIVE" : "ISSUE",
            reason: `Batch quantity updated for supplier ${body.supplier}`,
            batchId: id,
          },
        });
      }

      const updated = await tx.cylinderBatch.update({
        where: { id },
        data: {
          supplier: body.supplier,
          invoiceNo: body.invoiceNo,
          quantity: body.quantity,
          notes: body.notes,
          receivedAt: new Date(body.receivedAt),
          status: body.status as BatchStatus,
        },
      });

      return updated;
    });

    return successResponse(batch, "Batch updated successfully");
  } catch (error) {
    console.error("Failed to update batch:", error);
    throw error;
  }
}

async function deleteBatchHandler(
  _request: NextRequest,
  context?: Record<string, unknown>,
) {
  const raw = (context as unknown as { params?: { id?: string } | Promise<{ id?: string }> })?.params;
  const awaited =
    raw && typeof (raw as Promise<{ id?: string }>).then === "function"
      ? await (raw as Promise<{ id?: string }>)
      : (raw as { id?: string } | undefined);
  const id = awaited?.id as string | undefined;

  if (!id) throw new NotFoundError("Batch ID is required");

  try {
    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.cylinderBatch.findUnique({
        where: { id },
        select: { quantity: true, supplier: true },
      });

      if (!batch) throw new NotFoundError("Batch not found");

      // Verify stock capacity before deletion
      const stock = await tx.cylinderStock.upsert({
        where: { id: "default" },
        update: {},
        create: { id: "default", totalAvailable: 0 },
      });

      if (stock.totalAvailable - batch.quantity < 0) {
        throw new ConflictError(
          `Cannot delete batch: doing so would result in negative available stock. Current stock is ${stock.totalAvailable}, batch quantity is ${batch.quantity}.`
        );
      }

      // Delete the batch
      await tx.cylinderBatch.delete({
        where: { id },
      });

      // Update stock (decrease by batch quantity)
      await tx.cylinderStock.update({
        where: { id: "default" },
        data: {
          totalAvailable: {
            decrement: batch.quantity,
          },
        },
      });

      // Log adjustment
      await tx.stockAdjustment.create({
        data: {
          stockId: "default",
          delta: -batch.quantity,
          type: "ISSUE",
          reason: `Deleted cylinder batch from supplier ${batch.supplier}`,
        },
      });

      return { deleted: true };
    });

    return successResponse(result, "Batch deleted successfully");
  } catch (error) {
    console.error("Failed to delete batch:", error);
    throw error;
  }
}

export const GET = withMiddleware(getBatchHandler, {
  requireAuth: true,
  requireAdmin: true,
  validateContentType: false,
});
export const PUT = withMiddleware(updateBatchHandler, {
  requireAuth: true,
  requireAdmin: true,
  validateContentType: true,
});
export const DELETE = withMiddleware(deleteBatchHandler, {
  requireAuth: true,
  requireAdmin: true,
  validateContentType: false,
});
