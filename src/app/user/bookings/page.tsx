'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Button } from '@/components/ui';
import { Calendar, ChevronLeft, ChevronRight, Filter, RefreshCw, Clipboard, Check } from 'lucide-react';
import { getStatusColor, formatDateTime } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import UserNavbar from '@/components/UserNavbar';

type Booking = {
  id: string;
  paymentMethod: 'COD' | 'UPI';
  status: 'PENDING' | 'APPROVED' | 'DELIVERED' | 'CANCELLED';
  requestedAt: string;
  deliveryDate?: string | null;
  deliveredAt?: string | null;
  notes?: string | null;
};

export default function BookingHistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    void loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status, page, statusFilter, methodFilter]);

  const totalPages = useMemo(() => Math.ceil(total / limit) || 1, [total, limit]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (statusFilter) params.set('status', statusFilter);
      if (methodFilter) params.set('paymentMethod', methodFilter);
      const res = await fetch(`/api/bookings?${params.toString()}`);
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.message || 'Failed to load bookings');
        return;
      }
      setBookings(result.data.data);
      setTotal(result.data.pagination.total);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Load bookings error:', err);
      toast.error('An error occurred while loading bookings');
    } finally {
      setLoading(false);
    }
  };

  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      toast.success('Booking ID copied');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const cancelBooking = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    setActionId(id);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.message || 'Failed to cancel booking');
        return;
      }
      toast.success('Booking cancelled');
      void loadBookings();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Cancel booking error:', err);
      toast.error('An error occurred while cancelling');
    } finally {
      setActionId(null);
    }
  };

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UserNavbar />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Filter className="w-4 h-4" /> Filters</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => { setStatusFilter(''); setMethodFilter(''); setPage(1); }}>
                  Clear
                </Button>
                <Button variant="secondary" size="sm" onClick={() => loadBookings()}>
                  <RefreshCw className="w-4 h-4 mr-1" /> Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setPage(1);
                    setStatusFilter(e.target.value);
                  }}
                  className="h-10 border border-gray-300 rounded-md px-3 bg-white text-gray-900"
                >
                  <option value="" className="text-gray-900">All Statuses</option>
                  <option value="PENDING" className="text-gray-900">Pending</option>
                  <option value="APPROVED" className="text-gray-900">Approved</option>
                  <option value="DELIVERED" className="text-gray-900">Delivered</option>
                  <option value="CANCELLED" className="text-gray-900">Cancelled</option>
                </select>

                <select
                  value={methodFilter}
                  onChange={(e) => {
                    setPage(1);
                    setMethodFilter(e.target.value);
                  }}
                  className="h-10 border border-gray-300 rounded-md px-3 bg-white text-gray-900"
                >
                  <option value="" className="text-gray-900">All Payment Methods</option>
                  <option value="COD" className="text-gray-900">Cash on Delivery</option>
                  <option value="UPI" className="text-gray-900">UPI</option>
                </select>

                <select
                  value={limit}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setLimit(val);
                    setPage(1);
                  }}
                  className="h-10 border border-gray-300 rounded-md px-3 bg-white text-gray-900"
                >
                  <option value={5}>5 per page</option>
                  <option value={10}>10 per page</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* List */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" /> Your Bookings
              </CardTitle>
              <div className="text-sm text-gray-500">Total: {total}</div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivery</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading && (
                      <tr>
                        <td colSpan={7} className="px-4 py-6">
                          <div className="animate-pulse space-y-3">
                            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                          </div>
                        </td>
                      </tr>
                    )}
                    {!loading && bookings.map((b) => (
                      <tr key={b.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div className="flex items-center gap-2">
                            <span className="font-mono truncate max-w-[180px]" title={b.id}>{b.id}</span>
                            <button
                              onClick={() => copyId(b.id)}
                              className="inline-flex items-center text-xs text-gray-500 hover:text-gray-700"
                              title="Copy ID"
                            >
                              <Clipboard className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border ${getStatusColor(b.status as any)} uppercase`}>
                            {b.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{b.paymentMethod}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{formatDateTime(b.requestedAt)}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{b.deliveryDate ? formatDateTime(b.deliveryDate) : '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate" title={b.notes || ''}>{b.notes || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 space-x-2">
                          <button
                            onClick={() => router.push(`/user/track/${b.id}`)}
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                          >
                            Track
                          </button>
                          {b.paymentMethod === 'UPI' && b.status !== 'CANCELLED' && (
                            <button
                              onClick={() => router.push(`/user/pay/upi/${b.id}`)}
                              className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-blue-700 rounded-md hover:bg-blue-50"
                            >
                              Pay
                            </button>
                          )}
                          {b.status === 'PENDING' && (
                            <button
                              onClick={() => cancelBooking(b.id)}
                              disabled={actionId === b.id}
                              className="inline-flex items-center px-3 py-1.5 border border-red-300 text-red-700 rounded-md hover:bg-red-50 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {!loading && bookings.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                          No bookings found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next <ChevronRight className="w-4 h-4 ml-1" />
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


