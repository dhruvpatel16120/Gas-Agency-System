import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(_request: NextRequest) {
  try {
    void _request;
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    // Get current date and calculate date ranges
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch all dashboard data in parallel
    const [
      totalUsers,
      totalBookings,
      totalCylinders,
      pendingBookings,
      activeDeliveries,
      newContacts,
      monthlyRevenue,
      lastMonthRevenue,
      monthlyBookingQuantity,
      recentBookings,
      recentUsers,
      recentDeliveries,
      recentContacts,
      deliveryStats,
      paymentStats,
      inventoryStats,
    ] = await Promise.all([
      // User stats
      prisma.user.count(),

      // Booking stats
      prisma.booking.count(),

      // Inventory stats
      prisma.cylinderStock.findUnique({
        where: { id: "default" },
        select: { totalAvailable: true },
      }),

      // Pending bookings
      prisma.booking.count({
        where: { status: "PENDING" },
      }),

      // Active deliveries
      prisma.deliveryAssignment.count({
        where: {
          status: {
            notIn: ["DELIVERED", "FAILED"],
          },
        },
      }),

      // New contacts (last 7 days)
      prisma.contactMessage.count({
        where: {
          createdAt: {
            gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          },
          status: "NEW",
        },
      }),

      // Monthly revenue (this month) - collected payments
      prisma.payment.aggregate({
        where: {
          status: "SUCCESS",
          createdAt: {
            gte: thisMonth,
          },
        },
        _sum: { amount: true },
      }),

      // Last month revenue
      prisma.payment.aggregate({
        where: {
          status: "SUCCESS",
          createdAt: {
            gte: lastMonth,
            lt: thisMonth,
          },
        },
        _sum: { amount: true },
      }),

      // Monthly booking value (this month) - total value of all bookings
      prisma.booking.aggregate({
        where: {
          createdAt: {
            gte: thisMonth,
          },
        },
        _sum: { quantity: true },
      }),

      // Recent bookings (last 10)
      prisma.booking.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      }),

      // Recent users (last 10)
      prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          role: true,
        },
      }),

      // Recent deliveries (last 10)
      prisma.deliveryAssignment.findMany({
        take: 10,
        orderBy: { assignedAt: "desc" },
        include: {
          booking: {
            select: { userName: true, userPhone: true },
          },
          partner: {
            select: { name: true, phone: true },
          },
        },
      }),

      // Recent contacts (last 10)
      prisma.contactMessage.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      }),

      // Delivery performance stats
      prisma.deliveryAssignment.groupBy({
        by: ["status"],
        _count: { id: true },
      }),

      // Payment method distribution
      prisma.booking.groupBy({
        by: ["paymentMethod"],
        _count: { id: true },
      }),

      // Inventory adjustments (last 30 days)
      prisma.stockAdjustment.findMany({
        where: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          booking: {
            select: { userName: true },
          },
          batch: {
            select: { supplier: true },
          },
        },
      }),
    ]);

    // Calculate revenue change percentage
    const currentRevenue = monthlyRevenue._sum.amount || 0;
    const previousRevenue = lastMonthRevenue._sum.amount || 0;
    const revenueChange =
      previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
        : 0;

    // Calculate booking value (assuming ₹1,100 per cylinder)
    const bookingQuantity = monthlyBookingQuantity._sum.quantity || 0;
    const monthlyBookingValue = bookingQuantity * 1100;

    // Calculate delivery performance
    const totalDeliveries = deliveryStats.reduce(
      (sum, stat) => sum + stat._count.id,
      0,
    );
    const completedDeliveries =
      deliveryStats.find((stat) => stat.status === "DELIVERED")?._count.id || 0;
    const deliverySuccessRate =
      totalDeliveries > 0 ? (completedDeliveries / totalDeliveries) * 100 : 0;

    // Format recent activity
    const recentActivity = [
      ...recentBookings.map((booking) => ({
        id: booking.id,
        type: "booking" as const,
        title: "New Gas Cylinder Order",
        description: `User ${booking.user.name} placed an order for ${booking.quantity} cylinder(s)`,
        timestamp: booking.createdAt,
        status:
          booking.status === "PENDING"
            ? "warning"
            : booking.status === "DELIVERED"
              ? "success"
              : "info",
      })),
      ...recentUsers.map((user) => ({
        id: user.id,
        type: "user" as const,
        title: "New User Registration",
        description: `${user.name} created a new account`,
        timestamp: user.createdAt,
        status: "info" as const,
      })),
      ...recentDeliveries.map((delivery) => ({
        id: delivery.id,
        type: "delivery" as const,
        title: "Delivery Assignment",
        description: `Order assigned to ${delivery.partner.name}`,
        timestamp: delivery.assignedAt,
        status:
          delivery.status === "DELIVERED"
            ? "success"
            : delivery.status === "FAILED"
              ? "warning"
              : "info",
      })),
      ...recentContacts.map((contact) => ({
        id: contact.id,
        type: "contact" as const,
        title: "New Support Ticket",
        description: `${contact.user.name}: ${contact.subject}`,
        timestamp: contact.createdAt,
        status: contact.status === "NEW" ? "warning" : "info",
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, 10);

    // Format active deliveries for dashboard
    const activeDeliveriesList = recentDeliveries
      .filter(
        (delivery) =>
          delivery.status !== "DELIVERED" && delivery.status !== "FAILED",
      )
      .slice(0, 5)
      .map((delivery) => ({
        id: delivery.id,
        bookingId: delivery.bookingId,
        status: delivery.status,
        customer: delivery.booking.userName,
        partner: delivery.partner.name,
        estimated: "2-4 hours", // This could be calculated based on assignment time
      }));

    const dashboardData = {
      stats: {
        totalUsers,
        totalBookings,
        totalCylinders: totalCylinders?.totalAvailable || 0,
        pendingBookings,
        activeDeliveries,
        newContacts,
        monthlyRevenue: currentRevenue,
        revenueChange: Math.round(revenueChange * 100) / 100,
        deliverySuccessRate: Math.round(deliverySuccessRate * 100) / 100,
        monthlyBookingValue,
        monthlyCollected: currentRevenue,
      },
      recentActivity,
      activeDeliveries: activeDeliveriesList,
      paymentMethods: paymentStats.map((stat) => ({
        method: stat.paymentMethod,
        count: stat._count.id,
      })),
      deliveryStats: deliveryStats.map((stat) => ({
        status: stat.status,
        count: stat._count.id,
      })),
      inventoryActivity: inventoryStats.map((adjustment) => ({
        id: adjustment.id,
        delta: adjustment.delta,
        type: adjustment.type,
        reason: adjustment.reason,
        createdAt: adjustment.createdAt,
        booking: adjustment.booking?.userName,
        supplier: adjustment.batch?.supplier,
      })),
    };

    return NextResponse.json({
      success: true,
      data: dashboardData,
    });
  } catch (error) {
    console.error("Failed to fetch dashboard data:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load dashboard data" },
      { status: 500 },
    );
  }
}
