import { NextRequest } from "next/server";
import { BatchStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  withMiddleware,
  parseRequestBody,
  successResponse,
} from "@/lib/api-middleware";
import { NotFoundError } from "@/lib/error-handler";
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

    const batch = await prisma.cylinderBatch.update({
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
    const batch = await prisma.cylinderBatch.findUnique({
      where: { id },
      select: { quantity: true },
    });

    if (!batch) throw new NotFoundError("Batch not found");

    // Delete the batch
    await prisma.cylinderBatch.delete({
      where: { id },
    });

    // Update stock (decrease by batch quantity)
    await prisma.cylinderStock.update({
      where: { id: "default" },
      data: {
        totalAvailable: {
          decrement: batch.quantity,
        },
      },
    });

    return successResponse({ deleted: true }, "Batch deleted successfully");
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
