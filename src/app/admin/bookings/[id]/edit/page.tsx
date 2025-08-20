'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AdminNavbar from '@/components/AdminNavbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { 
  ArrowLeft, 
  Save, 
  Package, 
  User, 
  MapPin, 
  Phone, 
  Calendar,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

type Booking = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  userAddress: string;
  paymentMethod: 'COD' | 'UPI';
  quantity: number;
  receiverName?: string | null;
  receiverPhone?: string | null;
  status: 'PENDING' | 'APPROVED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  requestedAt: string;
  expectedDate?: string | null;
  deliveryDate?: string | null;
  deliveredAt?: string | null;
  notes?: string | null;
  paymentStatus?: 'PENDING' | 'SUCCESS' | 'FAILED';
  paymentAmount?: number;
  createdAt: string;
  updatedAt: string;
};

export default function EditBookingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id as string;
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    quantity: 1,
    paymentMethod: 'COD' as 'COD' | 'UPI',
    receiverName: '',
    receiverPhone: '',
    expectedDate: '',
    notes: '',
    deliveryAddress: '',
    status: 'PENDING' as 'PENDING' | 'APPROVED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.push('/login');
    else if (session.user.role !== 'ADMIN') router.push('/user');
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user?.role === 'ADMIN' && bookingId) {
      loadBooking();
    }
  }, [session, bookingId]);

  const loadBooking = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, { cache: 'no-store' });
      if (res.ok) {
        const result = await res.json();
        const bookingData = result.data;
        setBooking(bookingData);
        setFormData({
          quantity: bookingData.quantity,
          paymentMethod: bookingData.paymentMethod,
          receiverName: bookingData.receiverName || '',
          receiverPhone: bookingData.receiverPhone || '',
          expectedDate: bookingData.expectedDate ? new Date(bookingData.expectedDate).toISOString().split('T')[0] : '',
          notes: bookingData.notes || '',
          deliveryAddress: bookingData.userAddress,
          status: bookingData.status
        });
      }
    } catch (error) {
      console.error('Failed to load booking:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    setSaving(true);
    try {
      const payload = {
        quantity: formData.quantity,
        paymentMethod: formData.paymentMethod,
        receiverName: formData.receiverName || null,
        receiverPhone: formData.receiverPhone || null,
        expectedDate: formData.expectedDate || null,
        notes: formData.notes || null,
        userAddress: formData.deliveryAddress,
        status: formData.status
      };

      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('Booking updated successfully!');
        router.push(`/admin/bookings/${bookingId}`);
      } else {
        const error = await res.json();
        alert(error.message || 'Failed to update booking');
      }
    } catch (error) {
      console.error('Failed to update booking:', error);
      alert('Failed to update booking');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading') return null;
  if (!session || session.user.role !== 'ADMIN') return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading booking...</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Booking Not Found</h2>
              <p className="text-gray-600 mb-4">The booking you're looking for doesn't exist.</p>
              <button
                onClick={() => router.push('/admin/bookings')}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Back to Bookings
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Booking
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Booking #{booking.id}</h1>
              <p className="text-sm text-gray-600">Modify booking details and information</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Information (Read-only) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Customer Name</label>
                    <p className="text-gray-900">{booking.userName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Phone</label>
                    <p className="text-gray-900">{booking.userPhone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Email</label>
                    <p className="text-gray-900">{booking.userEmail}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">User ID</label>
                    <p className="text-gray-900 font-mono text-sm">{booking.userId}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Booking Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Booking Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={formData.quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value as 'COD' | 'UPI' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    >
                      <option value="COD">Cash on Delivery</option>
                      <option value="UPI">UPI Payment</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Receiver Name
                    </label>
                    <input
                      type="text"
                      value={formData.receiverName}
                      onChange={(e) => setFormData(prev => ({ ...prev, receiverName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Leave empty to use customer name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Receiver Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.receiverPhone}
                      onChange={(e) => setFormData(prev => ({ ...prev, receiverPhone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Leave empty to use customer phone"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expected Delivery Date
                    </label>
                    <input
                      type="date"
                      value={formData.expectedDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, expectedDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    >
                      <option value="PENDING">Pending</option>
                      <option value="APPROVED">Approved</option>
                      <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                      <option value="DELIVERED">Delivered</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={formData.deliveryAddress}
                    onChange={(e) => setFormData(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Delivery address"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Additional notes or special instructions..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
