"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import UserNavbar from "@/components/UserNavbar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import QRCode from "qrcode";
import { toast } from "react-hot-toast";

type Invoice = {
  booking: {
    id: string;
    quantity?: number | null;
    paymentMethod: string;
    user: { name: string; email: string; address: string; phone: string };
  };
  payment: { id: string; amount: number; status: string };
  adminUpiId?: string | null;
};

export default function UPIPaymentPage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const bookingId = params?.bookingId as string;

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [txnId, setTxnId] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [upiUrl, setUpiUrl] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [upiAppLoading, setUpiAppLoading] = useState(false);
  const isTxnValid = /^[A-Za-z0-9\-_.]{6,}$/.test((txnId || "").trim());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }
    const load = async () => {
      try {
        setErrorMsg(null);
        const res = await fetch(
          `/api/payments/upi?bookingId=${encodeURIComponent(bookingId)}`,
        );
        const json = await res.json();
        if (res.ok && json.success) {
          setInvoice(json.data);
        } else {
          setInvoice(null);
          setErrorMsg(
            json.message ||
              "Failed to prepare payment. Please try again later.",
          );
        }
      } catch (e) {
        console.error("UPI invoice error", e);
        setInvoice(null);
        setErrorMsg("Unable to load payment at the moment. Please retry.");
      } finally {
        setLoading(false);
      }
    };
    if (bookingId) void load();
  }, [status, session, bookingId, router]);

  useEffect(() => {
    const generateQr = async () => {
      if (!invoice?.payment?.amount) return;
      const upiId = invoice?.adminUpiId;
      if (!upiId) return;
      const amountRupees = invoice.payment.amount.toFixed(2);
      const payeeName = encodeURIComponent("Gas Agency");
      const txnNote = encodeURIComponent(`Booking ${invoice.booking.id}`);
      const url = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${payeeName}&am=${amountRupees}&cu=INR&tn=${txnNote}`;
      setUpiUrl(url);
      try {
        const data = await QRCode.toDataURL(url, {
          width: 220,
          margin: 0,
          errorCorrectionLevel: "M",
        });
        setQrDataUrl(data);
      } catch (e) {
        console.error("QR generation failed", e);
        setQrDataUrl("");
      }
    };
    void generateQr();
  }, [invoice]);

  // Remove frequent polling; provide manual refresh button below

  const confirmPayment = async () => {
    if (!txnId.trim()) {
      toast.error("Please enter your UPI transaction/reference ID");
      return;
    }
    if (!/^[A-Za-z0-9\-_.]{6,}$/.test(txnId.trim())) {
      toast.error("Enter a valid UPI reference ID");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/payments/upi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, upiTxnId: txnId.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Payment submitted for review");
        router.push(`/user/reviewing?id=${encodeURIComponent(bookingId)}`);
      } else {
        toast.error(
          json.message || "Payment submission failed. Please try again.",
        );
      }
    } catch (e) {
      console.error("Payment confirmation error", e);
      toast.error(
        "Payment submission failed. Please try again or contact support.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading") return null;
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Preparing payment...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserNavbar />
        <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white border border-red-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-red-700">
                We couldn&apos;t prepare your payment
              </h2>
              <p className="mt-2 text-sm text-gray-700">{errorMsg}</p>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => {
                    setLoading(true);
                    setErrorMsg(null);
                    // Re-run initial load
                    (async () => {
                      try {
                        const res = await fetch(
                          `/api/payments/upi?bookingId=${encodeURIComponent(bookingId)}`,
                        );
                        const json = await res.json();
                        if (res.ok && json.success) setInvoice(json.data);
                        else
                          setErrorMsg(
                            json.message ||
                              "Failed to prepare payment. Please try again later.",
                          );
                      } catch {
                        setErrorMsg(
                          "Unable to load payment at the moment. Please retry.",
                        );
                      } finally {
                        setLoading(false);
                      }
                    })();
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Retry
                </button>
                <button
                  onClick={() => router.push("/user/bookings")}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Back to Bookings
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="mt-4 text-gray-600">
            Payment info is not available right now. Please retry in a moment.
          </p>
        </div>
      </div>
    );
  }

  const qty = invoice.booking.quantity || 1;
  const unitPrice = 1100; // Assuming a default unit price if not available in settings
  const total = unitPrice * qty;

  return (
    <div className="min-h-screen bg-gray-50">
      <UserNavbar />
      <main className="max-w-5xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>UPI Payment</CardTitle>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#002970] text-white text-xs font-semibold">
                  <span className="bg-white text-[#002970] px-2 py-0.5 rounded">
                    pay
                  </span>
                  <span>Paytm</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Booking Details
                  </h3>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>
                      <span className="text-gray-500">Booking ID:</span>{" "}
                      {invoice.booking.id}
                    </p>
                    <p>
                      <span className="text-gray-500">Quantity:</span> {qty}
                    </p>
                    <p>
                      <span className="text-gray-500">Unit Price:</span>{" "}
                      {formatCurrency(unitPrice)}
                    </p>
                    <p className="font-semibold">
                      <span className="text-gray-500">Total:</span>{" "}
                      {formatCurrency(total)}
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    User Details
                  </h3>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p>
                      <span className="text-gray-500">Name:</span>{" "}
                      {invoice.booking.user.name}
                    </p>
                    <p>
                      <span className="text-gray-500">Email:</span>{" "}
                      {invoice.booking.user.email}
                    </p>
                    <p>
                      <span className="text-gray-500">Phone:</span>{" "}
                      {invoice.booking.user.phone}
                    </p>
                    <p className="truncate">
                      <span className="text-gray-500">Address:</span>{" "}
                      {invoice.booking.user.address}
                    </p>
                  </div>
                </div>
              </div>

              {/* UPI QR */}
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Scan to Pay (UPI)
                </h3>
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                  <div className="flex flex-col items-center gap-3">
                    {qrDataUrl ? (
                      <Image
                        src={qrDataUrl}
                        alt="UPI QR"
                        width={192}
                        height={192}
                        className="w-48 h-48 rounded-md border"
                      />
                    ) : (
                      <div className="w-48 h-48 rounded-md border flex items-center justify-center text-gray-500 text-sm">
                        QR unavailable
                      </div>
                    )}
                    <button
                      onClick={() => {
                        if (upiUrl) {
                          setUpiAppLoading(true);
                          window.location.href = upiUrl;
                        }
                      }}
                      disabled={!upiUrl || upiAppLoading}
                      className="px-4 py-2 rounded-lg bg-[#00baf2] text-white hover:bg-[#00a3d6] disabled:opacity-50"
                    >
                      {upiAppLoading ? (
                        <>
                          <span className="mr-2 inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Opening...
                        </>
                      ) : (
                        "Pay with UPI App"
                      )}
                    </button>
                  </div>
                  <div className="text-sm text-gray-700">
                    <p>
                      <span className="text-gray-500">UPI ID:</span>{" "}
                      {invoice?.adminUpiId || "N/A"}
                    </p>
                    <p>
                      <span className="text-gray-500">Amount:</span>{" "}
                      {formatCurrency(total)}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      After payment, enter the Transaction ID below if prompted.
                    </p>
                  </div>
                </div>
              </div>

              {/* Confirmation */}
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Confirm Payment
                </h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (isTxnValid && !submitting) {
                      confirmPayment();
                    }
                  }}
                  className="flex items-center gap-3"
                >
                  <input
                    value={txnId}
                    onChange={(e) => setTxnId(e.target.value)}
                    placeholder="Enter UPI Transaction ID"
                    disabled={submitting}
                    className="flex-1 h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:bg-gray-50"
                  />
                  <button
                    type="submit"
                    disabled={!isTxnValid || submitting}
                    aria-busy={submitting}
                    className="inline-flex items-center h-10 px-4 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <span className="mr-2 inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Confirm"
                    )}
                  </button>
                </form>
                {txnId && !isTxnValid && (
                  <p className="mt-2 text-xs text-red-600">
                    Enter a valid reference ID (min 6 characters; letters,
                    numbers, - _ . allowed).
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-between">
              <button
                onClick={() => router.push("/user/bookings")}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Back to History
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(
                      `/api/payments/upi?bookingId=${encodeURIComponent(bookingId)}`,
                    );
                    const json = await res.json();
                    if (json.success) setInvoice(json.data);
                  } catch {}
                }}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Refresh
              </button>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}
