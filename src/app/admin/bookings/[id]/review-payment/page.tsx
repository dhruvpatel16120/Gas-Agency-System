"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import AdminNavbar from "@/components/AdminNavbar";
import { toast } from "react-hot-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  AlertCircle,
} from "lucide-react";

type Booking = {
  id: string;
  status:
    | "PENDING"
    | "APPROVED"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "CANCELLED";
  userName: string;
  userEmail: string;
  userPhone: string;
  paymentMethod: "COD" | "UPI";
};

type Payment = {
  id: string;
  amount: number;
  method: "COD" | "UPI";
  status: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";
  upiTxnId?: string;
  createdAt: string;
};

export default function ReviewPaymentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<null | "CONFIRM" | "REJECT">(
    null,
  );

  const [txnId, setTxnId] = useState("");
  const [issueReason, setIssueReason] = useState("");
  const [sendEmail, setSendEmail] = useState(true);

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
        if (latest) {
          setPayment(latest);
          setTxnId(latest.upiTxnId || "");
        }
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

  

  const canReview = useMemo(() => {
    return (
      booking &&
      payment &&
      payment.method === "UPI" &&
      payment.status === "PENDING"
    );
  }, [booking, payment]);

  const submit = async (action: "CONFIRM" | "REJECT") => {
    if (!canReview) return;
    if (action === "REJECT" && !issueReason.trim()) {
      toast.error("Please provide a reason to mark payment as issue");
      return;
    }
    if (!txnId.trim() || txnId.trim().length < 6) {
      toast.error("Enter a valid Reference/UPI ID");
      return;
    }
    setSubmitting(action);
    try {
      const res = await fetch(
        `/api/admin/bookings/${bookingId}/payments/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            upiTxnId: txnId.trim(),
            reason: issueReason.trim(),
            sendEmail,
          }),
        },
      );
      const json = await res.json();
      if (!res.ok || !json.success)
        throw new Error(json.message || "Failed to review payment");
      toast.success(
        action === "CONFIRM" ? "Payment confirmed" : "Payment marked as issue",
      );
      router.push(`/admin/bookings/${bookingId}`);
    } catch (e) {
      console.error("Review submit failed", e);
      toast.error("Unable to submit review");
    } finally {
      setSubmitting(null);
    }
  };

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
                Review Payment for #{booking.id}
              </h1>
              <p className="text-sm text-gray-600">
                Verify and confirm the UPI payment
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (₹)
                  </label>
                  <div className="text-gray-900 font-semibold">
                    ₹{payment?.amount ?? "-"}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Submitted On
                  </label>
                  <div className="text-gray-900">
                    {payment
                      ? new Date(payment.createdAt).toLocaleString()
                      : "-"}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reference / UPI ID
                  </label>
                  <input
                    value={txnId}
                    onChange={(e) => setTxnId(e.target.value)}
                    placeholder="Enter Reference/UPI ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Save or correct the reference/UPI ID before confirming.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-sm text-yellow-800">
                  Only confirm after verifying against your bank/UPI app.
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Issue Reason (for failed)
                </label>
                <textarea
                  value={issueReason}
                  onChange={(e) => setIssueReason(e.target.value)}
                  rows={3}
                  placeholder="Example: Reference ID not found in statement"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="sendEmail"
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                />
                <label htmlFor="sendEmail" className="text-sm text-gray-700">
                  Send email notification to customer
                </label>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => submit("CONFIRM")}
                  disabled={!canReview || submitting !== null}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  {submitting === "CONFIRM"
                    ? "Confirming..."
                    : "Confirm Payment"}
                </button>
                <button
                  onClick={() => submit("REJECT")}
                  disabled={!canReview || submitting !== null}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  <AlertTriangle className="w-4 h-4" />
                  {submitting === "REJECT" ? "Marking..." : "Mark as Issue"}
                </button>
              </div>

              {!canReview && (
                <div className="text-sm text-gray-600">
                  Only pending UPI payments can be reviewed.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
