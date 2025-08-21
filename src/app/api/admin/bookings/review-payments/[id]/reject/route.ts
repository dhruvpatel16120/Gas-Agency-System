import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendPaymentIssueEmail } from "@/lib/email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Check admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized - Admin access required" },
        { status: 401 },
      );
    }

    // Await params for Next.js 15 compatibility
    const { id } = await params;
    const body = await request.json();
    const { reason, sendEmail = true } = body;

    // Validate required fields
    if (!reason || typeof reason !== "string" || reason.trim().length < 10) {
      return NextResponse.json(
        {
          success: false,
          message: "Rejection reason is required (minimum 10 characters)",
        },
        { status: 400 },
      );
    }

    // Find the payment to reject
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, message: "Payment not found" },
        { status: 404 },
      );
    }

    // Validate payment status
    if (payment.status !== "PENDING") {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot reject payment with status: ${payment.status}. Only PENDING payments can be rejected.`,
        },
        { status: 400 },
      );
    }

    // Validate payment method
    if (payment.method !== "UPI") {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot reject ${payment.method} payment. Only UPI payments can be rejected through this endpoint.`,
        },
        { status: 400 },
      );
    }

    // Update payment status to FAILED
    const updatedPayment = await prisma.payment.update({
      where: { id },
      data: {
        status: "FAILED",
      },
    });

    // Create booking event for payment rejection
    await prisma.bookingEvent.create({
      data: {
        bookingId: payment.bookingId,
        status: payment.booking.status, // Keep the current booking status
        title: "Payment Rejected",
        description: `UPI payment rejected by admin. Reason: ${reason.trim()}. Customer can retry payment.`,
        createdAt: new Date(),
      },
    });

    // Send rejection email if requested and user has email
    let emailSent = false;
    if (sendEmail && payment.booking.user?.email) {
      try {
        await sendPaymentIssueEmail(
          payment.booking.user.email,
          payment.booking.user.name || "Customer",
          payment.booking.id,
          reason.trim(),
          payment.upiTxnId || "",
        );
        emailSent = true;
      } catch (emailError) {
        console.error("Failed to send payment rejection email:", emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: "Payment rejected successfully",
      data: {
        paymentId: updatedPayment.id,
        status: updatedPayment.status,
        reason: reason.trim(),
        bookingStatus: payment.booking.status, // Return current booking status
        emailSent,
      },
    });
  } catch (error) {
    console.error("Failed to reject payment:", error);

    // Handle specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes("Record to update not found")) {
        return NextResponse.json(
          {
            success: false,
            message: "Payment not found or already processed",
          },
          { status: 404 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to reject payment. Please try again.",
      },
      { status: 500 },
    );
  }
}
