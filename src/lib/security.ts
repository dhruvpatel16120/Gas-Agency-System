import { NextRequest } from "next/server";
import { randomBytes, createHash } from "crypto";

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// CSRF token store (in production, use Redis or similar)
const csrfTokenStore = new Map<string, { token: string; expires: number }>();

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 100; // 100 requests per 15 minutes
const MAX_LOGIN_ATTEMPTS = 5; // 5 login attempts per 15 minutes
const MAX_EMAIL_REQUESTS = 3; // 3 email requests per hour
const CSRF_TOKEN_EXPIRY = 30 * 60 * 1000; // 30 minutes

// Get client IP address
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  const cfConnectingIP = request.headers.get("cf-connecting-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  return "unknown";
}

// Rate limiting for general API endpoints
export function checkRateLimit(
  identifier: string,
  maxRequests: number = MAX_REQUESTS_PER_WINDOW,
): boolean {
  const now = Date.now();
  const key = `rate_limit:${identifier}`;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

// Rate limiting for login attempts
export function checkLoginRateLimit(identifier: string): boolean {
  return checkRateLimit(`login:${identifier}`, MAX_LOGIN_ATTEMPTS);
}

// Rate limiting for email requests (password reset, verification)
export function checkEmailRateLimit(identifier: string): boolean {
  const now = Date.now();
  const key = `email_rate_limit:${identifier}`;
  const record = rateLimitStore.get(key);
  const emailWindow = 60 * 60 * 1000; // 1 hour

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + emailWindow });
    return true;
  }

  if (record.count >= MAX_EMAIL_REQUESTS) {
    return false;
  }

  record.count++;
  return true;
}

// CSRF token generation
export function generateCSRFToken(sessionId: string): string {
  const token = randomBytes(32).toString("hex");
  const expires = Date.now() + CSRF_TOKEN_EXPIRY;

  csrfTokenStore.set(sessionId, { token, expires });
  return token;
}

// CSRF token validation
export function validateCSRFToken(sessionId: string, token: string): boolean {
  const record = csrfTokenStore.get(sessionId);

  if (!record) {
    return false;
  }

  if (Date.now() > record.expires) {
    csrfTokenStore.delete(sessionId);
    return false;
  }

  if (record.token !== token) {
    return false;
  }

  return true;
}

// CSRF token validation for requests
export function validateCSRFTokenFromRequest(
  request: NextRequest,
  sessionId: string,
): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const csrfToken =
    request.headers.get("x-csrf-token") ||
    request.nextUrl.searchParams.get("csrf_token");

  // Check if request has proper origin/referer headers
  if (!origin && !referer) {
    return false;
  }

  // Validate token
  if (!csrfToken || !validateCSRFToken(sessionId, csrfToken)) {
    return false;
  }

  return true;
}

// Clean up expired CSRF tokens
export function cleanupCSRFTokens(): void {
  const now = Date.now();
  for (const [sessionId, record] of csrfTokenStore.entries()) {
    if (now > record.expires) {
      csrfTokenStore.delete(sessionId);
    }
  }
}

// Input sanitization
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, ""); // Remove event handlers
}

// Email validation with additional security checks
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return false;
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /data:/i,
    /vbscript:/i,
  ];

  return !suspiciousPatterns.some((pattern) => pattern.test(email));
}

// Password strength validation
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  // Check for common weak passwords
  const weakPasswords = ["password", "123456", "qwerty", "admin", "letmein"];
  if (weakPasswords.includes(password.toLowerCase())) {
    errors.push("Password is too common");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// SQL injection prevention
export function sanitizeSQLInput(input: string): string {
  return input
    .replace(/['";\\]/g, "") // Remove SQL injection characters
    .replace(/--/g, "") // Remove SQL comments
    .replace(/\/\*.*?\*\//g, ""); // Remove SQL block comments
}

// XSS prevention
export function escapeHTML(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

// Validate file upload
export function validateFileUpload(file: File): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "application/pdf",
  ];

  if (file.size > maxSize) {
    errors.push("File size must be less than 5MB");
  }

  if (!allowedTypes.includes(file.type)) {
    errors.push("File type not allowed");
  }

  // Check for suspicious file names
  const suspiciousPatterns = [
    /\.\.\//, // Directory traversal
    /\.\.\\/, // Windows directory traversal
    /<script/i, // XSS attempts
    /javascript:/i,
  ];

  if (suspiciousPatterns.some((pattern) => pattern.test(file.name))) {
    errors.push("Invalid file name");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Generate secure random string
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString("hex");
}

// Hash sensitive data
export function hashSensitiveData(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

// Clean up old rate limit records (run periodically)
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Set up periodic cleanup
if (typeof window === "undefined") {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000); // Clean up every 5 minutes
  setInterval(cleanupCSRFTokens, 10 * 60 * 1000); // Clean up CSRF tokens every 10 minutes
}
