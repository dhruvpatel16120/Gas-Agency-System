'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AdminNavbar from '@/components/AdminNavbar';
import { toast } from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { 
  ArrowLeft, 
  Save, 
  Truck, 
  Package, 
  User, 
  Calendar,
  MapPin,
  Phone,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

type Booking = {
  id: string;
  userName: string;
  userPhone: string;
  userAddress: string;
  quantity: number;
  status: string;
  expectedDate?: string | null;
};

type DeliveryPartner = {
  id: string;
  name: string;
  phone: string;
  email: string;
  vehicleNumber?: string;
  serviceArea?: string;
  capacityPerDay: number;
  isActive: boolean;
  currentAssignments?: number;
  totalDeliveries?: number;
  completedDeliveries?: number;
  averageRating?: number;
  lastActive?: string;
};

export default function AssignDeliveryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id as string;
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [selectedPartner, setSelectedPartner] = useState<DeliveryPartner | null>(null);
  const [formData, setFormData] = useState({
    scheduledDate: '',
    scheduledTime: '09:00',
    notes: '',
    priority: 'normal'
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.push('/login');
    else if (session.user.role !== 'ADMIN') router.push('/user');
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user?.role === 'ADMIN' && bookingId) {
      loadData();
    }
  }, [session, bookingId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bookingRes, partnersRes] = await Promise.all([
        fetch(`/api/bookings/${bookingId}`, { cache: 'no-store' }),
        fetch('/api/admin/deliveries/partners?includeStats=true', { cache: 'no-store' })
      ]);

      if (bookingRes.ok) {
        const bookingData = await bookingRes.json();
        setBooking(bookingData.data);
      }

      if (partnersRes.ok) {
        const partnersData = await partnersRes.json();
        
        // Fix: The API returns { data: { data: [...], pagination: {...} } }
        // So we need to access partnersData.data.data
        if (partnersData.success && partnersData.data && partnersData.data.data) {
          setPartners(partnersData.data.data);
        } else if (partnersData.data && Array.isArray(partnersData.data)) {
          // Fallback: if the response structure is different
          setPartners(partnersData.data);
        } else {
          console.error('API response indicates failure or missing data');
          setPartners([]);
        }
      } else {
        console.error('Partners API error:', partnersRes.status, partnersRes.statusText);
        const errorText = await partnersRes.text();
        console.error('Error response:', errorText);
        setPartners([]);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePartnerSelect = (partner: DeliveryPartner) => {
    setSelectedPartner(partner);
    setSelectedPartnerId(partner.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner) {
      toast.error('Please select a delivery partner');
      return;
    }

    if (!formData.scheduledDate) {
      toast.error('Please select a scheduled date');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        partnerId: selectedPartner.id,
        scheduledDate: formData.scheduledDate,
        scheduledTime: formData.scheduledTime,
        notes: formData.notes,
        priority: formData.priority
      };

      const res = await fetch(`/api/admin/bookings/${bookingId}/assign-delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (res.ok && result.success) {
        toast.success('Delivery partner assigned successfully! Email notification sent to customer.');
        router.push(`/admin/bookings/${bookingId}`);
      } else {
        toast.error(result.message || 'Failed to assign delivery partner');
      }
    } catch (error) {
      console.error('Failed to assign delivery partner:', error);
      toast.error('Failed to assign delivery partner');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-blue-100 text-blue-800';
      case 'OUT_FOR_DELIVERY': return 'bg-purple-100 text-purple-800';
      case 'DELIVERED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
                <p className="text-gray-600">Loading...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Assign Delivery Partner</h1>
              <p className="text-sm text-gray-600">Select a delivery partner for this booking</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Booking Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Booking Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Customer</label>
                    <p className="text-gray-900">{booking.userName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Phone</label>
                    <p className="text-gray-900">{booking.userPhone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Quantity</label>
                    <p className="text-gray-900">{booking.quantity} cylinder(s)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Status</label>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                      {booking.status}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Delivery Address</label>
                  <p className="text-gray-900">{booking.userAddress}</p>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Partner Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Select Delivery Partner
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {partners && partners.length > 0 ? (
                  <div className="space-y-3">
                    {partners.map((partner) => (
                      <div
                        key={partner.id}
                        onClick={() => handlePartnerSelect(partner)}
                        className={`p-4 cursor-pointer border rounded-lg hover:bg-gray-50 transition-colors ${
                          selectedPartnerId === partner.id ? 'border-purple-300 bg-purple-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                <Truck className="w-5 h-5 text-purple-600" />
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{partner.name}</div>
                                <div className="text-sm text-gray-500">{partner.phone}</div>
                                {partner.vehicleNumber && (
                                  <div className="text-xs text-gray-400">Vehicle: {partner.vehicleNumber}</div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                              {partner.currentAssignments || 0}/{partner.capacityPerDay}
                            </div>
                            <div className="text-xs text-gray-500">Today's deliveries</div>
                            <div className="text-xs text-gray-500">
                              {partner.serviceArea || 'All areas'}
                            </div>
                          </div>
                        </div>
                        {selectedPartnerId === partner.id && (
                          <div className="mt-3 p-2 bg-purple-100 rounded border border-purple-200">
                            <div className="flex items-center gap-2 text-purple-800">
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-sm font-medium">Selected</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-3">No active delivery partners found</p>
                    <button
                      type="button"
                      onClick={() => router.push('/admin/deliveries/partners/new')}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      Add New Partner
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Delivery Schedule */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Delivery Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Scheduled Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.scheduledDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preferred Time
                    </label>
                    <select
                      value={formData.scheduledTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="09:00">9:00 AM</option>
                      <option value="10:00">10:00 AM</option>
                      <option value="11:00">11:00 AM</option>
                      <option value="12:00">12:00 PM</option>
                      <option value="13:00">1:00 PM</option>
                      <option value="14:00">2:00 PM</option>
                      <option value="15:00">3:00 PM</option>
                      <option value="16:00">4:00 PM</option>
                      <option value="17:00">5:00 PM</option>
                      <option value="18:00">6:00 PM</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expected Delivery Date
                    </label>
                    <p className="text-gray-900 py-2">
                      {booking.expectedDate ? new Date(booking.expectedDate).toLocaleDateString() : 'Not set'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Notes
                  </label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Special instructions, landmarks, or delivery notes..."
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
                disabled={!selectedPartner || submitting}
                className="inline-flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Assign Delivery Partner
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
