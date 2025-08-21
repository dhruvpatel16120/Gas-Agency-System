"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import AdminNavbar from "@/components/AdminNavbar";
import { toast } from "react-hot-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { ArrowLeft, Save, DollarSign, AlertCircle } from "lucide-react";

type Booking = {
  id: string;
  status:
    | "PENDING"
    | "APPROVED"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "CANCELLED";
  paymentMethod: "COD" | "UPI";
  paymentStatus?: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";
  paymentAmount?: number;
};

type Payment = {
  id: string;
  amount: number;
  method: "COD" | "UPI";
  status: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";
  upiTxnId?: string;
  createdAt: string;
};

export default function EditPaymentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<{
    amount: string;
    status: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";
  }>({ amount: "", status: "PENDING" });

  useEffect(() => {
    if (status === "loading") return;
    if (!session) router.push("/login");
    else if (session.user.role !== "ADMIN") router.push("/user");
  }, [session, status, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bookingRes, paymentsRes] = await Promise.all([
        fetch(`/api/bookings/${bookingId}`, { cache: "no-store" }),
        fetch(`/api/admin/bookings/${bookingId}/payments`, {
          cache: "no-store",
        }),
      ]);
      if (bookingRes.ok) {
        const jb = await bookingRes.json();
        setBooking(jb.data);
      }
      if (paymentsRes.ok) {
        const jp = await paymentsRes.json();
        const latest: Payment | undefined = (jp.data || [])[0];
        if (latest) setPayment(latest);
      }
    } catch (e) {
      console.error("Failed to load payment info", e);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (session?.user?.role === "ADMIN" && bookingId) {
      void load();
    }
  }, [session, bookingId, load]);

  const canEdit =
    booking &&
    booking.paymentMethod === "COD" &&
    ["PENDING", "APPROVED", "DELIVERED"].includes(booking.status);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    const amountInt = parseInt(form.amount || "0", 10);
    if (Number.isNaN(amountInt) || amountInt < 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/payments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountInt, status: form.status }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success("Payment updated");
        router.push(`/admin/bookings/${bookingId}`);
      } else {
        toast.error(json.message || "Failed to update payment");
      }
    } catch (e) {
      console.error("Failed to update payment", e);
      toast.error("Failed to update payment");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (
      booking &&
      (payment || booking.paymentAmount != null || booking.paymentStatus)
    ) {
      const initialAmount = (
        payment?.amount ??
        booking.paymentAmount ??
        0
      ).toString();
      const initialStatus = (payment?.status ??
        booking.paymentStatus ??
        "PENDING") as "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";
      setForm({ amount: initialAmount, status: initialStatus });
    }
  }, [booking, payment]);

  if (status === "loading") return null;
  if (!session || session.user.role !== "ADMIN") return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading payment...</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Booking Not Found
              </h2>
              <button
                onClick={() => router.push("/admin/bookings")}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Back to Bookings
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Payment not editable
              </h2>
              <p className="text-gray-600 mb-4">
                Only COD payments can be edited when booking is Pending,
                Approved or Delivered.
              </p>
              <button
                onClick={() => router.push(`/admin/bookings/${bookingId}`)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Back to Booking
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/admin/bookings/${bookingId}`)}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Booking
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Edit Payment for #{booking.id}
              </h1>
              <p className="text-sm text-gray-600">
                Update COD payment amount or status
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.amount}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, amount: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value as 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    >
                      <option value="PENDING">Pending</option>
                      <option value="SUCCESS">Success</option>
                      <option value="FAILED">Failed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => router.push(`/admin/bookings/${bookingId}`)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
