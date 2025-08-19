// import { z } from 'zod';

// XSS Protection patterns
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
  /<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /data:text\/html/gi,
  /on\w+\s*=/gi,
  /<\s*\w+[^>]*\s+on\w+\s*=/gi,
];

// SQL Injection patterns
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
  /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
  /('|(\\')|(;|\\;))/gi,
  /(--|\#|\/\*|\*\/)/gi,
];

// Path traversal patterns
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//gi,
  /\.\.\\/gi,
  /%2e%2e%2f/gi,
  /%2e%2e%5c/gi,
  /\.\.%2f/gi,
  /\.\.%5c/gi,
];

// Command injection patterns
const COMMAND_INJECTION_PATTERNS = [
  /[;&|`$\(\)]/gi,
  /\b(cat|ls|pwd|whoami|id|uname|ps|netstat|ifconfig|ping|wget|curl)\b/gi,
];

/**
 * Comprehensive input sanitization
 */
export function sanitizeInput(input: string, options: {
  allowHtml?: boolean;
  maxLength?: number;
  removeNewlines?: boolean;
} = {}): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  let sanitized = input;

  // Trim whitespace
  sanitized = sanitized.trim();

  // Check length
  if (options.maxLength && sanitized.length > options.maxLength) {
    throw new Error(`Input exceeds maximum length of ${options.maxLength} characters`);
  }

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove or escape HTML if not allowed
  if (!options.allowHtml) {
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // Remove newlines if specified
  if (options.removeNewlines) {
    sanitized = sanitized.replace(/[\r\n]/g, ' ');
  }

  // Check for XSS patterns
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(sanitized)) {
      throw new Error('Input contains potentially dangerous XSS content');
    }
  }

  // Check for SQL injection patterns
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      throw new Error('Input contains potentially dangerous SQL content');
    }
  }

  // Check for path traversal
  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    if (pattern.test(sanitized)) {
      throw new Error('Input contains path traversal patterns');
    }
  }

  // Check for command injection
  for (const pattern of COMMAND_INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      throw new Error('Input contains potentially dangerous command patterns');
    }
  }

  return sanitized;
}

/**
 * Validate and sanitize email addresses
 */
export function validateAndSanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    throw new Error('Email is required and must be a string');
  }

  // Basic sanitization
  const sanitized = email.toLowerCase().trim();

  // Length check
  if (sanitized.length > 254) {
    throw new Error('Email address is too long');
  }

  // Format validation
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(sanitized)) {
    throw new Error('Invalid email format');
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+=/i,
    /data:/i,
    /vbscript:/i,
    /@.*@/, // Multiple @ symbols
    /\.\./,  // Consecutive dots
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(sanitized)) {
      throw new Error('Email contains suspicious content');
    }
  }

  return sanitized;
}

/**
 * Validate and sanitize phone numbers
 */
export function validateAndSanitizePhone(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    throw new Error('Phone number is required and must be a string');
  }

  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');

  // Indian phone number validation (10 digits starting with 6-9)
  if (!/^[6-9]\d{9}$/.test(digitsOnly)) {
    throw new Error('Invalid Indian phone number format');
  }

  return digitsOnly;
}

/**
 * Validate and sanitize names
 */
export function validateAndSanitizeName(name: string): string {
  if (!name || typeof name !== 'string') {
    throw new Error('Name is required and must be a string');
  }

  let sanitized = name.trim();

  // Length validation
  if (sanitized.length < 2) {
    throw new Error('Name must be at least 2 characters long');
  }

  if (sanitized.length > 100) {
    throw new Error('Name is too long (maximum 100 characters)');
  }

  // Allow only letters, spaces, hyphens, and apostrophes
  if (!/^[a-zA-Z\s'-]+$/.test(sanitized)) {
    throw new Error('Name can only contain letters, spaces, hyphens, and apostrophes');
  }

  // Remove excessive whitespace
  sanitized = sanitized.replace(/\s+/g, ' ');

  // Check for suspicious patterns
  if (XSS_PATTERNS.some(pattern => pattern.test(sanitized))) {
    throw new Error('Name contains invalid characters');
  }

  return sanitized;
}

/**
 * Validate and sanitize addresses
 */
export function validateAndSanitizeAddress(address: string): string {
  if (!address || typeof address !== 'string') {
    throw new Error('Address is required and must be a string');
  }

  const sanitized = sanitizeInput(address, { maxLength: 500 });

  // Minimum length check
  if (sanitized.length < 10) {
    throw new Error('Address must be at least 10 characters long');
  }

  // Allow alphanumeric characters, spaces, and common punctuation
  if (!/^[a-zA-Z0-9\s,.\-#/()]+$/.test(sanitized)) {
    throw new Error('Address contains invalid characters');
  }

  return sanitized;
}

/**
 * Validate user ID
 */
export function validateAndSanitizeUserId(userId: string): string {
  if (!userId || typeof userId !== 'string') {
    throw new Error('User ID is required and must be a string');
  }

  const sanitized = userId.toLowerCase().trim();

  // Length validation
  if (sanitized.length < 3) {
    throw new Error('User ID must be at least 3 characters long');
  }

  if (sanitized.length > 50) {
    throw new Error('User ID is too long (maximum 50 characters)');
  }

  // Allow only alphanumeric characters, hyphens, and underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(sanitized)) {
    throw new Error('User ID can only contain letters, numbers, hyphens, and underscores');
  }

  // Check for reserved words
  const reservedWords = [
    'admin', 'administrator', 'root', 'system', 'api', 'www', 'mail', 'ftp',
    'null', 'undefined', 'test', 'demo', 'guest', 'anonymous', 'public'
  ];

  if (reservedWords.includes(sanitized)) {
    throw new Error('User ID cannot be a reserved word');
  }

  return sanitized;
}

/**
 * Validate tokens (hex strings)
 */
export function validateToken(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  // Must be hexadecimal and at least 32 characters
  return /^[a-fA-F0-9]{32,}$/.test(token);
}

/**
 * Validate file uploads
 */
export function validateFileUpload(file: {
  name: string;
  size: number;
  type: string;
}): void {
  if (!file.name || typeof file.name !== 'string') {
    throw new Error('File name is required');
  }

  if (file.name.length > 255) {
    throw new Error('File name is too long');
  }

  // Check for dangerous file extensions
  const dangerousExtensions = [
    '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
    '.php', '.asp', '.aspx', '.jsp', '.sh', '.py', '.pl', '.rb'
  ];

  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (dangerousExtensions.includes(fileExtension)) {
    throw new Error('File type not allowed');
  }

  // Size validation (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File size exceeds 5MB limit');
  }

  // MIME type validation
  const allowedMimeTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];

  if (!allowedMimeTypes.includes(file.type)) {
    throw new Error('File type not allowed');
  }
}

/**
 * Rate limiting key generator
 */
export function generateRateLimitKey(identifier: string, action: string): string {
  const sanitizedIdentifier = sanitizeInput(identifier, { removeNewlines: true, maxLength: 100 });
  const sanitizedAction = sanitizeInput(action, { removeNewlines: true, maxLength: 50 });
  
  return `${sanitizedAction}:${sanitizedIdentifier}`;
}

/**
 * Clean and validate search queries
 */
export function validateSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') {
    throw new Error('Search query is required');
  }

  let sanitized = query.trim();

  if (sanitized.length === 0) {
    throw new Error('Search query cannot be empty');
  }

  if (sanitized.length > 100) {
    throw new Error('Search query is too long');
  }

  // Remove special characters that could be used for injection
  sanitized = sanitized.replace(/[<>"'%;()&+]/g, '');

  // Check for SQL injection patterns
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      throw new Error('Search query contains invalid characters');
    }
  }

  return sanitized;
}
