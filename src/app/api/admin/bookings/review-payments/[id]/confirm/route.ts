import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendPaymentConfirmedEmail } from "@/lib/email";

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
    const { upiTxnId, sendEmail = true } = body;

    // Validate required fields
    if (
      !upiTxnId ||
      typeof upiTxnId !== "string" ||
      upiTxnId.trim().length < 6
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Valid UPI transaction ID is required (minimum 6 characters)",
        },
        { status: 400 },
      );
    }

    // Find the payment to confirm
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

    // Validate payment method
    if (payment.method !== "UPI") {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot confirm ${payment.method} payment. Only UPI payments can be confirmed through this endpoint.`,
        },
        { status: 400 },
      );
    }

    // Update payment status and transaction ID
    const updatedPayment = await prisma.payment.update({
      where: { id },
      data: {
        status: "SUCCESS",
        upiTxnId: upiTxnId.trim(),
      },
    });

    // Create booking event for payment confirmation
    await prisma.bookingEvent.create({
      data: {
        bookingId: payment.bookingId,
        status: payment.booking.status, // Keep the current booking status
        title: "Payment Confirmed",
        description: `UPI payment confirmed by admin. Transaction ID: ${upiTxnId.trim()}`,
        createdAt: new Date(),
      },
    });

    // Send confirmation email if requested and user has email
    let emailSent = false;
    if (sendEmail && payment.booking.user?.email) {
      try {
        await sendPaymentConfirmedEmail(
          payment.booking.user.email,
          payment.booking.user.name || "Customer",
          payment.booking.id,
          updatedPayment.amount, // Amount is already in rupees
          updatedPayment.upiTxnId || "",
        );
        emailSent = true;
      } catch (emailError) {
        console.error("Failed to send payment confirmation email:", emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: "Payment confirmed successfully",
      data: {
        paymentId: updatedPayment.id,
        status: updatedPayment.status,
        upiTxnId: updatedPayment.upiTxnId,
        bookingStatus: payment.booking.status, // Return current booking status
        emailSent,
      },
    });
  } catch (error) {
    console.error("Failed to confirm payment:", error);

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

      if (error.message.includes("Unique constraint")) {
        return NextResponse.json(
          {
            success: false,
            message: "Transaction ID already exists for another payment",
          },
          { status: 409 },
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to confirm payment. Please try again.",
      },
      { status: 500 },
    );
  }
}
