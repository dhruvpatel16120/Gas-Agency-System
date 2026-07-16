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

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, email: true },
  });
  if (!existing) throw new NotFoundError("User not found");

  const session = context?.session as { user?: { email?: string | null } } | undefined;
  const currentAdminEmail = session?.user?.email;

  // 1. Admin cannot change information of other admins
  if (existing.role === "ADMIN" && existing.email !== currentAdminEmail) {
    throw new ConflictError("You cannot modify other administrator accounts.");
  }

  const body = await parseRequestBody<Record<string, unknown>>(request);

  // Validation constraints
  if (body.remainingQuota !== undefined) {
    const quota = Number(body.remainingQuota);
    if (isNaN(quota) || quota > 12 || quota < 0) {
      throw new ConflictError("Quota must be less than or equal to 12.");
    }
  }

  if (body.phone !== undefined) {
    const phone = String(body.phone).trim();
    if (phone.length < 10 || phone.length > 13) {
      throw new ConflictError("Phone number length must be between 10 and 13 characters.");
    }
  }

  if (body.address !== undefined) {
    const address = String(body.address).trim();
    if (address.length <= 10) {
      throw new ConflictError("Address length must be greater than 10 characters.");
    }
  }

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
    select: { id: true, role: true, email: true },
  });
  if (!user) throw new NotFoundError("User not found");

  const session = context?.session as { user?: { email?: string | null } } | undefined;
  const currentAdminEmail = session?.user?.email;

  // 1. Admin cannot delete other admins
  if (user.role === "ADMIN" && user.email !== currentAdminEmail) {
    throw new ConflictError("You cannot delete other administrator accounts.");
  }

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
