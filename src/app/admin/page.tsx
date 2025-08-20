'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { 
  Flame, 
  Users, 
  Calendar, 
  Package, 
  TrendingUp, 
  TrendingDown, 
  Eye,
  MessageSquare,
  Truck,
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  BarChart3,
  Activity,
  RefreshCw,
  PieChart
} from 'lucide-react';
import AdminNavbar from '@/components/AdminNavbar';
import Link from 'next/link';

type DashboardStats = {
  totalUsers: number;
  totalBookings: number;
  totalCylinders: number;
  pendingBookings: number;
  activeDeliveries: number;
  newContacts: number;
  monthlyRevenue: number;
  revenueChange: number;
};

type RecentActivity = {
  id: string;
  type: 'booking' | 'user' | 'delivery' | 'contact';
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'info';
};

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalBookings: 0,
    totalCylinders: 0,
    pendingBookings: 0,
    activeDeliveries: 0,
    newContacts: 0,
    monthlyRevenue: 0,
    revenueChange: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
    } else if (session.user.role !== 'ADMIN') {
      router.push('/user');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchDashboardData();
    }
  }, [session]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Simulate API calls for dashboard data
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStats({
        totalUsers: 1247,
        totalBookings: 892,
        totalCylinders: 2500,
        pendingBookings: 23,
        activeDeliveries: 15,
        newContacts: 8,
        monthlyRevenue: 45600,
        revenueChange: 12.5
      });

      setRecentActivity([
        {
          id: '1',
          type: 'booking',
          title: 'New Gas Cylinder Order',
          description: 'User John Doe placed an order for 2 cylinders',
          timestamp: '2 minutes ago',
          status: 'success'
        },
        {
          id: '2',
          type: 'user',
          title: 'New User Registration',
          description: 'Sarah Wilson created a new account',
          timestamp: '15 minutes ago',
          status: 'info'
        },
        {
          id: '3',
          type: 'delivery',
          title: 'Delivery Completed',
          description: 'Order #BK-2024-001 delivered successfully',
          timestamp: '1 hour ago',
          status: 'success'
        },
        {
          id: '4',
          type: 'contact',
          title: 'New Support Ticket',
          description: 'Customer inquiry about delivery status',
          timestamp: '2 hours ago',
          status: 'warning'
        },
        {
          id: '5',
          type: 'booking',
          title: 'Payment Received',
          description: 'Payment confirmed for order #BK-2024-015',
          timestamp: '3 hours ago',
          status: 'success'
        }
      ]);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'booking': return <Calendar className="w-4 h-4" />;
      case 'user': return <Users className="w-4 h-4" />;
      case 'delivery': return <Truck className="w-4 h-4" />;
      case 'contact': return <MessageSquare className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30">
      <AdminNavbar />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
              <p className="text-lg text-gray-600">Welcome back, {session.user.name}. Here's what's happening with your system.</p>
            </div>
            <button 
              onClick={fetchDashboardData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 
              Refresh
            </button>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
                <Users className="h-5 w-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stats.totalUsers.toLocaleString()}</div>
                <div className="flex items-center gap-2 mt-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <p className="text-xs text-green-600">+12% from last month</p>
                </div>
              </CardContent>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500 to-purple-600 opacity-5 rounded-full -translate-y-16 translate-x-16"></div>
            </Card>

            <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Bookings</CardTitle>
                <Calendar className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stats.totalBookings.toLocaleString()}</div>
                <div className="flex items-center gap-2 mt-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <p className="text-xs text-green-600">+8% from last month</p>
                </div>
              </CardContent>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500 to-blue-600 opacity-5 rounded-full -translate-y-16 translate-x-16"></div>
            </Card>

            <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Available Cylinders</CardTitle>
                <Package className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{stats.totalCylinders.toLocaleString()}</div>
                <div className="flex items-center gap-2 mt-2">
                  <TrendingDown className="w-4 h-4 text-orange-500" />
                  <p className="text-xs text-orange-600">-3% from last week</p>
                </div>
              </CardContent>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500 to-green-600 opacity-5 rounded-full -translate-y-16 translate-x-16"></div>
            </Card>

            <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Monthly Revenue</CardTitle>
                <DollarSign className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">₹{stats.monthlyRevenue.toLocaleString()}</div>
                <div className="flex items-center gap-2 mt-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <p className="text-xs text-green-600">+{stats.revenueChange}% from last month</p>
                </div>
              </CardContent>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500 to-green-600 opacity-5 rounded-full -translate-y-16 translate-x-16"></div>
            </Card>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  Pending Bookings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{stats.pendingBookings}</div>
                <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-blue-500" />
                  Active Deliveries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{stats.activeDeliveries}</div>
                <p className="text-xs text-gray-500 mt-1">In transit</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-purple-500" />
                  New Contacts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{stats.newContacts}</div>
                <p className="text-xs text-gray-500 mt-1">Unread messages</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Quick Actions */}
            <div className="xl:col-span-2">
              <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                    Quick Actions
                  </CardTitle>
            </CardHeader>
            <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Link href="/admin/users" className="group">
                      <div className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors duration-200 text-left group-hover:border-purple-300">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors duration-200">
                            <Users className="w-5 h-5 text-purple-600" />
                          </div>
                          <h3 className="font-semibold text-gray-900">User Management</h3>
                        </div>
                        <p className="text-sm text-gray-600">View and manage user accounts, permissions, and roles</p>
                      </div>
                    </Link>

                    <Link href="/admin/bookings" className="group">
                      <div className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors duration-200 text-left group-hover:border-blue-300">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors duration-200">
                            <Calendar className="w-5 h-5 text-blue-600" />
                          </div>
                  <h3 className="font-semibold text-gray-900">Booking Management</h3>
                        </div>
                        <p className="text-sm text-gray-600">Approve, track, and manage customer bookings</p>
                      </div>
                    </Link>

                    <Link href="/admin/inventory" className="group">
                      <div className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors duration-200 text-left group-hover:border-green-300">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors duration-200">
                            <Package className="w-5 h-5 text-green-600" />
                          </div>
                          <h3 className="font-semibold text-gray-900">Inventory Management</h3>
                        </div>
                        <p className="text-sm text-gray-600">Monitor cylinder stock and manage inventory</p>
                      </div>
                    </Link>

                    <Link href="/admin/contacts" className="group">
                      <div className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors duration-200 text-left group-hover:border-orange-300">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors duration-200">
                            <MessageSquare className="w-5 h-5 text-orange-600" />
                          </div>
                          <h3 className="font-semibold text-gray-900">Customer Support</h3>
                        </div>
                        <p className="text-sm text-gray-600">Handle customer inquiries and support tickets</p>
                      </div>
                    </Link>

                    <Link href="/admin/deliveries" className="group">
                      <div className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors duration-200 text-left group-hover:border-indigo-300">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors duration-200">
                            <Truck className="w-5 h-5 text-indigo-600" />
                          </div>
                          <h3 className="font-semibold text-gray-900">Delivery Management</h3>
                        </div>
                        <p className="text-sm text-gray-600">Track deliveries and manage delivery partners</p>
                      </div>
                    </Link>



                    <Link href="/admin/bookings/analytics" className="group">
                      <div className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors duration-200 text-left group-hover:border-cyan-300">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-cyan-100 rounded-lg group-hover:bg-cyan-200 transition-colors duration-200">
                            <PieChart className="w-5 h-5 text-cyan-600" />
                          </div>
                          <h3 className="font-semibold text-gray-900">Booking Analytics</h3>
                        </div>
                        <p className="text-sm text-gray-600">View detailed analytics and insights for bookings</p>
                      </div>
                    </Link>

                    <Link href="/admin/deliveries/analytics" className="group">
                      <div className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors duration-200 text-left group-hover:border-violet-300">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-violet-100 rounded-lg group-hover:bg-violet-200 transition-colors duration-200">
                            <BarChart3 className="w-5 h-5 text-violet-600" />
                          </div>
                          <h3 className="font-semibold text-gray-900">Delivery Analytics</h3>
                        </div>
                        <p className="text-sm text-gray-600">Track delivery performance and partner analytics</p>
                      </div>
                    </Link>

                    <Link href="/admin/inventory" className="group">
                      <div className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors duration-200 text-left group-hover:border-emerald-300">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors duration-200">
                            <Activity className="w-5 h-5 text-emerald-600" />
                          </div>
                          <h3 className="font-semibold text-gray-900">Inventory Analytics</h3>
                        </div>
                        <p className="text-sm text-gray-600">Monitor stock levels and inventory performance</p>
                      </div>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Active Deliveries */}
            <div>
              <Card className="hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-purple-600" />
                    Active Deliveries
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { id: '1', bookingId: 'BK-2024-001', status: 'IN_TRANSIT', customer: 'John Doe', estimated: '2 hours' },
                      { id: '2', bookingId: 'BK-2024-002', status: 'ASSIGNED', customer: 'Sarah Wilson', estimated: '4 hours' },
                      { id: '3', bookingId: 'BK-2024-003', status: 'PENDING', customer: 'Mike Johnson', estimated: '6 hours' },
                      { id: '4', bookingId: 'BK-2024-004', status: 'IN_TRANSIT', customer: 'Emily Brown', estimated: '1 hour' },
                      { id: '5', bookingId: 'BK-2024-005', status: 'ASSIGNED', customer: 'David Lee', estimated: '3 hours' }
                    ].map((delivery) => (
                      <div key={delivery.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors duration-200">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900">#{delivery.bookingId}</span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              delivery.status === 'IN_TRANSIT' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                              delivery.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                              'bg-yellow-100 text-yellow-800 border-yellow-200'
                            }`}>
                              {delivery.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">{delivery.customer}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Est. delivery</div>
                          <div className="text-sm font-medium text-gray-900">{delivery.estimated}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <Link 
                      href="/admin/deliveries" 
                      className="text-sm text-purple-600 hover:text-purple-700 font-medium hover:underline"
                    >
                      View all deliveries →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
