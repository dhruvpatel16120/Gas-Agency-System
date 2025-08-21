"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AdminNavbar from "@/components/AdminNavbar";
import { toast } from "react-hot-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Download, TrendingUp, Users, Package, DollarSign, Clock, AlertCircle, Truck, RefreshCw } from "lucide-react";

type AnalyticsData = {
  overview: {
    totalBookings: number;
    totalRevenue: number;
    totalUsers: number;
    averageDeliveryTime: number;
    pendingBookings: number;
    deliveredBookings: number;
    cancelledBookings: number;
  };
  trends: {
    daily: Array<{ date: string; bookings: number; revenue: number }>;
    weekly: Array<{ week: string; bookings: number; revenue: number }>;
    monthly: Array<{ month: string; bookings: number; revenue: number }>;
  };
  statusDistribution: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  paymentMethods: Array<{ method: string; count: number; percentage: number }>;
  topUsers: Array<{
    userId: string;
    name: string;
    bookings: number;
    totalSpent: number;
  }>;
  deliveryPerformance: {
    averageDeliveryTime: number;
    onTimeDeliveries: number;
    delayedDeliveries: number;
    totalDeliveries: number;
  };
};

type DateRange = "7d" | "30d" | "90d" | "1y" | "custom";

export default function BookingAnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) router.push("/login");
    else if (session.user.role !== "ADMIN") router.push("/user");
  }, [session, status, router]);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ range: dateRange });
      if (dateRange === "custom" && customStartDate && customEndDate) {
        params.set("startDate", customStartDate);
        params.set("endDate", customEndDate);
      }

      const res = await fetch(
        `/api/admin/bookings/analytics?${params.toString()}`,
        { cache: "no-store" },
      );

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(
          "Server returned non-JSON response. Please check if the analytics API is working.",
        );
      }

      const result = await res.json();
      if (res.ok && result.success) {
        setAnalytics(result.data);
      } else {
        throw new Error(result.message || "Failed to load analytics data");
      }
    } catch (error) {
      console.error("Failed to load analytics:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load analytics data",
      );
    } finally {
      setLoading(false);
    }
  }, [dateRange, customStartDate, customEndDate]);

  useEffect(() => {
    if (session?.user?.role === "ADMIN") {
      void loadAnalytics();
    }
  }, [session, loadAnalytics]);

  const exportData = async (format: "csv" | "excel" | "pdf") => {
    setExportLoading(true);
    try {
      const params = new URLSearchParams({
        format,
        range: dateRange,
      });
      if (dateRange === "custom" && customStartDate && customEndDate) {
        params.set("startDate", customStartDate);
        params.set("endDate", customEndDate);
      }

      const res = await fetch(
        `/api/admin/bookings/analytics/export?${params.toString()}`,
      );
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bookings-analytics-${dateRange}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Failed to export data:", error);
      alert("Failed to export data");
    } finally {
      setExportLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-IN").format(num);
  };

  if (status === "loading") return null;
  if (!session || session.user.role !== "ADMIN") return null;

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
                  Booking Analytics
                </h1>
                <p className="text-sm text-gray-600">
                  Comprehensive insights into your booking operations
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => exportData("csv")}
                disabled={exportLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={() => exportData("excel")}
                disabled={exportLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Export Excel
              </button>
            </div>
          </div>

          {/* Date Range Selector */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">
                  Date Range:
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as DateRange)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="1y">Last year</option>
                  <option value="custom">Custom range</option>
                </select>

                {dateRange === "custom" && (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading analytics...</p>
              </div>
            </div>
          ) : !analytics ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Failed to Load Analytics
                </h2>
                <p className="text-gray-600 mb-4">
                  Unable to load analytics data. Please try again later.
                </p>
                <button
                  onClick={loadAnalytics}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Package className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">
                          Total Bookings
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatNumber(analytics.overview.totalBookings)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <DollarSign className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">
                          Total Revenue
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(analytics.overview.totalRevenue)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Users className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">
                          Active Users
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                          {formatNumber(analytics.overview.totalUsers)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Clock className="w-6 h-6 text-yellow-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">
                          Avg Delivery Time
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                          {analytics.overview.averageDeliveryTime} days
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Status Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="w-5 h-5" />
                      Booking Status Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analytics.statusDistribution.map((item) => (
                        <div
                          key={item.status}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                item.status === "PENDING"
                                  ? "bg-yellow-400"
                                  : item.status === "APPROVED"
                                    ? "bg-blue-400"
                                    : item.status === "OUT_FOR_DELIVERY"
                                      ? "bg-purple-400"
                                      : item.status === "DELIVERED"
                                        ? "bg-green-400"
                                        : "bg-red-400"
                              }`}
                            ></div>
                            <span className="text-sm text-gray-700">
                              {item.status}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                              {item.count}
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.percentage}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <RefreshCw className="w-5 h-5" />
                      Payment Methods
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analytics.paymentMethods.map((item) => (
                        <div
                          key={item.method}
                          className="flex items-center justify-between"
                        >
                          <span className="text-sm text-gray-700">
                            {item.method}
                          </span>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                              {item.count}
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.percentage}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="w-5 h-5" />
                      Delivery Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {analytics.deliveryPerformance.onTimeDeliveries}/
                          {analytics.deliveryPerformance.totalDeliveries}
                        </div>
                        <div className="text-sm text-gray-600">
                          On-time deliveries
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>On-time</span>
                          <span className="font-medium text-green-600">
                            {Math.round(
                              (analytics.deliveryPerformance.onTimeDeliveries /
                                analytics.deliveryPerformance.totalDeliveries) *
                                100,
                            )}
                            %
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Delayed</span>
                          <span className="font-medium text-red-600">
                            {Math.round(
                              (analytics.deliveryPerformance.delayedDeliveries /
                                analytics.deliveryPerformance.totalDeliveries) *
                                100,
                            )}
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Top Users */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Top Customers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Customer
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Bookings
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Spent
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Average Order Value
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {analytics.topUsers.map((user) => (
                          <tr key={user.userId} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {user.name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {user.userId}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {user.bookings}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(user.totalSpent)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(user.totalSpent / user.bookings)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Trends Chart Placeholder */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Booking Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <Truck className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>
                        Chart visualization will be implemented with Chart.js or
                        similar library
                      </p>
                      <p className="text-sm">
                        Data available: {analytics.trends.daily.length} daily
                        data points
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
