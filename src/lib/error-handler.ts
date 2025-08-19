import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

// Error types
export interface APIError {
  code: string;
  message: string;
  details?: unknown;
  statusCode: number;
}

// Custom error classes
export class ValidationError extends Error {
  public statusCode = 400;
  public code = 'VALIDATION_ERROR';
  
  constructor(message: string, public details?: unknown) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  public statusCode = 401;
  public code = 'AUTHENTICATION_ERROR';
  
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  public statusCode = 403;
  public code = 'AUTHORIZATION_ERROR';
  
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  public statusCode = 404;
  public code = 'NOT_FOUND_ERROR';
  
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  public statusCode = 409;
  public code = 'CONFLICT_ERROR';
  
  constructor(message: string, public details?: unknown) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends Error {
  public statusCode = 429;
  public code = 'RATE_LIMIT_ERROR';
  
  constructor(message: string = 'Too many requests') {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class InternalServerError extends Error {
  public statusCode = 500;
  public code = 'INTERNAL_SERVER_ERROR';
  
  constructor(message: string = 'Internal server error') {
    super(message);
    this.name = 'InternalServerError';
  }
}

// Error handler function
export function handleAPIError(error: unknown): NextResponse {
  console.error('API Error:', error);

  // Zod validation errors
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        })),
      },
      { status: 400 }
    );
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return NextResponse.json(
          {
            success: false,
            error: 'UNIQUE_CONSTRAINT_ERROR',
            message: 'A record with this information already exists',
            details: { fields: error.meta?.target },
          },
          { status: 409 }
        );
      
      case 'P2025':
        return NextResponse.json(
          {
            success: false,
            error: 'RECORD_NOT_FOUND',
            message: 'The requested record was not found',
          },
          { status: 404 }
        );
      
      case 'P2003':
        return NextResponse.json(
          {
            success: false,
            error: 'FOREIGN_KEY_CONSTRAINT_ERROR',
            message: 'Foreign key constraint failed',
          },
          { status: 400 }
        );
      
      default:
        return NextResponse.json(
          {
            success: false,
            error: 'DATABASE_ERROR',
            message: 'Database operation failed',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
          },
          { status: 500 }
        );
    }
  }

  // Prisma client initialization errors
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return NextResponse.json(
      {
        success: false,
        error: 'DATABASE_CONNECTION_ERROR',
        message: 'Failed to connect to database',
      },
      { status: 503 }
    );
  }

  // Custom error classes
  if (error instanceof ValidationError) {
    return NextResponse.json(
      {
        success: false,
        error: error.code,
        message: error.message,
        details: error.details,
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof AuthenticationError) {
    return NextResponse.json(
      {
        success: false,
        error: error.code,
        message: error.message,
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof AuthorizationError) {
    return NextResponse.json(
      {
        success: false,
        error: error.code,
        message: error.message,
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json(
      {
        success: false,
        error: error.code,
        message: error.message,
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof ConflictError) {
    return NextResponse.json(
      {
        success: false,
        error: error.code,
        message: error.message,
        details: error.details,
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof RateLimitError) {
    return NextResponse.json(
      {
        success: false,
        error: error.code,
        message: error.message,
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof InternalServerError) {
    return NextResponse.json(
      {
        success: false,
        error: error.code,
        message: error.message,
      },
      { status: error.statusCode }
    );
  }

  // JSON parsing errors
  if (error instanceof SyntaxError && error.message.includes('JSON')) {
    return NextResponse.json(
      {
        success: false,
        error: 'INVALID_JSON',
        message: 'Invalid JSON in request body',
      },
      { status: 400 }
    );
  }

  // Generic error fallback
  return NextResponse.json(
    {
      success: false,
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
    },
    { status: 500 }
  );
}

// Async error wrapper for API routes
export function withErrorHandler<T extends unknown[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleAPIError(error);
    }
  };
}

// Validation helper
export function validateRequestBody<T>(schema: { parse: (data: unknown) => T }, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError('Validation failed', error.issues);
    }
    throw error;
  }
}

// Session validation helper
export function validateSession(session: unknown) {
  if (!session || typeof session !== 'object' || !('user' in session) || !session.user || typeof session.user !== 'object' || !('id' in session.user)) {
    throw new AuthenticationError('Authentication required');
  }
  return session as { user: { id: string; role?: string } };
}

// Admin role validation helper
export function validateAdminRole(session: unknown) {
  const validatedSession = validateSession(session);
  if (validatedSession.user.role !== 'ADMIN') {
    throw new AuthorizationError('Admin access required');
  }
  return validatedSession;
}
