import { toast } from 'react-hot-toast';

// API Error response interface
export interface APIErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: unknown;
}

// API Success response interface
export interface APISuccessResponse<T = unknown> {
  success: true;
  message?: string;
  data?: T;
}

export type APIResponse<T = unknown> = APIErrorResponse | APISuccessResponse<T>;

// Error types
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  CONFLICT = 'CONFLICT_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  NETWORK = 'NETWORK_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR',
}

// Form validation errors
export interface FormErrors {
  [key: string]: string;
}

// Frontend error handler class
export class FrontendErrorHandler {
  /**
   * Handle API response and show appropriate messages
   */
  static async handleAPIResponse<T>(
    response: Response,
    options: {
      showSuccessToast?: boolean;
      showErrorToast?: boolean;
      successMessage?: string;
    } = {}
  ): Promise<T | null> {
    const {
      showSuccessToast = true,
      showErrorToast = true,
      successMessage,
    } = options;

    try {
      const data: APIResponse<T> = await response.json();

      if (response.ok && data.success) {
        if (showSuccessToast) {
          toast.success(successMessage || data.message || 'Operation successful');
        }
        return data.data || null;
      } else {
        const errorData = data as APIErrorResponse;
        if (showErrorToast) {
          this.showErrorToast(errorData.error, errorData.message, response.status);
        }
        throw new APIError(errorData.error, errorData.message, response.status, errorData.details);
      }
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      
      // Handle JSON parsing errors
      const fallbackMessage = this.getStatusMessage(response.status);
      if (showErrorToast) {
        toast.error(fallbackMessage);
      }
      throw new APIError(ErrorType.UNKNOWN, fallbackMessage, response.status);
    }
  }

  /**
   * Handle fetch errors (network issues, etc.)
   */
  static handleFetchError(error: unknown): APIError {
    console.error('Fetch error:', error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      toast.error('Network error. Please check your connection.');
      return new APIError(ErrorType.NETWORK, 'Network error. Please check your connection.', 0);
    }

    toast.error('An unexpected error occurred. Please try again.');
    return new APIError(ErrorType.UNKNOWN, 'An unexpected error occurred', 0);
  }

  /**
   * Show error toast based on error type and status
   */
  private static showErrorToast(errorType: string, message: string, status: number): void {
    switch (errorType) {
      case ErrorType.VALIDATION:
        toast.error(message || 'Please check your input and try again.');
        break;
      case ErrorType.AUTHENTICATION:
        toast.error(message || 'Please log in to continue.');
        break;
      case ErrorType.AUTHORIZATION:
        toast.error(message || 'You do not have permission to perform this action.');
        break;
      case ErrorType.NOT_FOUND:
        toast.error(message || 'The requested resource was not found.');
        break;
      case ErrorType.CONFLICT:
        toast.error(message || 'This action conflicts with existing data.');
        break;
      case ErrorType.RATE_LIMIT:
        toast.error(message || 'Too many requests. Please try again later.');
        break;
      default:
        toast.error(message || this.getStatusMessage(status));
    }
  }

  /**
   * Get user-friendly message based on HTTP status
   */
  private static getStatusMessage(status: number): string {
    switch (status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Please log in to continue.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'This action conflicts with existing data.';
      case 429:
        return 'Too many requests. Please try again later.';
      case 500:
        return 'Server error. Please try again later.';
      case 503:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return 'An error occurred. Please try again.';
    }
  }

  /**
   * Handle form validation errors
   */
  static handleValidationErrors(
    errors: Array<{ field?: string; message?: string }>,
    setErrors: (errors: FormErrors) => void
  ): void {
    const formErrors: FormErrors = {};
    
    errors.forEach((error) => {
      if (error.field && error.message) {
        formErrors[error.field] = error.message;
      }
    });

    setErrors(formErrors);
  }

  /**
   * Safe API call wrapper
   */
  static async safeAPICall<T>(
    apiCall: () => Promise<Response>,
    options: {
      showSuccessToast?: boolean;
      showErrorToast?: boolean;
      successMessage?: string;
      onSuccess?: (data: T) => void;
      onError?: (error: APIError) => void;
    } = {}
  ): Promise<T | null> {
    try {
      const response = await apiCall();
      const data = await this.handleAPIResponse<T>(response, options);
      
      if (options.onSuccess && data) {
        options.onSuccess(data);
      }
      
      return data;
    } catch (error) {
      if (error instanceof APIError) {
        if (options.onError) {
          options.onError(error);
        }
        throw error;
      }
      
      const apiError = this.handleFetchError(error);
      if (options.onError) {
        options.onError(apiError);
      }
      throw apiError;
    }
  }
}

