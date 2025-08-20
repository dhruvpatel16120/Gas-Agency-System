'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AdminNavbar from '@/components/AdminNavbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { 
  ArrowLeft, 
  Edit, 
  Truck, 
  Package, 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Send,
  Download,
  X
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
  deliveryPartnerId?: string | null;
  deliveryPartnerName?: string | null;
  cylinderReserved?: boolean;
  createdAt: string;
  updatedAt: string;
};

type Payment = {
  id: string;
  amount: number;
  method: 'COD' | 'UPI';
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  upiTxnId?: string;
  createdAt: string;
};

type DeliveryAssignment = {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerPhone: string;
  status: 'ASSIGNED' | 'PICKED_UP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED';
  assignedAt: string;
  notes?: string;
};

type BookingEvent = {
  id: string;
  status: string;
  title: string;
  description?: string;
  createdAt: string;
};

export default function BookingDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id as string;
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [deliveryAssignment, setDeliveryAssignment] = useState<DeliveryAssignment | null>(null);
  const [events, setEvents] = useState<BookingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [showPaymentReminder, setShowPaymentReminder] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.push('/login');
    else if (session.user.role !== 'ADMIN') router.push('/user');
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user?.role === 'ADMIN' && bookingId) {
      loadBookingDetails();
    }
  }, [session, bookingId]);

  const loadBookingDetails = async () => {
    setLoading(true);
    try {
      const [bookingRes, paymentsRes, deliveryRes, eventsRes] = await Promise.all([
        fetch(`/api/bookings/${bookingId}`, { cache: 'no-store' }),
        fetch(`/api/admin/bookings/${bookingId}/payments`, { cache: 'no-store' }),
        fetch(`/api/admin/bookings/${bookingId}/delivery`, { cache: 'no-store' }),
        fetch(`/api/admin/bookings/${bookingId}/events`, { cache: 'no-store' })
      ]);

      if (bookingRes.ok) {
        const bookingData = await bookingRes.json();
        setBooking(bookingData.data);
      }

      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        setPayments(paymentsData.data || []);
      }

      if (deliveryRes.ok) {
        const deliveryData = await deliveryRes.json();
        setDeliveryAssignment(deliveryData.data);
      }

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData.data || []);
      }
    } catch (error) {
      console.error('Failed to load booking details:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    setActionLoading('status');
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        await loadBookingDetails();
      } else {
        alert('Failed to update status');
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const sendEmail = async (type: 'confirmation' | 'delivery' | 'reminder' | 'payment') => {
    setActionLoading('email');
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      });

      if (res.ok) {
        alert(`${type.charAt(0).toUpperCase() + type.slice(1)} email sent successfully!`);
      } else {
        alert('Failed to send email');
      }
    } catch (error) {
      console.error('Failed to send email:', error);
      alert('Failed to send email');
    } finally {
      setActionLoading(null);
    }
  };

  const cancelBooking = async () => {
    if (!cancellationReason.trim()) {
      alert('Please provide a cancellation reason');
      return;
    }

    setActionLoading('cancel');
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'CANCELLED',
          cancellationReason: cancellationReason.trim()
        })
      });

      if (res.ok) {
        // Send cancellation email with reason
        await fetch(`/api/admin/bookings/${bookingId}/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            type: 'cancellation',
            additionalData: { reason: cancellationReason.trim() }
          })
        });

        alert('Booking cancelled successfully');
        setShowCancellationModal(false);
        setCancellationReason('');
        await loadBookingDetails();
      } else {
        alert('Failed to cancel booking');
      }
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      alert('Failed to cancel booking');
    } finally {
      setActionLoading(null);
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

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'SUCCESS': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (status === 'loading') return null;
  if (!session || session.user.role !== 'ADMIN') return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading booking details...</p>
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
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Booking Not Found</h2>
              <p className="text-gray-600 mb-4">The booking you're looking for doesn't exist or has been removed.</p>
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
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/bookings')}
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Bookings
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Booking #{booking.id}</h1>
                <p className="text-sm text-gray-600">
                  Created on {new Date(booking.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(`/admin/bookings/${bookingId}/edit`)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => router.push(`/admin/bookings/${bookingId}/assign-delivery`)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <Truck className="w-4 h-4" />
                Assign Delivery
              </button>
            </div>
          </div>

          {/* Status and Actions */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                    {booking.status}
                  </span>
                  <span className="text-sm text-gray-600">
                    Last updated: {new Date(booking.updatedAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {booking.status === 'PENDING' && (
                    <button
                      onClick={() => updateStatus('APPROVED')}
                      disabled={actionLoading === 'status'}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {actionLoading === 'status' ? 'Updating...' : 'Approve'}
                    </button>
                  )}
                  {booking.status === 'APPROVED' && (
                    <button
                      onClick={() => updateStatus('OUT_FOR_DELIVERY')}
                      disabled={actionLoading === 'status'}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {actionLoading === 'status' ? 'Updating...' : 'Out for Delivery'}
                    </button>
                  )}
                  {(booking.status === 'OUT_FOR_DELIVERY' || booking.status === 'APPROVED') && (
                    <button
                      onClick={() => updateStatus('DELIVERED')}
                      disabled={actionLoading === 'status'}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {actionLoading === 'status' ? 'Updating...' : 'Mark Delivered'}
                    </button>
                  )}
                  {booking.status !== 'DELIVERED' && booking.status !== 'CANCELLED' && (
                    <button
                      onClick={() => updateStatus('CANCELLED')}
                      disabled={actionLoading === 'status'}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {actionLoading === 'status' ? 'Updating...' : 'Cancel'}
                    </button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Customer & Booking Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Information */}
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
                      <label className="block text-sm font-medium text-gray-500">Name</label>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Address</label>
                    <p className="text-gray-900">{booking.userAddress}</p>
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
                      <label className="block text-sm font-medium text-gray-500">Quantity</label>
                      <p className="text-gray-900">{booking.quantity} cylinder(s)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Payment Method</label>
                      <p className="text-gray-900">{booking.paymentMethod}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Requested Date</label>
                      <p className="text-gray-900">{new Date(booking.requestedAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Expected Delivery</label>
                      <p className="text-gray-900">
                        {booking.expectedDate ? new Date(booking.expectedDate).toLocaleDateString() : 'Not set'}
                      </p>
                    </div>
                  </div>
                  
                  {booking.receiverName && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Receiver Name</label>
                        <p className="text-gray-900">{booking.receiverName}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Receiver Phone</label>
                        <p className="text-gray-900">{booking.receiverPhone}</p>
                      </div>
                    </div>
                  )}

                  {booking.notes && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Notes</label>
                      <p className="text-gray-900">{booking.notes}</p>
                    </div>
                  )}

                  {booking.cylinderReserved && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-800">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Cylinder Reserved</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Payment Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {payments.length > 0 ? (
                    <div className="space-y-3">
                      {payments.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(payment.status)}`}>
                                {payment.status}
                              </span>
                              <span className="text-sm text-gray-600">{payment.method}</span>
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {new Date(payment.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-gray-900">₹{payment.amount}</div>
                            {payment.upiTxnId && (
                              <div className="text-xs text-gray-500">TXN: {payment.upiTxnId}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No payment records found</p>
                  )}
                </CardContent>
              </Card>

              {/* Delivery Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    Delivery Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {deliveryAssignment ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Delivery Partner</label>
                          <p className="text-gray-900">{deliveryAssignment.partnerName}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Phone</label>
                          <p className="text-gray-900">{deliveryAssignment.partnerPhone}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Status</label>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(deliveryAssignment.status)}`}>
                            {deliveryAssignment.status}
                          </span>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Assigned On</label>
                          <p className="text-gray-900">{new Date(deliveryAssignment.assignedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {deliveryAssignment.notes && (
                        <div>
                          <label className="block text-sm font-medium text-gray-500">Notes</label>
                          <p className="text-gray-900">{deliveryAssignment.notes}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-500 mb-3">No delivery partner assigned</p>
                      <button
                        onClick={() => router.push(`/admin/bookings/${bookingId}/assign-delivery`)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        Assign Delivery Partner
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Actions & Timeline */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <button
                    onClick={() => sendEmail('confirmation')}
                    disabled={actionLoading === 'email'}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4 text-blue-600" />
                      <span>Send Confirmation</span>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => sendEmail('delivery')}
                    disabled={actionLoading === 'email'}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-purple-600" />
                      <span>Send Delivery Info</span>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => sendEmail('reminder')}
                    disabled={actionLoading === 'email'}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-yellow-600" />
                      <span>Send Reminder</span>
                    </div>
                  </button>

                  {/* Payment Reminder Button - Only show for UPI payments with pending status */}
                  {booking?.paymentMethod === 'UPI' && booking?.paymentStatus === 'PENDING' && (
                    <button
                      onClick={() => sendEmail('payment')}
                      disabled={actionLoading === 'email'}
                      className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-red-600" />
                        <span>Send Payment Reminder</span>
                      </div>
                    </button>
                  )}

                  <button
                    onClick={() => router.push(`/admin/bookings/${bookingId}/invoice`)}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4 text-green-600" />
                      <span>Download Invoice</span>
                    </div>
                  </button>

                  {/* Cancel Booking Button */}
                  {booking?.status !== 'CANCELLED' && booking?.status !== 'DELIVERED' && (
                    <button
                      onClick={() => setShowCancellationModal(true)}
                      disabled={actionLoading === 'cancel'}
                      className="w-full text-left p-3 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 text-red-700"
                    >
                      <div className="flex items-center gap-2">
                        <X className="w-4 h-4" />
                        <span>Cancel Booking</span>
                      </div>
                    </button>
                  )}
                </CardContent>
              </Card>

              {/* Booking Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Booking Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {events.length > 0 ? (
                      events.map((event, index) => (
                        <div key={event.id} className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">{event.title}</div>
                            {event.description && (
                              <div className="text-xs text-gray-500">{event.description}</div>
                            )}
                            <div className="text-xs text-gray-400 mt-1">
                              {new Date(event.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">No events recorded</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Cancellation Modal */}
      {showCancellationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Cancel Booking</h3>
              <button
                onClick={() => setShowCancellationModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cancellation Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Please provide a reason for cancellation..."
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowCancellationModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={cancelBooking}
                disabled={actionLoading === 'cancel' || !cancellationReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === 'cancel' ? 'Cancelling...' : 'Cancel Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}