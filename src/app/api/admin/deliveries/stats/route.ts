import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withMiddleware, successResponse } from "@/lib/api-middleware";

async function getDeliveryStatsHandler(_request: NextRequest) {
  void _request;
  try {
    // Get current date and calculate date ranges
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get total deliveries count
    const totalDeliveries = await prisma.deliveryAssignment.count();

    // Get active deliveries (not delivered or failed)
    const activeDeliveries = await prisma.deliveryAssignment.count({
      where: {
        status: {
          notIn: ["DELIVERED", "FAILED"],
        },
      },
    });

    // Get completed deliveries today
    const completedToday = await prisma.deliveryAssignment.count({
      where: {
        status: "DELIVERED",
        updatedAt: {
          gte: today,
        },
      },
    });

    // Get pending assignments (bookings without delivery assignments)
    const pendingAssignments = await prisma.booking.count({
      where: {
        status: "APPROVED",
        assignment: null,
      },
    });

    // Get total and active partners
    const totalPartners = await prisma.deliveryPartner.count();
    const activePartners = await prisma.deliveryPartner.count({
      where: {
        isActive: true,
      },
    });

    // Calculate average delivery time (for completed deliveries)
    const completedDeliveries = await prisma.deliveryAssignment.findMany({
      where: {
        status: "DELIVERED",
        updatedAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        assignedAt: true,
        updatedAt: true,
      },
    });

    let averageDeliveryTime = 0;
    if (completedDeliveries.length > 0) {
      const totalTime = completedDeliveries.reduce(
        (sum: number, delivery) => {
          const assignedTime = new Date(delivery.assignedAt).getTime();
          const completedTime = new Date(delivery.updatedAt).getTime();
          return sum + (completedTime - assignedTime);
        },
        0,
      );
      averageDeliveryTime = Math.round(
        totalTime / completedDeliveries.length / (1000 * 60 * 60),
      ); // Convert to hours
    }

    // Calculate success rate
    const totalCompleted = await prisma.deliveryAssignment.count({
      where: {
        status: "DELIVERED",
      },
    });

    const totalFailed = await prisma.deliveryAssignment.count({
      where: {
        status: "FAILED",
      },
    });

    const successRate =
      totalCompleted + totalFailed > 0
        ? Math.round((totalCompleted / (totalCompleted + totalFailed)) * 100)
        : 0;

    const stats = {
      totalDeliveries,
      activeDeliveries,
      completedToday,
      pendingAssignments,
      totalPartners,
      activePartners,
      averageDeliveryTime,
      successRate,
    };

    return successResponse(stats);
  } catch (error) {
    console.error("Error getting delivery stats:", error);
    return successResponse({
      totalDeliveries: 0,
      activeDeliveries: 0,
      completedToday: 0,
      pendingAssignments: 0,
      totalPartners: 0,
      activePartners: 0,
      averageDeliveryTime: 0,
      successRate: 0,
    });
  }
}

export const GET = withMiddleware(getDeliveryStatsHandler, {
  requireAuth: true,
  requireAdmin: true,
  validateContentType: false,
});
