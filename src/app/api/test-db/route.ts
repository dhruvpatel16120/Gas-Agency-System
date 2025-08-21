import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    // Test basic database connection
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log("Database connection test result:", result);

    // Test if tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('bookings', 'payments', 'booking_events', 'delivery_assignments')
      ORDER BY table_name
    `;
    console.log("Available tables:", tables);

    // Test basic booking count
    const bookingCount = await prisma.booking.count();
    console.log("Total bookings:", bookingCount);

    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      data: {
        connection: "OK",
        tables: tables,
        bookingCount,
      },
    });
  } catch (error) {
    console.error("Database test failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Database connection failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
