import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/utils";
import { sendWelcomeEmail, sendEmailVerification } from "@/lib/email";
import { registerSchema } from "@/lib/validation";
import {
  withEmailRateLimit,
  parseRequestBody,
  successResponse,
} from "@/lib/api-middleware";
import { ConflictError, InternalServerError } from "@/lib/error-handler";
import { sanitizeInput } from "@/lib/security";
import { Prisma } from "@prisma/client";
import crypto from "crypto";

async function registerHandler(request: NextRequest) {
  // Parse and validate request body
  const body = await parseRequestBody(request);
  const validatedData = registerSchema.parse(body);
  const { name, userId, email, phone, address, password } = validatedData;

  // Check for existing email and userId in parallel
  const [existingEmail, existingUserId] = await Promise.all([
    prisma.user.findUnique({
      where: { email },
      select: { id: true },
    }),
    prisma.user.findUnique({
      where: { userId },
      select: { id: true },
    }),
  ]);

  if (existingEmail) {
    throw new ConflictError("An account with this email already exists", {
      field: "email",
      code: "EMAIL_EXISTS",
    });
  }

  if (existingUserId) {
    throw new ConflictError("This User ID is already taken", {
      field: "userId",
      code: "USER_ID_EXISTS",
    });
  }

  // Hash password with error handling
  let hashedPassword: string;
  try {
    hashedPassword = await hashPassword(password);
  } catch (error) {
    console.error("Password hashing failed:", error);
    throw new InternalServerError("Failed to process password");
  }

  // Generate email verification token
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Create user with transaction for data consistency
  const user = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      return await tx.user.create({
        data: {
          name: sanitizeInput(name),
          userId: userId.toLowerCase(),
          email,
          phone,
          address: sanitizeInput(address),
          password: hashedPassword,
          role: "USER",
          remainingQuota: 12,
          emailVerificationToken: verificationToken,
          emailVerificationExpiry: verificationExpiry,
        },
        select: {
          id: true,
          name: true,
          userId: true,
          email: true,
          phone: true,
          address: true,
          role: true,
          remainingQuota: true,
          createdAt: true,
        },
      });
    },
  );

  // Send emails asynchronously (non-blocking)
  Promise.allSettled([
    sendWelcomeEmail(email, name),
    sendEmailVerification(email, name, verificationToken),
  ]);

  return successResponse(
    user,
    "User registered successfully. Please check your email to verify your account.",
    201,
  );
}

// Export with middleware
export const POST = withEmailRateLimit(registerHandler);
