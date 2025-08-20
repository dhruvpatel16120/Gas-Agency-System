'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AdminNavbar from '@/components/AdminNavbar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import Link from 'next/link';
import { 
  Users, 
  ArrowLeft,
  Save,
  Trash2
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
};

export default function EditPartnerPage() {
  const { id } = useParams();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.push('/login');
    else if (session.user.role !== 'ADMIN') router.push('/user');
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user?.role === 'ADMIN' && id) {
      loadPartner();
    }
  }, [session, id]);

  const loadPartner = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/deliveries/partners/${id}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setPartner(data.data);
      }
    } catch (error) {
      console.error('Error loading partner:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const formData = new FormData(e.currentTarget);
      const payload = {
        name: formData.get('name') as string,
        phone: formData.get('phone') as string,
        email: formData.get('email') as string || undefined,
        vehicleNumber: formData.get('vehicleNumber') as string || undefined,
        serviceArea: formData.get('serviceArea') as string || undefined,
        capacityPerDay: parseInt(formData.get('capacityPerDay') as string) || 20,
        isActive: formData.get('isActive') === 'on',
      };

      const res = await fetch(`/api/admin/deliveries/partners/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('Partner updated successfully!');
        router.push(`/admin/deliveries/partners/${id}`);
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Failed to update partner');
      }
    } catch (error) {
      console.error('Error updating partner:', error);
      setError('An error occurred while updating the partner');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this partner? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/deliveries/partners/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        alert('Partner deleted successfully!');
        router.push('/admin/deliveries/partners');
      } else {
        const errorData = await res.json();
        alert(errorData.message || 'Failed to delete partner');
      }
    } catch (error) {
      console.error('Error deleting partner:', error);
      alert('An error occurred while deleting the partner');
    }
  };

  if (status === 'loading') return null;
  if (!session || session.user.role !== 'ADMIN') return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link
                href={`/admin/deliveries/partners/${id}`}
                className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Partner
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Edit Partner</h1>
                <p className="text-gray-600 mt-2">Modify delivery partner information</p>
              </div>
            </div>
          </div>

          {loading ? (
            <Card className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ) : partner ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Partner Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                        Name *
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        defaultValue={partner.name}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Partner name"
                      />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                        Phone *
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        required
                        defaultValue={partner.phone}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Phone number"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        defaultValue={partner.email || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Email address (optional)"
                      />
                    </div>

                    <div>
                      <label htmlFor="vehicleNumber" className="block text-sm font-medium text-gray-700 mb-2">
                        Vehicle Number
                      </label>
                      <input
                        id="vehicleNumber"
                        name="vehicleNumber"
                        type="text"
                        defaultValue={partner.vehicleNumber || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Vehicle number (optional)"
                      />
                    </div>

                    <div>
                      <label htmlFor="serviceArea" className="block text-sm font-medium text-gray-700 mb-2">
                        Service Area
                      </label>
                      <input
                        id="serviceArea"
                        name="serviceArea"
                        type="text"
                        defaultValue={partner.serviceArea || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Service area (optional)"
                      />
                    </div>

                    <div>
                      <label htmlFor="capacityPerDay" className="block text-sm font-medium text-gray-700 mb-2">
                        Daily Capacity *
                      </label>
                      <input
                        id="capacityPerDay"
                        name="capacityPerDay"
                        type="number"
                        min="1"
                        max="500"
                        required
                        defaultValue={partner.capacityPerDay}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="20"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      id="isActive"
                      name="isActive"
                      type="checkbox"
                      defaultChecked={partner.isActive}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                      Active Partner
                    </label>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t">
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Partner
                    </button>

                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/deliveries/partners/${id}`}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </Link>
                      <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium text-gray-900">Partner not found</p>
                <p className="text-gray-600">The partner you're looking for doesn't exist or has been removed.</p>
                <Link
                  href="/admin/deliveries/partners"
                  className="inline-flex items-center gap-2 px-4 py-2 mt-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Partners
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
