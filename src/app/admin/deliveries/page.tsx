'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AdminNavbar from '@/components/AdminNavbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import Link from 'next/link';
import { 
  Truck, 
  Users, 
  Package, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Plus,
  Eye
} from 'lucide-react';

type DeliveryStats = {
  totalDeliveries: number;
  activeDeliveries: number;
  completedToday: number;
  pendingAssignments: number;
  totalPartners: number;
  activePartners: number;
  averageDeliveryTime: number;
  successRate: number;
};

type RecentDelivery = {
  id: string;
  bookingId: string;
  customerName: string;
  address: string;
  status: string;
  partnerName: string;
  assignedAt: string;
  expectedDelivery: string;
};

export default function AdminDeliveriesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [recentDeliveries, setRecentDeliveries] = useState<RecentDelivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.push('/login');
    else if (session.user.role !== 'ADMIN') router.push('/user');
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      loadDashboardData();
    }
  }, [session]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, recentRes] = await Promise.all([
        fetch('/api/admin/deliveries/stats', { cache: 'no-store' }),
        fetch('/api/admin/deliveries/recent', { cache: 'no-store' })
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data);
      }

      if (recentRes.ok) {
        const recentData = await recentRes.json();
        setRecentDeliveries(recentData.data);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
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

  if (status === 'loading') return null;
  if (!session || session.user.role !== 'ADMIN') return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Deliveries Management</h1>
              <p className="text-gray-600 mt-2">Manage cylinder deliveries, partners, and track delivery performance</p>
            </div>
            <div className="flex items-center gap-3">
              <Link 
                href="/admin/deliveries/active" 
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Eye className="w-4 h-4" />
                View Active
              </Link>
              <Link 
                href="/admin/deliveries/partners/new" 
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Partner
              </Link>
            </div>
          </div>

          {/* Quick Stats */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Deliveries</p>
                      <p className="text-2xl font-bold text-gray-900">{stats?.activeDeliveries || 0}</p>
                    </div>
                    <Truck className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Completed Today</p>
                      <p className="text-2xl font-bold text-gray-900">{stats?.completedToday || 0}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-yellow-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending Assignments</p>
                      <p className="text-2xl font-bold text-gray-900">{stats?.pendingAssignments || 0}</p>
                    </div>
                    <Clock className="w-8 h-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Success Rate</p>
                      <p className="text-2xl font-bold text-gray-900">{stats?.successRate || 0}%</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/admin/deliveries/active">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Truck className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Active Deliveries</h3>
                      <p className="text-sm text-gray-600">Monitor and update delivery status</p>
                    </div>
                  </div>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/admin/deliveries/partners">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <Users className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Delivery Partners</h3>
                      <p className="text-sm text-gray-600">Manage delivery partners and areas</p>
                    </div>
                  </div>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/admin/deliveries/analytics">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <BarChart3 className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Analytics</h3>
                      <p className="text-sm text-gray-600">View delivery performance metrics</p>
                    </div>
                  </div>
                </CardContent>
              </Link>
            </Card>
          </div>

          {/* Recent Deliveries */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Deliveries</CardTitle>
              <Link 
                href="/admin/deliveries/active" 
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                View All →
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                    </div>
                  ))}
                </div>
              ) : recentDeliveries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No recent deliveries</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentDeliveries.map((delivery) => (
                    <div key={delivery.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(delivery.status)}`}>
                            {delivery.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{delivery.customerName}</p>
                          <p className="text-sm text-gray-600 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {delivery.address}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{delivery.partnerName}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(delivery.assignedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}


