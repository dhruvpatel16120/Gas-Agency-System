import { prisma } from "@/lib/db";
import { withMiddleware, successResponse } from "@/lib/api-middleware";

async function getStockHandler() {
  const stock = await prisma.cylinderStock.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", totalAvailable: 0 },
  });
  return successResponse({
    totalAvailable: stock.totalAvailable,
  });
}

export const GET = withMiddleware(getStockHandler, {
  requireAuth: true,
  validateContentType: false,
});
