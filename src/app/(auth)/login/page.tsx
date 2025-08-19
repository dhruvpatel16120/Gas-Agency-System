'use client';

import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui';
import { Flame, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { FormValidator, FormErrors, LoadingManager } from '@/lib/frontend-error-handler';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  
  const router = useRouter();

  const validateForm = (): boolean => {
    const validationErrors = FormValidator.validateForm(formData, {
      email: ['required', 'email'],
      password: ['required'],
    });

    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors below');
      return;
    }

    setLoading(true);
    LoadingManager.setLoading('login', true);
    setErrors({});

    try {
      const result = await signIn('credentials', {
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        // Handle specific error cases
        if (result.error.includes('verify your email')) {
          setErrors({ email: 'Please verify your email address before logging in' });
          toast.error('Please verify your email address before logging in');
        } else if (result.error.includes('CredentialsSignin')) {
          setErrors({ password: 'Invalid email or password' });
          toast.error('Invalid email or password');
        } else {
          setErrors({ password: 'Login failed. Please try again.' });
          toast.error('Login failed. Please try again.');
        }
        return;
      }

      // Success - get session and redirect based on role
      try {
        const session = await getSession();
        
        if (session?.user?.role === 'ADMIN') {
          toast.success('Welcome back, Admin!');
          router.push('/admin');
        } else {
          toast.success('Welcome back!');
          router.push('/user');
        }
      } catch (sessionError) {
        console.error('Session error:', sessionError);
        toast.error('Login successful but failed to load user data. Please refresh the page.');
      }

    } catch (error) {
      console.error('Login error:', error);
      setErrors({ password: 'An unexpected error occurred. Please try again.' });
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
      LoadingManager.clearLoading('login');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleForgotPassword = () => {
    if (formData.email) {
      router.push(`/forgot-password?email=${encodeURIComponent(formData.email)}`);
    } else {
      router.push('/forgot-password');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Flame className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gas Agency System</h1>
          <p className="text-gray-600">Sign in to your account</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-semibold text-blue-600">Welcome Back</CardTitle>
            <p className="text-gray-600">Enter your credentials to continue</p>
          </CardHeader>

          <form onSubmit={handleSubmit} noValidate>
            <CardContent className="space-y-4">
              {/* Email Input */}
              <Input
                label="Email Address"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                error={errors.email}
                required
                autoComplete="email"
                disabled={loading}
              />

              {/* Password Input */}
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  error={errors.password}
                  required
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-8 text-gray-400 hover:text-gray-600 transition-colors disabled:cursor-not-allowed"
                  disabled={loading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Error Alert */}
              {Object.keys(errors).length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600">
                    Please fix the errors above to continue
                  </p>
                </div>
              )}

              {/* Forgot Password Link */}
              <div className="text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  Forgot your password?
                </button>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full"
                loading={loading}
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>

              <div className="text-center">
                <span className="text-sm text-gray-600">Don&apos;t have an account? </span>
                <Link
                  href="/register"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Sign up
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-500">
            © 2024 Gas Agency System. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}