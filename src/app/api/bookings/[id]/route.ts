import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  withMiddleware,
  successResponse,
  parseRequestBody,
} from "@/lib/api-middleware";
import { NotFoundError, ConflictError } from "@/lib/error-handler";
import {
  sendBookingApprovalEmail,
  sendBookingCancelledByAdminEmail,
  sendBookingCancelledByUserEmail,
} from "@/lib/email";
import { sanitizeInput } from "@/lib/security";

// Validation schemas
const bookingUpdateSchema = z.object({
  quantity: z.number().min(1).max(10).optional(),
  paymentMethod: z.enum(["UPI", "COD"]).optional(),
  receiverName: z.string().min(2).max(100).optional(),
  receiverPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/)
    .optional(),
  expectedDate: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
  userAddress: z.string().min(5).max(500).optional(),
  status: z
    .enum(["PENDING", "APPROVED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"])
    .optional(),
  cancellationReason: z.string().max(200).optional(),
});

const userCancellationSchema = z.object({
  status: z.literal("CANCELLED"),
  cancellationReason: z.string().max(200).optional(),
});

// GET - Fetch individual booking
async function getBookingHandler(
  request: NextRequest,
  context?: Record<string, unknown>,
) {
  const session = context?.session as
    | { user: { id: string; role?: string } }
    | undefined;
  if (!session?.user?.id) {
    throw new NotFoundError("User session not found");
  }

  const url = new URL(request.url);
  const bookingId = url.pathname.split("/").pop();

  if (!bookingId) {
    throw new NotFoundError("Booking ID is required");
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
      },
      assignment: {
        include: {
          partner: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
      },
      events: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!booking) {
    throw new NotFoundError("Booking not found");
  }

  // Check if user can access this booking
  if (session.user.role !== "ADMIN" && booking.userId !== session.user.id) {
    throw new NotFoundError("Access denied");
  }

  // Transform data for frontend
  const transformedBooking = {
    id: booking.id,
    userId: booking.userId,
    userName: booking.user.name,
    userEmail: booking.user.email,
    userPhone: booking.user.phone,
    userAddress: booking.user.address,
    paymentMethod: booking.paymentMethod,
    quantity: booking.quantity,
    receiverName: booking.receiverName,
    receiverPhone: booking.receiverPhone,
    status: booking.status,
    requestedAt: booking.requestedAt,
    expectedDate: booking.expectedDate,
    deliveryDate: booking.deliveryDate,
    deliveredAt: booking.deliveredAt,
    notes: booking.notes,
    paymentStatus:
      booking.payments[0]?.status ||
      (booking.status === "CANCELLED" ? "CANCELLED" : "PENDING"),
    paymentAmount: booking.payments[0]?.amount,
    deliveryPartnerId: booking.assignment?.partnerId,
    deliveryPartnerName: booking.assignment?.partner?.name,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };

  return successResponse(transformedBooking);
}

