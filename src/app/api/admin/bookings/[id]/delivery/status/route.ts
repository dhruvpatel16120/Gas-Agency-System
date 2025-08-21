import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendDeliveryStatusEmail } from "@/lib/email";

export async function PUT(
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
    const { newStatus, notes } = body;

    if (
      !newStatus ||
      ![
        "ASSIGNED",
        "PICKED_UP",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "FAILED",
      ].includes(newStatus)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid status. Must be ASSIGNED, PICKED_UP, OUT_FOR_DELIVERY, DELIVERED, or FAILED",
        },
        { status: 400 },
      );
    }

    // Check if delivery assignment exists
    const deliveryAssignment = await prisma.deliveryAssignment.findUnique({
      where: { bookingId },
      include: { booking: true },
    });

    if (!deliveryAssignment) {
      return NextResponse.json(
        {
          success: false,
          message: "Delivery assignment not found",
        },
        { status: 404 },
      );
    }

    // Update delivery assignment status
    await prisma.deliveryAssignment.update({
      where: { bookingId },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
    });

    // Update booking status based on delivery status
    let newBookingStatus = deliveryAssignment.booking.status;

    if (newStatus === "PICKED_UP") {
      // When picked up, keep booking as APPROVED
      newBookingStatus = "APPROVED";
    } else if (newStatus === "OUT_FOR_DELIVERY") {
      // When out for delivery, change booking status to OUT_FOR_DELIVERY
      newBookingStatus = "OUT_FOR_DELIVERY";
    } else if (newStatus === "DELIVERED") {
      // When delivered, change booking status to DELIVERED
      newBookingStatus = "DELIVERED";
    } else if (newStatus === "FAILED") {
      // When failed, change booking status to CANCELLED
      newBookingStatus = "CANCELLED";
    }

    // Only update booking status if it's different
    if (newBookingStatus !== deliveryAssignment.booking.status) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: newBookingStatus,
          updatedAt: new Date(),
        },
      });

      // Create booking event for status change
      await prisma.bookingEvent.create({
        data: {
          bookingId,
          status: newBookingStatus,
          title: `Delivery ${newStatus.toLowerCase().replace("_", " ")}`,
          description: `Delivery status updated to ${newStatus}. Booking status changed to ${newBookingStatus}.`,
        },
      });
    } else {
      // Create booking event for delivery status update (no booking status change)
      await prisma.bookingEvent.create({
        data: {
          bookingId,
          status: deliveryAssignment.booking.status,
          title: `Delivery ${newStatus.toLowerCase().replace("_", " ")}`,
          description: `Delivery status updated to ${newStatus}.`,
        },
      });
    }

    // Send email notification to customer about delivery status update
    try {
      if (deliveryAssignment.booking.userEmail) {
        await sendDeliveryStatusEmail(
          deliveryAssignment.booking.userEmail,
          deliveryAssignment.booking.userName,
          bookingId,
          newStatus,
          notes ||
            `Your delivery status has been updated to ${newStatus.toLowerCase().replace("_", " ")}.`,
        );
      }
    } catch (emailError) {
      console.error("Failed to send delivery status email:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: "Delivery status updated successfully",
      data: {
        id: deliveryAssignment.id,
        status: newStatus,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Failed to update delivery status:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update delivery status" },
      { status: 500 },
    );
  }
}
