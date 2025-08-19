'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AdminNavbar from '@/components/AdminNavbar';
import Link from 'next/link';

type UserDetail = {
  id: string;
  name: string;
  email: string;
  userId: string;
  phone: string;
  address: string;
  role: 'USER' | 'ADMIN';
  remainingQuota: number;
  emailVerified: string | null;
  createdAt: string;
};

type BookingLite = { id: string; status: string; createdAt: string; deliveredAt: string | null; paymentMethod: string };

export default function AdminUserDetailPage() {
  const params = useParams();
  const userId = String(params?.id || '');
  const { data: session, status } = useSession();
  const router = useRouter();

  const [user, setUser] = useState<UserDetail | null>(null);
  const [bookings, setBookings] = useState<BookingLite[]>([]);
  const [stats, setStats] = useState<{ total: number; delivered: number; pending: number; approved: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState<'none' | 'verify' | 'reset'>('none');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.push('/login');
    else if (session.user.role !== 'ADMIN') router.push('/user');
  }, [session, status, router]);

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/users/${userId}`, { cache: 'no-store' });
    const json = await res.json();
    if (json.success) {
      setUser(json.data.user);
      setBookings(json.data.user.bookings);
      setStats(json.data.bookingStats);
    }
    setLoading(false);
  };

  useEffect(() => { if (userId) fetchData(); }, [userId]);

  const onSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const payload: any = {
      name: String(formData.get('name') || ''),
      phone: String(formData.get('phone') || ''),
      address: String(formData.get('address') || ''),
      role: String(formData.get('role') || ''),
      remainingQuota: Number(formData.get('remainingQuota') || 0),
    };
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        await fetchData();
        alert('Saved');
      } else {
        alert(json.message || 'Failed to save');
      }
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!confirm('Delete user and all related bookings? This cannot be undone.')) return;
    const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      router.push('/admin/users');
    } else {
      alert(json.message || 'Failed to delete');
    }
  };

  if (status === 'loading') return null;
  if (!session || session.user.role !== 'ADMIN') return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <main className="max-w-5xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Manage User</h2>
            <Link href="/admin/users" className="text-blue-600 hover:underline">Back to Users</Link>
          </div>

          {loading || !user ? (
            <div className="p-6 bg-white rounded border">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3 p-4 bg-white rounded border text-gray-900">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Profile & Settings</h3>
                  <p className="text-sm text-gray-500">Edit user details, role, and cylinder quota. Changes apply immediately.</p>
                </div>
                <form onSubmit={onSave} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-gray-600">Name</label>
                      <input name="name" defaultValue={user.name} className="w-full border rounded px-3 py-2 text-gray-900" required />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Email</label>
                      <input disabled defaultValue={user.email} className="w-full border rounded px-3 py-2 bg-gray-100 text-gray-700" />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">User ID</label>
                      <input disabled defaultValue={user.userId} className="w-full border rounded px-3 py-2 bg-gray-100 text-gray-700" />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Phone</label>
                      <input name="phone" defaultValue={user.phone} className="w-full border rounded px-3 py-2 text-gray-900" required />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm text-gray-600">Address</label>
                      <textarea name="address" defaultValue={user.address} className="w-full border rounded px-3 py-2 text-gray-900" required />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Role</label>
                      <select name="role" defaultValue={user.role} className="w-full border rounded px-3 py-2 text-gray-900">
                        <option value="USER">User</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Remaining Quota</label>
                      <input name="remainingQuota" type="number" min={0} defaultValue={user.remainingQuota} className="w-full border rounded px-3 py-2 text-gray-900" />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Email Verified</label>
                      <input disabled value={user.emailVerified ? 'Yes' : 'No'} className="w-full border rounded px-3 py-2 bg-gray-100 text-gray-700" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button disabled={saving} className="bg-purple-600 text-white rounded px-4 py-2 disabled:opacity-50">{saving ? 'Saving...' : 'Save Changes'}</button>
                    <button type="button" onClick={onDelete} className="bg-red-600 text-white rounded px-4 py-2">Delete User</button>
                  </div>
                </form>
              </div>

              <div className="lg:col-span-2 p-4 bg-white rounded border text-gray-900">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">User Insights</h3>
                  <p className="text-sm text-gray-500">Stats, recent bookings, and quick actions for this user.</p>
                </div>
                <div className="mb-3">
                  <div className="text-sm text-gray-600">Stats</div>
                  <div className="text-sm">Total bookings: {stats?.total ?? 0}</div>
                  <div className="text-sm">Pending: {stats?.pending ?? 0}</div>
                  <div className="text-sm">Approved: {stats?.approved ?? 0}</div>
                  <div className="text-sm">Delivered: {stats?.delivered ?? 0}</div>
                </div>
                <div>
                  <div className="font-medium mb-2">Recent Bookings</div>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {bookings.length === 0 ? (
                      <div className="text-sm text-gray-600">No bookings</div>
                    ) : bookings.map((b) => (
                      <div key={b.id} className="border rounded px-3 py-2 text-sm">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">{b.id}</div>
                          <span className="text-xs rounded px-2 py-0.5 bg-gray-100">{b.status}</span>
                        </div>
                        <div className="text-xs text-gray-600">Created {new Date(b.createdAt).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-4 border-t pt-3">
                  <div className="font-medium mb-2">Actions</div>
                  <div className="flex gap-2">
                    <button
                      className="border rounded px-3 py-1"
                      disabled={sending !== 'none'}
                      onClick={async () => {
                        setSending('verify');
                        try {
                          const res = await fetch(`/api/admin/users/${userId}/action`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'resendVerification' }),
                          });
                          const json = await res.json();
                          alert(json.message || (json.success ? 'Verification email sent' : 'Failed'));
                        } finally {
                          setSending('none');
                        }
                      }}
                    >
                      {sending === 'verify' ? 'Sending...' : 'Resend Verification'}
                    </button>
                    <button
                      className="border rounded px-3 py-1"
                      disabled={sending !== 'none'}
                      onClick={async () => {
                        setSending('reset');
                        try {
                          const res = await fetch(`/api/admin/users/${userId}/action`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'sendPasswordReset' }),
                          });
                          const json = await res.json();
                          alert(json.message || (json.success ? 'Password reset email sent' : 'Failed'));
                        } finally {
                          setSending('none');
                        }
                      }}
                    >
                      {sending === 'reset' ? 'Sending...' : 'Send Password Reset'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}


