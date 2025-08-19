import { NextRequest } from 'next/server';

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS_PER_WINDOW = 100; // 100 requests per 15 minutes
const MAX_LOGIN_ATTEMPTS = 5; // 5 login attempts per 15 minutes
const MAX_EMAIL_REQUESTS = 3; // 3 email requests per hour

// Get client IP address
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  return 'unknown';
}

// Rate limiting for general API endpoints
export function checkRateLimit(identifier: string, maxRequests: number = MAX_REQUESTS_PER_WINDOW): boolean {
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

// CSRF token validation
export function validateCSRFToken(request: NextRequest, token: string): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  
  // Check if request has proper origin/referer headers
  if (!origin && !referer) {
    return false;
  }
  
  // Validate token (in production, use proper CSRF token validation)
  if (!token || token.length < 32) {
    return false;
  }
  
  return true;
}

// Input sanitization
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
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
  
  return !suspiciousPatterns.some(pattern => pattern.test(email));
}

// Password strength validation
export function validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Check for common weak passwords
  const weakPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
  if (weakPasswords.includes(password.toLowerCase())) {
    errors.push('Password is too common');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
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
if (typeof window === 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000); // Clean up every 5 minutes
}
