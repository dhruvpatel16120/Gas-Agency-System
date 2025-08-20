'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AdminNavbar from '@/components/AdminNavbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import Link from 'next/link';
import { 
  Truck, 
  MapPin, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  Phone,
  Mail,
  Edit3,
  Eye,
  RefreshCw,
  Filter,
  Search
} from 'lucide-react';

type Delivery = {
  id: string;
  bookingId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  address: string;
  quantity: number;
  status: string;
  partnerId: string;
  partnerName: string;
  partnerPhone: string;
  assignedAt: string;
  expectedDelivery: string;
  notes?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
};

type FilterOptions = {
  status: string;
  partnerId: string;
  priority: string;
  search: string;
};

export default function ActiveDeliveriesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [partners, setPartners] = useState<Array<{ id: string; name: string; isActive: boolean }>>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    status: '',
    partnerId: '',
    priority: '',
    search: ''
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.push('/login');
    else if (session.user.role !== 'ADMIN') router.push('/user');
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      loadData();
    }
  }, [session]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [deliveriesRes, partnersRes] = await Promise.all([
        fetch('/api/admin/deliveries/active', { cache: 'no-store' }),
        fetch('/api/admin/deliveries/partners?active=true', { cache: 'no-store' })
      ]);

      if (deliveriesRes.ok) {
        const deliveriesData = await deliveriesRes.json();
        setDeliveries(deliveriesData.data || []);
      }

      if (partnersRes.ok) {
        const partnersData = await partnersRes.json();
        // Handle both direct data and paginated data structures
        const partnersArray = partnersData.data?.data || partnersData.data || [];
        setPartners(partnersArray);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setDeliveries([]);
      setPartners([]);
    } finally {
      setLoading(false);
    }
  };

  const updateDeliveryStatus = async (deliveryId: string, newStatus: string, notes?: string) => {
    setUpdating(deliveryId);
    try {
      const res = await fetch('/api/admin/deliveries/assignments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          bookingId: deliveryId, 
          status: newStatus,
          notes 
        })
      });

      if (res.ok) {
        await loadData();
      } else {
        alert('Failed to update delivery status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating delivery status');
    } finally {
      setUpdating(null);
    }
  };

  const assignPartner = async (deliveryId: string, partnerId: string) => {
    setUpdating(deliveryId);
    try {
      const res = await fetch('/api/admin/deliveries/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          bookingId: deliveryId, 
          partnerId 
        })
      });

      if (res.ok) {
        await loadData();
      } else {
        alert('Failed to assign partner');
      }
    } catch (error) {
      console.error('Error assigning partner:', error);
      alert('Error assigning partner');
    } finally {
      setUpdating(null);
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredDeliveries = deliveries.filter(delivery => {
    if (filters.status && delivery.status !== filters.status) return false;
    if (filters.partnerId && delivery.partnerId !== filters.partnerId) return false;
    if (filters.priority && delivery.priority !== filters.priority) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        delivery.customerName.toLowerCase().includes(searchLower) ||
        delivery.address.toLowerCase().includes(searchLower) ||
        delivery.bookingId.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  if (status === 'loading') return null;
  if (!session || session.user.role !== 'ADMIN') return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Active Deliveries</h1>
              <p className="text-gray-600 mt-2">Monitor and manage active cylinder deliveries</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadData}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <Link
                href="/admin/deliveries"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Eye className="w-4 h-4" />
                Dashboard
              </Link>
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Customer, address, or booking ID"
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Status</option>
                    <option value="ASSIGNED">Assigned</option>
                    <option value="PICKED_UP">Picked Up</option>
                    <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                    <option value="DELIVERED">Delivered</option>
                    <option value="FAILED">Failed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Partner</label>
                  <select
                    value={filters.partnerId}
                    onChange={(e) => setFilters(prev => ({ ...prev, partnerId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Partners</option>
                    {Array.isArray(partners) && partners.map(partner => (
                      <option key={partner.id} value={partner.id}>{partner.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={filters.priority}
                    onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Priorities</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Deliveries List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Active Deliveries ({filteredDeliveries.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-20 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : filteredDeliveries.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Truck className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No deliveries found</p>
                  <p className="text-sm">Try adjusting your filters or check back later</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredDeliveries.map((delivery) => (
                    <div key={delivery.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(delivery.status)}`}>
                              {delivery.status.replace('_', ' ')}
                            </span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(delivery.priority)}`}>
                              {delivery.priority}
                            </span>
                            <span className="text-sm text-gray-500">#{delivery.bookingId}</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h3 className="font-semibold text-gray-900 mb-2">{delivery.customerName}</h3>
                              <div className="space-y-1 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                  <Phone className="w-4 h-4" />
                                  {delivery.customerPhone}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Mail className="w-4 h-4" />
                                  {delivery.customerEmail}
                                </div>
                                <div className="flex items-start gap-2">
                                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                  <span className="line-clamp-2">{delivery.address}</span>
                                </div>
                              </div>
                            </div>

                            <div>
                              <div className="mb-2">
                                <span className="text-sm font-medium text-gray-700">Quantity: </span>
                                <span className="text-sm text-gray-900">{delivery.quantity} cylinders</span>
                              </div>
                              <div className="mb-2">
                                <span className="text-sm font-medium text-gray-700">Assigned: </span>
                                <span className="text-sm text-gray-900">{delivery.partnerName}</span>
                              </div>
                              <div className="mb-2">
                                <span className="text-sm font-medium text-gray-700">Expected: </span>
                                <span className="text-sm text-gray-900">
                                  {new Date(delivery.expectedDelivery).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          {/* Status Update Buttons */}
                          {delivery.status === 'ASSIGNED' && (
                            <button
                              onClick={() => updateDeliveryStatus(delivery.bookingId, 'PICKED_UP')}
                              disabled={updating === delivery.bookingId}
                              className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm hover:bg-yellow-200 transition-colors disabled:opacity-50"
                            >
                              Mark Picked Up
                            </button>
                          )}

                          {delivery.status === 'PICKED_UP' && (
                            <button
                              onClick={() => updateDeliveryStatus(delivery.bookingId, 'OUT_FOR_DELIVERY')}
                              disabled={updating === delivery.bookingId}
                              className="px-3 py-1 bg-purple-100 text-purple-800 rounded text-sm hover:bg-purple-200 transition-colors disabled:opacity-50"
                            >
                              Out for Delivery
                            </button>
                          )}

                          {delivery.status === 'OUT_FOR_DELIVERY' && (
                            <button
                              onClick={() => updateDeliveryStatus(delivery.bookingId, 'DELIVERED')}
                              disabled={updating === delivery.bookingId}
                              className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm hover:bg-green-200 transition-colors disabled:opacity-50"
                            >
                              Mark Delivered
                            </button>
                          )}

                          {/* Partner Assignment */}
                          {!delivery.partnerId && (
                            <select
                              onChange={(e) => assignPartner(delivery.bookingId, e.target.value)}
                              disabled={updating === delivery.bookingId}
                              className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                              <option value="">Assign Partner</option>
                              {Array.isArray(partners) && partners.filter(p => p.isActive).map(partner => (
                                <option key={partner.id} value={partner.id}>{partner.name}</option>
                              ))}
                            </select>
                          )}

                          {/* Failed Delivery */}
                          {['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(delivery.status) && (
                            <button
                              onClick={() => updateDeliveryStatus(delivery.bookingId, 'FAILED')}
                              disabled={updating === delivery.bookingId}
                              className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200 transition-colors disabled:opacity-50"
                            >
                              Mark Failed
                            </button>
                          )}

                          {/* View Details */}
                          <Link
                            href={`/admin/bookings/${delivery.bookingId}`}
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200 transition-colors text-center"
                          >
                            View Details
                          </Link>
                        </div>
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
