import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { profileUpdateSchema } from "@/lib/validation";
import { withAuth, successResponse, errorResponse } from "@/lib/api-middleware";
import { NotFoundError } from "@/lib/error-handler";
import { sanitizeInput } from "@/lib/security";
import { Prisma } from "@prisma/client";

// GET - Get user profile
async function getProfileHandler(
  request: NextRequest,
  context?: Record<string, unknown>,
) {
  console.log("GET Profile handler called");
  console.log("Context:", context);

  const session = context?.session as { user: { id: string } } | undefined;
  console.log("Session:", session);

  if (!session?.user?.id) {
    console.error("Session not found or missing user ID");
    throw new Error("Session not found");
  }

  console.log("User ID from session:", session.user.id);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      role: true,
      remainingQuota: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  console.log("User found:", user);

  if (!user) {
    throw new NotFoundError("User profile not found");
  }

  return successResponse(user, "Profile retrieved successfully");
}

// PUT - Update user profile
async function updateProfileHandler(
  request: NextRequest,
  context?: Record<string, unknown>,
) {
  const session = context?.session as { user: { id: string } } | undefined;
  if (!session?.user?.id) {
    throw new Error("Session not found");
  }
  const body = await request.json();
  // Disallow email updates explicitly
  if (Object.prototype.hasOwnProperty.call(body, "email")) {
    return errorResponse("EMAIL_IMMUTABLE", "Email cannot be changed", 400);
  }
  const { name, phone, address } = profileUpdateSchema.parse(body);

  // Check if user exists before updating
  const existingUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });

  if (!existingUser) {
    throw new NotFoundError("User not found");
  }

  // Update user profile with transaction
  const updatedUser = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      return await tx.user.update({
        where: { id: session.user.id },
        data: {
          name: sanitizeInput(name),
          phone,
          address: sanitizeInput(address),
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          role: true,
          remainingQuota: true,
          updatedAt: true,
        },
      });
    },
  );

  return successResponse(updatedUser, "Profile updated successfully");
}

// Export with middleware
export const GET = withAuth(getProfileHandler);
export const PUT = withAuth(updateProfileHandler);
