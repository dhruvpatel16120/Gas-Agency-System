import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmailVerification } from "@/lib/email";
import { z } from "zod";
import crypto from "crypto";

// Validation schema
const resendVerificationSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = resendVerificationSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors: validationResult.error.issues,
        },
        { status: 400 },
      );
    }

    const { email } = validationResult.data;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "USER_NOT_FOUND",
          message: "No account found with this email address",
        },
        { status: 404 },
      );
    }

    // Check if email is already verified
    if (user.emailVerified) {
      return NextResponse.json(
        {
          success: false,
          error: "ALREADY_VERIFIED",
          message: "Email is already verified",
        },
        { status: 400 },
      );
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Update user with new verification token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry,
      },
    });

    // Send verification email (non-blocking)
    try {
      await sendEmailVerification(email, user.name, verificationToken);
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json(
      {
        success: true,
        message: "Verification email sent successfully",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}
