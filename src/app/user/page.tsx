"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui";
import {
  User,
  Calendar,
  Package,
  Flame,
  ArrowRight,
} from "lucide-react";
import { formatDate, getStatusColor } from "@/lib/utils";
import UserNavbar from "@/components/UserNavbar";
import toast from "react-hot-toast";

export default function UserDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{
    name: string;
    remainingQuota: number;
    emailVerified?: string | null;
  } | null>(null);
  const [totalBookings, setTotalBookings] = useState<number>(0);
  const [recentBookings, setRecentBookings] = useState<
    Array<{
      id: string;
      status:
        | "PENDING"
        | "APPROVED"
        | "OUT_FOR_DELIVERY"
        | "DELIVERED"
        | "CANCELLED";
      quantity?: number | null;
      paymentMethod: "COD" | "UPI";
      paymentStatus?: "PENDING" | "SUCCESS" | "FAILED";
      createdAt: string;
    }>
  >([]);

  // Helper function to determine which action buttons to show for recent bookings
  const getRecentBookingActions = (booking: {
    paymentMethod: "COD" | "UPI";
    status: "PENDING" | "APPROVED" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";
    paymentStatus?: "PENDING" | "SUCCESS" | "FAILED";
    id: string;
  }) => {
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

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }
  }, [session, status, router]);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [pRes, bRes] = await Promise.all([
        fetch("/api/user/profile"),
        fetch("/api/bookings?page=1&limit=5"),
      ]);
      if (pRes.ok) {
        const pJson = await pRes.json();
        const data = pJson.data;
        setProfile({
          name: data.name,
          remainingQuota: data.remainingQuota,
          emailVerified: data.emailVerified,
        });
      }
      if (bRes.ok) {
        const bJson = await bRes.json();
        setTotalBookings(bJson.data?.pagination?.total || 0);
        setRecentBookings(bJson.data?.data || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const isVerified = Boolean(profile?.emailVerified);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <UserNavbar />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          {/* Quota Status */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Gas Cylinder Quota
                  </h2>
                  <p className="text-gray-600">
                    You have{" "}
                    <span className="font-semibold text-blue-600 text-lg">
                      {profile?.remainingQuota || 0}
                    </span>{" "}
                    cylinder(s) remaining this year
                  </p>
                  {profile?.remainingQuota !== undefined &&
                    profile.remainingQuota <= 2 && (
                      <p className="text-sm text-yellow-700 mt-2">
                        ⚠️ You&apos;re running low on cylinders. Only{" "}
                        {profile.remainingQuota} remaining this year.
                      </p>
                    )}
                  {profile?.remainingQuota !== undefined &&
                    profile.remainingQuota > 0 && (
                      <button
                        onClick={() => router.push("/user/book")}
                        className="mt-3 inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Book New Cylinder
                      </button>
                    )}
                </div>
                <div className="text-right">
                  <div className="text-4xl font-bold text-blue-600">
                    {profile?.remainingQuota || 0}
                  </div>
                  <div className="text-sm text-gray-500">Remaining</div>
                  <div className="text-xs text-gray-400 mt-1">of 12 total</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Welcome Card */}
          <div className="rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 text-white shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold">
                  Welcome back, {profile?.name || "User"}!
                </h2>
                <p className="mt-1 text-white/90">
                  Manage your bookings, track deliveries, and update your
                  profile.
                </p>
              </div>
              <Flame className="w-10 h-10 opacity-80" />
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="transition-all hover:shadow-xl hover:-translate-y-0.5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Remaining Quota
                </CardTitle>
                <Package className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {profile?.remainingQuota ?? "—"}
                </div>
                <p className="text-xs text-gray-500">Gas cylinders remaining</p>
              </CardContent>
            </Card>

            <Card className="transition-all hover:shadow-xl hover:-translate-y-0.5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Bookings
                </CardTitle>
                <Calendar className="h-4 w-4 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalBookings}</div>
                <p className="text-xs text-gray-500">All-time bookings</p>
              </CardContent>
            </Card>

            <Card className="transition-all hover:shadow-xl hover:-translate-y-0.5">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Account Status
                </CardTitle>
                <User
                  className={`h-4 w-4 ${isVerified ? "text-green-600" : "text-amber-600"}`}
                />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-3xl font-bold ${isVerified ? "text-green-600" : "text-amber-600"}`}
                >
                  {isVerified ? "Verified" : "Unverified"}
                </div>
                <p className="text-xs text-gray-500">
                  {isVerified
                    ? "Your email is verified"
                    : "Please verify your email"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Bookings */}
          <Card className="transition-all hover:shadow-xl">
            <CardHeader>
              <CardTitle>Recent Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              {recentBookings.length === 0 ? (
                <div className="text-sm text-gray-600">
                  No recent bookings. Create your first booking to see it here.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recentBookings.map((b) => (
                    <div
                      key={b.id}
                      className="py-3 flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          Booking #{b.id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-gray-600">
                          {formatDate(b.createdAt)} · Qty: {b.quantity ?? 1} ·{" "}
                          {b.paymentMethod}
                          {b.paymentStatus && (
                            <span
                              className={`ml-2 px-1.5 py-0.5 rounded text-xs font-medium ${
                                b.paymentStatus === "SUCCESS"
                                  ? "bg-green-100 text-green-800"
                                  : b.paymentStatus === "PENDING"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                              }`}
                            >
                              {b.paymentStatus}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${getStatusColor(b.status)}`}
                        >
                          {b.status}
                        </span>
                        {getRecentBookingActions(b).map((action) => {
                          switch (action) {
                            case "track":
                              return (
                                <button
                                  key="track"
                                  onClick={() =>
                                    router.push(`/user/track/${b.id}`)
                                  }
                                  className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700"
                                >
                                  Track <ArrowRight className="w-3 h-3 ml-1" />
                                </button>
                              );
                            case "pay":
                              return (
                                <button
                                  key="pay"
                                  onClick={() =>
                                    router.push(`/user/pay/upi/${b.id}`)
                                  }
                                  className="inline-flex items-center text-xs text-green-600 hover:text-green-700"
                                >
                                  Pay <ArrowRight className="w-3 h-3 ml-1" />
                                </button>
                              );
                            case "repay":
                              return (
                                <button
                                  key="repay"
                                  onClick={() =>
                                    router.push(`/user/repay/${b.id}`)
                                  }
                                  className="inline-flex items-center text-xs text-purple-600 hover:text-purple-700"
                                >
                                  Repay <ArrowRight className="w-3 h-3 ml-1" />
                                </button>
                              );
                            case "cancel":
                              return (
                                <button
                                  key="cancel"
                                  onClick={async () => {
                                    if (
                                      confirm(
                                        "Are you sure you want to cancel this booking?",
                                      )
                                    ) {
                                      try {
                                        const response = await fetch(
                                          `/api/bookings/${b.id}`,
                                          {
                                            method: "PUT",
                                            headers: {
                                              "Content-Type":
                                                "application/json",
                                            },
                                            body: JSON.stringify({
                                              status: "CANCELLED",
                                            }),
                                          },
                                        );

                                        if (response.ok) {
                                          if (
                                            b.paymentMethod === "UPI" &&
                                            b.paymentStatus === "SUCCESS"
                                          ) {
                                            toast.success(
                                              "Booking cancelled successfully! Payment will be refunded in 5-6 business working days.",
                                            );
                                          } else {
                                            toast.success(
                                              "Booking cancelled successfully!",
                                            );
                                          }
                                          // Refresh the page to show updated data
                                          window.location.reload();
                                        } else {
                                          const error = await response.json();
                                          toast.error(
                                            error.message ||
                                              "Failed to cancel booking",
                                          );
                                        }
                                      } catch (error) {
                                        console.error(
                                          "Error cancelling booking:",
                                          error,
                                        );
                                        toast.error("Failed to cancel booking");
                                      }
                                    }
                                  }}
                                  className="inline-flex items-center text-xs text-red-600 hover:text-red-700"
                                >
                                  Cancel <ArrowRight className="w-3 h-3 ml-1" />
                                </button>
                              );
                            default:
                              return null;
                          }
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <button
                onClick={() => router.push("/user/bookings")}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                View all bookings
              </button>
            </CardFooter>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
              onClick={() => router.push("/user/book")}
              className="group p-5 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-100">
                  <Flame className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Book New Cylinder
                  </h3>
                  <p className="text-sm text-gray-600">
                    Order a new gas cylinder
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => router.push("/user/bookings")}
              className="group p-5 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100">
                  <Calendar className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    View Booking History
                  </h3>
                  <p className="text-sm text-gray-600">
                    Check your past orders
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => router.push("/user/profile/edit")}
              className="group p-5 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all text-left"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-green-50 text-green-600 group-hover:bg-green-100">
                  <User className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Update Profile
                  </h3>
                  <p className="text-sm text-gray-600">
                    Edit your account details
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
