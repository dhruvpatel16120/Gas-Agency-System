import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import bcrypt from 'bcryptjs';
import { BookingStatus, PaymentMethod, UserRole } from '@prisma/client';

// Tailwind CSS utility function
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Password hashing
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

// Password verification
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Generate random string
export function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Format date
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Format date and time
export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Get status badge color
export function getStatusColor(status: BookingStatus): string {
  switch (status) {
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'APPROVED':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'OUT_FOR_DELIVERY':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'DELIVERED':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'CANCELLED':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

// Get payment method display name
export function getPaymentMethodDisplay(method: PaymentMethod): string {
  switch (method) {
    case 'COD':
      return 'Cash on Delivery';
    case 'UPI':
      return 'UPI Payment';
    default:
      return method;
  }
}

// Get role display name
export function getRoleDisplay(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
      return 'Administrator';
    case 'USER':
      return 'User';
    default:
      return role;
  }
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate phone number format (Indian format)
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

// Validate password strength
export function validatePassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
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

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Calculate delivery date (2 days from approval)
export function calculateDeliveryDate(): Date {
  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 2);
  return deliveryDate;
}

// Format currency (Indian Rupees)
export function formatCurrency(amount: number): string {
  // Amount is already in rupees, no conversion needed
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
}

// Generate booking ID
export function generateBookingId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `BK${timestamp}${random}`.toUpperCase();
}

// Generate user ID
export function generateUserId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 4);
  return `USER${timestamp}${random}`.toUpperCase();
}

// Pagination helper
export function getPaginationInfo(
  page: number,
  limit: number,
  total: number
): {
  currentPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  startIndex: number;
  endIndex: number;
} {
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const hasNext = currentPage < totalPages;
  const hasPrev = currentPage > 1;
  const startIndex = (currentPage - 1) * limit;
  const endIndex = Math.min(startIndex + limit, total);

  return {
    currentPage,
    totalPages,
    hasNext,
    hasPrev,
    startIndex,
    endIndex,
  };
}

// Debounce function
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle function
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Deep clone object
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const clonedObj = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }

  return obj;
}

// Sleep function for testing
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Generate initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Truncate text
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + '...';
}

// Capitalize first letter
export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Convert string to title case
export function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}
