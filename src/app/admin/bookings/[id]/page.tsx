"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import AdminNavbar from "@/components/AdminNavbar";
import { toast } from "react-hot-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";

import { ArrowLeft, Edit, Truck, Package, User, DollarSign, CheckCircle, Clock, AlertCircle, Send, Download, RefreshCw, X } from "lucide-react";

type Booking = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  userAddress: string;
  paymentMethod: "COD" | "UPI";
  quantity: number;
  receiverName?: string | null;
  receiverPhone?: string | null;
  status:
    | "PENDING"
    | "APPROVED"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "CANCELLED";
  requestedAt: string;
  expectedDate?: string | null;
  deliveryDate?: string | null;
  deliveredAt?: string | null;
  notes?: string | null;
  paymentStatus?: "PENDING" | "SUCCESS" | "FAILED";
  paymentAmount?: number;
  deliveryPartnerId?: string | null;
  deliveryPartnerName?: string | null;
  cylinderReserved?: boolean;
  createdAt: string;
  updatedAt: string;
};

type Payment = {
  id: string;
  amount: number;
  method: "COD" | "UPI";
  status: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";
  upiTxnId?: string;
  createdAt: string;
};

type DeliveryAssignment = {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerPhone: string;
  status:
    | "ASSIGNED"
    | "PICKED_UP"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "FAILED";
  assignedAt: string;
  notes?: string;
};

type BookingEvent = {
  id: string;
  status: string;
  title: string;
  description?: string;
  createdAt: string;
};

