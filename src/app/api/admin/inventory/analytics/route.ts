//
import { prisma } from "@/lib/db";
import { withMiddleware, successResponse } from "@/lib/api-middleware";

async function getInventoryAnalyticsHandler() {
  try {
    // Get current stock status
    const stock = await prisma.cylinderStock.findUnique({
      where: { id: "default" },
      include: {
        adjustments: {
          orderBy: { createdAt: "desc" },
          take: 100,
        },
      },
    });

    // Get batch statistics
    const batchStats = await prisma.cylinderBatch.groupBy({
      by: ["status"],
      _count: { id: true },
      _sum: { quantity: true },
    });

    // Get monthly trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrends = await prisma.stockAdjustment.groupBy({
      by: ["type"],
      where: {
        createdAt: { gte: sixMonthsAgo },
      },
      _sum: { delta: true },
      _count: { id: true },
    });

    // Get recent activity
    const recentActivity = await prisma.stockAdjustment.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        batch: {
          select: { supplier: true, quantity: true },
        },
        booking: {
          select: { userName: true, quantity: true },
        },
      },
    });

    // Calculate metrics
    const totalReceived =
      stock?.adjustments
        .filter((a) => a.delta > 0)
        .reduce((sum, a) => sum + a.delta, 0) || 0;

    const totalIssued = Math.abs(
      stock?.adjustments
        .filter((a) => a.delta < 0)
        .reduce((sum, a) => sum + a.delta, 0) || 0,
    );

    const analytics = {
      currentStock: stock?.totalAvailable || 0,
      totalReceived,
      totalIssued,
      batchStats: batchStats.map((stat) => ({
        status: stat.status,
        count: stat._count.id,
        totalQuantity: stat._sum.quantity || 0,
      })),
      monthlyTrends: monthlyTrends.map((trend) => ({
        type: trend.type,
        totalDelta: trend._sum.delta || 0,
        count: trend._count.id,
      })),
      recentActivity: recentActivity.map((activity) => ({
        id: activity.id,
        delta: activity.delta,
        type: activity.type,
        reason: activity.reason,
        createdAt: activity.createdAt,
        batch: activity.batch,
        booking: activity.booking,
      })),
    };

    return successResponse(analytics, "Analytics retrieved successfully");
  } catch (error) {
    console.error("Failed to fetch analytics:", error);
    throw error;
  }
}

export const GET = withMiddleware(getInventoryAnalyticsHandler, {
  requireAuth: true,
  requireAdmin: true,
  validateContentType: false,
});
