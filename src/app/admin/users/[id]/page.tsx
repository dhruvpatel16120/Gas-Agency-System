"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AdminNavbar from "@/components/AdminNavbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Package,
  Mail,
  Calendar,
  Save,
  Trash2,
  Send,
} from "lucide-react";

type UserDetail = {
  id: string;
  name: string;
  email: string;
  userId: string;
  phone: string;
  address: string;
  role: "USER" | "ADMIN";
  remainingQuota: number;
  emailVerified: string | null;
  createdAt: string;
};

type BookingLite = {
  id: string;
  status: string;
  createdAt: string;
  deliveredAt: string | null;
};

export default function AdminUserDetailPage() {
  const params = useParams();
  const userId = String(params?.id || "");
  const { data: session, status } = useSession();
  const router = useRouter();

  const [user, setUser] = useState<UserDetail | null>(null);
  const [bookings, setBookings] = useState<BookingLite[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    delivered: number;
    pending: number;
    approved: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState<"none" | "verify" | "reset">("none");

  useEffect(() => {
    if (status === "loading") return;
    if (!session) router.push("/login");
    else if (session.user.role !== "ADMIN") router.push("/user");
  }, [session, status, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/users/${userId}`, {
      cache: "no-store",
    });
    const json = await res.json();
    if (json.success) {
      setUser(json.data.user);
      setBookings(json.data.user.bookings);
      setStats(json.data.bookingStats);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (userId) fetchData();
  }, [userId, fetchData]);

  const onSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const payload: {
      name: string;
      phone: string;
      address: string;
      role: string;
      remainingQuota: number;
    } = {
      name: String(formData.get("name") || ""),
      phone: String(formData.get("phone") || ""),
      address: String(formData.get("address") || ""),
      role: String(formData.get("role") || ""),
      remainingQuota: Number(formData.get("remainingQuota") || 0),
    };
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        await fetchData();
        alert("Saved");
      } else {
        alert(json.message || "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (
      !confirm("Delete user and all related bookings? This cannot be undone.")
    )
      return;
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      router.push("/admin/users");
    } else {
      alert(json.message || "Failed to delete");
    }
  };

  if (status === "loading") return null;
  if (!session || session.user.role !== "ADMIN") return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 text-black">
      <AdminNavbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/users"
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Users
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  User Management
                </h1>
                <p className="text-sm text-gray-600">
                  Manage user details, permissions, and settings
                </p>
              </div>
            </div>
          </div>

          {loading || !user ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading user details...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile & Settings */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Profile & Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={onSave} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Name
                          </label>
                          <input
                            name="name"
                            defaultValue={user.name}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email
                          </label>
                          <input
                            disabled
                            defaultValue={user.email}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            User ID
                          </label>
                          <input
                            disabled
                            defaultValue={user.userId}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Phone
                          </label>
                          <input
                            name="phone"
                            defaultValue={user.phone}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            required
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Address
                          </label>
                          <textarea
                            name="address"
                            defaultValue={user.address}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Role
                          </label>
                          <select
                            name="role"
                            defaultValue={user.role}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          >
                            <option value="USER">User</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Remaining Quota
                          </label>
                          <input
                            name="remainingQuota"
                            type="number"
                            min={0}
                            defaultValue={user.remainingQuota}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email Verified
                          </label>
                          <input
                            disabled
                            value={user.emailVerified ? "Yes" : "No"}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 pt-4">
                        <button
                          disabled={saving}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                        >
                          <Save className="w-4 h-4" />
                          {saving ? "Saving..." : "Save Changes"}
                        </button>
                        <button
                          type="button"
                          onClick={onDelete}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete User
                        </button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* User Insights */}
              <div className="space-y-6">
                {/* Statistics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Booking Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {stats?.total ?? 0}
                        </div>
                        <div className="text-sm text-blue-600">
                          Total Bookings
                        </div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {stats?.delivered ?? 0}
                        </div>
                        <div className="text-sm text-green-600">Delivered</div>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">
                          {stats?.pending ?? 0}
                        </div>
                        <div className="text-sm text-yellow-600">Pending</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {stats?.approved ?? 0}
                        </div>
                        <div className="text-sm text-purple-600">Approved</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Bookings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Recent Bookings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {bookings.length === 0 ? (
                        <div className="text-center py-4">
                          <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">
                            No bookings found
                          </p>
                        </div>
                      ) : (
                        bookings.map((b) => (
                          <div
                            key={b.id}
                            className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="font-medium text-sm">
                                {b.id.slice(-8).toUpperCase()}
                              </div>
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  b.status === "DELIVERED"
                                    ? "bg-green-100 text-green-800"
                                    : b.status === "APPROVED"
                                      ? "bg-blue-100 text-blue-800"
                                      : b.status === "PENDING"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {b.status}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              Created{" "}
                              {new Date(b.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Send className="w-5 h-5" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <button
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        disabled={sending !== "none"}
                        onClick={async () => {
                          setSending("verify");
                          try {
                            const res = await fetch(
                              `/api/admin/users/${userId}/action`,
                              {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  action: "resendVerification",
                                }),
                              },
                            );
                            const json = await res.json();
                            alert(
                              json.message ||
                                (json.success
                                  ? "Verification email sent"
                                  : "Failed"),
                            );
                          } finally {
                            setSending("none");
                          }
                        }}
                      >
                        <Mail className="w-4 h-4" />
                        {sending === "verify"
                          ? "Sending..."
                          : "Resend Verification"}
                      </button>
                      <button
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        disabled={sending !== "none"}
                        onClick={async () => {
                          setSending("reset");
                          try {
                            const res = await fetch(
                              `/api/admin/users/${userId}/action`,
                              {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  action: "sendPasswordReset",
                                }),
                              },
                            );
                            const json = await res.json();
                            alert(
                              json.message ||
                                (json.success
                                  ? "Password reset email sent"
                                  : "Failed"),
                            );
                          } finally {
                            setSending("none");
                          }
                        }}
                      >
                        <Send className="w-4 h-4" />
                        {sending === "reset"
                          ? "Sending..."
                          : "Send Password Reset"}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
