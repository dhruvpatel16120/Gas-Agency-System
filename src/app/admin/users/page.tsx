'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AdminNavbar from '@/components/AdminNavbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import Link from 'next/link';
import { Users, UserPlus, RefreshCw, Filter, Search, ChevronDown, SortAsc, SortDesc } from 'lucide-react';

type UserRow = {
  id: string;
  name: string;
  email: string;
  userId: string;
  phone: string;
  address: string;
  role: 'USER' | 'ADMIN';
  remainingQuota: number;
  createdAt: string;
  _count: { bookings: number };
};

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<'ALL' | 'USER' | 'ADMIN'>('ALL');
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'createdAt' | 'name' | 'email' | 'remainingQuota'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.push('/login');
    else if (session.user.role !== 'ADMIN') router.push('/user');
  }, [session, status, router]);

  const fetchUsers = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    const normalizedSearch = search.trim();
    if (normalizedSearch) params.set('search', normalizedSearch);
    if (role !== 'ALL') params.set('role', role);
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);
    const res = await fetch(`/api/admin/users?${params.toString()}`, { cache: 'no-store' });
    const json = await res.json();
    if (json.success) {
      setUsers(json.data.data);
      setTotal(json.data.pagination.total);
    }
    setLoading(false);
  };

  const totalPages = useMemo(() => Math.ceil(total / limit) || 1, [total, limit]);

  const refresh = () => fetchUsers();
  const listDepsKey = `${page}|${limit}|${role}|${sortBy}|${sortOrder}|${search.trim()}`;

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listDepsKey]);

  if (status === 'loading') return null;
  if (!session || session.user.role !== 'ADMIN') return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-gray-900">Users</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={refresh}
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 font-semibold text-purple-700 bg-white border border-purple-200 shadow-sm transition-all duration-200
                  hover:bg-gradient-to-r hover:from-purple-500 hover:to-purple-700 hover:text-white hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
              
              <Link
                href="/admin/users/new"
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 font-semibold text-white bg-gradient-to-r from-purple-500 to-purple-700 shadow-sm transition-all duration-200
                  hover:from-purple-600 hover:to-purple-800 hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
              >
                <UserPlus className="w-4 h-4" /> New User
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[
              { title: 'Total Users', value: total, icon: Users },
              { title: 'Admins', value: users.filter(u => u.role === 'ADMIN').length, icon: Users },
              { title: 'Low Quota (<=2)', value: users.filter(u => u.remainingQuota <= 2).length, icon: Users },
              { title: 'Page Size', value: limit, icon: Users },
            ].map((s, idx) => (
              <Card key={idx} className="border-purple-200 hover:shadow-md transition-all hover:-translate-y-0.5">
                <CardContent className="p-4 text-gray-900">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-500">{s.title}</div>
                      <div className="text-2xl font-bold">{s.value}</div>
                    </div>
                    <s.icon className="w-7 h-7 text-purple-600/80" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-purple-200 text-gray-900">
            <CardHeader className="p-4 border-b bg-gradient-to-r from-gray-50 to-white rounded-t-lg">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
                    <input className="border rounded pl-8 pr-3 py-2 w-72 focus:ring-2 focus:ring-purple-500 focus:border-purple-500" placeholder="Search name, email, userId, phone" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); } }} />
                  </div>
                  <select className="border rounded px-3 py-2" value={role} onChange={(e) => { setRole(e.target.value as any); setPage(1); }}>
                    <option value="ALL">All Roles</option>
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-600">Sort:</span>
                    <select className="border rounded px-2 py-2" value={sortBy} onChange={(e) => { setSortBy(e.target.value as any); setPage(1); }}>
                      <option value="createdAt">Created</option>
                      <option value="name">Name</option>
                      <option value="email">Email</option>
                      <option value="remainingQuota">Quota</option>
                    </select>
                    <button onClick={() => { setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); setPage(1); }} className="border rounded px-2 py-2 hover:bg-gray-50">
                      {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                    </button>
                  </div>
                  <button className="border rounded px-3 py-2 hover:bg-gray-50" onClick={() => { setPage(1); }}>Apply</button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Per page:</span>
                  <select className="border rounded px-2 py-2" value={limit} onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(1); }}>
                    {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 text-gray-900">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2">Role</th>
                      <th className="px-3 py-2">Bookings</th>
                      <th className="px-3 py-2">Quota</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td className="px-3 py-6 text-center" colSpan={6}>Loading...</td></tr>
                    ) : users.length === 0 ? (
                      <tr><td className="px-3 py-6 text-center" colSpan={6}>No users found</td></tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u.id} className="border-t hover:bg-purple-50/40 transition-colors">
                          <td className="px-3 py-2">
                            <div className="font-medium">{u.name}</div>
                            <div className="text-xs text-gray-500">{u.userId} • {new Date(u.createdAt).toLocaleDateString()}</div>
                          </td>
                          <td className="px-3 py-2">{u.email}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs border ${u.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>{u.role}</span>
                          </td>
                          <td className="px-3 py-2 text-center">{u._count.bookings}</td>
                          <td className="px-3 py-2 text-center">{u.remainingQuota}</td>
                          <td className="px-3 py-2 text-center">
                            <Link className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 hover:underline" href={`/admin/users/${u.id}`}>Manage</Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between p-4 border-t rounded-b-lg bg-gradient-to-r from-white to-purple-50">
                <div className="text-sm text-gray-600">Page {page} of {totalPages}</div>
                <div className="flex gap-2">
                  <button className="border rounded px-3 py-1 hover:bg-gray-50" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
                  <button className="border rounded px-3 py-1 hover:bg-gray-50" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}


