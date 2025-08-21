"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import UserNavbar from "@/components/UserNavbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import QRCode from "qrcode";
import { toast } from "react-hot-toast";

export default function PrePaymentUPIPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [remainingQuota, setRemainingQuota] = useState<number | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(true);

  // Form data from query params
  const quantity = parseInt(searchParams.get("quantity") || "1", 10);
  const receiverName = searchParams.get("receiverName") || "";
  const receiverPhone = searchParams.get("receiverPhone") || "";
  const expectedDate = searchParams.get("expectedDate") || "";
  const notes = searchParams.get("notes") || "";

  const [txnId, setTxnId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [adminUpiId, setAdminUpiId] = useState<string | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  const isTxnValid = useMemo(() => {
    const refRe = /^[A-Za-z0-9\-_.]{6,}$/;
    const upiRe = /^[a-zA-Z0-9._\-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{2,64}$/;
    const v = txnId.trim();
    return refRe.test(v) || upiRe.test(v);
  }, [txnId]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }

    // Load settings and check quota
    const loadData = async () => {
      try {
        // Load settings (including UPI ID)
        const settingsRes = await fetch("/api/settings");
        if (settingsRes.ok) {
          const settingsJson = await settingsRes.json();
          if (settingsJson.success) {
            setAdminUpiId(settingsJson.data.adminUpiId);
          }
        }

        // Check quota
        const quotaRes = await fetch("/api/user/profile");
        if (quotaRes.ok) {
          const quotaJson = await quotaRes.json();
          const data = quotaJson.data || {};
          setRemainingQuota(data.remainingQuota || 0);
        }
      } catch {
        // no-op
      } finally {
        setQuotaLoading(false);
        setSettingsLoading(false);
        setLoading(false);
      }
    };
    void loadData();
  }, [session, status, router]);

  const unitPrice = 1100; // Fixed price per cylinder
  const total = unitPrice * quantity;

  useEffect(() => {
    const build = async () => {
      if (!adminUpiId) return;
      const payeeName = encodeURIComponent("Gas Agency");
      const txnNote = encodeURIComponent(`Pre-Booking`);
      const url = `upi://pay?pa=${encodeURIComponent(adminUpiId)}&pn=${payeeName}&am=${total.toFixed(2)}&cu=INR&tn=${txnNote}`;
      try {
        const data = await QRCode.toDataURL(url, {
          width: 220,
          margin: 0,
          errorCorrectionLevel: "M",
        });
        setQrDataUrl(data);
      } catch (e) {
        console.error("QR generation failed", e);
      }
    };
    void build();
  }, [adminUpiId, total]);

  const submitWithPayment = async () => {
    if (!txnId.trim()) {
      toast.error("Please enter your UPI transaction/reference ID");
      return;
    }
    {
      const v = txnId.trim();
      const refRe = /^[A-Za-z0-9\-_.]{6,}$/;
      const upiRe = /^[a-zA-Z0-9._\-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{2,64}$/;
      if (!(refRe.test(v) || upiRe.test(v))) {
        toast.error("Enter a valid UPI ID or reference ID");
        return;
      }
    }
    setSubmitting(true);
    try {
      // Server will atomically create booking and success payment
      const res = await fetch("/api/payments/upi/confirm-and-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity,
          receiverName,
          receiverPhone,
          expectedDate,
          notes,
          upiTxnId: txnId.trim(),
        }),
      });
      const json = await res.json();
      if (!json.success || !json?.data?.bookingId)
        throw new Error(json.message || "Failed to process payment");
      toast.success("Payment confirmed! Creating your booking...");
      router.push(`/user/booked?id=${encodeURIComponent(json.data.bookingId)}`);
    } catch (e) {
      console.error("Pre-payment submit error", e);
      toast.error(
        "Payment confirmation failed. Please try again or contact support.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (status === "loading" || loading || quotaLoading || settingsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Preparing payment...</p>
        </div>
      </div>
    );
  }

  // Check if user has quota remaining
  if (remainingQuota !== null && remainingQuota <= 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserNavbar />
        <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
              <svg
                className="h-8 w-8 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Yearly Booking Limit Reached
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              We cannot accept new bookings from you at this time. Your yearly
              quota of gas cylinders has been exhausted.
            </p>
            <div className="space-y-4">
              <button
                onClick={() => router.push("/user")}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go to Dashboard
              </button>
              <div className="text-sm text-gray-500">
                <p>
                  You can still track your existing bookings and manage your
                  account.
                </p>
                <p>Contact support if you believe this is an error.</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Check if user has enough quota for the requested quantity
  if (remainingQuota !== null && quantity > remainingQuota) {
    return (
      <div className="min-h-screen bg-gray-50">
        <UserNavbar />
        <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-6">
              <svg
                className="h-8 w-8 text-yellow-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Insufficient Quota
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              You requested {quantity} cylinder(s) but only have{" "}
              {remainingQuota} remaining in your yearly quota.
            </p>
            <div className="space-y-4">
              <button
                onClick={() => router.push("/user/book")}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Adjust Quantity
              </button>
              <div className="text-sm text-gray-500">
                <p>
                  Please reduce your quantity or contact support if you need
                  assistance.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UserNavbar />
      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          {/* Quota Information */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Your Gas Cylinder Quota
                  </h2>
                  <p className="text-sm text-gray-600">
                    You have{" "}
                    <span className="font-semibold text-blue-600">
                      {remainingQuota}
                    </span>{" "}
                    cylinder(s) remaining this year
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {remainingQuota}
                  </div>
                  <div className="text-xs text-gray-500">Remaining</div>
                </div>
              </div>
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  📋 Booking {quantity} cylinder(s) will use {quantity} of your
                  remaining quota.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle>UPI Payment (Pre-Booking)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                <p className="font-semibold mb-2">Instructions</p>
                <ul className="list-disc ml-5 space-y-1">
                  <li>Scan the QR or tap the button to open your UPI app.</li>
                  <li>Verify the UPI ID matches ours exactly.</li>
                  <li>Pay the exact amount shown below.</li>
                  <li>
                    After successful payment, enter your UPI
                    Transaction/Reference ID and continue.
                  </li>
                </ul>
                <p className="mt-3">
                  If you completed payment but didn&apos;t receive a booking email,
                  or your status has not updated, contact us through the Contact
                  Us form. Our team will reach you within 24 hours.
                </p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Order Summary
                </h3>
                <p className="text-sm text-gray-700">Quantity: {quantity}</p>
                <p className="text-sm text-gray-700">
                  Unit Price: ₹{unitPrice}
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  Total: ₹{total}
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Scan to Pay
                </h3>
                {!adminUpiId ? (
                  <div className="text-center py-8">
                    <div className="text-red-600 mb-2">
                      ⚠️ UPI ID not configured
                    </div>
                    <p className="text-sm text-gray-600">
                      Please contact support to configure the UPI payment
                      system.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-6">
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
                    <div className="text-sm text-gray-700">
                      <p>
                        <span className="text-gray-500">UPI ID:</span>{" "}
                        {adminUpiId}
                      </p>
                      <p>
                        <span className="text-gray-500">Amount:</span> ₹
                        {total.toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Enter UPI Transaction ID
                </h3>
                <p className="text-xs text-red-600 mb-2">
                  Please enter the real and correct UPI reference ID. Kindly
                  make payment only to the UPI ID shown above. Otherwise, your
                  booking will be cancelled and no refund will be provided.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (isTxnValid && !submitting && adminUpiId) {
                      submitWithPayment();
                    }
                  }}
                  className="flex items-center gap-3"
                >
                  <input
                    value={txnId}
                    onChange={(e) => setTxnId(e.target.value)}
                    placeholder="UPI ID or Transaction/Reference ID"
                    disabled={submitting}
                    className="flex-1 h-10 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:bg-gray-50"
                  />
                  <button
                    type="submit"
                    disabled={!isTxnValid || submitting || !adminUpiId}
                    aria-busy={submitting}
                    className="inline-flex items-center h-10 px-4 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <span className="mr-2 inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Continue"
                    )}
                  </button>
                </form>
                {txnId && !isTxnValid && (
                  <p className="mt-2 text-xs text-red-600">
                    Enter a valid UPI ID (name@bank) or reference ID (min 6
                    chars; letters, numbers, - _ .).
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
