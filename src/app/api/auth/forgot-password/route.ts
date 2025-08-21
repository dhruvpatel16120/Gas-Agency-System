import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import { forgotPasswordSchema } from "@/lib/validation";
import { withEmailRateLimit, successResponse } from "@/lib/api-middleware";
import { NotFoundError } from "@/lib/error-handler";
import { Prisma } from "@prisma/client";
import crypto from "crypto";

async function forgotPasswordHandler(
  request: NextRequest,
): Promise<NextResponse> {
  const body = await request.json();
  const { email } = forgotPasswordSchema.parse(body);

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, emailVerified: true },
  });

  if (!user) {
    throw new NotFoundError("No account found with this email address");
  }

  // Require verified email before allowing password reset
  if (!user.emailVerified) {
    return NextResponse.json(
      {
        success: false,
        error: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email before resetting your password.",
      },
      { status: 400 },
    );
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Store reset token in database with transaction
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });
  });

  // Send password reset email asynchronously (non-blocking)
  sendPasswordResetEmail(user.email, user.name, resetToken).catch(
    (emailError) => {
      console.error("Failed to send password reset email:", emailError);
    },
  );

  return successResponse(
    null,
    "If an account with this email exists, you will receive a password reset link shortly.",
  );
}

// Export with middleware
export const POST = withEmailRateLimit(forgotPasswordHandler);
