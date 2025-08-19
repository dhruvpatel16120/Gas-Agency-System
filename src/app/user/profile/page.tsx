'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui';
import { Flame, User, Mail, Phone, MapPin, Save, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function UserProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }

    // Load user data
    loadUserProfile();
  }, [session, status, router]);

  const loadUserProfile = async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const userData = await response.json();
        setFormData({
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          address: userData.address || '',
        });
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[6-9]\d{9}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    } else if (formData.address.trim().length < 10) {
      newErrors.address = 'Address must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.replace(/\s/g, ''),
          address: formData.address.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Profile updated successfully!');
      } else {
        toast.error(data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Flame className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Gas Agency System</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {session.user.name}</span>
              <button
                onClick={() => router.push('/api/auth/signout')}
                className="text-gray-500 hover:text-gray-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Back Button */}
          <div className="mb-6">
            <button
              onClick={() => router.push('/user')}
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Profile Information
                  </CardTitle>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                  <CardContent className="space-y-4">
                    {/* Name Input */}
                    <Input
                      label="Full Name"
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      error={errors.name}
                      required
                      autoComplete="name"
                      icon={<User className="w-4 h-4" />}
                    />

                    {/* Email Input (Read-only) */}
                    <Input
                      label="Email Address"
                      type="email"
                      value={formData.email}
                      error={errors.email}
                      disabled
                      autoComplete="email"
                      icon={<Mail className="w-4 h-4" />}
                      helperText="Email cannot be changed"
                    />

                    {/* Phone Input */}
                    <Input
                      label="Phone Number"
                      type="tel"
                      placeholder="Enter your phone number"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      error={errors.phone}
                      required
                      autoComplete="tel"
                      icon={<Phone className="w-4 h-4" />}
                    />

                    {/* Address Input */}
                    <Input
                      label="Address"
                      type="text"
                      placeholder="Enter your complete address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      error={errors.address}
                      required
                      autoComplete="street-address"
                      icon={<MapPin className="w-4 h-4" />}
                    />
                  </CardContent>

                  <CardFooter>
                    <Button
                      type="submit"
                      className="w-full"
                      loading={loading}
                      disabled={loading}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </div>

            {/* Account Info Card */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">User ID</p>
                    <p className="text-sm text-gray-600">{session.user.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Role</p>
                    <p className="text-sm text-gray-600 capitalize">{session.user.role.toLowerCase()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Member Since</p>
                    <p className="text-sm text-gray-600">
                      N/A
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <button
                    onClick={() => router.push('/user')}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <h3 className="font-semibold text-gray-900">Back to Dashboard</h3>
                    <p className="text-sm text-gray-600">Return to main dashboard</p>
                  </button>
                  <button
                    onClick={() => router.push('/user/bookings')}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <h3 className="font-semibold text-gray-900">View Bookings</h3>
                    <p className="text-sm text-gray-600">Check your booking history</p>
                  </button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
