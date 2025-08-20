'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { Button } from '@/components/ui';
import { Search, Filter, RefreshCw, CheckCircle, XCircle, AlertCircle, Eye, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import AdminNavbar from '@/components/AdminNavbar';

type Payment = {
  id: string;
  bookingId: string;
  amount: number;
  method: string;
  status: string;
  upiTxnId?: string;
  createdAt: string;
  booking: {
    id: string;
    userName: string;
    userEmail?: string;
    userPhone?: string;
    quantity: number;
    status: string;
    paymentMethod: string;
  };
};

export default function ReviewPaymentsPage() {
  const { data: session, status } = useSession();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      void loadPayments();
    }
  }, [session, searchQuery, statusFilter]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (statusFilter) params.set('status', statusFilter);
      
      const res = await fetch(`/api/admin/bookings/review-payments?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const result = await res.json();
      if (result.success) {
        setPayments(result.data);
      } else {
        throw new Error(result.message || 'Failed to load payments');
      }
    } catch (error) {
      console.error('Failed to load payments:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async (paymentId: string) => {
    // Enhanced confirmation dialog
    const upiTxnId = prompt(
      'Please enter the UPI Transaction ID to confirm this payment:\n\n' +
      '⚠️ IMPORTANT: Verify the transaction ID carefully before confirming.\n' +
      'This action cannot be undone and will approve the booking.',
      ''
    );

    if (!upiTxnId || upiTxnId.trim().length < 6) {
      toast.error('Valid UPI transaction ID is required (minimum 6 characters)');
      return;
    }

    // Final confirmation
    if (!confirm(
      `Are you sure you want to confirm this payment?\n\n` +
      `Transaction ID: ${upiTxnId.trim()}\n` +
      `Amount: ${formatCurrency(payments.find(p => p.id === paymentId)?.amount || 0)}\n\n` +
      `This will:\n` +
      `• Mark payment as SUCCESS\n` +
      `• Send confirmation email to customer\n` +
      `• Keep booking status unchanged\n\n` +
      `Click OK to confirm.`
    )) {
      return;
    }

    setActionLoading(paymentId);
    try {
      const res = await fetch(`/api/admin/bookings/review-payments/${paymentId}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          upiTxnId: upiTxnId.trim(),
          sendEmail: true
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        toast.success(`Payment confirmed successfully! Payment status updated to SUCCESS. ${result.data.emailSent ? 'Email sent to customer.' : 'Email delivery failed.'}`);
        await loadPayments(); // Refresh the list
      } else {
        throw new Error(result.message || 'Failed to confirm payment');
      }
    } catch (error) {
      console.error('Failed to confirm payment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to confirm payment');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    // Enhanced rejection dialog
    const reason = prompt(
      'Please provide a detailed reason for rejecting this payment:\n\n' +
      '⚠️ IMPORTANT: Provide a clear, professional reason that will be sent to the customer.\n' +
      'Minimum 10 characters required.',
      ''
    );

    if (!reason || reason.trim().length < 10) {
      toast.error('Detailed rejection reason is required (minimum 10 characters)');
      return;
    }

    // Final confirmation
    if (!confirm(
      `Are you sure you want to reject this payment?\n\n` +
      `Reason: ${reason.trim()}\n` +
      `Amount: ${formatCurrency(payments.find(p => p.id === paymentId)?.amount || 0)}\n\n` +
      `This will:\n` +
      `• Mark payment as FAILED\n` +
      `• Send rejection email to customer\n` +
      `• Keep booking status unchanged\n` +
      `• Customer can retry payment using Repay button\n\n` +
      `Click OK to confirm.`
    )) {
      return;
    }

    setActionLoading(paymentId);
    try {
      const res = await fetch(`/api/admin/bookings/review-payments/${paymentId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reason: reason.trim(),
          sendEmail: true
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        toast.success(`Payment rejected successfully! Payment status updated to FAILED. Customer can retry payment. ${result.data.emailSent ? 'Email sent to customer.' : 'Email delivery failed.'}`);
        await loadPayments(); // Refresh the list
      } else {
        throw new Error(result.message || 'Failed to reject payment');
      }
    } catch (error) {
      console.error('Failed to reject payment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reject payment');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'SUCCESS': return 'bg-green-100 text-green-800 border-green-200';
      case 'FAILED': return 'bg-red-100 text-red-800 border-red-200';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="w-4 h-4" />;
      case 'SUCCESS': return <CheckCircle className="w-4 h-4" />;
      case 'FAILED': return <XCircle className="w-4 h-4" />;
      case 'CANCELLED': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
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

  if (!session?.user?.role || session.user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <p className="text-gray-600">Access denied. Admin privileges required.</p>
        </div>
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
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Review UPI Payments</h1>
              <p className="text-gray-600 mt-1">
                Review and manage pending UPI payments. Confirm successful payments or reject failed ones. 
                Payment confirmation is separate from booking approval. Rejected payments can be retried by customers.
              </p>
            </div>
            <Button onClick={() => loadPayments()} disabled={loading} className="flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-4 h-4" /> Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by customer name, email, or booking ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 border border-gray-300 rounded-md px-3 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="SUCCESS">Success</option>
                  <option value="FAILED">Failed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>

                <Button
                  variant="secondary"
                  onClick={() => { setSearchQuery(''); setStatusFilter(''); }}
                  className="h-10"
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Payments List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" /> UPI Payments
                <span className="text-sm font-normal text-gray-500">
                  ({payments.length} payment{payments.length !== 1 ? 's' : ''})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading payments...</p>
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No UPI payments found</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {searchQuery || statusFilter ? 'Try adjusting your filters' : 'All payments have been processed'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Booking Details
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payment
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">{payment.booking.userName}</div>
                              {payment.booking.userEmail && (
                                <div className="text-gray-500">{payment.booking.userEmail}</div>
                              )}
                              {payment.booking.userPhone && (
                                <div className="text-gray-500">{payment.booking.userPhone}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">
                                Booking: {payment.booking.id}
                              </div>
                              <div className="text-gray-500">
                                {payment.booking.quantity} cylinder(s) • {payment.booking.status}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">
                                {formatCurrency(payment.amount)}
                              </div>
                              <div className="text-gray-500">
                                {payment.method} • {new Date(payment.createdAt).toLocaleDateString()}
                              </div>
                              {payment.upiTxnId && (
                                <div className="text-xs text-gray-400 font-mono">
                                  Txn: {payment.upiTxnId}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(payment.status)}`}>
                              {getStatusIcon(payment.status)}
                              {payment.status}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              {payment.status === 'PENDING' && (
                                <>
                                  <Button
                                    onClick={() => handleConfirmPayment(payment.id)}
                                    disabled={actionLoading === payment.id}
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    {actionLoading === payment.id ? (
                                      <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <CheckCircle className="w-4 h-4" />
                                    )}
                                    Confirm
                                  </Button>
                                  <Button
                                    onClick={() => handleRejectPayment(payment.id)}
                                    disabled={actionLoading === payment.id}
                                    size="sm"
                                    variant="danger"
                                  >
                                    {actionLoading === payment.id ? (
                                      <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <XCircle className="w-4 h-4" />
                                    )}
                                    Reject
                                  </Button>
                                </>
                              )}
                              {payment.status === 'SUCCESS' && (
                                <span className="text-sm text-green-600 font-medium">
                                  ✓ Confirmed
                                </span>
                              )}
                              {payment.status === 'FAILED' && (
                                <span className="text-sm text-red-600 font-medium">
                                  ✗ Rejected - Customer can retry
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
