import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Validation schema
const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = verifyEmailSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Validation failed', 
          errors: validationResult.error.issues 
        },
        { status: 400 }
      );
    }

    const { token } = validationResult.data;

    // Find user with this verification token
    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      // Check if token exists but is expired
      const expiredUser = await prisma.user.findFirst({
        where: {
          emailVerificationToken: token,
        },
      });

      if (expiredUser) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'TOKEN_EXPIRED',
            message: 'Email verification link has expired' 
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { 
          success: false, 
          error: 'INVALID_TOKEN',
          message: 'Invalid verification token' 
        },
        { status: 400 }
      );
    }

    // Check if email is already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'ALREADY_VERIFIED',
          message: 'Email is already verified' 
        },
        { status: 400 }
      );
    }

    // Verify the email
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      },
    });

    return NextResponse.json(
      { 
        success: true, 
        message: 'Email verified successfully' 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
