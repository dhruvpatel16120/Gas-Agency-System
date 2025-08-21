import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - Fetch delivery assignment for a specific booking
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

    // Get delivery assignment for the booking
    const deliveryAssignment = await prisma.deliveryAssignment.findFirst({
      where: { bookingId },
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
      },
      orderBy: { assignedAt: "desc" },
    });

    if (!deliveryAssignment) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    // Transform data for frontend
    const transformedData = {
      id: deliveryAssignment.id,
      partnerId: deliveryAssignment.partnerId,
      partnerName: deliveryAssignment.partner.name,
      partnerPhone: deliveryAssignment.partner.phone,
      partnerEmail: deliveryAssignment.partner.email,
      status: deliveryAssignment.status,
      assignedAt: deliveryAssignment.assignedAt,
      notes: deliveryAssignment.notes,
    };

    return NextResponse.json({
      success: true,
      data: transformedData,
    });
  } catch (error) {
    console.error("Failed to fetch delivery assignment:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch delivery assignment" },
      { status: 500 },
    );
  }
}
