'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui';
import { User, Calendar, Package, Flame, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatDate, getStatusColor } from '@/lib/utils';
import UserNavbar from '@/components/UserNavbar';

export default function UserDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ name: string; remainingQuota: number; emailVerified?: string | null } | null>(null);
  const [totalBookings, setTotalBookings] = useState<number>(0);
  const [recentBookings, setRecentBookings] = useState<Array<{ id: string; status: any; quantity?: number | null; paymentMethod: 'COD' | 'UPI'; createdAt: string }>>([]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    const load = async () => {
      try {
        setLoading(true);
        const [pRes, bRes] = await Promise.all([
          fetch('/api/user/profile'),
          fetch('/api/bookings?page=1&limit=5'),
        ]);
        if (pRes.ok) {
          const pJson = await pRes.json();
          const data = pJson.data;
          setProfile({ name: data.name, remainingQuota: data.remainingQuota, emailVerified: data.emailVerified });
        }
        if (bRes.ok) {
          const bJson = await bRes.json();
          setTotalBookings(bJson.data?.pagination?.total || 0);
          setRecentBookings(bJson.data?.data || []);
        }
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [session, status, router]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const isVerified = Boolean(profile?.emailVerified);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <UserNavbar />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0 space-y-8">
          {/* Welcome */}
          <div className="rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 text-white shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold">Welcome back, {profile?.name || 'User'}!</h2>
                <p className="mt-1 text-white/90">Manage your bookings, track deliveries, and update your profile.</p>
              </div>
              <Flame className="w-10 h-10 opacity-80" />
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="transition-all hover:shadow-xl hover:-translate-y-0.5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Remaining Quota</CardTitle>
                <Package className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{profile?.remainingQuota ?? '—'}</div>
                <p className="text-xs text-gray-500">Gas cylinders remaining</p>
              </CardContent>
            </Card>

            <Card className="transition-all hover:shadow-xl hover:-translate-y-0.5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
                <Calendar className="h-4 w-4 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalBookings}</div>
                <p className="text-xs text-gray-500">All-time bookings</p>
              </CardContent>
            </Card>

            <Card className="transition-all hover:shadow-xl hover:-translate-y-0.5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Account Status</CardTitle>
                <User className={`h-4 w-4 ${isVerified ? 'text-green-600' : 'text-amber-600'}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${isVerified ? 'text-green-600' : 'text-amber-600'}`}>{isVerified ? 'Verified' : 'Unverified'}</div>
                <p className="text-xs text-gray-500">{isVerified ? 'Your email is verified' : 'Please verify your email'}</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Bookings */}
          <Card className="transition-all hover:shadow-xl">
            <CardHeader>
              <CardTitle>Recent Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              {recentBookings.length === 0 ? (
                <div className="text-sm text-gray-600">No recent bookings. Create your first booking to see it here.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recentBookings.map((b) => (
                    <div key={b.id} className="py-3 flex items-center justify-between gap-3 group">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">Booking #{b.id.slice(0, 8)}</p>
                        <p className="text-xs text-gray-600">{formatDate(b.createdAt)} · Qty: {b.quantity ?? 1} · {b.paymentMethod}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${getStatusColor(b.status)}`}>{b.status}</span>
                        <button
                          onClick={() => router.push(`/user/track/${b.id}`)}
                          className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700"
                        >
                          Track <ArrowRight className="w-3 h-3 ml-1" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <button
                onClick={() => router.push('/user/bookings')}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                View all bookings
              </button>
            </CardFooter>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
              onClick={() => router.push('/user/book')}
              className="group p-5 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100">
                  <Flame className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900">Book New Cylinder</h3>
                  <p className="text-sm text-gray-600">Order a new gas cylinder</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => router.push('/user/bookings')}
              className="group p-5 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100">
                  <Calendar className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900">View Booking History</h3>
                  <p className="text-sm text-gray-600">Check your past orders</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => router.push('/user/profile/edit')}
              className="group p-5 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-green-50 text-green-600 group-hover:bg-green-100">
                  <User className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900">Update Profile</h3>
                  <p className="text-sm text-gray-600">Edit your account details</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
