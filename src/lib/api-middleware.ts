import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import {
  handleAPIError,
  AuthenticationError,
  RateLimitError,
} from "./error-handler";
import {
  getClientIP,
  checkRateLimit,
  checkLoginRateLimit,
  checkEmailRateLimit,
  validateCSRFTokenFromRequest,
} from "./security";

// Middleware options
interface MiddlewareOptions {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  requireCSRF?: boolean;
  rateLimit?: {
    type: "general" | "login" | "email";
    maxRequests?: number;
  };
  validateContentType?: boolean;
}

// API route wrapper with middleware
export function withMiddleware(
  handler: (
    request: NextRequest,
    context?: Record<string, unknown>,
  ) => Promise<NextResponse>,
  options: MiddlewareOptions = {},
) {
  return async (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> },
  ): Promise<NextResponse> => {
    try {
      // Content-Type validation for POST/PUT requests
      if (
        options.validateContentType &&
        ["POST", "PUT", "PATCH"].includes(request.method)
      ) {
        const contentType = request.headers.get("content-type");
        if (!contentType?.includes("application/json")) {
          return NextResponse.json(
            {
              success: false,
              error: "INVALID_CONTENT_TYPE",
              message: "Content-Type must be application/json",
            },
            { status: 400 },
          );
        }
      }

      // Rate limiting
      if (options.rateLimit) {
        const clientIP = getClientIP(request);
        let rateLimitPassed = false;

        switch (options.rateLimit.type) {
          case "login":
            rateLimitPassed = checkLoginRateLimit(clientIP);
            break;
          case "email":
            rateLimitPassed = checkEmailRateLimit(clientIP);
            break;
          case "general":
          default:
            rateLimitPassed = checkRateLimit(
              clientIP,
              options.rateLimit.maxRequests,
            );
            break;
        }

        if (!rateLimitPassed) {
          throw new RateLimitError(
            "Too many requests. Please try again later.",
          );
        }
      }

      // Authentication check
      let session = null;
      if (options.requireAuth || options.requireAdmin) {
        session = await getServerSession(authOptions);

        if (!session?.user?.id) {
          throw new AuthenticationError("Authentication required");
        }

        // Admin role check
        if (options.requireAdmin && session.user.role !== "ADMIN") {
          return NextResponse.json(
            {
              success: false,
              error: "INSUFFICIENT_PERMISSIONS",
              message: "Admin access required",
            },
            { status: 403 },
          );
        }

        // CSRF protection for state-changing operations
        if (
          options.requireCSRF &&
          ["POST", "PUT", "PATCH", "DELETE"].includes(request.method)
        ) {
          const sessionId = session.user.id;
          if (!validateCSRFTokenFromRequest(request, sessionId)) {
            return NextResponse.json(
              {
                success: false,
                error: "CSRF_TOKEN_INVALID",
                message: "Invalid or missing CSRF token",
              },
              { status: 403 },
            );
          }
        }
      }

      // Call the actual handler
      const response = await handler(
        request,
        ({ session, ...(context as unknown as Record<string, unknown>) }) as Record<string, unknown>,
      );

      // Add security headers to response
      return addSecurityHeaders(response);
    } catch (err) {
      return handleAPIError(err);
    }
  };
}

// Specific middleware presets
export const withAuth = (
  handler: (
    request: NextRequest,
    context?: Record<string, unknown>,
  ) => Promise<NextResponse>,
) => withMiddleware(handler, { requireAuth: true, validateContentType: true });

export const withAdmin = (
  handler: (
    request: NextRequest,
    context?: Record<string, unknown>,
  ) => Promise<NextResponse>,
) =>
  withMiddleware(handler, {
    requireAuth: true,
    requireAdmin: true,
    validateContentType: true,
  });

export const withCSRF = (
  handler: (
    request: NextRequest,
    context?: Record<string, unknown>,
  ) => Promise<NextResponse>,
) =>
  withMiddleware(handler, {
    requireAuth: true,
    requireCSRF: true,
    validateContentType: true,
  });

export const withRateLimit = (
  handler: (
    request: NextRequest,
    context?: Record<string, unknown>,
  ) => Promise<NextResponse>,
  type: "general" | "login" | "email" = "general",
) =>
  withMiddleware(handler, { rateLimit: { type }, validateContentType: true });

export const withLoginRateLimit = (
  handler: (
    request: NextRequest,
    context?: Record<string, unknown>,
  ) => Promise<NextResponse>,
) =>
  withMiddleware(handler, {
    rateLimit: { type: "login" },
    validateContentType: true,
  });

export const withEmailRateLimit = (
  handler: (
    request: NextRequest,
    context?: Record<string, unknown>,
  ) => Promise<NextResponse>,
) =>
  withMiddleware(handler, {
    rateLimit: { type: "email" },
    validateContentType: true,
  });

// Request body parser with error handling
export async function parseRequestBody<T = unknown>(
  request: NextRequest,
): Promise<T> {
  try {
    const body = await request.json();
    return body;
  } catch {
    throw new Error("Invalid JSON in request body");
  }
}

// Response helpers
export const successResponse = (
  data?: unknown,
  message?: string,
  statusCode = 200,
) => {
  const response = NextResponse.json(
    {
      success: true,
      message,
      data,
    },
    { status: statusCode },
  );

  return addSecurityHeaders(response);
};

export const errorResponse = (
  error: string,
  message: string,
  statusCode = 400,
  details?: unknown,
) => {
  const response = NextResponse.json(
    {
      success: false,
      error,
      message,
      details,
    },
    { status: statusCode },
  );

  return addSecurityHeaders(response);
};

// CORS headers helper
export function addCORSHeaders(response: NextResponse): NextResponse {
  response.headers.set(
    "Access-Control-Allow-Origin",
    process.env.NEXTAUTH_URL || "*",
  );
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-CSRF-Token",
  );
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}

// Security headers helper
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()",
  );
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';",
  );

  // Only add HSTS in production with HTTPS
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }

  return response;
}