export default function BookingDetailsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [deliveryAssignment, setDeliveryAssignment] =
    useState<DeliveryAssignment | null>(null);
  const [events, setEvents] = useState<BookingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [showPaymentReminder, setShowPaymentReminder] = useState(false);
  const [reminderMessage, setReminderMessage] = useState("");
  const [sendingReminder, setSendingReminder] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) router.push("/login");
    else if (session.user.role !== "ADMIN") router.push("/user");
  }, [session, status, router]);

  const loadBookingDetails = useCallback(async () => {
    setLoading(true);
    try {
      const [bookingRes, paymentsRes, deliveryRes, eventsRes] =
        await Promise.all([
          fetch(`/api/bookings/${bookingId}`, { cache: "no-store" }),
          fetch(`/api/admin/bookings/${bookingId}/payments`, {
            cache: "no-store",
          }),
          fetch(`/api/admin/bookings/${bookingId}/delivery`, {
            cache: "no-store",
          }),
          fetch(`/api/admin/bookings/${bookingId}/events`, {
            cache: "no-store",
          }),
        ]);

      if (bookingRes.ok) {
        const bookingData = await bookingRes.json();
        setBooking(bookingData.data);
      }

      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        setPayments(paymentsData.data || []);
      }

      if (deliveryRes.ok) {
        const deliveryData = await deliveryRes.json();
        setDeliveryAssignment(deliveryData.data);
      }

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData.data || []);
      }
    } catch (error) {
      console.error("Failed to load booking details:", error);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (session?.user?.role === "ADMIN" && bookingId) {
      loadBookingDetails();
    }
  }, [session, bookingId, loadBookingDetails]);

  const refreshPaymentStatus = async () => {
    setActionLoading("refresh-pay");
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/payments`, {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        const list = json.data || [];
        setPayments(list);
        const latest = list[0];
        if (latest) {
          setBooking((prev) =>
            prev
              ? {
                  ...prev,
                  paymentStatus: latest.status,
                  paymentAmount: latest.amount,
                }
              : prev,
          );
        }
      }
    } catch {
      // no-op
    } finally {
      setActionLoading(null);
    }
  };


  const updateStatus = async (newStatus: string) => {
    setActionLoading("status");
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newStatus }),
      });

      if (res.ok) {
        const result = await res.json();
        toast.success(result.message || "Status updated successfully");
        await loadBookingDetails();
      } else {
        const error = await res.json();
        toast.error(error.message || "Failed to update status");
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (
    newStatus: "APPROVED" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED",
  ) => {
    // Check if UPI payment is pending
    if (
      newStatus === "APPROVED" &&
      booking?.paymentMethod === "UPI" &&
      payments.length > 0 &&
      payments[0].status !== "SUCCESS"
    ) {
      toast.error(
        "⚠️ Cannot approve booking: UPI payment is pending. Please ensure payment is completed or request user to make payment before approval.",
      );
      return;
    }

    // Restriction: must have an assigned delivery partner before marking delivered or out for delivery
    if (
      (newStatus === "DELIVERED" || newStatus === "OUT_FOR_DELIVERY") &&
      !deliveryAssignment
    ) {
      toast.error("Assign a delivery partner before updating this status.");
      return;
    }

    // Additional restriction: OUT_FOR_DELIVERY should be managed through delivery status updates
    if (newStatus === "OUT_FOR_DELIVERY" && deliveryAssignment) {
      toast.error(
        "Use the delivery status controls to mark as Out for Delivery. This ensures proper tracking.",
      );
      return;
    }

    // Confirmation prompts
    let message = "";
    if (newStatus === "APPROVED") {
      message =
        "Approve this booking? An approval email will be sent to the user.";
    } else if (newStatus === "DELIVERED") {
      message =
        "Mark this booking as Delivered? This should typically be done through delivery status updates.";
    } else if (newStatus === "CANCELLED") {
      message = "Cancel this booking? This action cannot be undone.";
    }
    const confirmed = confirm(message);
    if (!confirmed) return;

    await updateStatus(newStatus);
  };

  const sendPaymentReminder = async () => {
    if (!reminderMessage.trim()) {
      toast.error("Please enter a reminder message");
      return;
    }

    setSendingReminder(true);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "PAYMENT_REMINDER",
          message: reminderMessage.trim(),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success("Payment reminder sent successfully");
        setShowPaymentReminder(false);
        setReminderMessage("");
      } else {
        toast.error(json.message || "Failed to send reminder");
      }
    } catch (error) {
      console.error("Failed to send reminder:", error);
      toast.error("Failed to send reminder");
    } finally {
      setSendingReminder(false);
    }
  };

  const sendEmail = async (
    type: "confirmation" | "delivery" | "reminder" | "payment" | "invoice",
  ) => {
    setActionLoading("email");
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      if (res.ok) {
        toast.success(
          `${type.charAt(0).toUpperCase() + type.slice(1)} email sent successfully`,
        );
      } else {
        toast.error("Failed to send email");
      }
    } catch (error) {
      console.error("Failed to send email:", error);
      toast.error("Failed to send email");
    } finally {
      setActionLoading(null);
    }
  };

  const downloadInvoice = async () => {
    setActionLoading("invoice");
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/invoice`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `invoice-${bookingId.slice(-8).toUpperCase()}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Invoice downloaded successfully");
      } else {
        toast.error("Failed to download invoice");
      }
    } catch (error) {
      console.error("Failed to download invoice:", error);
      toast.error("Failed to download invoice");
    } finally {
      setActionLoading(null);
    }
  };

  const cancelBooking = async () => {
    if (!cancellationReason.trim()) {
      toast.error("Please provide a cancellation reason");
      return;
    }

    setActionLoading("cancel");
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newStatus: "CANCELLED",
          cancellationReason: cancellationReason.trim(),
        }),
      });

      if (res.ok) {
        const result = await res.json();
        toast.success(result.message || "Booking cancelled successfully");
        setShowCancellationModal(false);
        setCancellationReason("");
        await loadBookingDetails();
      } else {
        const error = await res.json();
        toast.error(error.message || "Failed to cancel booking");
      }
    } catch (error) {
      console.error("Failed to cancel booking:", error);
      toast.error("Failed to cancel booking");
    } finally {
      setActionLoading(null);
    }
  };

  

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "APPROVED":
        return "bg-blue-100 text-blue-800";
      case "OUT_FOR_DELIVERY":
        return "bg-purple-100 text-purple-800";
      case "DELIVERED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return "bg-green-100 text-green-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "FAILED":
        return "bg-red-100 text-red-800";
      case "CANCELLED":
        return "bg-gray-200 text-gray-700";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (status === "loading") return null;
  if (!session || session.user.role !== "ADMIN") return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading booking details...</p>
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
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Booking Not Found
              </h2>
              <p className="text-gray-600 mb-4">The booking you&apos;re looking for doesn&apos;t exist or has been removed.</p>
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
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/admin/bookings")}
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Bookings
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Booking #{booking.id}
                </h1>
                <p className="text-sm text-gray-600">
                  Created on {new Date(booking.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Status-based Quick Actions */}
              {booking.status === "PENDING" && (
                <button
                  onClick={() => handleStatusChange("APPROVED")}
                  disabled={
                    actionLoading === "status" ||
                    (booking.paymentMethod === "UPI" &&
                      payments.length > 0 &&
                      payments[0].status !== "SUCCESS")
                  }
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  title={
                    booking.paymentMethod === "UPI" &&
                    payments.length > 0 &&
                    payments[0].status !== "SUCCESS"
                      ? "Cannot approve: UPI payment is pending. Please ensure payment is completed or request user to make payment."
                      : undefined
                  }
                >
                  <CheckCircle className="w-4 h-4" />
                  {actionLoading === "status" ? "Approving..." : "Approve"}
                </button>
              )}

              {booking.status === "APPROVED" && !deliveryAssignment && (
                <button
                  onClick={() =>
                    router.push(`/admin/bookings/${bookingId}/assign-delivery`)
                  }
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <Truck className="w-4 h-4" />
                  Assign Delivery
                </button>
              )}

              {booking.status === "APPROVED" && deliveryAssignment && (
                <button
                  onClick={() => router.push(`/admin/deliveries/active`)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  title="Manage delivery status through Active Deliveries"
                >
                  <Truck className="w-4 h-4" />
                  Manage Delivery
                </button>
              )}

              {booking.status === "OUT_FOR_DELIVERY" && (
                <button
                  onClick={() => handleStatusChange("DELIVERED")}
                  disabled={actionLoading === "status"}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  {actionLoading === "status"
                    ? "Updating..."
                    : "Mark Delivered"}
                </button>
              )}

              {booking.status !== "CANCELLED" && (
                <>
                  <button
                    onClick={() =>
                      router.push(`/admin/bookings/${bookingId}/edit`)
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>

                  {booking.status !== "DELIVERED" && (
                    <button
                      onClick={() => setShowCancellationModal(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  )}

                  {booking.status === "DELIVERED" && (
                    <button
                      onClick={() => sendEmail("invoice")}
                      disabled={actionLoading === "email"}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      {actionLoading === "email"
                        ? "Sending..."
                        : "Send Invoice"}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Status Display */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}
                  >
                    {booking.status}
                  </span>
                  <span className="text-sm text-gray-600">
                    Last updated: {new Date(booking.updatedAt).toLocaleString()}
                  </span>
                </div>
                <div className="text-sm text-gray-500">
                  {deliveryAssignment ? (
                    <span className="text-purple-600">
                      Delivery Partner: {deliveryAssignment.partnerName}
                    </span>
                  ) : (
                    <span className="text-gray-500">
                      No delivery partner assigned
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Customer & Booking Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        Name
                      </label>
                      <p className="text-gray-900">{booking.userName}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        Phone
                      </label>
                      <p className="text-gray-900">{booking.userPhone}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        Email
                      </label>
                      <p className="text-gray-900">{booking.userEmail}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        User ID
                      </label>
                      <p className="text-gray-900 font-mono text-sm">
                        {booking.userId}
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      Address
                    </label>
                    <p className="text-gray-900">{booking.userAddress}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Booking Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Booking Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        Quantity
                      </label>
                      <p className="text-gray-900">
                        {booking.quantity} cylinder(s)
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        Payment Method
                      </label>
                      <p className="text-gray-900">{booking.paymentMethod}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        Requested Date
                      </label>
                      <p className="text-gray-900">
                        {new Date(booking.requestedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        Expected Delivery
                      </label>
                      <p className="text-gray-900">
                        {booking.expectedDate
                          ? new Date(booking.expectedDate).toLocaleDateString()
                          : "Not set"}
                      </p>
                    </div>
                  </div>

                  {booking.receiverName && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500">
                          Receiver Name
                        </label>
                        <p className="text-gray-900">{booking.receiverName}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-500">
                          Receiver Phone
                        </label>
                        <p className="text-gray-900">{booking.receiverPhone}</p>
                      </div>
                    </div>
                  )}

                  {booking.notes && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        Notes
                      </label>
                      <p className="text-gray-900">{booking.notes}</p>
                    </div>
                  )}

                  {booking.cylinderReserved && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-800">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          Cylinder Reserved
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Payment Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {payments.length > 0 ? (
                    <div className="space-y-3">
                      {payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(payment.status)}`}
                              >
                                {payment.status}
                              </span>
                              <span className="text-sm text-gray-600">
                                {payment.method}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {new Date(payment.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-gray-900">
                              ₹{payment.amount}
                            </div>
                            {payment.upiTxnId && (
                              <div className="text-xs text-gray-500">
                                TXN: {payment.upiTxnId}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">
                      No payment records found
                    </p>
                  )}

                  {/* UPI Payment Restriction Warning */}
                  {booking.paymentMethod === "UPI" &&
                    payments.length > 0 &&
                    payments[0].status !== "SUCCESS" && (
                      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <h4 className="text-sm font-semibold text-red-800 mb-1">
                              ⚠️ UPI Payment Pending - Approval Blocked
                            </h4>
                            <p className="text-sm text-red-700 mb-3">
                              This UPI payment has not been completed
                              successfully.{" "}
                              <strong>
                                The booking cannot be approved until payment is
                                confirmed.
                              </strong>{" "}
                              Please ensure payment is completed or request the
                              user to make payment before proceeding with
                              approval.
                            </p>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() =>
                                  router.push(
                                    `/admin/bookings/${bookingId}/review-payment`,
                                  )
                                }
                                className="inline-flex items-center gap-2 px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                              >
                                <DollarSign className="w-4 h-4" />
                                Review Payment
                              </button>
                              <button
                                onClick={() => setShowPaymentReminder(true)}
                                className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-red-300 text-red-700 text-sm rounded-md hover:bg-red-50"
                              >
                                <Send className="w-4 h-4" />
                                Send Payment Reminder
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                </CardContent>
              </Card>

              {/* Delivery Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    Delivery Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {booking.status === "APPROVED" ? (
                    <div className="space-y-4">
                      {deliveryAssignment ? (
                        <>
                          <div className="flex items-center gap-2 mb-4">
                            <Truck className="w-5 h-5 text-purple-600" />
                            <span className="text-sm font-medium text-purple-600">
                              Delivery Partner Assigned
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-500">
                                Delivery Partner
                              </label>
                              <p className="text-gray-900">
                                {deliveryAssignment.partnerName}
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-500">
                                Phone
                              </label>
                              <p className="text-gray-900">
                                {deliveryAssignment.partnerPhone}
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-500">
                                Status
                              </label>
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(deliveryAssignment.status)}`}
                              >
                                {deliveryAssignment.status}
                              </span>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-500">
                                Assigned On
                              </label>
                              <p className="text-gray-900">
                                {new Date(
                                  deliveryAssignment.assignedAt,
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          {deliveryAssignment.notes && (
                            <div>
                              <label className="block text-sm font-medium text-gray-500">
                                Notes
                              </label>
                              <p className="text-gray-900">
                                {deliveryAssignment.notes}
                              </p>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-4">
                          <div className="flex items-center justify-center gap-2 mb-3">
                            <Clock className="w-5 h-5 text-orange-600" />
                            <span className="text-sm font-medium text-orange-600">
                              Ready for Delivery Assignment
                            </span>
                          </div>
                          <p className="text-gray-500 mb-3">
                            No delivery partner assigned yet
                          </p>
                          <button
                            onClick={() =>
                              router.push(
                                `/admin/bookings/${bookingId}/assign-delivery`,
                              )
                            }
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                          >
                            Assign Delivery Partner
                          </button>
                        </div>
                      )}
                    </div>
                  ) : booking.status === "OUT_FOR_DELIVERY" ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Truck className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-medium text-blue-600">
                          Out for Delivery
                        </span>
                      </div>
                      {deliveryAssignment ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-500">
                              Delivery Partner
                            </label>
                            <p className="text-gray-900">
                              {deliveryAssignment.partnerName}
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-500">
                              Phone
                            </label>
                            <p className="text-gray-900">
                              {deliveryAssignment.partnerPhone}
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-500">
                              Status
                            </label>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(deliveryAssignment.status)}`}
                            >
                              {deliveryAssignment.status}
                            </span>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-500">
                              Assigned On
                            </label>
                            <p className="text-gray-900">
                              {new Date(
                                deliveryAssignment.assignedAt,
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-gray-500">
                            Delivery partner information not available
                          </p>
                        </div>
                      )}
                    </div>
                  ) : booking.status === "DELIVERED" ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-4">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium text-green-600">
                          Successfully Delivered
                        </span>
                      </div>
                      {deliveryAssignment ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-500">
                              Delivery Partner
                            </label>
                            <p className="text-gray-900">
                              {deliveryAssignment.partnerName}
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-500">
                              Phone
                            </label>
                            <p className="text-gray-900">
                              {deliveryAssignment.partnerPhone}
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-500">
                              Status
                            </label>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(deliveryAssignment.status)}`}
                            >
                              {deliveryAssignment.status}
                            </span>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-500">
                              Delivered On
                            </label>
                            <p className="text-gray-900">
                              {booking.deliveredAt
                                ? new Date(
                                    booking.deliveredAt,
                                  ).toLocaleDateString()
                                : "Not specified"}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-gray-500">
                            Delivery partner information not available
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <span className="text-sm font-medium text-gray-500">
                          Delivery Not Available
                        </span>
                      </div>
                      <p className="text-gray-500">
                        Delivery information will be available once the booking
                        is approved
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Actions & Timeline */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Status-based Actions */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 border-b pb-1">
                      Status Actions
                    </h4>

                    {/* PENDING Status Actions */}
                    {booking.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => handleStatusChange("APPROVED")}
                          disabled={
                            actionLoading === "status" ||
                            (booking.paymentMethod === "UPI" &&
                              payments.length > 0 &&
                              payments[0].status !== "SUCCESS")
                          }
                          className="w-full text-left p-3 border border-green-200 rounded-lg hover:bg-green-50 disabled:opacity-50 text-green-700"
                          title={
                            booking.paymentMethod === "UPI" &&
                            payments.length > 0 &&
                            payments[0].status !== "SUCCESS"
                              ? "Cannot approve: UPI payment is pending. Please ensure payment is completed or request user to make payment."
                              : undefined
                          }
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            <span>
                              {actionLoading === "status"
                                ? "Approving..."
                                : "Approve Booking"}
                            </span>
                          </div>
                        </button>

                        <button
                          onClick={() => sendEmail("confirmation")}
                          disabled={actionLoading === "email"}
                          className="w-full text-left p-3 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50 text-blue-700"
                        >
                          <div className="flex items-center gap-2">
                            <Send className="w-4 h-4" />
                            <span>Send Confirmation Email</span>
                          </div>
                        </button>
                      </>
                    )}

                    {/* APPROVED Status Actions */}
                    {booking.status === "APPROVED" && (
                      <>
                        {!deliveryAssignment ? (
                          <button
                            onClick={() =>
                              router.push(
                                `/admin/bookings/${bookingId}/assign-delivery`,
                              )
                            }
                            className="w-full text-left p-3 border border-purple-200 rounded-lg hover:bg-purple-50 text-purple-700"
                          >
                            <div className="flex items-center gap-2">
                              <Truck className="w-4 h-4" />
                              <span>Assign Delivery Partner</span>
                            </div>
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              router.push(`/admin/deliveries/active`)
                            }
                            className="w-full text-left p-3 border border-purple-200 rounded-lg hover:bg-purple-50 text-purple-700"
                            title="Manage delivery status through Active Deliveries"
                          >
                            <div className="flex items-center gap-2">
                              <Truck className="w-4 h-4" />
                              <span>Manage Delivery</span>
                            </div>
                          </button>
                        )}

                        <button
                          onClick={() => sendEmail("reminder")}
                          disabled={actionLoading === "email"}
                          className="w-full text-left p-3 border border-yellow-200 rounded-lg hover:bg-yellow-50 disabled:opacity-50 text-yellow-700"
                        >
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>Send Reminder Email</span>
                          </div>
                        </button>
                      </>
                    )}

                    {/* OUT_FOR_DELIVERY Status Actions */}
                    {booking.status === "OUT_FOR_DELIVERY" && (
                      <button
                        onClick={() => router.push(`/admin/deliveries/active`)}
                        className="w-full text-left p-3 border border-purple-200 rounded-lg hover:bg-purple-50 text-purple-700"
                        title="Manage delivery status through Active Deliveries"
                      >
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4" />
                          <span>Manage Delivery</span>
                        </div>
                      </button>
                    )}

                    {/* No Status Actions Available */}
                    {!(
                      booking.status === "PENDING" ||
                      booking.status === "APPROVED" ||
                      booking.status === "OUT_FOR_DELIVERY"
                    ) && (
                      <div className="text-center py-3 text-gray-500 text-sm">
                        No status actions available
                      </div>
                    )}
                  </div>

                  {/* Payment Actions */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 border-b pb-1">
                      Payment Actions
                    </h4>

                    {/* Review UPI Payment */}
                    {booking.paymentMethod === "UPI" &&
                      (booking.paymentStatus === "PENDING" ||
                        payments[0]?.status === "PENDING") && (
                        <button
                          onClick={() =>
                            router.push(
                              `/admin/bookings/${bookingId}/review-payment`,
                            )
                          }
                          className="w-full text-left p-3 border border-green-200 rounded-lg hover:bg-green-50 text-green-700"
                        >
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            <span>Review UPI Payment</span>
                          </div>
                        </button>
                      )}

                    {/* Edit COD Payment */}
                    {booking.paymentMethod === "COD" &&
                      (booking.status === "PENDING" ||
                        booking.status === "APPROVED" ||
                        booking.status === "DELIVERED") && (
                        <button
                          onClick={() =>
                            router.push(
                              `/admin/bookings/${bookingId}/edit-payment`,
                            )
                          }
                          className="w-full text-left p-3 border border-green-200 rounded-lg hover:bg-green-50 text-green-700"
                        >
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            <span>Edit Payment</span>
                          </div>
                        </button>
                      )}

                    {/* Payment Reminder */}
                    {booking?.paymentStatus === "PENDING" && (
                      <button
                        onClick={() => sendEmail("payment")}
                        disabled={actionLoading === "email"}
                        className="w-full text-left p-3 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 text-red-700"
                      >
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          <span>Send Payment Reminder</span>
                        </div>
                      </button>
                    )}

                    {/* Refresh Payment Status */}
                    {booking?.paymentStatus === "PENDING" && (
                      <button
                        onClick={refreshPaymentStatus}
                        disabled={actionLoading === "refresh-pay"}
                        className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-gray-700"
                      >
                        <div className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4" />
                          <span>
                            {actionLoading === "refresh-pay"
                              ? "Refreshing…"
                              : "Refresh Payment Status"}
                          </span>
                        </div>
                      </button>
                    )}

                    {/* No Payment Actions Available */}
                    {!(
                      (booking.paymentMethod === "UPI" &&
                        (booking.paymentStatus === "PENDING" ||
                          payments[0]?.status === "PENDING")) ||
                      (booking.paymentMethod === "COD" &&
                        (booking.status === "PENDING" ||
                          booking.status === "APPROVED" ||
                          booking.status === "DELIVERED")) ||
                      booking?.paymentStatus === "PENDING"
                    ) && (
                      <div className="text-center py-3 text-gray-500 text-sm">
                        No payment actions available
                      </div>
                    )}
                  </div>

                  {/* Communication Actions */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 border-b pb-1">
                      Communication
                    </h4>

                    {/* Delivery Info Email */}
                    {deliveryAssignment &&
                      (booking.status === "APPROVED" ||
                        booking.status === "OUT_FOR_DELIVERY") && (
                        <button
                          onClick={() => sendEmail("delivery")}
                          disabled={actionLoading === "email"}
                          className="w-full text-left p-3 border border-purple-200 rounded-lg hover:bg-purple-50 disabled:opacity-50 text-purple-700"
                        >
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4" />
                            <span>Send Delivery Info</span>
                          </div>
                        </button>
                      )}

                    {/* No Communication Actions Available */}
                    {!(
                      deliveryAssignment &&
                      (booking.status === "APPROVED" ||
                        booking.status === "OUT_FOR_DELIVERY")
                    ) && (
                      <div className="text-center py-3 text-gray-500 text-sm">
                        No communication actions available
                      </div>
                    )}
                  </div>

                  {/* Utility Actions */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 border-b pb-1">
                      Utilities
                    </h4>

                    {/* Download Invoice */}
                    <button
                      onClick={downloadInvoice}
                      disabled={actionLoading === "invoice"}
                      className="w-full text-left p-3 border border-green-200 rounded-lg hover:bg-green-50 disabled:opacity-50 text-green-700"
                    >
                      <div className="flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        <span>
                          {actionLoading === "invoice"
                            ? "Downloading..."
                            : "Download Invoice"}
                        </span>
                      </div>
                    </button>

                    {/* Send Invoice Email */}
                    {booking.status === "DELIVERED" && (
                      <button
                        onClick={() => sendEmail("invoice")}
                        disabled={actionLoading === "email"}
                        className="w-full text-left p-3 border border-blue-200 rounded-lg hover:bg-blue-50 disabled:opacity-50 text-blue-700"
                      >
                        <div className="flex items-center gap-2">
                          <Send className="w-4 h-4" />
                          <span>
                            {actionLoading === "email"
                              ? "Sending..."
                              : "Send Invoice Email"}
                          </span>
                        </div>
                      </button>
                    )}

                    {/* Edit Booking */}
                    {booking.status !== "CANCELLED" && (
                      <button
                        onClick={() =>
                          router.push(`/admin/bookings/${bookingId}/edit`)
                        }
                        className="w-full text-left p-3 border border-blue-200 rounded-lg hover:bg-blue-50 text-blue-700"
                      >
                        <div className="flex items-center gap-2">
                          <Edit className="w-4 h-4" />
                          <span>Edit Booking</span>
                        </div>
                      </button>
                    )}
                  </div>

                  {/* Danger Actions */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 border-b pb-1">
                      Danger Zone
                    </h4>

                    {/* Cancel Booking */}
                    {booking?.status !== "CANCELLED" &&
                      booking?.status !== "DELIVERED" && (
                        <button
                          onClick={() => setShowCancellationModal(true)}
                          disabled={actionLoading === "cancel"}
                          className="w-full text-left p-3 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 text-red-700"
                        >
                          <div className="flex items-center gap-2">
                            <X className="w-4 h-4" />
                            <span>Cancel Booking</span>
                          </div>
                        </button>
                      )}
                  </div>
                </CardContent>
              </Card>

              {/* Booking Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Booking Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {events.length > 0 ? (
                      events.map((event) => (
                        <div key={event.id} className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {event.title}
                            </div>
                            {event.description && (
                              <div className="text-xs text-gray-500">
                                {event.description}
                              </div>
                            )}
                            <div className="text-xs text-gray-400 mt-1">
                              {new Date(event.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">
                        No events recorded
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Cancellation Modal */}
      {showCancellationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Cancel Booking
              </h3>
              <button
                onClick={() => setShowCancellationModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cancellation Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-black"
                placeholder="Please provide a reason for cancellation..."
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowCancellationModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={cancelBooking}
                disabled={
                  actionLoading === "cancel" || !cancellationReason.trim()
                }
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === "cancel"
                  ? "Cancelling..."
                  : "Cancel Booking"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Reminder Modal */}
      {showPaymentReminder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Send Payment Reminder
              </h3>
              <button
                onClick={() => setShowPaymentReminder(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                Send a reminder to <strong>{booking?.userName}</strong> about
                their pending UPI payment for booking #{booking?.id}.
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reminder Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reminderMessage}
                onChange={(e) => setReminderMessage(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Enter your reminder message here..."
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowPaymentReminder(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={sendPaymentReminder}
                disabled={sendingReminder || !reminderMessage.trim()}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingReminder ? "Sending..." : "Send Reminder"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
