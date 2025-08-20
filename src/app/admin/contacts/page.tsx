'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AdminNavbar from '@/components/AdminNavbar';
import Link from 'next/link';
import { 
  RefreshCw, 
  Search, 
  Filter, 
  MessageSquare, 
  Inbox, 
  CheckCircle2, 
  Archive, 
  Clock,
  AlertCircle,
  TrendingUp,
  Mail,
  Calendar,
  User,
  Eye,
  MoreHorizontal
} from 'lucide-react';

type ContactRow = {
  id: string;
  subject: string;
  status: 'NEW' | 'OPEN' | 'RESOLVED' | 'ARCHIVED';
  createdAt: string;
  lastRepliedAt?: string | null;
  category?: string | null;
  priority?: string | null;
  user: { id: string; name: string; email: string };
  _count: { replies: number };
};

const statusConfig = {
  NEW: { label: 'New', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Clock },
  OPEN: { label: 'Open', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertCircle },
  RESOLVED: { label: 'Resolved', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
  ARCHIVED: { label: 'Archived', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: Archive }
};

const priorityConfig = {
  HIGH: { label: 'High', color: 'bg-red-100 text-red-800 border-red-200' },
  MEDIUM: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  LOW: { label: 'Low', color: 'bg-blue-100 text-blue-800 border-blue-200' }
};

export default function AdminContactsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<ContactRow[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [state, setState] = useState<'ALL' | 'NEW' | 'OPEN' | 'RESOLVED' | 'ARCHIVED'>('ALL');
  const [loading, setLoading] = useState(true);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.push('/login');
    else if (session.user.role !== 'ADMIN') router.push('/user');
  }, [session, status, router]);

  const fetchItems = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (search) params.set('search', search);
    if (state !== 'ALL') params.set('status', state);
    const res = await fetch(`/api/admin/contacts?${params.toString()}`, { cache: 'no-store' });
    const json = await res.json();
    if (json.success) {
      setItems(json.data.data);
      setTotal(json.data.pagination.total);
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/contacts/stats', { cache: 'no-store' });
      const json = await res.json();
      if (json.success) {
        // Update stats based on real data
        setTotal(json.data.overview.total);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  useEffect(() => { 
    if (session?.user?.role === 'ADMIN') {
      fetchItems(); 
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [page, limit, state]);

  // Debounced search
  useEffect(() => {
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => {
      setPage(1);
      fetchItems();
    }, 500);
    setSearchTimeout(timeout);
    return () => clearTimeout(timeout);
  }, [search]);

  const totalPages = useMemo(() => Math.ceil(total / limit) || 1, [total, limit]);

  const getStatusIcon = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    const IconComponent = config?.icon || Clock;
    return <IconComponent className="w-4 h-4" />;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (status === 'loading') return null;
  if (!session || session.user.role !== 'ADMIN') return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30">
      <AdminNavbar />
      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Contact Management</h1>
                <p className="text-lg text-gray-600">Manage customer inquiries and support tickets</p>
              </div>
              <button 
                onClick={() => fetchItems()} 
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <RefreshCw className="w-4 h-4" /> 
                Refresh
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              { 
                title: 'Total Messages', 
                value: total, 
                icon: MessageSquare, 
                color: 'from-blue-500 to-blue-600',
                bgColor: 'bg-blue-50',
                textColor: 'text-blue-700'
              },
              { 
                title: 'New Tickets', 
                value: items.filter(i => i.status === 'NEW').length, 
                icon: Inbox, 
                color: 'from-orange-500 to-orange-600',
                bgColor: 'bg-orange-50',
                textColor: 'text-orange-700'
              },
              { 
                title: 'Open Tickets', 
                value: items.filter(i => i.status === 'OPEN').length, 
                icon: AlertCircle, 
                color: 'from-purple-500 to-purple-600',
                bgColor: 'bg-purple-50',
                textColor: 'text-purple-700'
              },
              { 
                title: 'Resolved', 
                value: items.filter(i => i.status === 'RESOLVED').length, 
                icon: CheckCircle2, 
                color: 'from-green-500 to-green-600',
                bgColor: 'bg-green-50',
                textColor: 'text-green-700'
              },
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

          {/* Search and Filters */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-8 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white text-gray-700 text-base" 
                      placeholder="Search messages, users, or subjects..." 
                      value={search} 
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-black">
                    <Filter className="w-4 h-4 text-black" />
                    <select 
                      className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white" 
                      value={state} 
                      onChange={(e) => { setState(e.target.value as any); setPage(1); }}
                    >
                      <option value="ALL">All Status</option>
                    <option value="NEW">New</option>
                    <option value="OPEN">Open</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-black">
                  <span className="text-sm text-gray-600 font-medium">Show:</span>
                  <select 
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white" 
                    value={limit} 
                    onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(1); }}
                  >
                    {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Table */}
          <div className="overflow-x-auto">
              <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Message</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Replies</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                {loading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                          <span className="ml-3 text-gray-500">Loading messages...</span>
                        </div>
                      </td>
                    </tr>
                ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="text-center">
                          <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No messages found</h3>
                          <p className="text-gray-500">Try adjusting your search or filter criteria</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    items.map((contact) => (
                      <tr key={contact.id} className="hover:bg-gray-50/50 transition-colors duration-150">
                        <td className="px-6 py-4">
                          <div className="max-w-xs">
                            <div className="font-semibold text-gray-900 mb-1 line-clamp-1">{contact.subject}</div>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              {contact.category && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  {contact.category}
                                </span>
                              )}
                              {contact.priority && priorityConfig[contact.priority as keyof typeof priorityConfig] && (
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${priorityConfig[contact.priority as keyof typeof priorityConfig].color}`}>
                                  {priorityConfig[contact.priority as keyof typeof priorityConfig].label}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold mr-3">
                              {contact.user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{contact.user.name}</div>
                              <div className="text-sm text-gray-500">{contact.user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${statusConfig[contact.status].color}`}>
                            {getStatusIcon(contact.status)}
                            {statusConfig[contact.status].label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {contact.priority && priorityConfig[contact.priority as keyof typeof priorityConfig] ? (
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${priorityConfig[contact.priority as keyof typeof priorityConfig].color}`}>
                              {priorityConfig[contact.priority as keyof typeof priorityConfig].label}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {contact._count.replies}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center">
                            <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-600">{formatDate(contact.createdAt)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Link 
                            href={`/admin/contacts/${contact.id}`}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 font-medium text-sm"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(page - 1) * limit + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(page * limit, total)}</span> of{' '}
                  <span className="font-medium">{total}</span> results
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200" 
                    disabled={page <= 1} 
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <span className="px-3 py-2 text-sm text-gray-700">
                    Page {page} of {totalPages}
                  </span>
                  <button 
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200" 
                    disabled={page >= totalPages} 
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
          </div>
          </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


