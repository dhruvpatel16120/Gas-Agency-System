"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardDescription,
} from "@/components/ui";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui";
import { CreditCard, MessageSquare, CheckCircle2 } from "lucide-react";
import { toast } from "react-hot-toast";
import UserNavbar from "@/components/UserNavbar";

type PaymentMethod = "UPI" | "COD";

export default function BookCylinderPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");
  const [notes, setNotes] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [expectedDate, setExpectedDate] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [remainingQuota, setRemainingQuota] = useState<number | null>(null);
  const [quotaLoading, setQuotaLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
    }
  }, [session, status, router]);

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const json = await res.json();
        const data = json.data || {};
        if (!receiverName) setReceiverName(data.name || "");
        if (!receiverPhone) setReceiverPhone(data.phone || "");
        setRemainingQuota(data.remainingQuota || 0);
      }
    } catch {
      // no-op
    } finally {
      setQuotaLoading(false);
    }
  }, [receiverName, receiverPhone]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const formatInputDate = (d: Date) => d.toISOString().slice(0, 10);
  const minDate = useMemo(() => formatInputDate(new Date()), []);
  const maxDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return formatInputDate(d);
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!receiverName.trim()) e.receiverName = "Receiver name is required";
    if (!receiverPhone.trim()) e.receiverPhone = "Receiver phone is required";
    if (
      receiverPhone.trim() &&
      !/^[0-9]{10}$/.test(receiverPhone.replace(/\s/g, ""))
    ) {
      e.receiverPhone = "Phone must be 10 digits";
    }
    if (quantity < 1) e.quantity = "Quantity must be at least 1";
    if (quantity > (remainingQuota || 0))
      e.quantity = `You can only book up to ${remainingQuota} cylinder(s)`;
    if (expectedDate && new Date(expectedDate) < new Date()) {
      e.expectedDate = "Expected date cannot be in the past";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (paymentMethod === "UPI") {
        // Redirect to pre-payment page with necessary details via query params
        const params = new URLSearchParams({
          quantity: String(quantity),
          receiverName: receiverName.trim(),
          receiverPhone: receiverPhone.replace(/\s/g, ""),
          expectedDate: expectedDate || "",
          notes: notes.trim(),
        });
        router.push(`/user/pay/upi/new?${params.toString()}`);
        return;
      }

      // COD: Create booking immediately
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod,
          quantity,
          receiverName: receiverName.trim(),
          receiverPhone: receiverPhone.replace(/\s/g, ""),
          expectedDate: expectedDate || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to create booking");
        return;
      }
      toast.success("Booking created successfully");
      router.push("/user/bookings");
    } catch (err) {
      console.error("Create booking error:", err);
      toast.error("An error occurred. Please try again");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || !session || quotaLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
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

  return (
    <div className="min-h-screen bg-gray-50">
      <UserNavbar />

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
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
              {remainingQuota !== null && remainingQuota <= 2 && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ You&apos;re running low on cylinders. Only {remainingQuota}{" "}
                    remaining this year.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Booking Form */}
          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle>Book New Cylinder</CardTitle>
              <CardDescription>
                Choose your payment method, then provide delivery details below.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-8">
                {/* Payment Method - first section */}
                <section>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Payment Method
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      aria-pressed={paymentMethod === "COD"}
                      onClick={() => setPaymentMethod("COD")}
                      className={`p-4 border rounded-lg text-left hover:bg-gray-50 transition-colors ${
                        paymentMethod === "COD"
                          ? "border-blue-600 ring-2 ring-blue-200 bg-blue-50/30"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-semibold text-gray-900 flex items-center gap-2">
                            Cash on Delivery
                            {paymentMethod === "COD" && (
                              <CheckCircle2 className="w-4 h-4 text-blue-600" />
                            )}
                          </p>
                          <p className="text-sm text-gray-600">
                            Pay when you receive the cylinder
                          </p>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      aria-pressed={paymentMethod === "UPI"}
                      onClick={() => setPaymentMethod("UPI")}
                      className={`p-4 border rounded-lg text-left hover:bg-gray-50 transition-colors ${
                        paymentMethod === "UPI"
                          ? "border-blue-600 ring-2 ring-blue-200 bg-blue-50/30"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-blue-600" />
                        <div>
                          <p className="font-semibold text-gray-900 flex items-center gap-2">
                            UPI Payment
                            {paymentMethod === "UPI" && (
                              <CheckCircle2 className="w-4 h-4 text-blue-600" />
                            )}
                          </p>
                          <p className="text-sm text-gray-600">
                            Use your preferred UPI app
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                  {errors.paymentMethod && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.paymentMethod}
                    </p>
                  )}
                </section>

                {/* Details under payment method */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="quantity"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="quantity"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {Array.from(
                        { length: Math.min(remainingQuota || 1, 3) },
                        (_, i) => i + 1,
                      ).map((num) => (
                        <option key={num} value={num}>
                          {num} cylinder{num > 1 ? "s" : ""}
                        </option>
                      ))}
                    </select>
                    {errors.quantity && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.quantity}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Maximum: {remainingQuota} cylinder(s) available
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expected Delivery (optional)
                    </label>
                    <input
                      type="date"
                      value={expectedDate}
                      onChange={(e) => setExpectedDate(e.target.value)}
                      min={minDate}
                      max={maxDate}
                      className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Must be within the next 7 days.
                    </p>
                    {errors.expectedDate && (
                      <p className="mt-2 text-sm text-red-600">
                        {errors.expectedDate}
                      </p>
                    )}
                  </div>

                  <div>
                    <Input
                      label="Receiver Name"
                      type="text"
                      placeholder="Person who will receive the delivery"
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                      error={errors.receiverName}
                    />
                  </div>

                  <div>
                    <Input
                      label="Receiver Phone"
                      type="tel"
                      placeholder="10-digit phone number"
                      value={receiverPhone}
                      onChange={(e) => setReceiverPhone(e.target.value)}
                      error={errors.receiverPhone}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Input
                      label="Notes (optional)"
                      placeholder="Any special instructions for delivery"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      icon={<MessageSquare className="w-4 h-4" />}
                    />
                    {errors.notes && (
                      <p className="mt-2 text-sm text-red-600">
                        {errors.notes}
                      </p>
                    )}
                  </div>
                </section>

                <section>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Profile on File
                    </p>
                    <p className="text-sm text-gray-600">
                      Email: {session?.user?.email || "-"}
                    </p>
                    <p className="text-sm text-gray-600">
                      Phone: {receiverPhone || "-"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Your saved profile details will be attached to this
                      booking automatically.
                    </p>
                  </div>
                </section>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" loading={loading}>
                  {paymentMethod === "UPI" ? "Make Payment" : "Create Booking"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </main>
    </div>
  );
}
