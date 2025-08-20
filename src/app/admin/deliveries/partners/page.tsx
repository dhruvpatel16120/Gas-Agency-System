'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AdminNavbar from '@/components/AdminNavbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import Link from 'next/link';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  MapPin, 
  Phone, 
  Mail, 
  Truck, 
  Edit3, 
  Trash2, 
  Eye,
  CheckCircle,
  XCircle,
  TrendingUp,
  Calendar
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

type FilterOptions = {
  search: string;
  status: string;
  area: string;
  sortBy: string;
};

export default function DeliveryPartnersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    status: '',
    area: '',
    sortBy: 'name'
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.push('/login');
    else if (session.user.role !== 'ADMIN') router.push('/user');
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      loadPartners();
    }
  }, [session]);

  const loadPartners = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/deliveries/partners?includeStats=true', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        // Handle both direct data and paginated data structures
        const partnersArray = data.data?.data || data.data || [];
        setPartners(partnersArray);
      }
    } catch (error) {
      console.error('Error loading partners:', error);
      setPartners([]);
    } finally {
      setLoading(false);
    }
  };

  const togglePartnerStatus = async (partnerId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/deliveries/partners/${partnerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      });

      if (res.ok) {
        await loadPartners();
      } else {
        alert('Failed to update partner status');
      }
    } catch (error) {
      console.error('Error updating partner status:', error);
      alert('Error updating partner status');
    }
  };

  const deletePartner = async (partnerId: string) => {
    if (!confirm('Are you sure you want to delete this partner? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/deliveries/partners/${partnerId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        await loadPartners();
      } else {
        alert('Failed to delete partner');
      }
    } catch (error) {
      console.error('Error deleting partner:', error);
      alert('Error deleting partner');
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-red-100 text-red-800 border-red-200';
  };

  const getPerformanceColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 4.0) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredPartners = Array.isArray(partners) ? partners.filter(partner => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        partner.name.toLowerCase().includes(searchLower) ||
        partner.phone.toLowerCase().includes(searchLower) ||
        partner.email?.toLowerCase().includes(searchLower) ||
        partner.serviceArea?.toLowerCase().includes(searchLower)
      );
    }
    if (filters.status && filters.status === 'active' && !partner.isActive) return false;
    if (filters.status && filters.status === 'inactive' && partner.isActive) return false;
    if (filters.area && partner.serviceArea !== filters.area) return false;
    return true;
  }) : [];

  const sortedPartners = [...filteredPartners].sort((a, b) => {
    switch (filters.sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'performance':
        return (b.averageRating || 0) - (a.averageRating || 0);
      case 'deliveries':
        return (b.totalDeliveries || 0) - (a.totalDeliveries || 0);
      case 'recent':
        return new Date(b.lastActive || 0).getTime() - new Date(a.lastActive || 0).getTime();
      default:
        return 0;
    }
  });

  const uniqueAreas = Array.isArray(partners) 
    ? Array.from(new Set(partners.map(p => p.serviceArea).filter(Boolean)))
    : [];

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
              <h1 className="text-3xl font-bold text-gray-900">Delivery Partners</h1>
              <p className="text-gray-600 mt-2">Manage delivery partners and their service areas</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/deliveries"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Eye className="w-4 h-4" />
                Dashboard
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

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Partners</p>
                    <p className="text-2xl font-bold text-gray-900">{Array.isArray(partners) ? partners.length : 0}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Partners</p>
                                          <p className="text-2xl font-bold text-gray-900">
                        {Array.isArray(partners) ? partners.filter(p => p.isActive).length : 0}
                      </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Deliveries</p>
                                          <p className="text-2xl font-bold text-gray-900">
                        {Array.isArray(partners) ? partners.reduce((sum, p) => sum + p.totalDeliveries, 0) : 0}
                      </p>
                  </div>
                  <Truck className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg Rating</p>
                                          <p className="text-2xl font-bold text-gray-900">
                        {Array.isArray(partners) && partners.length > 0 
                          ? (partners.reduce((sum, p) => sum + p.averageRating, 0) / partners.length).toFixed(1)
                          : '0.0'
                        }
                      </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
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
                      placeholder="Name, phone, email, or area"
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
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Service Area</label>
                  <select
                    value={filters.area}
                    onChange={(e) => setFilters(prev => ({ ...prev, area: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Areas</option>
                    {uniqueAreas.map(area => (
                      <option key={area} value={area}>{area}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="name">Name</option>
                    <option value="performance">Performance</option>
                    <option value="deliveries">Total Deliveries</option>
                    <option value="recent">Recently Active</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Partners List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Partners ({sortedPartners.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-24 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : sortedPartners.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No partners found</p>
                  <p className="text-sm">Try adjusting your filters or add a new partner</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedPartners.map((partner) => (
                    <div key={partner.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(partner.isActive)}`}>
                              {partner.isActive ? 'Active' : 'Inactive'}
                            </span>
                            <span className="text-sm text-gray-500">#{partner.id.slice(-6)}</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h3 className="font-semibold text-gray-900 mb-2">{partner.name}</h3>
                              <div className="space-y-1 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                  <Phone className="w-4 h-4" />
                                  {partner.phone}
                                </div>
                                {partner.email && (
                                  <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4" />
                                    {partner.email}
                                  </div>
                                )}
                                {partner.vehicleNumber && (
                                  <div className="flex items-center gap-2">
                                    <Truck className="w-4 h-4" />
                                    {partner.vehicleNumber}
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-4 h-4" />
                                  {partner.serviceArea || 'No area assigned'}
                                </div>
                              </div>
                            </div>

                            <div>
                              <div className="mb-2">
                                <span className="text-sm font-medium text-gray-700">Capacity: </span>
                                <span className="text-sm text-gray-900">{partner.capacityPerDay}/day</span>
                              </div>
                              <div className="mb-2">
                                <span className="text-sm font-medium text-gray-700">Total Deliveries: </span>
                                <span className="text-sm text-gray-900">{partner.totalDeliveries}</span>
                              </div>
                              <div className="mb-2">
                                <span className="text-sm font-medium text-gray-700">Rating: </span>
                                <span className={`text-sm font-medium ${getPerformanceColor(partner.averageRating)}`}>
                                  {partner.averageRating.toFixed(1)}/5.0
                                </span>
                              </div>
                              <div className="mb-2">
                                <span className="text-sm font-medium text-gray-700">Last Active: </span>
                                <span className="text-sm text-gray-900">
                                  {new Date(partner.lastActive).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          <Link
                            href={`/admin/deliveries/partners/${partner.id}`}
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200 transition-colors text-center"
                          >
                            <Eye className="w-4 h-4 inline mr-1" />
                            View
                          </Link>

                          <Link
                            href={`/admin/deliveries/partners/${partner.id}/edit`}
                            className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm hover:bg-yellow-200 transition-colors text-center"
                          >
                            <Edit3 className="w-4 h-4 inline mr-1" />
                            Edit
                          </Link>

                          <button
                            onClick={() => togglePartnerStatus(partner.id, partner.isActive)}
                            className={`px-3 py-1 rounded text-sm transition-colors text-center ${
                              partner.isActive
                                ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                : 'bg-green-100 text-green-800 hover:bg-green-200'
                            }`}
                          >
                            {partner.isActive ? (
                              <>
                                <XCircle className="w-4 h-4 inline mr-1" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 inline mr-1" />
                                Activate
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => deletePartner(partner.id)}
                            className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200 transition-colors text-center"
                          >
                            <Trash2 className="w-4 h-4 inline mr-1" />
                            Delete
                          </button>
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
