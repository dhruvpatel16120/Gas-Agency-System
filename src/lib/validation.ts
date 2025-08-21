import { z } from "zod";
import {
  sanitizeInput,
  validateEmail,
  validatePasswordStrength,
} from "./security";

// Common validation rules
const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Invalid email format")
  .max(254, "Email is too long")
  .refine((email) => validateEmail(email), "Email contains suspicious content")
  .transform((email) => email.toLowerCase().trim());

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .refine(
    (password: string) => validatePasswordStrength(password).isValid,
    "Password does not meet strength requirements",
  );

const nameSchema = z
  .string()
  .min(1, "Name is required")
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name is too long")
  .regex(
    /^[a-zA-Z\s'-]+$/,
    "Name can only contain letters, spaces, hyphens, and apostrophes",
  )
  .transform((name) => sanitizeInput(name.trim()));

const userIdSchema = z
  .string()
  .min(3, "User ID must be at least 3 characters")
  .max(50, "User ID is too long")
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "User ID can only contain letters, numbers, hyphens, and underscores",
  )
  .transform((userId) => userId.toLowerCase().trim());

const phoneSchema = z
  .string()
  .min(1, "Phone number is required")
  // Normalize: strip all non-digits and keep last 10 (handles +91, spaces, hyphens)
  .transform((phone) => phone.replace(/\D/g, "").slice(-10))
  .refine(
    (digits) => /^([6-9])\d{9}$/.test(digits),
    "Invalid Indian phone number format",
  );

const addressSchema = z
  .string()
  .min(1, "Address is required")
  .min(5, "Address must be at least 5 characters")
  .max(500, "Address is too long")
  .transform((address) => sanitizeInput(address.trim()));

const tokenSchema = z
  .string()
  .min(1, "Token is required")
  .min(32, "Invalid token format")
  .max(128, "Token is too long")
  .regex(/^[a-fA-F0-9]+$/, "Token must be hexadecimal");

// Registration validation schema
export const registerSchema = z.object({
  name: nameSchema,
  userId: userIdSchema,
  email: emailSchema,
  phone: phoneSchema,
  address: addressSchema,
  password: passwordSchema,
});

// Login validation schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, "Password is required")
    .max(128, "Password is too long"),
});

// Profile update validation schema
export const profileUpdateSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  address: addressSchema,
});

// Password reset request validation schema
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

// Password reset validation schema
export const resetPasswordSchema = z.object({
  token: tokenSchema,
  password: passwordSchema,
});

// Email verification validation schema
export const verifyEmailSchema = z.object({
  token: tokenSchema,
});

// Resend verification validation schema
export const resendVerificationSchema = z.object({
  email: emailSchema,
});

// Token validation schema
export const validateTokenSchema = z.object({
  token: tokenSchema,
});

// Booking validation schema (for future use)
export const bookingSchema = z.object({
  paymentMethod: z.enum(["UPI", "COD"] as const),
  quantity: z
    .number()
    .min(1, "Minimum quantity is 1")
    .max(3, "Maximum quantity is 3"),
  receiverName: z
    .string()
    .min(2, "Receiver name must be at least 2 characters")
    .max(100, "Receiver name is too long")
    .regex(
      /^[a-zA-Z\s'-]+$/,
      "Name can only contain letters, spaces, hyphens, and apostrophes",
    )
    .transform((name) => sanitizeInput(name.trim())),
  receiverPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/u, "Invalid receiver phone number")
    .transform((phone) => phone.replace(/\s/g, "")),
  expectedDate: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const date = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const max = new Date();
      max.setDate(max.getDate() + 7);
      max.setHours(23, 59, 59, 999);
      return date >= today && date <= max;
    }, "Expected delivery date must be within the next 7 days")
    .transform((val) => (val ? new Date(val).toISOString() : undefined)),
  notes: z
    .string()
    .max(500, "Notes are too long")
    .optional()
    .transform((notes) => (notes ? sanitizeInput(notes.trim()) : undefined)),
});

// Admin user creation schema
export const adminCreateUserSchema = z.object({
  name: nameSchema,
  userId: userIdSchema,
  email: emailSchema,
  phone: phoneSchema,
  address: addressSchema,
  role: z.enum(["USER", "ADMIN"] as const),
});

// Query parameter validation schemas
export const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => val > 0, "Page must be a positive number"),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .refine((val) => val > 0 && val <= 100, "Limit must be between 1 and 100"),
});

export const searchSchema = z.object({
  q: z
    .string()
    .min(1, "Search query is required")
    .max(100, "Search query is too long")
    .transform((query) => sanitizeInput(query.trim())),
});

// File upload validation (for future use)
export const fileUploadSchema = z.object({
  filename: z
    .string()
    .min(1, "Filename is required")
    .max(255, "Filename is too long")
    .regex(/^[a-zA-Z0-9._-]+$/, "Invalid filename format"),
  mimetype: z
    .string()
    .regex(/^[a-zA-Z0-9]+\/[a-zA-Z0-9.-]+$/, "Invalid MIME type"),
  size: z
    .number()
    .min(1, "File cannot be empty")
    .max(5 * 1024 * 1024, "File size cannot exceed 5MB"),
});

// Environment variable validation
export const envSchema = z.object({
  DATABASE_URL: z.string().url("Invalid database URL"),
  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NextAuth secret must be at least 32 characters"),
  NEXTAUTH_URL: z.string().url("Invalid NextAuth URL"),
  EMAIL_SERVER_HOST: z.string().min(1, "Email server host is required"),
  EMAIL_SERVER_PORT: z
    .string()
    .regex(/^\d+$/, "Email server port must be a number"),
  EMAIL_SERVER_USER: z.string().email("Invalid email server user"),
  EMAIL_SERVER_PASSWORD: z.string().min(1, "Email server password is required"),
});

// Type exports
export type RegisterData = z.infer<typeof registerSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;
export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailData = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationData = z.infer<typeof resendVerificationSchema>;
export type BookingData = z.infer<typeof bookingSchema>;
export type AdminCreateUserData = z.infer<typeof adminCreateUserSchema>;
export type PaginationData = z.infer<typeof paginationSchema>;
export type SearchData = z.infer<typeof searchSchema>;
export type FileUploadData = z.infer<typeof fileUploadSchema>;
