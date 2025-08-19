'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AdminNavbar from '@/components/AdminNavbar';
import Link from 'next/link';
import { RefreshCw, Search, Filter, MessageSquare, Inbox, CheckCircle2, Archive } from 'lucide-react';

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

  useEffect(() => { if (session?.user?.role === 'ADMIN') fetchItems(); /* eslint-disable-next-line */ }, [page, limit, state]);

  const totalPages = useMemo(() => Math.ceil(total / limit) || 1, [total, limit]);

  if (status === 'loading') return null;
  if (!session || session.user.role !== 'ADMIN') return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-gray-900">Contact Messages</h2>
            <button onClick={() => fetchItems()} className="inline-flex items-center gap-2 border rounded px-3 py-2 hover:bg-gray-50"><RefreshCw className="w-4 h-4" /> Refresh</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[
              { title: 'Total', value: total, icon: MessageSquare },
              { title: 'New', value: items.filter(i => i.status === 'NEW').length, icon: Inbox },
              { title: 'Open', value: items.filter(i => i.status === 'OPEN').length, icon: MessageSquare },
              { title: 'Resolved', value: items.filter(i => i.status === 'RESOLVED').length, icon: CheckCircle2 },
            ].map((s, idx) => (
              <div key={idx} className="rounded-xl border border-purple-200 bg-white p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 text-gray-900">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-500">{s.title}</div>
                    <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                  </div>
                  <s.icon className="w-7 h-7 text-purple-600/80" />
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border bg-white shadow-sm text-gray-900">
            <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-white rounded-t-xl">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
                    <input className="border rounded-lg pl-8 pr-3 py-2 w-72 focus:ring-2 focus:ring-purple-500 focus:border-purple-500" placeholder="Search subject, message, user" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); fetchItems(); } }} />
                  </div>
                  <select className="border rounded-lg px-3 py-2" value={state} onChange={(e) => { setState(e.target.value as any); setPage(1); }}>
                    <option value="ALL">All</option>
                    <option value="NEW">New</option>
                    <option value="OPEN">Open</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                  <button className="border border-purple-200 rounded-lg px-3 py-2 hover:bg-purple-50" onClick={() => { setPage(1); fetchItems(); }}>Apply</button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Per page:</span>
                  <select className="border rounded-lg px-2 py-2" value={limit} onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(1); }}>
                    {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
            </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-gray-900">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Subject</th>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Replies</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td className="px-3 py-6 text-center" colSpan={6}>Loading...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td className="px-3 py-6 text-center" colSpan={6}>No messages</td></tr>
                ) : (
                  items.map((c) => (
                    <tr key={c.id} className="border-t hover:bg-purple-50/40 transition-colors">
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900">{c.subject}</div>
                        <div className="text-xs text-gray-500">{c.category || 'General'}{c.priority ? ` • ${c.priority}` : ''}</div>
                      </td>
                      <td className="px-3 py-2 text-center">{c.user.name}</td>
                      <td className="px-3 py-2 text-center"><span className="text-xs rounded-full px-2.5 py-0.5 bg-gray-50 border border-gray-200">{c.status}</span></td>
                      <td className="px-3 py-2 text-center">{c._count.replies}</td>
                      <td className="px-3 py-2 text-center">{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td className="px-3 py-2 text-center"><Link className="text-purple-600 hover:text-purple-700 hover:underline" href={`/admin/contacts/${c.id}`}>Open</Link></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-b-xl bg-gradient-to-r from-white to-purple-50">
            <div className="text-sm text-gray-600">Page {page} of {totalPages}</div>
            <div className="flex gap-2">
              <button className="border rounded-lg px-3 py-1 hover:bg-gray-50" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
              <button className="border rounded-lg px-3 py-1 hover:bg-gray-50" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


