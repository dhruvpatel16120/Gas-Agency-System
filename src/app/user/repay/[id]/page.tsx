"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { Button } from "@/components/ui";
import { ArrowLeft, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import UserNavbar from "@/components/UserNavbar";
import { formatCurrency } from "@/lib/utils";

type Booking = {
  id: string;
  paymentMethod: "COD" | "UPI";
  status: string;
  quantity: number;
  paymentAmount?: number;
  paymentStatus?: string;
};

export default function RepayPage({ params }: { params: { id: string } }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(false);
  const [upiTxnId, setUpiTxnId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadBookingCb = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${params.id}`);
      const result = await res.json();
      if (!res.ok) {
        toast.error(result.message || "Failed to load booking");
        router.push("/user");
        return;
      }
      setBooking(result.data);
    } catch (err) {
      console.error("Load booking error:", err);
      toast.error("An error occurred while loading the booking");
      router.push("/user");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }
    void loadBookingCb();
  }, [session, status, loadBookingCb, router]);

  // removed duplicate loadBooking

  const handleRepay = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!upiTxnId.trim() || upiTxnId.trim().length < 6) {
      toast.error(
        "Please enter a valid UPI transaction ID (at least 6 characters)",
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/payments/upi/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: params.id,
          upiTxnId: upiTxnId.trim(),
        }),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        toast.success(
          result.data.message || "Payment retry initiated successfully",
        );
        router.push("/user");
      } else {
        toast.error(result.message || "Failed to retry payment");
      }
    } catch (err) {
      console.error("Repay error:", err);
      toast.error("An error occurred while retrying payment");
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <p className="text-gray-600">Booking not found</p>
          <Button onClick={() => router.push("/user")} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Check if booking is eligible for repayment
  if (booking.paymentMethod !== "UPI" || booking.paymentStatus !== "FAILED") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <p className="text-gray-600">
            This booking is not eligible for repayment
          </p>
          <Button onClick={() => router.push("/user")} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UserNavbar />

      <main className="max-w-2xl mx-auto py-8 px-4">
        <div className="mb-6">
          <Button
            variant="secondary"
            onClick={() => router.push("/user")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Retry UPI Payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Booking Details */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">
                  Booking Details
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Booking ID:</span>
                    <span className="ml-2 font-mono text-gray-900">
                      {booking.id}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Quantity:</span>
                    <span className="ml-2 text-gray-900">
                      {booking.quantity} cylinder(s)
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Amount:</span>
                    <span className="ml-2 text-gray-900">
                      {booking.paymentAmount
                        ? formatCurrency(booking.paymentAmount)
                        : "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <span className="ml-2 text-gray-900">{booking.status}</span>
                  </div>
                </div>
              </div>

              {/* Payment Retry Form */}
              <form onSubmit={handleRepay} className="space-y-4">
                <div>
                  <label
                    htmlFor="upiTxnId"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    New UPI Transaction ID
                  </label>
                  <input
                    type="text"
                    id="upiTxnId"
                    value={upiTxnId}
                    onChange={(e) => setUpiTxnId(e.target.value)}
                    placeholder="Enter your new UPI transaction ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    minLength={6}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Please enter the transaction ID from your UPI app after
                    making the payment
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Important Notes:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>
                          Make sure you have sufficient balance in your UPI
                          account
                        </li>
                        <li>Complete the payment in your UPI app first</li>
                        <li>
                          Copy the transaction ID exactly as shown in your UPI
                          app
                        </li>
                        <li>Your payment will be reviewed by our team</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={submitting || !upiTxnId.trim()}
                    className="flex-1"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Submit Payment Retry"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => router.push("/user")}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
