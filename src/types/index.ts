import { User, Booking, Notification, UserRole, PaymentMethod, BookingStatus, NotificationType } from '@prisma/client';

// User Types
export type UserWithRelations = User & {
  bookings: Booking[];
  notifications: Notification[];
};

export type CreateUserInput = {
  email: string;
  name: string;
  userId: string;
  phone: string;
  address: string;
  password: string;
  role?: UserRole;
};

export type UpdateUserInput = Partial<Omit<CreateUserInput, 'password'>>;

// Booking Types
export type CreateBookingInput = {
  userId: string;
  userName: string;
  paymentMethod: PaymentMethod;
  notes?: string;
};

export type UpdateBookingInput = {
  status?: BookingStatus;
  deliveryDate?: Date;
  deliveredAt?: Date;
  notes?: string;
};

export type BookingWithUser = Booking & {
  user: User;
};

// Notification Types
export type CreateNotificationInput = {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
};

export type NotificationWithUser = Notification & {
  user: User;
};

// Auth Types
export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  image?: string;
};

// API Response Types
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

// Dashboard Types
export type DashboardStats = {
  totalUsers: number;
  totalBookings: number;
  pendingBookings: number;
  approvedBookings: number;
  deliveredBookings: number;
  totalRevenue?: number;
};

export type UserDashboardData = {
  user: User;
  recentBookings: Booking[];
  notifications: Notification[];
  stats: {
    totalBookings: number;
    pendingBookings: number;
    remainingQuota: number;
  };
};

// Email Types
export type EmailTemplate = {
  subject: string;
  html: string;
  text: string;
};

export type EmailData = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

// Form Types
export type LoginFormData = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

export type RegisterFormData = {
  name: string;
  userId: string;
  email: string;
  phone: string;
  address: string;
  password: string;
  confirmPassword: string;
};

export type BookingFormData = {
  paymentMethod: PaymentMethod;
  notes?: string;
};

// Filter Types
export type BookingFilters = {
  status?: BookingStatus;
  paymentMethod?: PaymentMethod;
  dateFrom?: Date;
  dateTo?: Date;
  userId?: string;
};

export type UserFilters = {
  role?: UserRole;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
};

// Pagination Types
export type PaginationParams = {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

// Component Props Types
export type ButtonProps = {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
};

export type InputProps = {
  label?: string;
  placeholder?: string;
  type?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
};

export type CardProps = {
  children: React.ReactNode;
  title?: string;
  className?: string;
  headerActions?: React.ReactNode;
};

// Utility Types
export type StatusBadgeProps = {
  status: BookingStatus;
  className?: string;
};

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export type ToastType = 'success' | 'error' | 'warning' | 'info';
