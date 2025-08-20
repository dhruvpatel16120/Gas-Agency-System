'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AdminNavbar from '@/components/AdminNavbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import Link from 'next/link';
import { 
  Users, 
  MapPin, 
  Phone, 
  Mail, 
  Truck, 
  Edit3, 
  ArrowLeft,
  Calendar,
  TrendingUp,
  CheckCircle,
  Clock,
  Package
} from 'lucide-react';

type Partner = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicleNumber?: string;
  serviceArea?: string;
  capacityPerDay: number;
  isActive: boolean;
  createdAt: string;
  totalDeliveries: number;
  completedDeliveries: number;
  averageRating: number;
  lastActive: string;
};

type DeliveryHistory = {
  id: string;
  bookingId: string;
  status: string;
  assignedAt: string;
  updatedAt?: string;
  customerName: string;
  quantity: number;
  address: string;
};

export default function ViewPartnerPage() {
  const { id } = useParams();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [deliveryHistory, setDeliveryHistory] = useState<DeliveryHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.push('/login');
    else if (session.user.role !== 'ADMIN') router.push('/user');
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user?.role === 'ADMIN' && id) {
      loadPartnerData();
    }
  }, [session, id]);

  const loadPartnerData = async () => {
    setLoading(true);
    try {
      const [partnerRes, historyRes] = await Promise.all([
        fetch(`/api/admin/deliveries/partners/${id}`, { cache: 'no-store' }),
        fetch(`/api/admin/deliveries/partners/${id}/deliveries`, { cache: 'no-store' })
      ]);

      if (partnerRes.ok) {
        const partnerData = await partnerRes.json();
        setPartner(partnerData.data);
      }

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setDeliveryHistory(historyData.data || []);
      }
    } catch (error) {
      console.error('Error loading partner data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'OUT_FOR_DELIVERY':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'PICKED_UP':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ASSIGNED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'FAILED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPerformanceColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 4.0) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (status === 'loading') return null;
  if (!session || session.user.role !== 'ADMIN') return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/deliveries/partners"
                className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Partners
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Partner Details</h1>
                <p className="text-gray-600 mt-2">View delivery partner information and performance</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/admin/deliveries/partners/${id}/edit`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Edit Partner
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : partner ? (
            <>
              {/* Partner Information */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Partner Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">{partner.name}</h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-700">{partner.phone}</span>
                        </div>
                        {partner.email && (
                          <div className="flex items-center gap-3">
                            <Mail className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-700">{partner.email}</span>
                          </div>
                        )}
                        {partner.vehicleNumber && (
                          <div className="flex items-center gap-3">
                            <Truck className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-700">{partner.vehicleNumber}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-700">{partner.serviceArea || 'No area assigned'}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Status:</span>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            partner.isActive 
                              ? 'bg-green-100 text-green-800 border-green-200' 
                              : 'bg-red-100 text-red-800 border-red-200'
                          }`}>
                            {partner.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Capacity:</span>
                          <span className="font-medium">{partner.capacityPerDay} deliveries/day</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Member Since:</span>
                          <span className="font-medium">
                            {new Date(partner.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Last Active:</span>
                          <span className="font-medium">
                            {partner.lastActive ? new Date(partner.lastActive).toLocaleDateString() : 'Never'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Deliveries</p>
                        <p className="text-2xl font-bold text-gray-900">{partner.totalDeliveries || 0}</p>
                      </div>
                      <Package className="w-8 h-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Completed</p>
                        <p className="text-2xl font-bold text-gray-900">{partner.completedDeliveries || 0}</p>
                      </div>
                      <CheckCircle className="w-8 h-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Success Rate</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {(partner.totalDeliveries || 0) > 0 
                            ? Math.round(((partner.completedDeliveries || 0) / (partner.totalDeliveries || 1)) * 100)
                            : 0
                          }%
                        </p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Rating</p>
                        <p className={`text-2xl font-bold ${getPerformanceColor(partner.averageRating || 0)}`}>
                          {(partner.averageRating || 0).toFixed(1)}/5.0
                        </p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-yellow-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Delivery History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Recent Delivery History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {deliveryHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">No delivery history found</p>
                      <p className="text-sm">This partner hasn't completed any deliveries yet</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {deliveryHistory.map((delivery) => (
                            <tr key={delivery.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">#{delivery.bookingId.slice(-6)}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{delivery.customerName}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{delivery.quantity} cylinders</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(delivery.status)}`}>
                                  {delivery.status.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {new Date(delivery.assignedAt).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-900 max-w-xs truncate">{delivery.address}</div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium text-gray-900">Partner not found</p>
                <p className="text-gray-600">The partner you're looking for doesn't exist or has been removed.</p>
                <Link
                  href="/admin/deliveries/partners"
                  className="inline-flex items-center gap-2 px-4 py-2 mt-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Partners
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}


