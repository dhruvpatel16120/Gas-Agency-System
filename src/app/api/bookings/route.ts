import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withMiddleware, successResponse, parseRequestBody } from '@/lib/api-middleware';
import { bookingSchema, paginationSchema } from '@/lib/validation';
import { ConflictError, NotFoundError } from '@/lib/error-handler';
import { sendBookingRequestEmail } from '@/lib/email';
import { BookingStatus, PaymentMethod } from '@prisma/client';

const listQuerySchema = z.object({
  page: paginationSchema.shape.page,
  limit: paginationSchema.shape.limit,
  status: z
    .string()
    .optional()
    .refine((val) => !val || ['PENDING', 'APPROVED', 'DELIVERED', 'CANCELLED'].includes(val), 'Invalid status'),
  paymentMethod: z
    .string()
    .optional()
    .refine((val) => !val || ['COD', 'UPI'].includes(val), 'Invalid payment method'),
  admin: z
    .string()
    .optional(),
});

async function createBookingHandler(request: NextRequest, context?: Record<string, unknown>) {
  const session = context?.session as { user: { id: string } } | undefined;
  if (!session?.user?.id) {
    throw new NotFoundError('User session not found');
  }

  const body = await parseRequestBody(request);
  const { paymentMethod, quantity, receiverName, receiverPhone, expectedDate, notes } = bookingSchema.parse(body);

  // Load user with minimal fields
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, phone: true, address: true, remainingQuota: true },
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Read pricing/settings OUTSIDE the transaction to avoid timeouts/P2028
  const globalSettings = await (prisma as any).systemSettings.findUnique({
    where: { id: 'default' },
    select: { pricePerCylinder: true },
  });

  // Create booking within transaction and atomically decrement quota if available
  const booking = await prisma.$transaction(async (tx) => {
    // Atomically decrement only if remainingQuota > 0
    const updated = await tx.user.updateMany({
      where: { id: user.id, remainingQuota: { gt: 0 } },
      data: { remainingQuota: { decrement: 1 } },
    });

    if (updated.count === 0) {
      throw new ConflictError('Insufficient quota to create a booking');
    }

    const createData: any = {
      userId: user.id,
      userName: user.name,
      paymentMethod: paymentMethod as PaymentMethod,
      status: 'PENDING',
      notes: notes || undefined,
    };
    if (typeof quantity === 'number') createData.quantity = quantity;
    if (receiverName) createData.receiverName = receiverName;
    if (receiverPhone) createData.receiverPhone = receiverPhone;
    if (expectedDate) createData.expectedDate = new Date(expectedDate);

    const created = await tx.booking.create({
      data: createData,
    });

    // Seed initial tracking events
    await (tx as any).bookingEvent.createMany({
      data: [
        {
          bookingId: created.id,
          status: 'PENDING',
          title: 'Started',
          description: 'Booking process started.',
        },
        {
          bookingId: created.id,
          status: 'PENDING',
          title: 'Booking Requested',
          description: 'Your booking request was submitted and is pending approval.',
        },
      ],
    });

    await tx.notification.create({
      data: {
        userId: user.id,
        title: 'Booking Created',
        message: 'Your booking has been created and is pending approval.',
        type: 'BOOKING_CREATED',
      },
    });

    // Create payment record (PENDING) and compute amount
    const unitPrice = (globalSettings?.pricePerCylinder ?? 1100);
    const amountInPaise = (unitPrice * (typeof quantity === 'number' ? quantity : 1)) * 100;
    await (tx as any).payment.create({
      data: {
        bookingId: created.id,
        amount: amountInPaise,
        method: paymentMethod as PaymentMethod,
        status: 'PENDING',
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
    }
  });

  return successResponse(booking, 'Booking created successfully', 201);
}

async function listBookingsHandler(request: NextRequest, context?: Record<string, unknown>) {
  const session = context?.session as { user: { id: string; role?: 'USER' | 'ADMIN' } } | undefined;
  if (!session?.user?.id) {
    throw new NotFoundError('User session not found');
  }

  const url = new URL(request.url);
  const queryParams = Object.fromEntries(url.searchParams.entries());
  const { page, limit, status, paymentMethod, admin } = listQuerySchema.parse(queryParams);

  const whereClause: Record<string, unknown> = {};

  const isAdminQuery = admin === '1' || admin === 'true';
  if (isAdminQuery) {
    if (session.user.role !== 'ADMIN') {
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
  const bookings = await prisma.booking.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  });

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
    'Bookings retrieved successfully'
  );
}

export const POST = withMiddleware(createBookingHandler, {
  requireAuth: true,
  rateLimit: { type: 'general' },
  validateContentType: true,
});

export const GET = withMiddleware(listBookingsHandler, {
  requireAuth: true,
  validateContentType: false,
});


