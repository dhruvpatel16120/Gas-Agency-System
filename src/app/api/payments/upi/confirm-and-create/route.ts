import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendBookingRequestEmail } from "@/lib/email";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

// POST: confirm UPI payment and then create booking + payment atomically
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const {
      quantity,
      receiverName,
      receiverPhone,
      expectedDate,
      notes,
      upiTxnId,
    } = body as {
      quantity?: number;
      receiverName?: string;
      receiverPhone?: string;
      expectedDate?: string;
      notes?: string;
      upiTxnId?: string;
    };

    if (
      !upiTxnId ||
      typeof upiTxnId !== "string" ||
      upiTxnId.trim().length < 6
    ) {
      return NextResponse.json(
        { success: false, message: "Valid upiTxnId is required" },
        { status: 400 },
      );
    }

    // Fixed pricing
    const unitPrice = 1100; // Fixed price per cylinder
    const qty = typeof quantity === "number" && quantity > 0 ? quantity : 1;
    const amountInRupees = unitPrice * qty;

    // Create booking and payment in transaction, with quota handling
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Check and decrement quota
      const updated = await tx.user.updateMany({
        where: { id: session.user.id, remainingQuota: { gte: qty } },
        data: { remainingQuota: { decrement: qty } },
      });
      if (updated.count === 0) {
        throw new Error("Insufficient quota to create a booking");
      }

      const user = await tx.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
        },
      });
      if (!user) throw new Error("User not found");

      const booking = await tx.booking.create({
        data: {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          userPhone: user.phone,
          userAddress: user.address,
          quantity: qty,
          paymentMethod: "UPI",
          status: "PENDING",
          receiverName: receiverName || undefined,
          receiverPhone: receiverPhone || undefined,
          expectedDate: expectedDate ? new Date(expectedDate) : undefined,
          notes: notes || undefined,
        },
      });

      // Events
      await tx.bookingEvent.createMany({
        data: [
          {
            bookingId: booking.id,
            status: "PENDING",
            title: "Started",
            description: "Booking process started.",
          },
          {
            bookingId: booking.id,
            status: "PENDING",
            title: "Booking Requested",
            description:
              "Your booking request was submitted and is pending approval.",
          },
        ],
      });

      // Create payment as PENDING with provided reference/UPI id (verification/approval later)
      const payment = await tx.payment.create({
        data: {
          bookingId: booking.id,
          amount: amountInRupees,
          method: "UPI",
          status: "PENDING",
          upiTxnId: upiTxnId.trim(),
        },
      });

      return { booking, payment };
    });

    // Send booking request creation email to the user (non-blocking)
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true, phone: true, address: true },
      });
      if (user?.email) {
        void sendBookingRequestEmail({
          toEmail: user.email,
          userName: user.name || "Customer",
          booking: {
            id: result.booking.id,
            paymentMethod: "UPI",
            quantity: qty,
            receiverName: receiverName || "",
            receiverPhone: receiverPhone || "",
            expectedDate: expectedDate ? new Date(expectedDate) : undefined,
            notes: notes || undefined,
            userEmail: user.email,
            userPhone: user.phone || undefined,
            userAddress: user.address || undefined,
          },
        });
      }
    } catch (e) {
      console.error("Failed to send booking request email:", e);
    }

    return NextResponse.json({
      success: true,
      data: { bookingId: result.booking.id },
    });
  } catch (error) {
    console.error("confirm-and-create failed:", error);
    const message =
      error instanceof Error ? error.message : "Failed to process payment/booking";
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