// Custom API Error class
export class APIError extends Error {
  constructor(
    public type: string,
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Form validation utilities
export class FormValidator {
  /**
   * Validate email format
   */
  static validateEmail(email: string): string | null {
    if (!email) return 'Email is required';
    if (email.length > 254) return 'Email is too long';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Please enter a valid email address';
    }
    return null;
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): string | null {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (password.length > 128) return 'Password is too long';
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
    if (!/\d/.test(password)) return 'Password must contain at least one number';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return 'Password must contain at least one special character';
    }
    return null;
  }

  /**
   * Validate name
   */
  static validateName(name: string): string | null {
    if (!name?.trim()) return 'Name is required';
    if (name.trim().length < 2) return 'Name must be at least 2 characters';
    if (name.trim().length > 100) return 'Name is too long';
    if (!/^[a-zA-Z\s'-]+$/.test(name.trim())) {
      return 'Name can only contain letters, spaces, hyphens, and apostrophes';
    }
    return null;
  }

  /**
   * Validate phone number
   */
  static validatePhone(phone: string): string | null {
    if (!phone) return 'Phone number is required';
    const cleanPhone = phone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return 'Please enter a valid 10-digit Indian phone number';
    }
    return null;
  }

  /**
   * Validate address
   */
  static validateAddress(address: string): string | null {
    if (!address?.trim()) return 'Address is required';
    if (address.trim().length < 10) return 'Address must be at least 10 characters';
    if (address.trim().length > 500) return 'Address is too long';
    return null;
  }

  /**
   * Validate user ID
   */
  static validateUserId(userId: string): string | null {
    if (!userId?.trim()) return 'User ID is required';
    if (userId.trim().length < 3) return 'User ID must be at least 3 characters';
    if (userId.trim().length > 50) return 'User ID is too long';
    if (!/^[a-zA-Z0-9_-]+$/.test(userId.trim())) {
      return 'User ID can only contain letters, numbers, hyphens, and underscores';
    }
    return null;
  }

  /**
   * Validate all form fields
   */
  static validateForm(data: Record<string, unknown>, rules: Record<string, string[]>): FormErrors {
    const errors: FormErrors = {};

    Object.keys(rules).forEach((field) => {
      const value = data[field];
      const fieldRules = rules[field];

      for (const rule of fieldRules) {
        let error: string | null = null;

        switch (rule) {
          case 'email':
            error = this.validateEmail(typeof value === 'string' ? value : '');
            break;
          case 'password':
            error = this.validatePassword(typeof value === 'string' ? value : '');
            break;
          case 'name':
            error = this.validateName(typeof value === 'string' ? value : '');
            break;
          case 'phone':
            error = this.validatePhone(typeof value === 'string' ? value : '');
            break;
          case 'address':
            error = this.validateAddress(typeof value === 'string' ? value : '');
            break;
          case 'userId':
            error = this.validateUserId(typeof value === 'string' ? value : '');
            break;
          case 'required':
            if (!value?.toString().trim()) {
              error = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
            }
            break;
        }

        if (error) {
          errors[field] = error;
          break; // Stop at first error for this field
        }
      }
    });

    return errors;
  }
}

// Loading state manager
export class LoadingManager {
  private static loadingStates: Map<string, boolean> = new Map();

  static setLoading(key: string, loading: boolean): void {
    this.loadingStates.set(key, loading);
  }

  static isLoading(key: string): boolean {
    return this.loadingStates.get(key) || false;
  }

  static clearLoading(key: string): void {
    this.loadingStates.delete(key);
  }

  static clearAllLoading(): void {
    this.loadingStates.clear();
  }
}

// Retry utility for failed requests
export class RetryManager {
  static async retry<T>(
    fn: () => Promise<T>,
    options: {
      maxAttempts?: number;
      delay?: number;
      backoff?: boolean;
    } = {}
  ): Promise<T> {
    const { maxAttempts = 3, delay = 1000, backoff = true } = options;
    
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxAttempts) {
          break;
        }
        
        const waitTime = backoff ? delay * Math.pow(2, attempt - 1) : delay;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    throw lastError!;
  }
}
