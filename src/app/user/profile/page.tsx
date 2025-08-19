'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui';
import { formatDate, getStatusColor } from '@/lib/utils';
import { User, Mail, Phone, MapPin, Save, ArrowLeft } from 'lucide-react';
import UserNavbar from '@/components/UserNavbar';
import { toast } from 'react-hot-toast';

export default function UserProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [memberSince, setMemberSince] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookings, setBookings] = useState<Array<{
    id: string;
    status: 'PENDING' | 'APPROVED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
    paymentMethod: 'COD' | 'UPI';
    quantity?: number | null;
    createdAt: string;
    expectedDate?: string | null;
    deliveryDate?: string | null;
  }>>([]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }

    // Load user data
    loadUserProfile();
    void loadRecentBookings();
  }, [session, status, router]);

  const loadUserProfile = async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const json = await response.json();
        const userData = json.data || {};
        setFormData({
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          address: userData.address || '',
        });
        setMemberSince(userData.createdAt || null);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const loadRecentBookings = async () => {
    try {
      setBookingsLoading(true);
      const response = await fetch('/api/bookings?page=1&limit=5');
      const json = await response.json();
      if (json?.success) {
        const list = (json.data?.data || []) as typeof bookings;
        setBookings(list);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load bookings:', error);
    } finally {
      setBookingsLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Email is read-only and not editable

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
      <UserNavbar />

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

                {/* Read-only preview */}
                <CardContent className="space-y-4">
                  <Input
                    label="Full Name"
                    type="text"
                    value={formData.name}
                    disabled
                    icon={<User className="w-4 h-4" />}
                  />

                  <Input
                    label="Email Address"
                    type="email"
                    value={formData.email}
                    disabled
                    icon={<Mail className="w-4 h-4" />}
                  />

                  <Input
                    label="Phone Number"
                    type="tel"
                    value={formData.phone}
                    disabled
                    icon={<Phone className="w-4 h-4" />}
                  />

                  <Input
                    label="Address"
                    type="text"
                    value={formData.address}
                    disabled
                    icon={<MapPin className="w-4 h-4" />}
                  />
                </CardContent>

                <CardFooter>
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => router.push('/user/profile/edit')}
                  >
                    Edit Profile
                  </Button>
                </CardFooter>
              </Card>

              {/* Recent Bookings */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Recent Bookings</CardTitle>
                </CardHeader>
                <CardContent>
                  {bookingsLoading ? (
                    <p className="text-sm text-gray-600">Loading bookings...</p>
                  ) : bookings.length === 0 ? (
                    <p className="text-sm text-gray-600">No bookings found.</p>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {bookings.map((b) => (
                        <div key={b.id} className="py-3 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">Booking #{b.id.slice(0, 8)}</p>
                            <p className="text-xs text-gray-600">
                              {formatDate(b.createdAt)} · Qty: {b.quantity ?? 1} · {b.paymentMethod}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${getStatusColor(b.status)}`}
                            >
                              {b.status}
                            </span>
                            <button
                              onClick={() => router.push(`/user/track/${b.id}`)}
                              className="text-xs text-blue-600 hover:text-blue-700"
                            >
                              Track
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <button
                    onClick={() => router.push('/user/bookings')}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    View all bookings
                  </button>
                </CardFooter>
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
                      {memberSince ? formatDate(memberSince) : '—'}
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