// PATCH - Update booking
async function updateBookingHandler(
  request: NextRequest,
  context?: Record<string, unknown>,
) {
  const session = context?.session as
    | { user: { id: string; role?: string } }
    | undefined;
  if (!session?.user?.id) {
    throw new NotFoundError("User session not found");
  }

  const url = new URL(request.url);
  const bookingId = url.pathname.split("/").pop();

  if (!bookingId) {
    throw new NotFoundError("Booking ID is required");
  }

  const body = await parseRequestBody<{
    status?: string;
    cancellationReason?: string;
    quantity?: number;
    paymentMethod?: string;
    receiverName?: string;
    receiverPhone?: string;
    expectedDate?: string;
    notes?: string;
    userAddress?: string;
  }>(request);

  // Get current booking first
  const currentBooking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { quantity: true, userId: true, status: true, notes: true },
  });

  if (!currentBooking) {
    throw new NotFoundError("Booking not found");
  }

  // If the caller is a non-admin user, only allow self-cancellation
  if (session.user.role !== "ADMIN") {
    const isOwner = currentBooking.userId === session.user.id;
    const wantsCancel = body.status === "CANCELLED";
    const canCancelCurrent = ["PENDING", "APPROVED"].includes(
      currentBooking.status as string,
    );

    if (!isOwner || !wantsCancel || !canCancelCurrent) {
      throw new NotFoundError("Forbidden");
    }

    // Validate user cancellation input
    const validatedData = userCancellationSchema.parse(body);

    // Perform cancellation within transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update booking status
      const cancelled = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: "CANCELLED",
          updatedAt: new Date(),
          notes: validatedData.cancellationReason
            ? `${currentBooking.notes ? currentBooking.notes + "\n" : ""}Cancellation reason: ${sanitizeInput(validatedData.cancellationReason)}`
            : currentBooking.notes,
        },
      });

      // Restore user quota
      await tx.user.update({
        where: { id: currentBooking.userId },
        data: { remainingQuota: { increment: currentBooking.quantity } },
      });

      // Create booking event
      await tx.bookingEvent.create({
        data: {
          bookingId,
          status: "CANCELLED",
          title: "Booking cancelled by user",
          description: validatedData.cancellationReason
            ? `Reason: ${sanitizeInput(validatedData.cancellationReason)}`
            : undefined,
        },
      });

      // Mark related payments as CANCELLED (except successful ones)
      await tx.payment.updateMany({
        where: { bookingId, status: { not: "SUCCESS" } },
        data: { status: "CANCELLED" },
      });

      return cancelled;
    });

    // Send cancellation email (non-blocking)
    try {
      const user = await prisma.user.findUnique({
        where: { id: currentBooking.userId },
        select: { name: true, email: true },
      });
      if (user?.email) {
        const payment = await prisma.payment.findFirst({
          where: { bookingId },
          select: { method: true, status: true },
        });
        await sendBookingCancelledByUserEmail(
          user.email,
          user.name,
          bookingId,
          payment?.method,
          payment?.status,
          validatedData.cancellationReason,
        );
      }
    } catch (e) {
      console.error("Failed to send user cancellation email:", e);
    }

    return successResponse(result, "Booking cancelled successfully");
  }

  // Admin flow - validate input
  const validatedData = bookingUpdateSchema.parse(body);

  // Handle quantity changes with proper validation
  if (
    typeof validatedData.quantity === "number" &&
    validatedData.quantity !== currentBooking.quantity
  ) {
    const quantityDiff = validatedData.quantity - currentBooking.quantity;

    // Check if user has enough quota for increase
    if (quantityDiff > 0) {
      const user = await prisma.user.findUnique({
        where: { id: currentBooking.userId },
        select: { remainingQuota: true },
      });

      if (!user || user.remainingQuota < quantityDiff) {
        throw new ConflictError("User quota exceeded");
      }
    }
  }

  // Prepare update payload with sanitization
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (validatedData.quantity !== undefined)
    updateData.quantity = validatedData.quantity;
  if (validatedData.paymentMethod !== undefined)
    updateData.paymentMethod = validatedData.paymentMethod;
  if (validatedData.receiverName !== undefined)
    updateData.receiverName = sanitizeInput(validatedData.receiverName);
  if (validatedData.receiverPhone !== undefined)
    updateData.receiverPhone = validatedData.receiverPhone;
  if (validatedData.expectedDate !== undefined)
    updateData.expectedDate = new Date(validatedData.expectedDate);
  if (validatedData.userAddress !== undefined)
    updateData.userAddress = sanitizeInput(validatedData.userAddress);
  if (validatedData.status !== undefined)
    updateData.status = validatedData.status;

  // Handle notes with proper sanitization
  if (validatedData.notes !== undefined) {
    updateData.notes = sanitizeInput(validatedData.notes);
  } else if (
    validatedData.status === "CANCELLED" &&
    validatedData.cancellationReason
  ) {
    const prefix = currentBooking.notes
      ? currentBooking.notes.trim() + "\n"
      : "";
    updateData.notes = `${prefix}Cancellation reason: ${sanitizeInput(validatedData.cancellationReason)}`;
  }

  // Update booking within transaction
  const result = await prisma.$transaction(async (tx) => {
    // Handle quantity changes
    if (
      typeof validatedData.quantity === "number" &&
      validatedData.quantity !== currentBooking.quantity
    ) {
      const quantityDiff = validatedData.quantity - currentBooking.quantity;

      if (quantityDiff > 0) {
        // Decrease user quota
        await tx.user.update({
          where: { id: currentBooking.userId },
          data: { remainingQuota: { decrement: quantityDiff } },
        });
      } else if (quantityDiff < 0) {
        // Increase user quota
        await tx.user.update({
          where: { id: currentBooking.userId },
          data: { remainingQuota: { increment: Math.abs(quantityDiff) } },
        });
      }
    }

    // Update booking
    const updatedBooking = await tx.booking.update({
      where: { id: bookingId },
      data: updateData,
    });

    // Create booking event for status change
    if (
      validatedData.status &&
      validatedData.status !== currentBooking.status
    ) {
      await tx.bookingEvent.create({
        data: {
          bookingId,
          status: validatedData.status,
          title: `Status updated to ${validatedData.status.toLowerCase()}`,
          description: `Booking status changed from ${currentBooking.status} to ${validatedData.status}`,
        },
      });

      // Handle cancellation
      if (validatedData.status === "CANCELLED") {
        // Restore user quota
        await tx.user.update({
          where: { id: currentBooking.userId },
          data: { remainingQuota: { increment: currentBooking.quantity } },
        });

        // Mark related payments as CANCELLED (except successful ones)
        await tx.payment.updateMany({
          where: { bookingId, status: { not: "SUCCESS" } },
          data: { status: "CANCELLED" },
        });
      }

      // Handle approval
      if (validatedData.status === "APPROVED") {
        // Mark pending UPI payments as SUCCESS
        await tx.payment.updateMany({
          where: { bookingId, method: "UPI", status: "PENDING" },
          data: { status: "SUCCESS" },
        });
      }
    }

    // Update payment amount if quantity changed
    if (
      typeof validatedData.quantity === "number" &&
      validatedData.quantity !== currentBooking.quantity
    ) {
      await tx.payment.updateMany({
        where: { bookingId },
        data: { amount: validatedData.quantity * 1100 },
      });
    }

    return updatedBooking;
  });

  // Send emails (non-blocking)
  if (validatedData.status && validatedData.status !== currentBooking.status) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: currentBooking.userId },
        select: { name: true, email: true },
      });

      if (user?.email) {
        if (validatedData.status === "CANCELLED") {
          const payment = await prisma.payment.findFirst({
            where: { bookingId },
            select: { method: true, status: true },
          });
          await sendBookingCancelledByAdminEmail(
            user.email,
            user.name,
            bookingId,
            validatedData.cancellationReason,
            payment?.method,
            payment?.status,
          );
        } else if (validatedData.status === "APPROVED") {
          const deliveryDateStr = result.expectedDate
            ? new Date(result.expectedDate).toLocaleDateString()
            : "To be scheduled";
          await sendBookingApprovalEmail(
            user.email,
            user.name,
            bookingId,
            deliveryDateStr,
          );
        }
      }
    } catch (e) {
      console.error("Failed to send booking status email:", e);
    }
  }

  return successResponse(result, "Booking updated successfully");
}

export const GET = withMiddleware(getBookingHandler, {
  requireAuth: true,
  validateContentType: false,
});

export const PATCH = withMiddleware(updateBookingHandler, {
  requireAuth: true,
  requireCSRF: true,
  rateLimit: { type: "general" },
  validateContentType: true,
});
