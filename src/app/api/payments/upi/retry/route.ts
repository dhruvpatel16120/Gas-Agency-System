import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  withMiddleware,
  successResponse,
  parseRequestBody,
} from "@/lib/api-middleware";
import { NotFoundError, ConflictError } from "@/lib/error-handler";
import { sanitizeInput } from "@/lib/security";

// Validation schema for payment retry
const paymentRetrySchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  upiTxnId: z
    .string()
    .min(6, "UPI transaction ID must be at least 6 characters")
    .max(50, "UPI transaction ID is too long")
    .regex(/^[A-Za-z0-9_-]+$/, "UPI transaction ID contains invalid characters")
    .transform((val) => sanitizeInput(val.trim())),
});

async function retryPaymentHandler(
  request: NextRequest,
  context?: Record<string, unknown>,
) {
  const session = context?.session as { user: { id: string } } | undefined;
  if (!session?.user?.id) {
    throw new NotFoundError("User session not found");
  }

  const body = await parseRequestBody(request);
  const { bookingId, upiTxnId } = paymentRetrySchema.parse(body);

  // Verify the booking belongs to the user and has a failed UPI payment
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      userId: session.user.id,
      paymentMethod: "UPI",
      status: { not: "CANCELLED" },
    },
    include: {
      payments: {
        where: { method: "UPI" },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!booking) {
    throw new NotFoundError("Booking not found or not eligible for retry");
  }

  const latestPayment = booking.payments[0];
  if (!latestPayment || latestPayment.status !== "FAILED") {
    throw new ConflictError("No failed UPI payment found for this booking");
  }

  // Check if this UPI transaction ID has already been used
  const existingPayment = await prisma.payment.findFirst({
    where: {
      upiTxnId: upiTxnId,
      status: { in: ["PENDING", "SUCCESS"] },
    },
  });

  if (existingPayment) {
    throw new ConflictError("This UPI transaction ID has already been used");
  }

  // Create a new payment record for the retry within transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create new payment record
    const newPayment = await tx.payment.create({
      data: {
        bookingId: booking.id,
        amount: latestPayment.amount,
        method: "UPI",
        status: "PENDING",
        upiTxnId: upiTxnId,
      },
    });

    // Update the old failed payment to show it was retried
    await tx.payment.update({
      where: { id: latestPayment.id },
      data: {
        upiTxnId: `${latestPayment.upiTxnId} (RETRIED - ${new Date().toISOString()})`,
      },
    });

    // Create a booking event for the payment retry
    await tx.bookingEvent.create({
      data: {
        bookingId: booking.id,
        status: "PENDING",
        title: "Payment Retry",
        description: `User retried UPI payment with transaction ID: ${upiTxnId}`,
      },
    });

    return newPayment;
  });

  return successResponse(
    {
      paymentId: result.id,
      status: result.status,
      message:
        "Your payment is now pending review. You will be notified once it is confirmed.",
    },
    "Payment retry initiated successfully",
  );
}

export const POST = withMiddleware(retryPaymentHandler, {
  requireAuth: true,
  rateLimit: { type: "general", maxRequests: 5 }, // Limit retry attempts
  validateContentType: true,
});
