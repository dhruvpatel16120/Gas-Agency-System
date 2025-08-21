"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { Button } from "@/components/ui";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Clipboard,
  Check,
  MapPin,
  CreditCard,
  X,
  AlertCircle,
} from "lucide-react";
import { getStatusColor, formatDateTime, formatCurrency } from "@/lib/utils";
import { toast } from "react-hot-toast";
import UserNavbar from "@/components/UserNavbar";
import type { BookingStatus } from "@prisma/client";

type Booking = {
  id: string;
  paymentMethod: "COD" | "UPI";
  status:
    | "PENDING"
    | "APPROVED"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "CANCELLED";
  requestedAt: string;
  deliveryDate?: string | null;
  deliveredAt?: string | null;
  notes?: string | null;
  paymentStatus?: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";
  paymentAmount?: number | null;
};

export default function BookingHistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [remainingQuota, setRemainingQuota] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }
    void loadBookings();
    void loadRemainingQuota();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status, page, statusFilter, methodFilter]);

  const totalPages = useMemo(
    () => Math.ceil(total / limit) || 1,
    [total, limit],
  );

  const loadBookings = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (statusFilter) params.set("status", statusFilter);
      if (methodFilter) params.set("paymentMethod", methodFilter);
      const res = await fetch(`/api/bookings?${params.toString()}`);
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || "Failed to load bookings");
      }
      setBookings(result.data.data);
      setTotal(result.data.pagination.total);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An error occurred while loading bookings";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadRemainingQuota = async () => {
    try {
      const res = await fetch("/api/user/quota");
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.message || "Failed to load remaining quota");
      }
      setRemainingQuota(result.data.remainingQuota);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An error occurred while loading remaining quota";
      toast.error(errorMessage);
    }
  };

  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      toast.success("Booking ID copied to clipboard");
    } catch {
      toast.error("Failed to copy booking ID");
    }
  };

  const cancelBooking = async (bookingId: string) => {
    if (
      !confirm(
        "Are you sure you want to cancel this booking? This action cannot be undone.",
      )
    )
      return;

    setActionId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CANCELLED",
          cancellationReason: "Cancelled by user",
        }),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        toast.success("Booking cancelled successfully");
        await loadBookings();
        await loadRemainingQuota();
      } else {
        throw new Error(result.message || "Failed to cancel booking");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An error occurred while cancelling the booking";
      toast.error(errorMessage);
    } finally {
      setActionId(null);
    }
  };

  const handleRepay = async (bookingId: string) => {
    if (!confirm("Do you want to retry the payment for this booking?")) return;

    setActionId(bookingId);
    try {
      // Prompt user for new UPI transaction ID with better validation
      const upiTxnId = prompt(
        "Please enter your new UPI transaction ID (minimum 6 characters):",
      );
      if (!upiTxnId || upiTxnId.trim().length < 6) {
        toast.error(
          "Please enter a valid UPI transaction ID (at least 6 characters)",
        );
        return;
      }

      // Additional validation for UPI transaction ID format
      if (!/^[A-Za-z0-9_-]+$/.test(upiTxnId.trim())) {
        toast.error("UPI transaction ID contains invalid characters");
        return;
      }

      const res = await fetch("/api/payments/upi/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          upiTxnId: upiTxnId.trim(),
        }),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        toast.success(
          result.data.message || "Payment retry initiated successfully",
        );
        await loadBookings(); // Refresh the list to show updated status
      } else {
        throw new Error(result.message || "Failed to retry payment");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An error occurred while retrying payment";
      toast.error(errorMessage);
    } finally {
      setActionId(null);
    }
  };

  // Helper function to determine which action buttons to show
  const getActionButtons = (booking: Booking): string[] => {
    const actions: string[] = [];

    // Always show Track button
    actions.push("track");

    // Show Pay button only for UPI payments that are not cancelled and payment is pending
    if (
      booking.paymentMethod === "UPI" &&
      booking.status !== "CANCELLED" &&
      booking.paymentStatus === "PENDING"
    ) {
      actions.push("pay");
    }

    // Show Repay button for UPI payments that failed
    if (
      booking.paymentMethod === "UPI" &&
      booking.status !== "CANCELLED" &&
      booking.paymentStatus === "FAILED"
    ) {
      actions.push("repay");
    }

    // Show Cancel button for PENDING or APPROVED status
    if (["PENDING", "APPROVED"].includes(booking.status)) {
      actions.push("cancel");
    }

    return actions;
  };

  if (status === "loading" || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UserNavbar />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          {/* Quota Status */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Gas Cylinder Quota
                  </h2>
                  <p className="text-gray-600">
                    You have{" "}
                    <span className="font-semibold text-blue-600">
                      {remainingQuota || 0}
                    </span>{" "}
                    cylinder(s) remaining this year
                  </p>
                  {remainingQuota !== null && remainingQuota <= 2 && (
                    <p className="text-sm text-yellow-700 mt-2 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      You&apos;re running low on cylinders. Only {
                        remainingQuota
                      }{" "}
                      remaining this year.
                    </p>
                  )}
                  {remainingQuota !== null && remainingQuota > 0 && (
                    <Button
                      onClick={() => router.push("/user/book")}
                      className="mt-3"
                      variant="primary"
                      size="sm"
                    >
                      Book New Cylinder
                    </Button>
                  )}
                  {/* Show message for failed payments */}
                  {bookings.some(
                    (b) =>
                      b.paymentStatus === "FAILED" && b.paymentMethod === "UPI",
                  ) && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        You have failed UPI payments. Use the &quot;Repay&quot; button to
                        retry payment.
                      </p>
                    </div>
                  )}
                </div>
                <div className="text-center lg:text-right">
                  <div className="text-3xl font-bold text-blue-600">
                    {remainingQuota || 0}
                  </div>
                  <div className="text-sm text-gray-500">Remaining</div>
                  <div className="text-xs text-gray-400 mt-1">of 12 total</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-4 h-4" /> Filters
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setStatusFilter("");
                    setMethodFilter("");
                    setPage(1);
                  }}
                >
                  Clear
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => loadBookings()}
                  loading={loading}
                >
                  <RefreshCw className="w-4 h-4 mr-1" /> Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setPage(1);
                    setStatusFilter(e.target.value);
                  }}
                  className="h-10 border border-gray-300 rounded-md px-3 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="" className="text-gray-900">
                    All Statuses
                  </option>
                  <option value="PENDING" className="text-gray-900">
                    Pending
                  </option>
                  <option value="APPROVED" className="text-gray-900">
                    Approved
                  </option>
                  <option value="OUT_FOR_DELIVERY" className="text-gray-900">
                    Out for Delivery
                  </option>
                  <option value="DELIVERED" className="text-gray-900">
                    Delivered
                  </option>
                  <option value="CANCELLED" className="text-gray-900">
                    Cancelled
                  </option>
                </select>

                <select
                  value={methodFilter}
                  onChange={(e) => {
                    setPage(1);
                    setMethodFilter(e.target.value);
                  }}
                  className="h-10 border border-gray-300 rounded-md px-3 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="" className="text-gray-900">
                    All Payment Methods
                  </option>
                  <option value="COD" className="text-gray-900">
                    Cash on Delivery
                  </option>
                  <option value="UPI" className="text-gray-900">
                    UPI
                  </option>
                </select>

                <select
                  value={limit}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setLimit(val);
                    setPage(1);
                  }}
                  className="h-10 border border-gray-300 rounded-md px-3 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={5}>5 per page</option>
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Error:</span>
                  <span>{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* List */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" /> Your Bookings
              </CardTitle>
              <div className="text-sm text-gray-500">Total: {total}</div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Requested
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Delivery
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notes
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading && (
                      <tr>
                        <td colSpan={7} className="px-4 py-6">
                          <div className="animate-pulse space-y-3">
                            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                          </div>
                        </td>
                      </tr>
                    )}
                    {!loading &&
                      bookings.map((b) => (
                        <tr key={b.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <div className="flex items-center gap-2">
                              <span
                                className="font-mono truncate max-w-[120px] sm:max-w-[180px]"
                                title={b.id}
                              >
                                {b.id}
                              </span>
                              <button
                                onClick={() => copyId(b.id)}
                                className="inline-flex items-center text-xs text-gray-500 hover:text-gray-700 transition-colors"
                                title="Copy ID"
                              >
                                <Clipboard className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border ${getStatusColor(b.status as BookingStatus)} uppercase`}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            <div className="flex flex-col gap-1">
                              <span className="font-medium">
                                {b.paymentMethod}
                              </span>
                              {b.paymentStatus && (
                                <div className="flex flex-col gap-1">
                                  <span
                                    className={`text-xs px-2 py-1 rounded-full font-medium inline-block w-fit ${
                                      b.paymentStatus === "SUCCESS"
                                        ? "bg-green-100 text-green-800"
                                        : b.paymentStatus === "FAILED"
                                          ? "bg-red-100 text-red-800"
                                          : b.paymentStatus === "PENDING"
                                            ? "bg-yellow-100 text-yellow-800"
                                            : "bg-gray-100 text-gray-800"
                                    }`}
                                  >
                                    {b.paymentStatus}
                                  </span>
                                  {b.paymentStatus === "FAILED" &&
                                    b.paymentMethod === "UPI" && (
                                      <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded inline-block w-fit">
                                        ⚠️ Payment failed
                                      </span>
                                    )}
                                </div>
                              )}
                              {b.paymentAmount && (
                                <span className="text-sm font-medium text-gray-900">
                                  Amount: {formatCurrency(b.paymentAmount)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {formatDateTime(b.requestedAt)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {b.deliveryDate
                              ? formatDateTime(b.deliveryDate)
                              : "-"}
                          </td>
                          <td
                            className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate"
                            title={b.notes || ""}
                          >
                            {b.notes || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            <div className="flex flex-wrap gap-2">
                              {getActionButtons(b).map((action) => {
                                const isProcessing = actionId === b.id;

                                switch (action) {
                                  case "track":
                                    return (
                                      <Button
                                        key="track"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          router.push(`/user/track/${b.id}`)
                                        }
                                        className="text-xs"
                                      >
                                        <MapPin className="w-3 h-3 mr-1" />
                                        Track
                                      </Button>
                                    );
                                  case "pay":
                                    return (
                                      <Button
                                        key="pay"
                                        variant="primary"
                                        size="sm"
                                        onClick={() =>
                                          router.push(`/user/pay/upi/${b.id}`)
                                        }
                                        className="text-xs"
                                      >
                                        <CreditCard className="w-3 h-3 mr-1" />
                                        Pay
                                      </Button>
                                    );
                                  case "repay":
                                    return (
                                      <Button
                                        key="repay"
                                        variant="success"
                                        size="sm"
                                        onClick={() => handleRepay(b.id)}
                                        loading={isProcessing}
                                        disabled={isProcessing}
                                        className="text-xs"
                                        title="Retry your UPI payment with a new transaction ID"
                                      >
                                        <Check className="w-3 h-3 mr-1" />
                                        {isProcessing
                                          ? "Processing..."
                                          : "Repay"}
                                      </Button>
                                    );
                                  case "cancel":
                                    return (
                                      <Button
                                        key="cancel"
                                        variant="danger"
                                        size="sm"
                                        onClick={() => cancelBooking(b.id)}
                                        loading={isProcessing}
                                        disabled={isProcessing}
                                        className="text-xs"
                                      >
                                        <X className="w-3 h-3 mr-1" />
                                        Cancel
                                      </Button>
                                    );
                                  default:
                                    return null;
                                }
                              })}
                            </div>
                          </td>
                        </tr>
                      ))}
                    {!loading && bookings.length === 0 && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-8 text-center text-sm text-gray-500"
                        >
                          No bookings found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
