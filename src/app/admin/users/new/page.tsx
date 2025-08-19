'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AdminNavbar from '@/components/AdminNavbar';
import Link from 'next/link';
import { UserPlus, Mail, Phone, IdCard, Home, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminCreateUserPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.push('/login');
    else if (session.user.role !== 'ADMIN') router.push('/user');
  }, [session, status, router]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const payload = {
      name: String(formData.get('name') || ''),
      userId: String(formData.get('userId') || ''),
      email: String(formData.get('email') || ''),
      phone: String(formData.get('phone') || ''),
      address: String(formData.get('address') || ''),
      role: String(formData.get('role') || 'USER'),
    } as any;
    setCreating(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (json.success) {
        toast.success('Invitation sent successfully');
        router.push('/admin/users');
      } else {
        const msg = json.message || 'Failed to create user';
        setErrorMsg(msg);
        toast.error(msg);
      }
    } catch (err) {
      const msg = 'Something went wrong while creating user';
      setErrorMsg(msg);
      toast.error(msg);
    } finally { setCreating(false); }
  };

  if (status === 'loading') return null;
  if (!session || session.user.role !== 'ADMIN') return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-gray-900">Create New User</h2>
            <Link href="/admin/users" className="text-blue-600 hover:underline">Back to Users</Link>
          </div>

          <div className="rounded-xl border border-purple-200 bg-white shadow-sm p-6 text-gray-900">
            {errorMsg && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
                {errorMsg}
              </div>
            )}
            <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm text-gray-600">Full Name</label>
                <div className="relative">
                  <UserPlus className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input name="name" className="w-full border rounded pl-9 pr-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-900" placeholder="Full name" required />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600">User ID (unique)</label>
                <div className="relative">
                  <IdCard className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input name="userId" className="w-full border rounded pl-9 pr-3 py-2 text-gray-900" placeholder="e.g. john_doe" required />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600">Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input name="email" type="email" className="w-full border rounded pl-9 pr-3 py-2 text-gray-900" placeholder="user@example.com" required />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600">Phone</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input name="phone" className="w-full border rounded pl-9 pr-3 py-2 text-gray-900" placeholder="10-digit number" required />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-gray-600">Address</label>
                <div className="relative">
                  <Home className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <textarea name="address" className="w-full border rounded pl-9 pr-3 py-2 text-gray-900" placeholder="Full address" rows={3} required />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600">Role</label>
                <div className="relative">
                  <Shield className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select name="role" defaultValue="USER" className="w-full border rounded pl-9 pr-3 py-2 text-gray-900">
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>

              <div className="md:col-span-2 flex items-center justify-end gap-3 mt-2">
                <Link href="/admin/users" className="border rounded-lg px-4 py-2 hover:bg-gray-50">Cancel</Link>
                <button disabled={creating} className="bg-purple-600 text-white rounded-lg px-4 py-2 hover:bg-purple-700 disabled:opacity-50">{creating ? 'Creating...' : 'Create & Send Invite'}</button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}


