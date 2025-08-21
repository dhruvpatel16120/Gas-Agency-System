"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AdminNavbar from "@/components/AdminNavbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import Link from "next/link";
import { TrendingUp, TrendingDown, Clock, CheckCircle, Truck, Users, Download, RefreshCw } from "lucide-react";

type AnalyticsData = {
  overview: {
    totalDeliveries: number;
    completedDeliveries: number;
    failedDeliveries: number;
    averageDeliveryTime: number;
    successRate: number;
    totalPartners: number;
    activePartners: number;
  };
  timeSeries: Array<{
    date: string;
    deliveries: number;
    completed: number;
    failed: number;
  }>;
  partnerPerformance: Array<{
    partnerId: string;
    partnerName: string;
    totalDeliveries: number;
    completedDeliveries: number;
    averageDeliveryTime: number;
    successRate: number;
    rating: number;
  }>;
  areaStats: Array<{
    area: string;
    totalDeliveries: number;
    averageDeliveryTime: number;
    successRate: number;
    activePartners: number;
  }>;
  recentTrends: {
    weeklyGrowth: number;
    monthlyGrowth: number;
    topPerformingAreas: string[];
    improvementAreas: string[];
  };
};

type FilterOptions = {
  period: string;
  partnerId: string;
  area: string;
};

export default function DeliveryAnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>({
    period: "30d",
    partnerId: "",
    area: "",
  });

  useEffect(() => {
    if (status === "loading") return;
    if (!session) router.push("/login");
    else if (session.user.role !== "ADMIN") router.push("/user");
  }, [session, status, router]);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        period: filters.period,
        ...(filters.partnerId && { partnerId: filters.partnerId }),
        ...(filters.area && { area: filters.area }),
      });

      const res = await fetch(
        `/api/admin/deliveries/analytics?${queryParams}`,
        { cache: "no-store" },
      );
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (session?.user?.role === "ADMIN") {
      void loadAnalytics();
    }
  }, [session, loadAnalytics]);

  // duplicate removed; using the memoized loadAnalytics above

  const exportData = async () => {
    try {
      const res = await fetch("/api/admin/deliveries/analytics/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filters),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `delivery-analytics-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Error exporting data:", error);
      alert("Failed to export data");
    }
  };

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? "text-green-600" : "text-red-600";
  };

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? (
      <TrendingUp className="w-4 h-4" />
    ) : (
      <TrendingDown className="w-4 h-4" />
    );
  };

  if (status === "loading") return null;
  if (!session || session.user.role !== "ADMIN") return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Delivery Analytics
              </h1>
              <p className="text-gray-600 mt-2">
                Performance metrics and insights for delivery operations
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={exportData}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export Data
              </button>
              <button
                onClick={loadAnalytics}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
              <Link
                href="/admin/deliveries"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Dashboard
              </Link>
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time Period
                  </label>
                  <select
                    value={filters.period}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        period: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="90d">Last 90 Days</option>
                    <option value="1y">Last Year</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Partner
                  </label>
                  <select
                    value={filters.partnerId}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        partnerId: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Partners</option>
                    {Array.isArray(analytics?.partnerPerformance) &&
                      analytics.partnerPerformance.map((partner) => (
                        <option
                          key={partner.partnerId}
                          value={partner.partnerId}
                        >
                          {partner.partnerName}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Area
                  </label>
                  <select
                    value={filters.area}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, area: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All Areas</option>
                    {Array.isArray(analytics?.areaStats) &&
                      analytics.areaStats.map((area) => (
                        <option key={area.area} value={area.area}>
                          {area.area}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Overview Stats */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : analytics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Total Deliveries
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analytics.overview.totalDeliveries}
                      </p>
                    </div>
                    <Truck className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Success Rate
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analytics.overview.successRate}%
                      </p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Avg Delivery Time
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analytics.overview.averageDeliveryTime}h
                      </p>
                    </div>
                    <Clock className="w-8 h-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Active Partners
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {analytics.overview.activePartners}
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {/* Growth Trends */}
          {analytics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Growth Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Weekly Growth
                      </span>
                      <div
                        className={`flex items-center gap-1 ${getGrowthColor(analytics.recentTrends.weeklyGrowth)}`}
                      >
                        {getGrowthIcon(analytics.recentTrends.weeklyGrowth)}
                        <span className="font-medium">
                          {analytics.recentTrends.weeklyGrowth}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Monthly Growth
                      </span>
                      <div
                        className={`flex items-center gap-1 ${getGrowthColor(analytics.recentTrends.monthlyGrowth)}`}
                      >
                        {getGrowthIcon(analytics.recentTrends.monthlyGrowth)}
                        <span className="font-medium">
                          {analytics.recentTrends.monthlyGrowth}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Top Performing Areas
                      </h4>
                      <div className="space-y-1">
                        {Array.isArray(
                          analytics.recentTrends.topPerformingAreas,
                        ) &&
                          analytics.recentTrends.topPerformingAreas.map(
                            (area, index) => (
                              <div
                                key={index}
                                className="text-sm text-gray-600 flex items-center gap-2"
                              >
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                {area}
                              </div>
                            ),
                          )}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Areas for Improvement
                      </h4>
                      <div className="space-y-1">
                        {Array.isArray(
                          analytics.recentTrends.improvementAreas,
                        ) &&
                          analytics.recentTrends.improvementAreas.map(
                            (area, index) => (
                              <div
                                key={index}
                                className="text-sm text-gray-600 flex items-center gap-2"
                              >
                                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                                {area}
                              </div>
                            ),
                          )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Partner Performance */}
          {analytics && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Partner Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Partner
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Deliveries
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Success Rate
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Avg Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rating
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Array.isArray(analytics.partnerPerformance) &&
                        analytics.partnerPerformance.map((partner) => (
                          <tr
                            key={partner.partnerId}
                            className="hover:bg-gray-50"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {partner.partnerName}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {partner.totalDeliveries}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {partner.successRate}%
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {partner.averageDeliveryTime}h
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {partner.rating.toFixed(1)}/5.0
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Area Statistics */}
          {analytics && (
            <Card>
              <CardHeader>
                <CardTitle>Service Area Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.isArray(analytics.areaStats) &&
                    analytics.areaStats.map((area) => (
                      <div key={area.area} className="border rounded-lg p-4">
                        <h3 className="font-semibold text-gray-900 mb-3">
                          {area.area}
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              Total Deliveries:
                            </span>
                            <span className="font-medium">
                              {area.totalDeliveries}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Success Rate:</span>
                            <span className="font-medium">
                              {area.successRate}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Avg Time:</span>
                            <span className="font-medium">
                              {area.averageDeliveryTime}h
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">
                              Active Partners:
                            </span>
                            <span className="font-medium">
                              {area.activePartners}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
