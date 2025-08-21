import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendDeliveryAssignedEmail } from "@/lib/email";

export async function POST(
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
    const body = await request.json();
    const { partnerId, scheduledDate, scheduledTime, notes, priority } = body;

    // Validate required fields
    if (!partnerId || !scheduledDate) {
      return NextResponse.json(
        {
          success: false,
          message: "Partner ID and scheduled date are required",
        },
        { status: 400 },
      );
    }

    // Check if booking exists and is in valid status
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { assignment: true },
    });

    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking not found",
        },
        { status: 404 },
      );
    }

    if (booking.status !== "APPROVED") {
      return NextResponse.json(
        {
          success: false,
          message: "Can only assign delivery to approved bookings",
        },
        { status: 400 },
      );
    }

    if (booking.assignment) {
      return NextResponse.json(
        {
          success: false,
          message: "Delivery already assigned to this booking",
        },
        { status: 400 },
      );
    }

    // Check if delivery partner exists and is active
    const partner = await prisma.deliveryPartner.findUnique({
      where: { id: partnerId },
    });

    if (!partner) {
      return NextResponse.json(
        {
          success: false,
          message: "Delivery partner not found",
        },
        { status: 404 },
      );
    }

    if (!partner.isActive) {
      return NextResponse.json(
        {
          success: false,
          message: "Delivery partner is not active",
        },
        { status: 400 },
      );
    }

    // Create delivery assignment
    const deliveryAssignment = await prisma.deliveryAssignment.create({
      data: {
        bookingId,
        partnerId,
        status: "ASSIGNED",
        priority: priority || "normal",
        scheduledDate: new Date(scheduledDate),
        scheduledTime: scheduledTime,
        notes: notes || "",
        assignedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Keep booking status as APPROVED - don't change to OUT_FOR_DELIVERY automatically
    // Admin will manually change status when delivery partner confirms pickup
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        // status: 'OUT_FOR_DELIVERY', // REMOVED - keep as APPROVED
        deliveryDate: new Date(scheduledDate + "T" + scheduledTime),
        updatedAt: new Date(),
      },
    });

    // Create booking event for delivery assignment (not status change)
    await prisma.bookingEvent.create({
      data: {
        bookingId,
        status: "APPROVED", // Keep as APPROVED
        title: "Delivery Assigned",
        description: `Delivery assigned to ${partner.name} for ${new Date(scheduledDate).toLocaleDateString()} at ${scheduledTime}. Status remains APPROVED until pickup confirmed.`,
      },
    });

    // Send email notification to user
    try {
      await sendDeliveryAssignedEmail(
        booking.userEmail || "",
        booking.userName || "Customer",
        bookingId,
        { name: partner.name, phone: partner.phone },
        new Date(scheduledDate).toLocaleDateString(),
        scheduledTime,
      );
    } catch (emailError) {
      console.error("Failed to send delivery assignment email:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: "Delivery partner assigned successfully",
      data: {
        id: deliveryAssignment.id,
        partnerId: deliveryAssignment.partnerId,
        status: deliveryAssignment.status,
        assignedAt: deliveryAssignment.assignedAt,
      },
    });
  } catch (error) {
    console.error("Failed to assign delivery partner:", error);
    return NextResponse.json(
      { success: false, message: "Failed to assign delivery partner" },
      { status: 500 },
    );
  }
}
