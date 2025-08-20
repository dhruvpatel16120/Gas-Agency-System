'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import UserNavbar from '@/components/UserNavbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { getStatusColor, formatDateTime } from '@/lib/utils';
import { CheckCircle2, Truck, Clock4, Ban, ClipboardList, ArrowLeft } from 'lucide-react';

// Helper function to get delivery status colors
const getDeliveryStatusColor = (status: string) => {
  switch (status) {
    case 'ASSIGNED':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'PICKED_UP':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'OUT_FOR_DELIVERY':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'DELIVERED':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'FAILED':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

type Event = { id: string; status: string; title: string; description?: string | null; createdAt: string };

type DeliveryAssignment = {
  id: string;
  status: string;
  scheduledDate: string | null;
  scheduledTime: string | null;
  notes: string | null;
  assignedAt: string;
  updatedAt: string;
  partner: {
    id: string;
    name: string;
    phone: string;
    vehicleNumber: string | null;
    serviceArea: string | null;
  } | null;
};

export default function TrackBookingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = (params?.id as string) || '';
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [deliveryAssignment, setDeliveryAssignment] = useState<DeliveryAssignment | null>(null);
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
          setDeliveryAssignment(json.data.booking.assignment);
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

              {/* Delivery Tracking Section */}
              {deliveryAssignment && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-lg font-medium text-blue-900 mb-4 flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    Delivery Tracking
                  </h3>
                  
                  {/* Delivery Partner Information */}
                  {deliveryAssignment.partner && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-white p-3 rounded-lg border border-blue-100">
                        <p className="text-sm font-medium text-blue-800 mb-2">Delivery Partner</p>
                        <div className="space-y-1 text-sm">
                          <p><span className="text-gray-600">Name:</span> {deliveryAssignment.partner.name}</p>
                          <p><span className="text-gray-600">Phone:</span> {deliveryAssignment.partner.phone}</p>
                          {deliveryAssignment.partner.vehicleNumber && (
                            <p><span className="text-gray-600">Vehicle:</span> {deliveryAssignment.partner.vehicleNumber}</p>
                          )}
                          {deliveryAssignment.partner.serviceArea && (
                            <p><span className="text-gray-600">Service Area:</span> {deliveryAssignment.partner.serviceArea}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-white p-3 rounded-lg border border-blue-100">
                        <p className="text-sm font-medium text-blue-800 mb-2">Delivery Details</p>
                        <div className="space-y-1 text-sm">
                          <p><span className="text-gray-600">Status:</span> 
                            <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getDeliveryStatusColor(deliveryAssignment.status)}`}>
                              {deliveryAssignment.status.replace('_', ' ')}
                            </span>
                          </p>
                          <p><span className="text-gray-600">Assigned:</span> {new Date(deliveryAssignment.assignedAt).toLocaleDateString()}</p>
                          {deliveryAssignment.scheduledDate && (
                            <p><span className="text-gray-600">Scheduled:</span> {new Date(deliveryAssignment.scheduledDate).toLocaleDateString()}</p>
                          )}
                          {deliveryAssignment.scheduledTime && (
                            <p><span className="text-gray-600">Time:</span> {deliveryAssignment.scheduledTime}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Delivery Progress Bar */}
                  <div className="mb-4">
                    <p className="text-sm font-medium text-blue-800 mb-3">Delivery Progress:</p>
                    <div className="flex items-center space-x-2">
                      <div className={`w-4 h-4 rounded-full ${deliveryAssignment.status === 'ASSIGNED' ? 'bg-blue-500' : 'bg-gray-300'}`} title="Assigned"></div>
                      <div className="text-xs text-gray-600">Assigned</div>
                      
                      <div className="w-6 h-px bg-gray-300"></div>
                      
                      <div className={`w-4 h-4 rounded-full ${deliveryAssignment.status === 'PICKED_UP' ? 'bg-yellow-500' : 'bg-gray-300'}`} title="Picked Up"></div>
                      <div className="text-xs text-gray-600">Picked Up</div>
                      
                      <div className="w-6 h-px bg-gray-300"></div>
                      
                      <div className={`w-4 h-4 rounded-full ${deliveryAssignment.status === 'OUT_FOR_DELIVERY' ? 'bg-purple-500' : 'bg-gray-300'}`} title="Out for Delivery"></div>
                      <div className="text-xs text-gray-600">On Way</div>
                      
                      <div className="w-6 h-px bg-gray-300"></div>
                      
                      <div className={`w-4 h-4 rounded-full ${deliveryAssignment.status === 'DELIVERED' ? 'bg-green-500' : 'bg-gray-300'}`} title="Delivered"></div>
                      <div className="text-xs text-gray-600">Delivered</div>
                    </div>
                  </div>

                  {/* Delivery Notes */}
                  {deliveryAssignment.notes && (
                    <div className="bg-white p-3 rounded-lg border border-blue-100">
                      <p className="text-sm font-medium text-blue-800 mb-2">Delivery Notes</p>
                      <p className="text-sm text-gray-700">{deliveryAssignment.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* No Delivery Partner Assigned Yet */}
              {booking.status === 'APPROVED' && !deliveryAssignment && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h3 className="text-lg font-medium text-yellow-900 mb-2 flex items-center gap-2">
                    <Clock4 className="w-5 h-5" />
                    Delivery Partner Assignment
                  </h3>
                  <p className="text-sm text-yellow-800">
                    Your booking has been approved! We are currently assigning a delivery partner to your order. 
                    You will receive an email notification once a partner is assigned and can track the delivery progress here.
                  </p>
                </div>
              )}
              {/* Phases bar */}
              <div className="mb-8">
                <div className="relative flex items-center justify-between rounded-lg bg-white p-4 shadow-sm border border-gray-200">
                  {[
                    { label: 'Started', status: 'PENDING', icon: Clock4 },
                    { label: 'Requested', status: 'PENDING', icon: ClipboardList },
                    { label: 'Admin Approval', status: 'APPROVED', icon: CheckCircle2 },
                    { label: 'Delivery Assigned', status: 'APPROVED', icon: Truck },
                    { label: 'Out for Delivery', status: 'OUT_FOR_DELIVERY', icon: Truck },
                    { label: 'Delivered', status: 'DELIVERED', icon: CheckCircle2 },
                    { label: 'Cancelled', status: 'CANCELLED', icon: Ban },
                  ].map((phase, idx, arr) => {
                    const Icon = phase.icon as any;
                    const order = ['PENDING','PENDING','APPROVED','APPROVED','OUT_FOR_DELIVERY','DELIVERED','CANCELLED'];
                    const reached = order.indexOf(booking.status) >= order.indexOf(phase.status);
                    const isCancelled = booking.status === 'CANCELLED' && phase.status === 'CANCELLED';
                    
                    // Special handling for delivery assigned phase
                    let isDeliveryAssigned = false;
                    if (phase.status === 'APPROVED' && phase.label === 'Delivery Assigned') {
                      isDeliveryAssigned = !!(deliveryAssignment && deliveryAssignment.status === 'ASSIGNED');
                    }
                    
                    return (
                      <div key={phase.label} className="flex-1 flex items-center min-w-0">
                        <div className="flex flex-col items-center text-center mx-1 min-w-0">
                          <div className={`h-8 w-8 flex items-center justify-center rounded-full border text-white ${
                            isCancelled ? 'bg-red-500 border-red-500' : 
                            isDeliveryAssigned ? 'bg-blue-600 border-blue-600' :
                            reached ? 'bg-blue-600 border-blue-600' : 'bg-gray-200 border-gray-300 text-gray-500'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className={`mt-2 truncate max-w-[80px] text-[10px] sm:text-xs ${
                            isCancelled ? 'text-red-600' : 
                            isDeliveryAssigned ? 'text-blue-700' :
                            reached ? 'text-blue-700' : 'text-gray-500'
                          }`}>{phase.label}</span>
                        </div>
                        {idx < arr.length - 1 && (
                          <div className={`h-1 flex-1 mx-1 rounded-full ${
                            booking.status === 'CANCELLED' && arr[idx + 1].status === 'CANCELLED'
                              ? 'bg-red-200'
                              : isDeliveryAssigned ? 'bg-blue-200' :
                              reached ? 'bg-blue-200' : 'bg-gray-200'
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


