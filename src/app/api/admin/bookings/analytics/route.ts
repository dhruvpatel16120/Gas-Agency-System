import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - Fetch comprehensive booking analytics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "30d";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Calculate date range
    let dateFrom: Date, dateTo: Date;
    const now = new Date();

    switch (range) {
      case "7d":
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateTo = now;
        break;
      case "30d":
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateTo = now;
        break;
      case "90d":
        dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        dateTo = now;
        break;
      case "1y":
        dateFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        dateTo = now;
        break;
      case "custom":
        if (startDate && endDate) {
          dateFrom = new Date(startDate);
          dateTo = new Date(endDate);
        } else {
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          dateTo = now;
        }
        break;
      default:
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateTo = now;
    }

    // Build date filter
    const dateFilter = {
      createdAt: {
        gte: dateFrom,
        lte: dateTo,
      },
    };

    // Get overview statistics with optimized queries
    const [bookingStats, totalRevenue, totalUsers] = await Promise.all([
      // Single query for all booking status counts
      prisma.booking.groupBy({
        by: ["status"],
        where: dateFilter,
        _count: { id: true },
      }),
      prisma.payment.aggregate({
        where: {
          status: "SUCCESS",
          booking: { ...dateFilter, status: { not: "CANCELLED" } },
        },
        _sum: { amount: true },
      }),
      prisma.user.count({ where: dateFilter }),
    ]);

    // Extract counts from booking stats
    const totalBookings = bookingStats.reduce(
      (sum, stat) => sum + stat._count.id,
      0,
    );
    const pendingBookings =
      bookingStats.find((stat) => stat.status === "PENDING")?._count.id || 0;
    const deliveredBookings =
      bookingStats.find((stat) => stat.status === "DELIVERED")?._count.id || 0;
    const cancelledBookings =
      bookingStats.find((stat) => stat.status === "CANCELLED")?._count.id || 0;

    // Calculate average delivery time
    const deliveredBookingsWithDates = await prisma.booking.findMany({
      where: { ...dateFilter, status: "DELIVERED", deliveredAt: { not: null } },
      select: { createdAt: true, deliveredAt: true },
    });

    let averageDeliveryTime = 0;
    if (deliveredBookingsWithDates.length > 0) {
      const totalTime = deliveredBookingsWithDates.reduce((sum, booking) => {
        const createdAtMs = new Date(booking.createdAt).getTime();
        const deliveredAtMs = new Date(booking.deliveredAt!).getTime();
        return sum + (deliveredAtMs - createdAtMs);
      }, 0);
      averageDeliveryTime = Math.round(totalTime / (24 * 60 * 60 * 1000)); // Convert to days
    }

    // Get daily trends with optimized query
    const dailyTrendsData = await prisma.booking.groupBy({
      by: ["createdAt"],
      where: dateFilter,
      _count: { id: true },
      _sum: { quantity: true },
    });

    // Group by date and calculate revenue
    const dailyTrendsMap = new Map();

    // Initialize all dates in range
    const currentDate = new Date(dateFrom);
    while (currentDate <= dateTo) {
      const dateKey = currentDate.toISOString().split("T")[0];
      dailyTrendsMap.set(dateKey, { date: dateKey, bookings: 0, revenue: 0 });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Fill in actual data
    dailyTrendsData.forEach((day) => {
      const dateKey = day.createdAt.toISOString().split("T")[0];
      if (dailyTrendsMap.has(dateKey)) {
        dailyTrendsMap.get(dateKey).bookings = day._count.id;
      }
    });

    // Get revenue data in a separate optimized query
    const revenueData = await prisma.payment.groupBy({
      by: ["createdAt"],
      where: {
        status: "SUCCESS",
        booking: { ...dateFilter, status: { not: "CANCELLED" } },
      },
      _sum: { amount: true },
    });

    revenueData.forEach((day) => {
      const dateKey = day.createdAt.toISOString().split("T")[0];
      if (dailyTrendsMap.has(dateKey)) {
        dailyTrendsMap.get(dateKey).revenue = day._sum.amount || 0;
      }
    });

    const dailyTrends = Array.from(dailyTrendsMap.values());

    // Get status distribution (reuse bookingStats)
    const statusDistribution = bookingStats.map((status) => ({
      status: status.status,
      count: status._count.id,
      percentage: Math.round((status._count.id / totalBookings) * 100),
    }));

    // Get payment method distribution
    const paymentMethodCounts = await prisma.booking.groupBy({
      by: ["paymentMethod"],
      where: dateFilter,
      _count: { id: true },
    });

    const paymentMethods = paymentMethodCounts.map((method) => ({
      method: method.paymentMethod,
      count: method._count.id,
      percentage: Math.round((method._count.id / totalBookings) * 100),
    }));

    // Get top users by bookings with optimized query
    const topUsers = await prisma.booking.groupBy({
      by: ["userId"],
      where: dateFilter,
      _count: { id: true },
      _sum: { quantity: true },
    });

    // Get user details and revenue in batch
    const userIds = topUsers.slice(0, 10).map((user) => user.userId);

    const [userDetails, userRevenues] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      }),
      prisma.payment.groupBy({
        by: ["bookingId"],
        where: {
          status: "SUCCESS",
          booking: { userId: { in: userIds }, ...dateFilter },
        },
        _sum: { amount: true },
      }),
    ]);

    // Create lookup maps
    const userDetailsMap = new Map(
      userDetails.map((user) => [user.id, user.name]),
    );
    const userRevenueMap = new Map();

    // Get booking-user mapping for revenue calculation
    const bookingUserMap = await prisma.booking.findMany({
      where: { userId: { in: userIds }, ...dateFilter },
      select: { id: true, userId: true },
    });

    bookingUserMap.forEach((booking) => {
      const revenue =
        userRevenues.find((r) => r.bookingId === booking.id)?._sum.amount || 0;
      userRevenueMap.set(
        booking.userId,
        (userRevenueMap.get(booking.userId) || 0) + revenue,
      );
    });

    const topUsersWithDetails = topUsers.slice(0, 10).map((user) => ({
      userId: user.userId,
      name: userDetailsMap.get(user.userId) || "Unknown",
      bookings: user._count.id,
      totalSpent: userRevenueMap.get(user.userId) || 0,
    }));

    // Get delivery performance
    const deliveryStats = await prisma.booking.findMany({
      where: { ...dateFilter, status: "DELIVERED", deliveredAt: { not: null } },
      select: { createdAt: true, deliveredAt: true, expectedDate: true },
    });

    let onTimeDeliveries = 0;
    let delayedDeliveries = 0;

    deliveryStats.forEach((booking) => {
      const delivered = new Date(booking.deliveredAt!);
      const expected = booking.expectedDate
        ? new Date(booking.expectedDate)
        : null;

      if (expected) {
        if (delivered <= expected) {
          onTimeDeliveries++;
        } else {
          delayedDeliveries++;
        }
      }
    });

    const analyticsData = {
      overview: {
        totalBookings,
        totalRevenue: totalRevenue._sum.amount || 0, // Amount is already in rupees
        totalUsers,
        averageDeliveryTime,
        pendingBookings,
        deliveredBookings,
        cancelledBookings,
      },
      trends: {
        daily: dailyTrends,
        weekly: [], // Could be implemented similarly
        monthly: [], // Could be implemented similarly
      },
      statusDistribution,
      paymentMethods,
      topUsers: topUsersWithDetails,
      deliveryPerformance: {
        averageDeliveryTime,
        onTimeDeliveries,
        delayedDeliveries,
        totalDeliveries: deliveryStats.length,
      },
    };

    return NextResponse.json({
      success: true,
      data: analyticsData,
    });
  } catch (error) {
    console.error("Failed to fetch analytics:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load analytics data" },
      { status: 500 },
    );
  }
}
