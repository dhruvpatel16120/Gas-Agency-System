import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  withMiddleware,
  parseRequestBody,
  successResponse,
} from "@/lib/api-middleware";
import { NotFoundError, ConflictError } from "@/lib/error-handler";
import { Prisma } from "@prisma/client";

async function getUserHandler(
  _request: NextRequest,
  context?: Record<string, unknown>,
) {
  // Support App Router dynamic params (awaitable)
  const paramsPromise = (context as unknown as { params?: { id?: string } })
    ?.params as
    | Promise<{ id?: string }>
    | { id?: string }
    | undefined;
  const { id } = paramsPromise
    ? typeof (paramsPromise as Promise<{ id?: string }>).then === "function"
      ? await (paramsPromise as Promise<{ id?: string }>)
      : (paramsPromise as { id?: string })
    : { id: undefined };
  if (!id) throw new NotFoundError("User ID is required");

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      userId: true,
      phone: true,
      address: true,
      role: true,
      remainingQuota: true,
      emailVerified: true,
      createdAt: true,
      bookings: {
        select: {
          id: true,
          status: true,
          createdAt: true,
          deliveredAt: true,
          paymentMethod: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      _count: { select: { bookings: true } },
    },
  });

  if (!user) throw new NotFoundError("User not found");

  // Compute booking stats
  const [total, delivered, pending, approved] = await Promise.all([
    prisma.booking.count({ where: { userId: id } }),
    prisma.booking.count({ where: { userId: id, status: "DELIVERED" } }),
    prisma.booking.count({ where: { userId: id, status: "PENDING" } }),
    prisma.booking.count({ where: { userId: id, status: "APPROVED" } }),
  ]);

  return successResponse(
    { user, bookingStats: { total, delivered, pending, approved } },
    "User retrieved successfully",
  );
}

async function updateUserHandler(
  request: NextRequest,
  context?: Record<string, unknown>,
) {
  const paramsPromise = (context as unknown as { params?: { id?: string } })
    ?.params as
    | Promise<{ id?: string }>
    | { id?: string }
    | undefined;
  const { id } = paramsPromise
    ? typeof (paramsPromise as Promise<{ id?: string }>).then === "function"
      ? await (paramsPromise as Promise<{ id?: string }>)
      : (paramsPromise as { id?: string })
    : { id: undefined };
  if (!id) throw new NotFoundError("User ID is required");

  const body = await parseRequestBody<Record<string, unknown>>(request);
  const allowedFields = [
    "name",
    "phone",
    "address",
    "role",
    "remainingQuota",
  ] as const;
  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      updates[key] = (body as Record<string, unknown>)[key];
    }
  }

  if (
    Object.prototype.hasOwnProperty.call(body, "email") ||
    Object.prototype.hasOwnProperty.call(body, "userId")
  ) {
    throw new ConflictError("Email and User ID cannot be changed once set");
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) throw new NotFoundError("User not found");

  const updated = await prisma.user.update({
    where: { id },
    data: updates,
    select: {
      id: true,
      name: true,
      email: true,
      userId: true,
      phone: true,
      address: true,
      role: true,
      remainingQuota: true,
      updatedAt: true,
    },
  });

  return successResponse(updated, "User updated successfully");
}

async function deleteUserHandler(
  _request: NextRequest,
  context?: Record<string, unknown>,
) {
  const paramsPromise = (context as unknown as { params?: { id?: string } })
    ?.params as
    | Promise<{ id?: string }>
    | { id?: string }
    | undefined;
  const { id } = paramsPromise
    ? typeof (paramsPromise as Promise<{ id?: string }>).then === "function"
      ? await (paramsPromise as Promise<{ id?: string }>)
      : (paramsPromise as { id?: string })
    : { id: undefined };
  if (!id) throw new NotFoundError("User ID is required");

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!user) throw new NotFoundError("User not found");

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.booking.deleteMany({ where: { userId: id } });
    await tx.user.delete({ where: { id } });
  });

  return successResponse(null, "User and related bookings deleted");
}

export const GET = withMiddleware(getUserHandler, {
  requireAuth: true,
  requireAdmin: true,
  validateContentType: false,
});
export const PUT = withMiddleware(updateUserHandler, {
  requireAuth: true,
  requireAdmin: true,
  validateContentType: true,
});
export const DELETE = withMiddleware(deleteUserHandler, {
  requireAuth: true,
  requireAdmin: true,
  validateContentType: false,
});
