import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - Export analytics data in various formats
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
    const format = searchParams.get("format") || "csv";
    const range = searchParams.get("range") || "30d";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Calculate date range (same logic as analytics endpoint)
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

    const dateFilter = {
      createdAt: {
        gte: dateFrom,
        lte: dateTo,
      },
    };

    // Get booking data for export
    const bookings = await prisma.booking.findMany({
      where: dateFilter,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        payments: {
          select: {
            amount: true,
            status: true,
            method: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (format === "csv") {
      // Generate CSV
      const csvHeaders = [
        "Booking ID",
        "User Name",
        "User Email",
        "User Phone",
        "Status",
        "Payment Method",
        "Payment Status",
        "Amount (₹)",
        "Quantity",
        "Created Date",
        "Expected Date",
        "Delivery Date",
      ];

      const csvRows = bookings.map((booking) => [
        booking.id,
        booking.userName,
        booking.user.email,
        booking.user.phone,
        booking.status,
        booking.paymentMethod,
        booking.payments[0]?.status || "N/A",
        booking.payments[0]?.amount || 0, // Amount is already in rupees
        booking.quantity,
        new Date(booking.createdAt).toLocaleDateString(),
        booking.expectedDate
          ? new Date(booking.expectedDate).toLocaleDateString()
          : "N/A",
        booking.deliveredAt
          ? new Date(booking.deliveredAt).toLocaleDateString()
          : "N/A",
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map((row) => row.map((field) => `"${field}"`).join(","))
        .join("\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="bookings-analytics-${range}.csv"`,
        },
      });
    }

    // For other formats, return JSON for now
    return NextResponse.json({
      success: true,
      data: bookings,
      message: `Export in ${format} format not yet implemented. Use CSV format.`,
    });
  } catch (error) {
    console.error("Failed to export analytics:", error);
    return NextResponse.json(
      { success: false, message: "Failed to export data" },
      { status: 500 },
    );
  }
}
