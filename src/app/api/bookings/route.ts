import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  withMiddleware,
  successResponse,
  parseRequestBody,
} from "@/lib/api-middleware";
import { bookingSchema, paginationSchema } from "@/lib/validation";
import { ConflictError, NotFoundError } from "@/lib/error-handler";
import { sendBookingRequestEmail } from "@/lib/email";
import { Prisma, BookingStatus, PaymentMethod } from "@prisma/client";

const listQuerySchema = z.object({
  page: paginationSchema.shape.page,
  limit: paginationSchema.shape.limit,
  status: z
    .string()
    .optional()
    .refine(
      (val) =>
        !val || ["PENDING", "APPROVED", "DELIVERED", "CANCELLED"].includes(val),
      "Invalid status",
    ),
  paymentMethod: z
    .string()
    .optional()
    .refine(
      (val) => !val || ["COD", "UPI"].includes(val),
      "Invalid payment method",
    ),
  admin: z.string().optional(),
});

async function createBookingHandler(
  request: NextRequest,
  context?: Record<string, unknown>,
) {
  const session = context?.session as { user: { id: string } } | undefined;
  if (!session?.user?.id) {
    throw new NotFoundError("User session not found");
  }

  const body = await parseRequestBody(request);
  const {
    paymentMethod,
    quantity,
    receiverName,
    receiverPhone,
    expectedDate,
    notes,
  } = bookingSchema.parse(body);

  // Load user with minimal fields
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      remainingQuota: true,
    },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  // Fixed pricing

  // Create booking within transaction and atomically decrement quota if available
  const booking = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Validate that user has enough quota for the requested quantity
    if (user.remainingQuota < quantity) {
      throw new ConflictError(
        `Insufficient quota. You have ${user.remainingQuota} cylinder(s) remaining, but requested ${quantity}.`,
      );
    }

    // Atomically decrement by the actual quantity
    const updated = await tx.user.updateMany({
      where: { id: user.id, remainingQuota: { gte: quantity } },
      data: { remainingQuota: { decrement: quantity } },
    });

    if (updated.count === 0) {
      throw new ConflictError("Insufficient quota to create a booking");
    }

    const created = await tx.booking.create({
      data: {
        userId: user.id,
        userName: user.name,
        paymentMethod: paymentMethod as PaymentMethod,
        status: "PENDING",
        notes: notes || undefined,
        ...(typeof quantity === "number" ? { quantity } : {}),
        ...(receiverName ? { receiverName } : {}),
        ...(receiverPhone ? { receiverPhone } : {}),
        ...(expectedDate ? { expectedDate: new Date(expectedDate) } : {}),
      },
    });

    // Seed initial tracking events
    await tx.bookingEvent.createMany({
      data: [
        {
          bookingId: created.id,
          status: "PENDING",
          title: "Started",
          description: "Booking process started.",
        },
        {
          bookingId: created.id,
          status: "PENDING",
          title: "Booking Requested",
          description:
            "Your booking request was submitted and is pending approval.",
        },
      ],
    });

    // Create payment record (PENDING) and compute amount
    const unitPrice = 1100; // Fixed price per cylinder
    const amountInRupees =
      unitPrice * (typeof quantity === "number" ? quantity : 1);
    await tx.payment.create({
      data: {
        bookingId: created.id,
        amount: amountInRupees,
        method: paymentMethod as PaymentMethod,
        status: "PENDING",
        createdAt: new Date(),
      },
    });

    return created;
  });

  // Send booking request received email (non-blocking)
  // No need to await; failures are logged in email util
  void sendBookingRequestEmail({
    toEmail: user.email,
    userName: user.name,
    booking: {
      id: booking.id,
      paymentMethod: String(paymentMethod),
      quantity,
      receiverName,
      receiverPhone,
      expectedDate: expectedDate ? new Date(expectedDate) : undefined,
      notes: notes || undefined,
      userEmail: user.email,
      userPhone: user.phone,
      userAddress: user.address,
    },
  });

  return successResponse(booking, "Booking created successfully", 201);
}

async function listBookingsHandler(
  request: NextRequest,
  context?: Record<string, unknown>,
) {
  const session = context?.session as
    | { user: { id: string; role?: "USER" | "ADMIN" } }
    | undefined;
  if (!session?.user?.id) {
    throw new NotFoundError("User session not found");
  }

  const url = new URL(request.url);
  const queryParams = Object.fromEntries(url.searchParams.entries());
  const { page, limit, status, paymentMethod, admin } =
    listQuerySchema.parse(queryParams);

  const whereClause: Record<string, unknown> = {};

  const isAdminQuery = admin === "1" || admin === "true";
  if (isAdminQuery) {
    if (session.user.role !== "ADMIN") {
      // Non-admin attempting admin view falls back to own bookings
      whereClause.userId = session.user.id;
    }
  } else {
    whereClause.userId = session.user.id;
  }

  if (status) {
    whereClause.status = status as BookingStatus;
  }
  if (paymentMethod) {
    whereClause.paymentMethod = paymentMethod as PaymentMethod;
  }

  const total = await prisma.booking.count({ where: whereClause });
  const bookingsRaw = await prisma.booking.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const bookings = bookingsRaw.map((b) => ({
    id: b.id,
    userId: b.userId,
    userName: b.userName,
    userEmail: b.userEmail,
    userPhone: b.userPhone,
    userAddress: b.userAddress,
    paymentMethod: b.paymentMethod,
    quantity: b.quantity,
    receiverName: b.receiverName,
    receiverPhone: b.receiverPhone,
    status: b.status,
    requestedAt: b.requestedAt,
    deliveryDate: b.deliveryDate,
    expectedDate: b.expectedDate,
    deliveredAt: b.deliveredAt,
    notes: b.notes,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
    paymentStatus:
      b.payments?.[0]?.status ||
      (b.status === "CANCELLED" ? "CANCELLED" : "PENDING"),
    paymentAmount: b.payments?.[0]?.amount || null,
  }));

  return successResponse(
    {
      data: bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    },
    "Bookings retrieved successfully",
  );
}

export const POST = withMiddleware(createBookingHandler, {
  requireAuth: true,
  rateLimit: { type: "general" },
  validateContentType: true,
});

export const GET = withMiddleware(listBookingsHandler, {
  requireAuth: true,
  validateContentType: false,
});
