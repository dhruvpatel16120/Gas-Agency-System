import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

// Validation schema
const validateTokenSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = validateTokenSchema.safeParse(body);
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

    const { token } = validationResult.data;

    // Find user with this reset token
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_TOKEN",
          message: "Invalid or expired reset token",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Token is valid",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Validate reset token error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}
