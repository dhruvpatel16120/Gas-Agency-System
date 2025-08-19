import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { withMiddleware, parseRequestBody, successResponse } from '@/lib/api-middleware';
import { NotFoundError, ConflictError } from '@/lib/error-handler';
import { BookingStatus } from '@prisma/client';
import { sendBookingApprovalEmail, sendDeliveryConfirmationEmail, sendBookingCancellationEmail } from '@/lib/email';
import { calculateDeliveryDate } from '@/lib/utils';

const updateSchema = z.object({
  status: z.enum(['APPROVED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']),
  // Optional explicit delivery date (ISO string)
  deliveryDate: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

async function updateBookingHandler(request: NextRequest, context?: Record<string, unknown>) {
  const session = context?.session as { user: { id: string; role?: 'ADMIN' | 'USER' } } | undefined;
  if (!session?.user?.id) {
    throw new NotFoundError('User session not found');
  }

  const { params } = (context || {}) as { params?: { id?: string } };
  const id = params?.id || request.url.split('/').slice(-2)[0];

  if (!id) {
    throw new NotFoundError('Booking ID is required');
  }

  const body = await parseRequestBody(request);
  const { status, deliveryDate, notes } = updateSchema.parse(body);

  // Load booking and user
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  if (!booking) {
    throw new NotFoundError('Booking not found');
  }

  // Users can only cancel their own pending bookings; admin can change any
  const isAdmin = session.user.role === 'ADMIN';
  if (!isAdmin) {
    if (status !== 'CANCELLED' || booking.userId !== session.user.id || booking.status !== 'PENDING') {
      throw new ConflictError('You are not allowed to perform this action');
    }
  }

  // Transactional update with quota adjustments
  const updated = await prisma.$transaction(async (tx) => {
    // Prepare update data
    const data: Record<string, unknown> = { status };

    if (status === 'APPROVED') {
      const date = deliveryDate ? new Date(deliveryDate) : calculateDeliveryDate();
      data.deliveryDate = date;
    }

    if (status === 'DELIVERED') {
      data.deliveredAt = new Date();
    }

    if (status === 'CANCELLED') {
      // Return quota to user if we are cancelling a non-cancelled booking
      if (booking.status !== 'CANCELLED') {
        await tx.user.update({
          where: { id: booking.userId },
          data: { remainingQuota: { increment: 1 } },
        });
      }
    }

    if (notes) {
      data.notes = notes;
    }

    const result = await tx.booking.update({
      where: { id: booking.id },
      data,
    });

    // Notification creation removed

    // Tracking events
    const eventTitleMap: Record<string, string> = {
      APPROVED: 'Admin Approved',
      OUT_FOR_DELIVERY: 'Out for Delivery',
      DELIVERED: 'Delivered',
      CANCELLED: 'Cancelled',
    };
    await (tx as any).bookingEvent.create({
      data: {
        bookingId: booking.id,
        status,
        title: eventTitleMap[status] || 'Updated',
        description:
          status === 'APPROVED'
            ? 'Your booking has been approved.'
            : status === 'OUT_FOR_DELIVERY'
            ? 'Your cylinder is out for delivery.'
            : status === 'DELIVERED'
            ? 'Your cylinder was delivered.'
            : `${(isAdmin ? 'Admin' : 'User')} cancelled the booking.`,
      },
    });

    // Send emails after transaction commits (fire-and-forget)
    if (status === 'APPROVED') {
      const dateStr = (data.deliveryDate as Date).toLocaleDateString('en-IN');
      void sendBookingApprovalEmail(booking.user.email, booking.user.name, booking.id, dateStr);
    } else if (status === 'DELIVERED') {
      void sendDeliveryConfirmationEmail(booking.user.email, booking.user.name, booking.id);
    } else if (status === 'CANCELLED') {
      void sendBookingCancellationEmail(booking.user.email, booking.user.name, booking.id, isAdmin ? 'Admin' : 'User');
    }

    return result;
  });

  return successResponse(updated, 'Booking updated successfully');
}

export const PUT = withMiddleware(updateBookingHandler, {
  requireAuth: true,
  // Only admins should generally update; users can cancel own PENDING bookings but middleware cannot express this fine rule.
  // We still require auth and perform authorization inside handler.
  validateContentType: true,
});

async function deleteBookingHandler(_request: NextRequest, context?: Record<string, unknown>) {
  const session = context?.session as { user: { id: string; role?: 'ADMIN' | 'USER' } } | undefined;
  if (!session?.user?.id) {
    throw new NotFoundError('User session not found');
  }
  if (session.user.role !== 'ADMIN') {
    throw new ConflictError('Only administrators can delete bookings');
  }

  const { params } = (context || {}) as { params?: { id?: string } };
  const id = params?.id;
  if (!id) {
    throw new NotFoundError('Booking ID is required');
  }

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) {
    throw new NotFoundError('Booking not found');
  }

  await prisma.$transaction(async (tx) => {
    // If booking not delivered, return quota to user
    if (booking.status !== 'DELIVERED') {
      await tx.user.update({ where: { id: booking.userId }, data: { remainingQuota: { increment: 1 } } });
    }
    await tx.booking.delete({ where: { id: booking.id } });
  });

  return successResponse(null, 'Booking deleted successfully');
}

export const DELETE = withMiddleware(deleteBookingHandler, {
  requireAuth: true,
  validateContentType: false,
});


