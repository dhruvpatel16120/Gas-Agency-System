import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendPaymentConfirmedEmail, sendPaymentIssueEmail } from "@/lib/email";
import type { Prisma } from "@prisma/client";

// POST: Review a UPI payment for a booking (ADMIN only)
// Body: { action: 'CONFIRM' | 'REJECT', upiTxnId?: string, reason?: string, sendEmail?: boolean }
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
    const { action, upiTxnId, reason, sendEmail } = body as {
      action?: "CONFIRM" | "REJECT";
      upiTxnId?: string;
      reason?: string;
      sendEmail?: boolean;
    };

    if (!action || (action !== "CONFIRM" && action !== "REJECT")) {
      return NextResponse.json(
        { success: false, message: "Invalid action" },
        { status: 400 },
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found" },
        { status: 404 },
      );
    }

    const latestPayment = booking.payments[0];
    if (!latestPayment) {
      return NextResponse.json(
        { success: false, message: "No payment to review" },
        { status: 400 },
      );
    }
    if (latestPayment.method !== "UPI") {
      return NextResponse.json(
        { success: false, message: "Only UPI payments can be reviewed here" },
        { status: 400 },
      );
    }

    // Prepare updates
    const updateData: Prisma.PaymentUpdateInput = {};
    if (
      upiTxnId &&
      typeof upiTxnId === "string" &&
      upiTxnId.trim().length >= 6
    ) {
      updateData.upiTxnId = upiTxnId.trim();
    }

    if (action === "CONFIRM") {
      updateData.status = "SUCCESS";
    } else {
      // REJECT requires a reason
      if (!reason || !reason.trim()) {
        return NextResponse.json(
          { success: false, message: "Reason is required to reject a payment" },
          { status: 400 },
        );
      }
      updateData.status = "FAILED";
    }

    const updated = await prisma.payment.update({
      where: { id: latestPayment.id },
      data: updateData,
    });

    // Log event
    try {
      await prisma.bookingEvent.create({
        data: {
          bookingId,
          status: booking.status,
          title:
            action === "CONFIRM"
              ? "UPI payment confirmed"
              : "UPI payment issue",
          description:
            action === "CONFIRM"
              ? `Payment marked SUCCESS. Ref: ${updateData.upiTxnId || latestPayment.upiTxnId || "-"}`
              : `Payment marked FAILED. Reason: ${reason}. Ref: ${updateData.upiTxnId || latestPayment.upiTxnId || "-"}`,
        },
      });
    } catch {
      console.error("Failed to log event");
    }

    // Optionally send emails
    if (sendEmail && booking.user?.email) {
      if (action === "CONFIRM") {
        await sendPaymentConfirmedEmail(
          booking.user.email,
          booking.user.name || "Customer",
          booking.id,
          updated.amount, // Amount is already in rupees
          updated.upiTxnId || "",
        );
      } else {
        await sendPaymentIssueEmail(
          booking.user.email,
          booking.user.name || "Customer",
          booking.id,
          reason || "Payment could not be verified",
          updated.upiTxnId || "",
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Payment reviewed",
      data: updated,
    });
  } catch (error) {
    console.error("Failed to review payment:", error);
    return NextResponse.json(
      { success: false, message: "Failed to review payment" },
      { status: 500 },
    );
  }
}
