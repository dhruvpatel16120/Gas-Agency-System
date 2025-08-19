'use client';

import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui';
import { Shield, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { FormValidator, FormErrors, LoadingManager } from '@/lib/frontend-error-handler';

export default function AdminLoginPage() {
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
    LoadingManager.setLoading('admin-login', true);
    setErrors({});

    try {
      const result = await signIn('credentials', {
        email: formData.email.toLowerCase().trim(),
        password: formData.password,
        redirect: false,
        admin: 'true',
      });

      if (result?.error) {
        if (result.error.includes('Admin account required')) {
          setErrors({ email: 'This account is not an admin' });
          toast.error('This account is not an admin');
        } else if (result.error.includes('CredentialsSignin')) {
          setErrors({ password: 'Invalid email or password' });
          toast.error('Invalid email or password');
        } else {
          setErrors({ password: 'Login failed. Please try again.' });
          toast.error('Login failed. Please try again.');
        }
        return;
      }

      const session = await getSession();
      if (session?.user?.role === 'ADMIN') {
        toast.success('Welcome, Admin!');
        router.push('/admin');
      } else {
        toast.error('Not authorized as admin');
      }
    } catch (error) {
      console.error('Admin login error:', error);
      setErrors({ password: 'An unexpected error occurred. Please try again.' });
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
      LoadingManager.clearLoading('admin-login');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-full mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Portal</h1>
          <p className="text-gray-600">Sign in to manage the system</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-semibold text-purple-600">Admin Sign In</CardTitle>
          </CardHeader>

          <form onSubmit={handleSubmit} noValidate>
            <CardContent className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="Enter your admin email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                error={errors.email}
                required
                autoComplete="email"
                disabled={loading}
              />

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

              {Object.keys(errors).length > 0 && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600">Please fix the errors above to continue</p>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" loading={loading} disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In as Admin'}
              </Button>

              <div className="text-center">
                <span className="text-sm text-gray-600">Regular user? </span>
                <Link href="/login" className="text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors">
                  Go to user login
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}


