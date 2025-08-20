'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AdminNavbar from '@/components/AdminNavbar';
import { toast } from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { 
  Calendar, 
  Package, 
  Users, 
  DollarSign, 
  Truck, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Filter,
  Search,
  Download,
  Eye,
  Edit,
  Trash2,
  Plus,
  RefreshCw
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
  paymentStatus?: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  paymentAmount?: number;
  deliveryPartnerId?: string | null;
  deliveryPartnerName?: string | null;
  cylinderReserved?: boolean;
  createdAt: string;
  updatedAt: string;
};

type BookingStats = {
  total: number;
  pending: number;
  approved: number;
  outForDelivery: number;
  delivered: number;
  cancelled: number;
  totalRevenue: number;
  pendingRevenue: number;
  pendingUpiPayments: number;
};

export default function AdminBookingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<BookingStats>({
    total: 0,
    pending: 0,
    approved: 0,
    outForDelivery: 0,
    delivered: 0,
    cancelled: 0,
    totalRevenue: 0,
    pendingRevenue: 0,
    pendingUpiPayments: 0
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [selectedBookings, setSelectedBookings] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.push('/login');
    else if (session.user.role !== 'ADMIN') router.push('/user');
  }, [session, status, router]);

  const totalPages = useMemo(() => Math.ceil(total / limit) || 1, [total, limit]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ 
        page: String(page), 
        limit: String(limit), 
        admin: '1' 
      });
      if (statusFilter) params.set('status', statusFilter);
      if (methodFilter) params.set('paymentMethod', methodFilter);
      if (paymentFilter) params.set('paymentStatus', paymentFilter);
      if (searchQuery) params.set('search', searchQuery);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      
      const res = await fetch(`/api/admin/bookings?${params.toString()}`, { cache: 'no-store' });
      
      // Check if response is ok before trying to parse JSON
      if (!res.ok) {
        console.error('Failed to fetch bookings:', res.status, res.statusText);
        setBookings([]);
        setTotal(0);
        return;
      }
      
      // Check content type to ensure it's JSON
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Response is not JSON:', contentType);
        setBookings([]);
        setTotal(0);
        return;
      }
      
      const result = await res.json();
      if (result.success) {
        setBookings(result.data.data || []);
        setTotal(result.data.pagination?.total || 0);
      } else {
        console.error('API returned error:', result.message);
        setBookings([]);
        setTotal(0);
      }
    } catch (error) {
      console.error('Failed to load bookings:', error);
      setBookings([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch('/api/admin/bookings/stats', { cache: 'no-store' });
      
      if (!res.ok) {
        console.error('Failed to fetch stats:', res.status, res.statusText);
        return;
      }
      
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Stats response is not JSON:', contentType);
        return;
      }
      
      const result = await res.json();
      if (result.success) {
        setStats(result.data);
      } else {
        console.error('Stats API returned error:', result.message);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  useEffect(() => { 
    if (session?.user?.role === 'ADMIN') {
      void loadBookings();
      void loadStats();
    }
  }, [session, page, statusFilter, methodFilter, paymentFilter, searchQuery, dateFrom, dateTo]);

  const handleBulkAction = async (action: string) => {
    if (selectedBookings.size === 0) return;
    
    let reason: string | undefined;
    if (action === 'cancel') {
      reason = prompt('Please provide a reason for cancellation (required):') || '';
      if (!reason.trim()) {
        toast.error('Cancellation reason is required');
        return;
      }
    }

    const confirmed = confirm(`Are you sure you want to ${action} ${selectedBookings.size} booking(s)?`);
    if (!confirmed) return;

    setLoading(true);
    try {
      const selected = bookings.filter(b => selectedBookings.has(b.id));

      // Client-side pre-checks to prevent guaranteed failures
      if (selected.some(b => b.status === 'DELIVERED')) {
        toast.error('Some selected bookings are already delivered. Service is fulfilled; bulk actions are not allowed for delivered bookings.');
        return;
      }
      if (action === 'approve') {
        const pendingCount = selected.filter(b => b.status === 'PENDING').length;
        if (pendingCount === 0) {
          toast.error('Only PENDING bookings can be approved. No eligible bookings in selection.');
          return;
        }

        // Check UPI payment status - prevent approval if UPI payment is not successful
        const upiBookingsWithoutSuccessPayment = selected.filter(b => 
          b.status === 'PENDING' && 
          b.paymentMethod === 'UPI' && 
          b.paymentStatus !== 'SUCCESS'
        );

        if (upiBookingsWithoutSuccessPayment.length > 0) {
          const bookingIds = upiBookingsWithoutSuccessPayment.map(b => b.id);
          toast.error(`Cannot approve UPI bookings with pending/failed payments. Booking IDs: ${bookingIds.join(', ')}. Please ensure UPI payments are confirmed before approval.`);
          return;
        }
      }

      if (action === 'assign-delivery') {
        const eligibleAssignCount = selected.filter(b => b.status === 'PENDING' || b.status === 'APPROVED').length;
        if (eligibleAssignCount === 0) {
          toast.error('Only PENDING or APPROVED bookings can be assigned. No eligible bookings in selection.');
          return;
        }
      }

      if (action === 'cancel') {
        const eligibleCancelCount = selected.filter(b => b.status !== 'DELIVERED' && b.status !== 'CANCELLED').length;
        if (eligibleCancelCount === 0) {
          toast.error('No eligible bookings to cancel in selection.');
          return;
        }
      }

      let partnerId: string | undefined;
      if (action === 'assign-delivery') {
        partnerId = prompt('Enter Delivery Partner ID (required):') || '';
        if (!partnerId.trim()) {
          toast.error('Delivery Partner ID is required');
          return;
        }
      }

      const res = await fetch('/api/admin/bookings/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          bookingIds: Array.from(selectedBookings),
          additionalData: {
            ...(action === 'cancel' ? { reason } : {}),
            ...(action === 'assign-delivery' ? { partnerId } : {}),
          },
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        // Show contextual alerts
        if (action === 'approve') {
          toast.success(`Approved ${result.data?.updatedCount || selectedBookings.size} booking(s). Approval emails have been sent to users.`);
        } else if (action === 'assign-delivery') {
          toast.success(`Assigned delivery partners to ${result.data?.updatedCount || selectedBookings.size} booking(s).`);
        } else if (action === 'cancel') {
          toast.success(`Cancelled ${result.data?.updatedCount || selectedBookings.size} booking(s). Cancellation emails have been sent to users.`);
        } else {
          toast.success('Action completed successfully');
        }

        setSelectedBookings(new Set());
        await loadBookings();
        await loadStats();
      } else {
        if (result?.message?.includes('already delivered')) {
          toast.error('Some selected bookings are already delivered. Service is fulfilled; bulk actions are not allowed for delivered bookings.');
        } else {
          toast.error(result.message || 'Failed to perform action');
        }
      }
    } finally {
      setLoading(false);
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
      case 'CANCELLED': return 'bg-gray-200 text-gray-700';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canBeApproved = (booking: Booking) => {
    if (booking.status !== 'PENDING') return false;
    if (booking.paymentMethod === 'UPI' && booking.paymentStatus !== 'SUCCESS') return false;
    return true;
  };

  if (status === 'loading') return null;
  if (!session || session.user.role !== 'ADMIN') return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Booking Management</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage all gas cylinder bookings, payments, and deliveries
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center gap-3">
              <button
                onClick={() => router.push('/admin/bookings/new')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <Plus className="w-4 h-4" />
                New Booking
              </button>
              <button
                onClick={() => router.push('/admin/bookings/analytics')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <Download className="w-4 h-4" />
                Analytics
              </button>
              <button
                onClick={() => router.push('/admin/bookings/review-payments')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <DollarSign className="w-4 h-4" />
                Review Payments
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Delivered</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.delivered}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">₹{stats.totalRevenue}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Clock className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pending UPI Payments</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.pendingUpiPayments}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters & Search
              </CardTitle>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className="text-sm text-purple-600 hover:text-purple-700"
                >
                  {showFilters ? 'Hide' : 'Show'} Advanced Filters
                </button>
                <button 
                  onClick={() => {
                    setStatusFilter('');
                    setMethodFilter('');
                    setPaymentFilter('');
                    setSearchQuery('');
                    setDateFrom('');
                    setDateTo('');
                    setPage(1);
                  }}
                  className="text-sm text-gray-600 hover:text-gray-700"
                >
                  Clear All
                </button>
                <button 
                  onClick={() => {
                    loadBookings();
                    loadStats();
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Basic Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by ID, name, phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select 
                    value={statusFilter} 
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                  <option value="">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                    <option value="DELIVERED">Delivered</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                  <select 
                    value={methodFilter} 
                    onChange={(e) => { setMethodFilter(e.target.value); setPage(1); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">All Methods</option>
                    <option value="COD">Cash on Delivery</option>
                    <option value="UPI">UPI</option>
                </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                  <select 
                    value={paymentFilter} 
                    onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="SUCCESS">Success</option>
                    <option value="FAILED">Failed</option>
                </select>
                </div>
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Items per page</label>
                    <select 
                      value={limit} 
                      onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(1); }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value={10}>10 per page</option>
                      <option value={20}>20 per page</option>
                      <option value={50}>50 per page</option>
                      <option value={100}>100 per page</option>
                </select>
              </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bulk Actions */}
          {selectedBookings.size > 0 && (
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedBookings.size === bookings.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedBookings(new Set(bookings.map(b => b.id)));
                        } else {
                          setSelectedBookings(new Set());
                        }
                      }}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-purple-900">
                      {selectedBookings.size} booking(s) selected
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleBulkAction('approve')}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                    >
                      Approve All
                    </button>
                    <button
                      onClick={async () => {
                        // Bulk payment reminder: only for bookings with pending payment
                        const selected = bookings.filter(b => selectedBookings.has(b.id));
                        const pendingIds = selected.filter(b => b.paymentStatus === 'PENDING').map(b => b.id);
                        if (pendingIds.length === 0) {
                          toast.error('No bookings with pending payment in selection.');
                          return;
                        }
                        const confirmed = confirm(`Send payment reminder to ${pendingIds.length} booking(s)?`);
                        if (!confirmed) return;
                        try {
                          for (const id of pendingIds) {
                            // eslint-disable-next-line no-await-in-loop
                            const res = await fetch(`/api/admin/bookings/${id}/send-email`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ type: 'payment' })
                            });
                            // ignore non-200s per booking
                            void res;
                          }
                          toast.success('Payment reminders sent (best effort).');
                        } catch (e) {
                          toast.error('Failed to send some payment reminders');
                        }
                      }}
                      className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                    >
                      Send Payment Reminder
                    </button>
                    <button
                      onClick={() => handleBulkAction('assign-delivery')}
                      className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700"
                    >
                      Assign Delivery
                    </button>
                    <button
                      onClick={() => handleBulkAction('cancel')}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    >
                      Cancel All
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bookings Table */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>All Bookings</CardTitle>
              <div className="text-sm text-gray-600">Total: {total}</div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedBookings.size === bookings.length && bookings.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBookings(new Set(bookings.map(b => b.id)));
                            } else {
                              setSelectedBookings(new Set());
                            }
                          }}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                      </th>
                      <th className="px-3 py-3 text-left">Booking ID</th>
                      <th className="px-3 py-3 text-left">Customer</th>
                      <th className="px-3 py-3 text-left">Details</th>
                      <th className="px-3 py-3 text-left">Payment</th>
                      <th className="px-3 py-3 text-center">Status</th>
                      <th className="px-3 py-3 text-left">Delivery</th>
                      <th className="px-3 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td className="px-3 py-8 text-center" colSpan={8}>
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="w-5 h-5 animate-spin text-purple-600" />
                            Loading bookings...
                          </div>
                        </td>
                      </tr>
                    ) : bookings.length === 0 ? (
                      <tr>
                        <td className="px-3 py-8 text-center" colSpan={8}>
                          <div className="text-gray-500">
                            <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                            <p>No bookings found</p>
                            <p className="text-sm">Try adjusting your filters or create a new booking</p>
                          </div>
                        </td>
                      </tr>
                    ) : bookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selectedBookings.has(booking.id)}
                            onChange={(e) => {
                              const newSelected = new Set(selectedBookings);
                              if (e.target.checked) {
                                newSelected.add(booking.id);
                              } else {
                                newSelected.delete(booking.id);
                              }
                              setSelectedBookings(newSelected);
                            }}
                            disabled={!canBeApproved(booking)}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!canBeApproved(booking) ? 
                              (booking.paymentMethod === 'UPI' && booking.paymentStatus !== 'SUCCESS' ? 
                                'UPI payment pending - cannot approve until payment is confirmed' : 
                                'Booking cannot be approved in current status') : 
                              'Select for approval'
                            }
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-mono text-xs text-gray-600">{booking.id}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(booking.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-medium text-gray-900">{booking.userName}</div>
                          <div className="text-xs text-gray-500">{booking.userPhone}</div>
                          <div className="text-xs text-gray-500 truncate max-w-[200px]" title={booking.userAddress}>
                            {booking.userAddress}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">{booking.quantity}</span>
                            <span className="text-gray-500">cylinder(s)</span>
                          </div>
                          {booking.receiverName && (
                            <div className="text-xs text-gray-500 mt-1">
                              Receiver: {booking.receiverName}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(booking.paymentStatus || 'PENDING')}`}>
                                {booking.paymentStatus || 'PENDING'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {booking.paymentMethod}
                            </div>
                            {booking.paymentAmount && (
                              <div className="text-sm font-medium text-gray-900">
                                {formatCurrency(booking.paymentAmount)}
                              </div>
                            )}
                            {/* Warning for UPI bookings with pending payment */}
                            {booking.paymentMethod === 'UPI' && 
                             booking.status === 'PENDING' && 
                             booking.paymentStatus !== 'SUCCESS' && (
                              <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded mt-1">
                                ⚠️ Payment pending - cannot approve
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="space-y-1">
                            {booking.expectedDate && (
                              <div className="text-xs text-gray-500">
                                Expected: {new Date(booking.expectedDate).toLocaleDateString()}
                              </div>
                            )}
                            {booking.deliveryDate && (
                              <div className="text-xs text-gray-500">
                                Scheduled: {new Date(booking.deliveryDate).toLocaleDateString()}
                              </div>
                            )}
                            {booking.deliveryPartnerName && (
                              <div className="text-xs text-purple-600">
                                Partner: {booking.deliveryPartnerName}
                              </div>
                            )}
                            {booking.cylinderReserved && (
                              <div className="text-xs text-green-600">
                                ✓ Cylinder Reserved
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => router.push(`/admin/bookings/${booking.id}`)}
                              className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => router.push(`/admin/bookings/${booking.id}/edit`)}
                              className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded"
                              title="Edit Booking"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => router.push(`/admin/bookings/${booking.id}/assign-delivery`)}
                              className="p-1 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded"
                              title="Assign Delivery"
                            >
                              <Truck className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} results
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setPage((p) => Math.max(1, p - 1))} 
                    disabled={page <= 1} 
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-2 text-sm text-gray-700">
                    Page {page} of {totalPages}
                  </span>
                  <button 
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))} 
                    disabled={page >= totalPages} 
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}


