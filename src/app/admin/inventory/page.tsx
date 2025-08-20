'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AdminNavbar from '@/components/AdminNavbar';
import Link from 'next/link';
import { 
  Package, 
  Plus, 
  RefreshCw, 
  BarChart3, 
  Database, 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Settings,
  Edit3
} from 'lucide-react';

type Stock = { 
  id: string; 
  totalAvailable: number; 
  adjustments: { 
    id: string; 
    delta: number; 
    reason?: string | null; 
    createdAt: string; 
    type?: string; 
    batchId?: string | null;
    bookingId?: string | null;
  }[] 
};

type CylinderBatch = {
  id: string;
  supplier: string;
  invoiceNo?: string;
  quantity: number;
  receivedAt: string;
  notes?: string;
  status: 'ACTIVE' | 'DEPLETED' | 'EXPIRED';
};



export default function AdminInventoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stock, setStock] = useState<Stock | null>(null);
  const [batches, setBatches] = useState<CylinderBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'stock' | 'batches' | 'analytics'>('overview');
  const [analyticsData, setAnalyticsData] = useState<{
    currentStock: number;
    totalReceived: number;
    totalIssued: number;
    batchStats: Array<{ status: string; count: number; totalQuantity: number }>;
    recentActivity: Array<{
      id: string;
      delta: number;
      type: string;
      reason: string;
      createdAt: string;
      batch?: { supplier: string; quantity: number };
      booking?: { userName: string; quantity: number };
    }>;
  } | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.push('/login');
    else if (session.user.role !== 'ADMIN') router.push('/user');
  }, [session, status, router]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'DEPLETED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'EXPIRED':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };


  const loadData = async () => {
    setLoading(true);
    try {
      const [stockRes, batchesRes, analyticsRes] = await Promise.all([
        fetch('/api/admin/inventory', { cache: 'no-store' }),
        fetch('/api/admin/inventory/batches', { cache: 'no-store' }),
        fetch('/api/admin/inventory/analytics', { cache: 'no-store' })
      ]);

      if (stockRes.ok) {
        const stockData = await stockRes.json();
        if (stockData.success) setStock(stockData.data);
      }
      
      if (batchesRes.ok) {
        const batchesData = await batchesRes.json();
        if (batchesData.success) setBatches(batchesData.data || []);
      }

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        if (analyticsData.success) {
          // Store analytics data for use in the analytics tab
          setAnalyticsData(analyticsData.data);
        }
      }
    } catch (error) {
      console.error('Failed to load inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    if (session?.user?.role === 'ADMIN') void loadData(); 
  }, [session]);







  if (status === 'loading') return null;
  if (!session || session.user.role !== 'ADMIN') return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30">
      <AdminNavbar />
      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Inventory Management</h1>
                <p className="text-lg text-gray-600">Comprehensive cylinder stock management and delivery tracking</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={loadData}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <RefreshCw className="w-4 h-4" /> 
                  Refresh
                </button>
                <Link
                  href="/admin/inventory/new-batch"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-all duration-200 shadow-sm hover:shadow-lg"
                >
                  <Plus className="w-4 h-4" /> 
                  New Batch
                </Link>
                <Link
                  href="/admin/inventory/adjust-stock"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-lg"
                >
                  <Settings className="w-4 h-4" /> 
                  Adjust Stock
                </Link>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12 mb-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              <span className="ml-4 text-gray-500">Loading inventory data...</span>
            </div>
          )}

          {/* Stats Overview */}
          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              { 
                title: 'Total Available', 
                value: stock?.totalAvailable || 0, 
                icon: Package, 
                color: 'from-blue-500 to-blue-600',
                bgColor: 'bg-blue-50',
                textColor: 'text-blue-700'
              },
              { 
                title: 'Active Batches', 
                value: batches.filter(b => b.status === 'ACTIVE').length, 
                icon: Database, 
                color: 'from-green-500 to-green-600',
                bgColor: 'bg-green-50',
                textColor: 'text-green-700'
              },
              { 
                title: 'Total Received', 
                value: stock?.adjustments?.filter(a => a.delta > 0).reduce((sum, a) => sum + a.delta, 0) || 0, 
                icon: TrendingUp, 
                color: 'from-green-500 to-green-600',
                bgColor: 'bg-green-50',
                textColor: 'text-green-700'
              },
              { 
                title: 'Total Issued', 
                value: Math.abs(stock?.adjustments?.filter(a => a.delta < 0).reduce((sum, a) => sum + a.delta, 0) || 0), 
                icon: TrendingDown, 
                color: 'from-red-500 to-red-600',
                bgColor: 'bg-red-50',
                textColor: 'text-red-700'
              }
            ].map((stat, idx) => (
              <div key={idx} className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                    <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
                  </div>
                </div>
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-5 rounded-full -translate-y-16 translate-x-16`}></div>
              </div>
            ))}
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-8">
            <div className="border-b border-gray-100">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'overview', label: 'Overview', icon: BarChart3 },
                  { id: 'stock', label: 'Stock Management', icon: Package },
                  { id: 'batches', label: 'Batches', icon: Database },
          
                  { id: 'analytics', label: 'Analytics', icon: TrendingUp }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as 'overview' | 'stock' | 'batches' | 'analytics')}
                    className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                      activeTab === tab.id
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Stock Status */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Status</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Available Cylinders</span>
                          <span className="font-semibold text-gray-900">{stock?.totalAvailable || 0}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${Math.min((stock?.totalAvailable || 0) / 100 * 100, 100)}%` }}
                          ></div>
              </div>
                        {stock && stock.totalAvailable < 50 && (
                          <div className="flex items-center gap-2 text-orange-600 text-sm">
                            <AlertTriangle className="w-4 h-4" />
                            Low stock alert - Consider replenishing
                </div>
              )}
            </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                      <div className="space-y-3">
                        {stock?.adjustments?.slice(0, 5).map((adjustment) => (
                          <div key={adjustment.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                adjustment.delta > 0 
                                  ? 'bg-green-100 text-green-800 border-green-200' 
                                  : 'bg-red-100 text-red-800 border-red-200'
                              }`}>
                                {adjustment.delta > 0 ? '+' : ''}{adjustment.delta}
                              </span>
                              <span className="text-gray-600">{adjustment.reason || 'Stock adjustment'}</span>
                            </div>
                            <span className="text-gray-500">{new Date(adjustment.createdAt).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
              </div>
            )}

              {/* Stock Management Tab */}
              {activeTab === 'stock' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Stock Adjustments</h3>

          </div>

                  <div className="bg-gray-50 rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">{stock?.totalAvailable || 0}</div>
                        <div className="text-sm text-gray-600">Current Stock</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {stock?.adjustments?.filter(a => a.delta > 0).reduce((sum, a) => sum + a.delta, 0) || 0}
                        </div>
                        <div className="text-sm text-gray-600">Total Received</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {Math.abs(stock?.adjustments?.filter(a => a.delta < 0).reduce((sum, a) => sum + a.delta, 0) || 0)}
                        </div>
                        <div className="text-sm text-gray-600">Total Issued</div>
                      </div>
                </div>
          </div>

                  {/* Stock History */}
                  <div className="bg-white rounded-xl border border-gray-200">
                    <div className="p-4 border-b border-gray-200">
                      <h4 className="font-semibold text-gray-900">Adjustment History</h4>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {stock?.adjustments?.map((adjustment) => (
                        <div key={adjustment.id} className="p-4 border-b border-gray-100 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                adjustment.delta > 0 
                                  ? 'bg-green-100 text-green-800 border-green-200' 
                                  : 'bg-red-100 text-red-800 border-red-200'
                              }`}>
                                {adjustment.delta > 0 ? '+' : ''}{adjustment.delta}
                              </span>
                              <div>
                                <div className="font-medium text-gray-900">{adjustment.reason || 'Stock adjustment'}</div>
                                <div className="text-sm text-gray-500">{adjustment.type || 'CORRECTION'}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-900">{new Date(adjustment.createdAt).toLocaleDateString()}</div>
                              <div className="text-xs text-gray-500">{new Date(adjustment.createdAt).toLocaleTimeString()}</div>
                            </div>
                          </div>
                        </div>
                    ))}
                  </div>
                  </div>
                </div>
              )}

              {/* Batches Tab */}
              {activeTab === 'batches' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Cylinder Batches</h3>

                  </div>

                  {batches.length === 0 ? (
                    <div className="text-center py-12">
                      <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No batches found</h3>
                      <p className="text-gray-500 mb-6">Get started by adding your first cylinder batch</p>
                      <Link
                        href="/admin/inventory/new-batch"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
                      >
                        <Plus className="w-4 h-4" />
                        Add First Batch
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {batches.map((batch) => (
                        <div key={batch.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-900">{batch.supplier}</h4>
                              <p className="text-sm text-gray-500">{batch.invoiceNo || 'No invoice'}</p>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(batch.status)}`}>
                              {batch.status}
                            </span>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Quantity:</span>
                              <span className="font-medium text-gray-900">{batch.quantity}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Received:</span>
                              <span className="font-medium text-gray-900">{new Date(batch.receivedAt).toLocaleDateString()}</span>
                            </div>
                            {batch.notes && (
                              <div className="text-gray-600 italic">&ldquo;{batch.notes}&rdquo;</div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                            <Link 
                              href={`/admin/inventory/edit-batch/${batch.id}`}
                              className="flex-1 px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors duration-200 text-center"
                            >
                              <Edit3 className="w-3 h-3 mr-1 inline" />
                              Edit
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Analytics Tab */}
              {activeTab === 'analytics' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Inventory Analytics</h3>
                  
                  {!analyticsData ? (
                    <div className="text-center py-12">
                      <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">Loading analytics data...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Stock Overview */}
                      <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h4 className="font-semibold text-gray-900 mb-4">Stock Overview</h4>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Current Stock</span>
                            <span className="text-sm font-medium text-blue-600">{analyticsData.currentStock}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Total Received</span>
                            <span className="text-sm font-medium text-green-600">{analyticsData.totalReceived}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Total Issued</span>
                            <span className="text-sm font-medium text-red-600">{analyticsData.totalIssued}</span>
                          </div>
                        </div>
                      </div>

                      {/* Batch Statistics */}
                      <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <h4 className="font-semibold text-gray-900 mb-4">Batch Statistics</h4>
                        <div className="space-y-4">
                          {analyticsData.batchStats?.map((stat, index: number) => (
                            <div key={index} className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">{stat.status} Batches</span>
                              <span className="text-sm font-medium text-purple-600">
                                {stat.count} ({stat.totalQuantity} cylinders)
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Recent Activity */}
                      <div className="bg-white rounded-xl border border-gray-200 p-6 lg:col-span-2">
                        <h4 className="font-semibold text-gray-900 mb-4">Recent Activity</h4>
                        <div className="space-y-3">
                          {analyticsData.recentActivity?.slice(0, 8).map((activity) => (
                            <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                  activity.delta > 0 
                                    ? 'bg-green-100 text-green-800 border-green-200' 
                                    : 'bg-red-100 text-red-800 border-red-200'
                                }`}>
                                  {activity.delta > 0 ? '+' : ''}{activity.delta}
                                </span>
                                <span className="text-sm text-gray-600">{activity.reason}</span>
                                <span className="text-xs text-gray-500">({activity.type})</span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {new Date(activity.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
                </div>
          </div>
        </div>
      </main>



    </div>
  );
}


