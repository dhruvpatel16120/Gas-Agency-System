import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - Fetch events for a specific booking
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id: bookingId } = await params;

    // Get events for the booking
    const events = await prisma.bookingEvent.findMany({
      where: { bookingId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error("Failed to fetch events:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch events" },
      { status: 500 },
    );
  }
}
