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

    const batch = await prisma.cylinderBatch.create({
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
    await prisma.cylinderStock.update({
      where: { id: "default" },
      data: {
        totalAvailable: {
          increment: body.quantity,
        },
      },
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
