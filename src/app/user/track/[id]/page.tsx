'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import UserNavbar from '@/components/UserNavbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { getStatusColor, formatDateTime } from '@/lib/utils';
import { CheckCircle2, Truck, Clock4, Ban, ClipboardList, ArrowLeft } from 'lucide-react';

type Event = { id: string; status: string; title: string; description?: string | null; createdAt: string };

export default function TrackBookingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = (params?.id as string) || '';
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [meta, setMeta] = useState<{ paymentMethod?: string; receiverName?: string; expectedDate?: string | null } | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    const load = async () => {
      try {
        const res = await fetch(`/api/bookings/track/${id}`);
        const json = await res.json();
        if (res.ok && json.success) {
          setBooking(json.data.booking);
          setEvents(json.data.events);
          setMeta({ paymentMethod: json.data.booking.paymentMethod, receiverName: json.data.booking.receiverName, expectedDate: json.data.booking.expectedDate });
        }
      } finally {
        setLoading(false);
      }
    };
    if (id) void load();
  }, [session, status, id, router]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tracking...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserNavbar />
        <main className="max-w-5xl mx-auto py-6 sm:px-6 lg:px-8">
          <Card>
            <CardHeader>
              <CardTitle>Booking not found</CardTitle>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UserNavbar />
      <main className="max-w-5xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Tracking Booking #{booking.id}</CardTitle>
                <button
                  onClick={() => router.push('/user/bookings')}
                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back to History
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border ${getStatusColor(booking.status)}`}>
                  {booking.status}
                </span>
              </div>
              {/* Meta grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
                  <p className="text-gray-500">Payment</p>
                  <p className="font-medium text-gray-900">{meta?.paymentMethod || '-'}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
                  <p className="text-gray-500">Receiver</p>
                  <p className="font-medium text-gray-900">{meta?.receiverName || '-'}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
                  <p className="text-gray-500">Requested Delivery</p>
                  <p className="font-medium text-gray-900">{meta?.expectedDate ? new Date(meta.expectedDate).toLocaleDateString() : 'Not specified'}</p>
                </div>
              </div>
              {/* Phases bar */}
              <div className="mb-8">
                <div className="relative flex items-center justify-between rounded-lg bg-white p-4 shadow-sm border border-gray-200">
                  {[
                    { label: 'Started', status: 'PENDING', icon: Clock4 },
                    { label: 'Requested', status: 'PENDING', icon: ClipboardList },
                    { label: 'Admin Approval', status: 'APPROVED', icon: CheckCircle2 },
                    { label: 'Out for Delivery', status: 'OUT_FOR_DELIVERY', icon: Truck },
                    { label: 'Delivered', status: 'DELIVERED', icon: CheckCircle2 },
                    { label: 'Cancelled', status: 'CANCELLED', icon: Ban },
                  ].map((phase, idx, arr) => {
                    const Icon = phase.icon as any;
                    const order = ['PENDING','PENDING','APPROVED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED'];
                    const reached = order.indexOf(booking.status) >= order.indexOf(phase.status);
                    const isCancelled = booking.status === 'CANCELLED' && phase.status === 'CANCELLED';
                    return (
                      <div key={phase.label} className="flex-1 flex items-center min-w-0">
                        <div className="flex flex-col items-center text-center mx-1 min-w-0">
                          <div className={`h-8 w-8 flex items-center justify-center rounded-full border text-white ${
                            isCancelled ? 'bg-red-500 border-red-500' : reached ? 'bg-blue-600 border-blue-600' : 'bg-gray-200 border-gray-300 text-gray-500'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className={`mt-2 truncate max-w-[80px] text-[10px] sm:text-xs ${
                            isCancelled ? 'text-red-600' : reached ? 'text-blue-700' : 'text-gray-500'
                          }`}>{phase.label}</span>
                        </div>
                        {idx < arr.length - 1 && (
                          <div className={`h-1 flex-1 mx-1 rounded-full ${
                            booking.status === 'CANCELLED' && arr[idx + 1].status === 'CANCELLED'
                              ? 'bg-red-200'
                              : reached ? 'bg-blue-200' : 'bg-gray-200'
                          }`}></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Activities table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phase</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {events.map((ev) => (
                      <tr key={ev.id}>
                        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{formatDateTime(ev.createdAt)}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border ${getStatusColor(ev.status as any)}`}>
                            {ev.title}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{ev.description || '-'}</td>
                      </tr>
                    ))}
                    {events.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-500">No tracking events yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}


