'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AdminNavbar from '@/components/AdminNavbar';
import Link from 'next/link';

type Reply = { id: string; body: string; isAdmin: boolean; createdAt: string; author: { id: string; name: string; email: string } };
type ContactDetail = {
  id: string;
  subject: string;
  message: string;
  category?: string | null;
  priority?: string | null;
  relatedBookingId?: string | null;
  preferredContact?: string | null;
  phone?: string | null;
  status: 'NEW' | 'OPEN' | 'RESOLVED' | 'ARCHIVED';
  createdAt: string;
  lastRepliedAt?: string | null;
  user: { id: string; name: string; email: string };
  replies: Reply[];
};

export default function AdminContactDetailPage() {
  const params = useParams();
  const id = String(params?.id || '');
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.push('/login');
    else if (session.user.role !== 'ADMIN') router.push('/user');
  }, [session, status, router]);

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/contacts/${id}`, { cache: 'no-store' });
    const json = await res.json();
    if (json.success) setData(json.data);
    setLoading(false);
  };
  useEffect(() => { if (id) fetchData(); }, [id]);

  const onUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const payload: any = { status: String(formData.get('status') || ''), category: String(formData.get('category') || ''), priority: String(formData.get('priority') || '') };
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/contacts/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (json.success) { await fetchData(); }
    } finally { setSaving(false); }
  };

  const onReply = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const body = String(formData.get('body') || '');
    if (!body.trim()) return;
    setReplying(true);
    try {
      const res = await fetch(`/api/admin/contacts/${id}/reply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body }) });
      const json = await res.json();
      if (json.success) { form.reset(); await fetchData(); }
      else alert(json.message || 'Failed to send reply');
    } finally { setReplying(false); }
  };

  if (status === 'loading') return null;
  if (!session || session.user.role !== 'ADMIN') return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <main className="max-w-5xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Contact Message</h2>
            <Link href="/admin/contacts" className="text-blue-600 hover:underline">Back to Contacts</Link>
          </div>

          {loading || !data ? (
            <div className="p-6 bg-white rounded border text-gray-900">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3 p-4 bg-white rounded border text-gray-900">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Message & Conversation</h3>
                  <p className="text-sm text-gray-500">View the original message and reply inline. Your reply will be emailed to the user.</p>
                </div>
                <div className="mb-4">
                  <div className="text-sm text-gray-600">From</div>
                  <div className="text-sm">{data.user.name} &lt;{data.user.email}&gt;</div>
                </div>
                <div className="mb-2 text-lg font-semibold">{data.subject}</div>
                <div className="whitespace-pre-wrap text-sm text-gray-800 border rounded p-3 bg-gray-50">{data.message}</div>
                <div className="mt-4">
                  <div className="font-medium mb-2">Conversation</div>
                  <div className="space-y-3">
                    {data.replies.length === 0 ? (
                      <div className="text-sm text-gray-600">No replies yet</div>
                    ) : data.replies.map((r) => (
                      <div key={r.id} className={`border rounded p-3 text-sm ${r.isAdmin ? 'bg-purple-50' : 'bg-white'}`}>
                        <div className="text-xs text-gray-600 mb-1">{r.author.name} • {new Date(r.createdAt).toLocaleString()}</div>
                        <div className="whitespace-pre-wrap">{r.body}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <form onSubmit={onReply} className="mt-4 space-y-2">
                  <textarea name="body" className="w-full border rounded px-3 py-2 text-gray-900" placeholder="Type your reply..." rows={4} required />
                  <button disabled={replying} className="bg-purple-600 text-white rounded px-4 py-2 disabled:opacity-50">{replying ? 'Sending...' : 'Send Reply'}</button>
                </form>
              </div>

              <div className="lg:col-span-2 p-4 bg-white rounded border text-gray-900">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Details & Status</h3>
                  <p className="text-sm text-gray-500">Update status, manage classification, and see timestamps.</p>
                </div>
                <form onSubmit={onUpdate} className="space-y-3">
                  <div>
                    <div className="text-sm text-gray-600">Status</div>
                    <select name="status" defaultValue={data.status} className="w-full border rounded px-3 py-2 text-gray-900">
                      <option value="NEW">New</option>
                      <option value="OPEN">Open</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Category</div>
                    <input name="category" defaultValue={data.category || ''} className="w-full border rounded px-3 py-2 text-gray-900" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Priority</div>
                    <input name="priority" defaultValue={data.priority || ''} className="w-full border rounded px-3 py-2 text-gray-900" />
                  </div>
                  <button disabled={saving} className="border rounded px-3 py-2">{saving ? 'Saving...' : 'Save'}</button>
                </form>
                <div className="mt-3 text-xs text-gray-600">Created {new Date(data.createdAt).toLocaleString()}</div>
                {data.lastRepliedAt && <div className="text-xs text-gray-600">Last replied {new Date(data.lastRepliedAt).toLocaleString()}</div>}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}


