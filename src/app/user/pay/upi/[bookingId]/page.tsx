'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import UserNavbar from '@/components/UserNavbar';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';

type Invoice = {
  booking: { id: string; quantity?: number | null; paymentMethod: string; user: { name: string; email: string; address: string; phone: string } };
  payment: { id: string; amount: number; status: string };
  settings: { upiId?: string | null; upiQrImageUrl?: string | null; pricePerCylinder: number } | null;
};

export default function UPIPaymentPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const bookingId = params?.bookingId as string;

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [txnId, setTxnId] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    const load = async () => {
      const res = await fetch(`/api/payments/upi?bookingId=${encodeURIComponent(bookingId)}`);
      const json = await res.json();
      if (json.success) setInvoice(json.data);
      setLoading(false);
    };
    if (bookingId) void load();
  }, [status, session, bookingId, router]);

  const confirmPayment = async () => {
    if (!txnId.trim()) return;
    const res = await fetch('/api/payments/upi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId, upiTxnId: txnId.trim() }),
    });
    const json = await res.json();
    if (json.success) {
      router.push('/user/bookings');
    }
  };

  if (status === 'loading' || loading || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Preparing invoice...</p>
        </div>
      </div>
    );
  }

  const qty = invoice.booking.quantity || 1;
  const unitPrice = invoice.settings?.pricePerCylinder || 1100;
  const total = unitPrice * qty;

  return (
    <div className="min-h-screen bg-gray-50">
      <UserNavbar />
      <main className="max-w-5xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>UPI Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Booking Details</h3>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p><span className="text-gray-500">Booking ID:</span> {invoice.booking.id}</p>
                    <p><span className="text-gray-500">Quantity:</span> {qty}</p>
                    <p><span className="text-gray-500">Unit Price:</span> {formatCurrency(unitPrice)}</p>
                    <p className="font-semibold"><span className="text-gray-500">Total:</span> {formatCurrency(total)}</p>
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">User Details</h3>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p><span className="text-gray-500">Name:</span> {invoice.booking.user.name}</p>
                    <p><span className="text-gray-500">Email:</span> {invoice.booking.user.email}</p>
                    <p><span className="text-gray-500">Phone:</span> {invoice.booking.user.phone}</p>
                    <p className="truncate"><span className="text-gray-500">Address:</span> {invoice.booking.user.address}</p>
                  </div>
                </div>
              </div>

              {/* UPI QR */}
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Pay via UPI</h3>
                {invoice.settings?.upiQrImageUrl ? (
                  <div className="flex items-center gap-6">
                    <img src={invoice.settings.upiQrImageUrl} alt="UPI QR" className="w-40 h-40 rounded-md border" />
                    <div className="text-sm text-gray-700">
                      <p><span className="text-gray-500">UPI ID:</span> {invoice.settings.upiId || 'N/A'}</p>
                      <p><span className="text-gray-500">Amount:</span> {formatCurrency(total)}</p>
                      <p className="text-xs text-gray-500 mt-2">After payment, enter the Transaction ID below to confirm.</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">UPI QR is not configured by Admin yet.</p>
                )}
              </div>

              {/* Confirmation */}
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Confirm Payment</h3>
                <div className="flex items-center gap-3">
                  <input
                    value={txnId}
                    onChange={(e) => setTxnId(e.target.value)}
                    placeholder="Enter UPI Transaction ID"
                    className="flex-1 h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  />
                  <button onClick={confirmPayment} className="inline-flex items-center h-10 px-4 rounded-md bg-blue-600 text-white hover:bg-blue-700">
                    Confirm
                  </button>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <button onClick={() => router.push('/user/bookings')} className="text-sm text-blue-600 hover:text-blue-700">Back to History</button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}


