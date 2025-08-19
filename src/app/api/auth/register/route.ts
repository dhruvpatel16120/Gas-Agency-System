import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/utils';
import { sendWelcomeEmail } from '@/lib/email';
import { z } from 'zod';

// Validation schema
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  userId: z.string().min(3, 'User ID must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number'),
  address: z.string().min(10, 'Address must be at least 10 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Validation failed', 
          errors: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    const { name, userId, email, phone, address, password } = validationResult.data;

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existingEmail) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'EMAIL_EXISTS',
          message: 'An account with this email already exists' 
        },
        { status: 409 }
      );
    }

    // Check if user ID already exists
    const existingUserId = await prisma.user.findUnique({
      where: { userId }
    });

    if (existingUserId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'USER_ID_EXISTS',
          message: 'This User ID is already taken' 
        },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        userId,
        email: email.toLowerCase(),
        phone,
        address,
        password: hashedPassword,
        role: 'USER',
        remainingQuota: 12, // Default quota
      },
    });

    // Send welcome email (non-blocking)
    try {
      await sendWelcomeEmail(email, name);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail registration if email fails
    }

    // Return success response (without password)
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      { 
        success: true, 
        message: 'User registered successfully',
        data: userWithoutPassword
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
