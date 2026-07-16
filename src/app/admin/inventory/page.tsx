"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AdminNavbar from "@/components/AdminNavbar";
import Link from "next/link";
import {
  Package,
  Plus,
  RefreshCw,
  BarChart3,
  Database,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Settings,
  Edit3,
} from "lucide-react";

type Stock = {
  id: string;
  totalAvailable: number;
  adjustments: {
    id: string;
    delta: number;
    reason?: string | null;
    createdAt: string;
    type?: string;
    batchId?: string | null;
    bookingId?: string | null;
  }[];
};

type CylinderBatch = {
  id: string;
  supplier: string;
  invoiceNo?: string;
  quantity: number;
  receivedAt: string;
  notes?: string;
  status: "ACTIVE" | "DEPLETED" | "EXPIRED";
};

export default function AdminInventoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stock, setStock] = useState<Stock | null>(null);
  const [batches, setBatches] = useState<CylinderBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "stock" | "batches" | "analytics"
  >("overview");
  const [analyticsData, setAnalyticsData] = useState<{
    currentStock: number;
    totalReceived: number;
    totalIssued: number;
    batchStats: Array<{ status: string; count: number; totalQuantity: number }>;
    recentActivity: Array<{
      id: string;
      delta: number;
      type: string;
      reason: string;
      createdAt: string;
      batch?: { supplier: string; quantity: number };
      booking?: { userName: string; quantity: number };
    }>;
  } | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) router.push("/login");
    else if (session.user.role !== "ADMIN") router.push("/user");
  }, [session, status, router]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800 border-green-200";
      case "DEPLETED":
        return "bg-red-100 text-red-800 border-red-200";
      case "EXPIRED":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [stockRes, batchesRes, analyticsRes] = await Promise.all([
        fetch("/api/admin/inventory", { cache: "no-store" }),
        fetch("/api/admin/inventory/batches", { cache: "no-store" }),
        fetch("/api/admin/inventory/analytics", { cache: "no-store" }),
      ]);

      if (stockRes.ok) {
        const stockData = await stockRes.json();
        if (stockData.success) setStock(stockData.data);
      }

      if (batchesRes.ok) {
        const batchesData = await batchesRes.json();
        if (batchesData.success) setBatches(batchesData.data || []);
      }

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        if (analyticsData.success) {
          // Store analytics data for use in the analytics tab
          setAnalyticsData(analyticsData.data);
        }
      }
    } catch (error) {
      console.error("Failed to load inventory data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.role === "ADMIN") void loadData();
  }, [session]);

  if (status === "loading") return null;
  if (!session || session.user.role !== "ADMIN") return null;

  // 1. Stock Gauge Calculation
  const maxCapacity = 500;
  const currentStockVal = stock?.totalAvailable || 0;
  const stockPercentage = Math.min(Math.max((currentStockVal / maxCapacity) * 100, 0), 100);
  const strokeDashoffsetValue = 251.2 - (251.2 * stockPercentage) / 100;

  // 2. Stock Level Trend Chart Calculation
  const trendPoints = (() => {
    if (!stock || !stock.adjustments || stock.adjustments.length === 0) {
      return null;
    }
    let val = stock.totalAvailable;
    const history = [{ val, label: "Current" }];
    const sorted = [...stock.adjustments].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    for (const adj of sorted.slice(0, 9)) {
      val = val - adj.delta;
      history.push({
        val,
        label: new Date(adj.createdAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
      });
    }
    history.reverse();

    const width = 600;
    const height = 180;
    const paddingX = 40;
    const paddingY = 25;

    const values = history.map((h) => h.val);
    const minY = Math.max(0, Math.min(...values) - 5);
    const maxY = Math.max(...values) + 10;
    const yRange = maxY - minY || 1;

    const points = history.map((h, i) => {
      const x = paddingX + (i * (width - 2 * paddingX)) / (history.length - 1);
      const y = height - paddingY - ((h.val - minY) * (height - 2 * paddingY)) / yRange;
      return { x, y, val: h.val, label: h.label };
    });

    const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    const areaPath = points.length > 0 
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(height - paddingY).toFixed(1)} L ${points[0].x.toFixed(1)} ${(height - paddingY).toFixed(1)} Z`
      : "";

    return { points, linePath, areaPath, width, height, paddingX, paddingY, minY, maxY };
  })();

  // 3. Batch Distribution Donut Chart Calculation
  const donutStats = (() => {
    if (!analyticsData || !analyticsData.batchStats || analyticsData.batchStats.length === 0) {
      return [];
    }
    const total = analyticsData.batchStats.reduce((sum, s) => sum + s.count, 0);
    let accumulated = 0;
    return analyticsData.batchStats.map((s) => {
      const percentage = total > 0 ? (s.count / total) * 100 : 0;
      const start = accumulated;
      accumulated += percentage;
      
      let strokeColor = "#a855f7"; // Purple (ACTIVE)
      if (s.status === "DEPLETED") strokeColor = "#ef4444"; // Red
      if (s.status === "EXPIRED") strokeColor = "#f97316"; // Orange

      return {
        ...s,
        percentage,
        start,
        strokeColor,
        dashArray: `${(percentage * 3.1416).toFixed(2)} 314.16`,
        dashOffset: `${(-(start * 3.1416)).toFixed(2)}`,
      };
    });
  })();

  // 4. Monthly Received vs Issued Bar Chart
  const barChartData = (() => {
    if (!stock || !stock.adjustments) return null;
    
    const months: Record<string, { received: number; issued: number }> = {};
    const sorted = [...stock.adjustments].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    sorted.forEach((adj) => {
      const date = new Date(adj.createdAt);
      const key = date.toLocaleString("en-US", { month: "short", year: "2-digit" });
      if (!months[key]) {
        months[key] = { received: 0, issued: 0 };
      }
      if (adj.delta > 0) {
        months[key].received += adj.delta;
      } else {
        months[key].issued += Math.abs(adj.delta);
      }
    });

    const items = Object.entries(months).slice(-6).map(([label, val]) => ({
      label,
      received: val.received,
      issued: val.issued,
    }));

    if (items.length === 0) return null;

    const width = 600;
    const height = 200;
    const paddingX = 40;
    const paddingY = 30;

    const maxVal = Math.max(...items.flatMap((item) => [item.received, item.issued]), 20);
    const chartHeight = height - 2 * paddingY;
    const barAreaWidth = (width - 2 * paddingX) / items.length;
    
    const bars = items.map((item, index) => {
      const xStart = paddingX + index * barAreaWidth;
      const receivedHeight = (item.received / maxVal) * chartHeight;
      const issuedHeight = (item.issued / maxVal) * chartHeight;
      
      const receivedBar = {
        x: xStart + barAreaWidth * 0.15,
        y: height - paddingY - receivedHeight,
        w: barAreaWidth * 0.3,
        h: receivedHeight,
      };
      
      const issuedBar = {
        x: xStart + barAreaWidth * 0.5,
        y: height - paddingY - issuedHeight,
        w: barAreaWidth * 0.3,
        h: issuedHeight,
      };

      return {
        label: item.label,
        receivedBar,
        issuedBar,
        receivedVal: item.received,
        issuedVal: item.issued,
        xLabel: xStart + barAreaWidth / 2,
      };
    });

    return { bars, width, height, paddingX, paddingY, maxVal };
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 text-black">
      <AdminNavbar />
      <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  Inventory Management
                </h1>
                <p className="text-lg text-gray-600">
                  Comprehensive cylinder stock management and delivery tracking
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={loadData}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
                <Link
                  href="/admin/inventory/new-batch"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-all duration-200 shadow-sm hover:shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  New Batch
                </Link>
                <Link
                  href="/admin/inventory/adjust-stock"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-lg"
                >
                  <Settings className="w-4 h-4" />
                  Adjust Stock
                </Link>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12 mb-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              <span className="ml-4 text-gray-500">
                Loading inventory data...
              </span>
            </div>
          )}

          {/* Stats Overview */}
          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                {
                  title: "Total Available",
                  value: stock?.totalAvailable || 0,
                  icon: Package,
                  color: "from-blue-500 to-blue-600",
                  bgColor: "bg-blue-50",
                  textColor: "text-blue-700",
                },
                {
                  title: "Active Batches",
                  value: batches.filter((b) => b.status === "ACTIVE").length,
                  icon: Database,
                  color: "from-green-500 to-green-600",
                  bgColor: "bg-green-50",
                  textColor: "text-green-700",
                },
                {
                  title: "Total Received",
                  value:
                    stock?.adjustments
                      ?.filter((a) => a.delta > 0)
                      .reduce((sum, a) => sum + a.delta, 0) || 0,
                  icon: TrendingUp,
                  color: "from-green-500 to-green-600",
                  bgColor: "bg-green-50",
                  textColor: "text-green-700",
                },
                {
                  title: "Total Issued",
                  value: Math.abs(
                    stock?.adjustments
                      ?.filter((a) => a.delta < 0)
                      .reduce((sum, a) => sum + a.delta, 0) || 0,
                  ),
                  icon: TrendingDown,
                  color: "from-red-500 to-red-600",
                  bgColor: "bg-red-50",
                  textColor: "text-red-700",
                },
              ].map((stat, idx) => (
                <div
                  key={idx}
                  className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        {stat.title}
                      </p>
                      <p className="text-3xl font-bold text-gray-900">
                        {stat.value}
                      </p>
                    </div>
                    <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                      <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
                    </div>
                  </div>
                  <div
                    className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-5 rounded-full -translate-y-16 translate-x-16`}
                  ></div>
                </div>
              ))}
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-8">
            <div className="border-b border-gray-100">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: "overview", label: "Overview", icon: BarChart3 },
                  { id: "stock", label: "Stock Management", icon: Package },
                  { id: "batches", label: "Batches", icon: Database },

                  { id: "analytics", label: "Analytics", icon: TrendingUp },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() =>
                      setActiveTab(
                        tab.id as
                          | "overview"
                          | "stock"
                          | "batches"
                          | "analytics",
                      )
                    }
                    className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                      activeTab === tab.id
                        ? "border-purple-500 text-purple-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === "overview" && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Stock Status & Gauge */}
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex flex-col justify-between shadow-sm">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          Stock Status
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                          Current available gas cylinders
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-around my-2">
                        {/* SVG Gauge */}
                        <div className="relative w-32 h-32 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            {/* Track Circle */}
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              className="stroke-gray-200"
                              strokeWidth="8"
                              fill="transparent"
                            />
                            {/* Value Circle */}
                            <circle
                              cx="50"
                              cy="50"
                              r="40"
                              className="stroke-purple-600 transition-all duration-1000 ease-out"
                              strokeWidth="8"
                              fill="transparent"
                              strokeDasharray="251.2"
                              strokeDashoffset={strokeDashoffsetValue}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute text-center">
                            <span className="text-2xl font-bold text-gray-900 block">
                              {currentStockVal}
                            </span>
                            <span className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">
                              / {maxCapacity} Max
                            </span>
                          </div>
                        </div>

                        {/* Legends */}
                        <div className="text-sm">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="w-3 h-3 rounded-full bg-purple-600 inline-block"></span>
                            <span className="text-gray-600">Available ({stockPercentage.toFixed(0)}%)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-gray-200 inline-block"></span>
                            <span className="text-gray-600">Empty ({(100 - stockPercentage).toFixed(0)}%)</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-150">
                        {stock && stock.totalAvailable < 50 ? (
                          <div className="flex items-center gap-2 text-orange-600 text-sm font-medium">
                            <AlertTriangle className="w-4 h-4" />
                            Low stock alert - Consider replenishing
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                            <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                            Stock levels are healthy
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 lg:col-span-2 shadow-sm">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Recent Activity
                      </h3>
                      <div className="space-y-3.5 max-h-48 overflow-y-auto pr-1">
                        {stock?.adjustments && stock.adjustments.length > 0 ? (
                          stock.adjustments.slice(0, 5).map((adjustment) => (
                            <div
                              key={adjustment.id}
                              className="flex items-center justify-between text-sm p-2 bg-white rounded-xl border border-gray-50 hover:shadow-sm transition-all duration-200"
                            >
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold ${
                                    adjustment.delta > 0
                                      ? "bg-green-50 text-green-700 border border-green-100"
                                      : "bg-red-50 text-red-700 border border-red-100"
                                  }`}
                                >
                                  {adjustment.delta > 0 ? "+" : ""}
                                  {adjustment.delta}
                                </span>
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {adjustment.reason || "Stock adjustment"}
                                  </p>
                                  <p className="text-[10px] text-gray-500">
                                    {adjustment.type || "CORRECTION"}
                                  </p>
                                </div>
                              </div>
                              <span className="text-xs text-gray-500 font-medium">
                                {new Date(adjustment.createdAt).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-10 text-gray-400 text-sm">
                            No adjustments logged yet.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stock Level Trend Chart */}
                  {trendPoints && trendPoints.points.length > 1 && (
                    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            Stock Level Trend
                          </h3>
                          <p className="text-sm text-gray-500">
                            Cylinder availability over the last 10 adjustments
                          </p>
                        </div>
                      </div>

                      <div className="w-full overflow-x-auto pt-2">
                        <svg className="w-full h-auto min-w-[600px]" viewBox={`0 0 ${trendPoints.width} ${trendPoints.height}`}>
                          <defs>
                            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.25" />
                              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Grid Lines */}
                          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                            const y = trendPoints.paddingY + ratio * (trendPoints.height - 2 * trendPoints.paddingY);
                            const val = trendPoints.maxY - ratio * (trendPoints.maxY - trendPoints.minY);
                            return (
                              <g key={index} className="opacity-40">
                                <line
                                  x1={trendPoints.paddingX}
                                  y1={y}
                                  x2={trendPoints.width - trendPoints.paddingX}
                                  y2={y}
                                  stroke="#e5e7eb"
                                  strokeDasharray="4 4"
                                />
                                <text
                                  x={trendPoints.paddingX - 10}
                                  y={y + 4}
                                  className="text-[10px] fill-gray-400 font-medium text-right"
                                  textAnchor="end"
                                >
                                  {val.toFixed(0)}
                                </text>
                              </g>
                            );
                          })}

                          {/* Area Fill */}
                          {trendPoints.areaPath && (
                            <path d={trendPoints.areaPath} fill="url(#trendGrad)" />
                          )}

                          {/* Trend Line */}
                          {trendPoints.linePath && (
                            <path
                              d={trendPoints.linePath}
                              fill="none"
                              stroke="#a855f7"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          )}

                          {/* Points & Labels */}
                          {trendPoints.points.map((p, index) => (
                            <g key={index} className="group cursor-pointer">
                              {/* Glowing Dot on Hover */}
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r="7"
                                fill="#a855f7"
                                className="opacity-0 group-hover:opacity-20 transition-all duration-200"
                              />
                              {/* Center Dot */}
                              <circle
                                cx={p.x}
                                cy={p.y}
                                r="4"
                                fill="#fff"
                                stroke="#a855f7"
                                strokeWidth="2.5"
                              />
                              {/* Value Label */}
                              <text
                                x={p.x}
                                y={p.y - 10}
                                className="text-[10px] font-bold fill-purple-700 opacity-0 group-hover:opacity-100 transition-all duration-200 text-center"
                                textAnchor="middle"
                              >
                                {p.val}
                              </text>
                              {/* X Axis Date Label */}
                              <text
                                x={p.x}
                                y={trendPoints.height - 8}
                                className="text-[9px] fill-gray-400 font-medium text-center"
                                textAnchor="middle"
                              >
                                {p.label}
                              </text>
                            </g>
                          ))}
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Stock Management Tab */}
              {activeTab === "stock" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Stock Adjustments
                    </h3>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {stock?.totalAvailable || 0}
                        </div>
                        <div className="text-sm text-gray-600">
                          Current Stock
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {stock?.adjustments
                            ?.filter((a) => a.delta > 0)
                            .reduce((sum, a) => sum + a.delta, 0) || 0}
                        </div>
                        <div className="text-sm text-gray-600">
                          Total Received
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {Math.abs(
                            stock?.adjustments
                              ?.filter((a) => a.delta < 0)
                              .reduce((sum, a) => sum + a.delta, 0) || 0,
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          Total Issued
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stock History */}
                  <div className="bg-white rounded-xl border border-gray-200">
                    <div className="p-4 border-b border-gray-200">
                      <h4 className="font-semibold text-gray-900">
                        Adjustment History
                      </h4>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {stock?.adjustments?.map((adjustment) => (
                        <div
                          key={adjustment.id}
                          className="p-4 border-b border-gray-100 hover:bg-gray-50"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                  adjustment.delta > 0
                                    ? "bg-green-100 text-green-800 border-green-200"
                                    : "bg-red-100 text-red-800 border-red-200"
                                }`}
                              >
                                {adjustment.delta > 0 ? "+" : ""}
                                {adjustment.delta}
                              </span>
                              <div>
                                <div className="font-medium text-gray-900">
                                  {adjustment.reason || "Stock adjustment"}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {adjustment.type || "CORRECTION"}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-900">
                                {new Date(
                                  adjustment.createdAt,
                                ).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(
                                  adjustment.createdAt,
                                ).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Batches Tab */}
              {activeTab === "batches" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Cylinder Batches
                    </h3>
                  </div>

                  {batches.length === 0 ? (
                    <div className="text-center py-12">
                      <Database className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No batches found
                      </h3>
                      <p className="text-gray-500 mb-6">
                        Get started by adding your first cylinder batch
                      </p>
                      <Link
                        href="/admin/inventory/new-batch"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
                      >
                        <Plus className="w-4 h-4" />
                        Add First Batch
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {batches.map((batch) => (
                        <div
                          key={batch.id}
                          className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow duration-200"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {batch.supplier}
                              </h4>
                              <p className="text-sm text-gray-500">
                                {batch.invoiceNo || "No invoice"}
                              </p>
                            </div>
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(batch.status)}`}
                            >
                              {batch.status}
                            </span>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Quantity:</span>
                              <span className="font-medium text-gray-900">
                                {batch.quantity}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Received:</span>
                              <span className="font-medium text-gray-900">
                                {new Date(
                                  batch.receivedAt,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                            {batch.notes && (
                              <div className="text-gray-600 italic">
                                &ldquo;{batch.notes}&rdquo;
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                            <Link
                              href={`/admin/inventory/edit-batch/${batch.id}`}
                              className="flex-1 px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors duration-200 text-center"
                            >
                              <Edit3 className="w-3 h-3 mr-1 inline" />
                              Edit
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Analytics Tab */}
              {activeTab === "analytics" && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Inventory Analytics
                      </h3>
                      <p className="text-sm text-gray-500">
                        Detailed trends, batch allocations, and distribution analysis
                      </p>
                    </div>
                  </div>

                  {!analyticsData ? (
                    <div className="text-center py-12">
                      <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4 animate-pulse" />
                      <p className="text-gray-500 font-medium">Loading analytics data...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Monthly Trends (Grouped Bar Chart) */}
                      <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-sm flex flex-col justify-between">
                        <div className="mb-4">
                          <h4 className="font-semibold text-gray-900 text-base">
                            Monthly Received vs Issued
                          </h4>
                          <p className="text-xs text-gray-500">
                            Comparison of monthly cylinder receipts and issues
                          </p>
                        </div>

                        {barChartData && barChartData.bars.length > 0 ? (
                          <div className="w-full overflow-x-auto">
                            <svg className="w-full h-auto min-w-[500px]" viewBox={`0 0 ${barChartData.width} ${barChartData.height}`}>
                              {/* Grid Lines */}
                              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                                const y = barChartData.paddingY + ratio * (barChartData.height - 2 * barChartData.paddingY);
                                const val = barChartData.maxVal - ratio * barChartData.maxVal;
                                return (
                                  <g key={idx} className="opacity-40">
                                    <line
                                      x1={barChartData.paddingX}
                                      y1={y}
                                      x2={barChartData.width - barChartData.paddingX}
                                      y2={y}
                                      stroke="#f3f4f6"
                                    />
                                    <text
                                      x={barChartData.paddingX - 8}
                                      y={y + 3}
                                      className="text-[9px] fill-gray-400 font-semibold"
                                      textAnchor="end"
                                    >
                                      {val.toFixed(0)}
                                    </text>
                                  </g>
                                );
                              })}

                              {/* Bars */}
                              {barChartData.bars.map((bar, index) => (
                                <g key={index} className="group">
                                  {/* Received Bar */}
                                  <rect
                                    x={bar.receivedBar.x}
                                    y={bar.receivedBar.y}
                                    width={bar.receivedBar.w}
                                    height={Math.max(bar.receivedBar.h, 2)}
                                    rx="2"
                                    fill="#10b981"
                                    className="hover:opacity-90 transition-all duration-200 cursor-pointer"
                                  />
                                  {/* Received Value Label */}
                                  <text
                                    x={bar.receivedBar.x + bar.receivedBar.w / 2}
                                    y={bar.receivedBar.y - 6}
                                    className="text-[9px] font-bold fill-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                    textAnchor="middle"
                                  >
                                    {bar.receivedVal}
                                  </text>

                                  {/* Issued Bar */}
                                  <rect
                                    x={bar.issuedBar.x}
                                    y={bar.issuedBar.y}
                                    width={bar.issuedBar.w}
                                    height={Math.max(bar.issuedBar.h, 2)}
                                    rx="2"
                                    fill="#f43f5e"
                                    className="hover:opacity-90 transition-all duration-200 cursor-pointer"
                                  />
                                  {/* Issued Value Label */}
                                  <text
                                    x={bar.issuedBar.x + bar.issuedBar.w / 2}
                                    y={bar.issuedBar.y - 6}
                                    className="text-[9px] font-bold fill-rose-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                    textAnchor="middle"
                                  >
                                    {bar.issuedVal}
                                  </text>

                                  {/* X Axis Month Label */}
                                  <text
                                    x={bar.xLabel}
                                    y={barChartData.height - 8}
                                    className="text-[10px] fill-gray-400 font-semibold"
                                    textAnchor="middle"
                                  >
                                    {bar.label}
                                  </text>
                                </g>
                              ))}
                            </svg>
                          </div>
                        ) : (
                          <div className="text-center py-10 text-gray-400 text-sm">
                            Insufficient trend data.
                          </div>
                        )}

                        <div className="flex items-center gap-6 mt-4 justify-center text-xs">
                          <div className="flex items-center gap-1.5 font-medium text-gray-600">
                            <span className="w-3 h-3 rounded bg-emerald-500"></span>
                            Received ({analyticsData.totalReceived} total)
                          </div>
                          <div className="flex items-center gap-1.5 font-medium text-gray-600">
                            <span className="w-3 h-3 rounded bg-rose-500"></span>
                            Issued ({analyticsData.totalIssued} total)
                          </div>
                        </div>
                      </div>

                      {/* Batch Status Donut Chart */}
                      <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-sm flex flex-col justify-between">
                        <div className="mb-4">
                          <h4 className="font-semibold text-gray-900 text-base">
                            Batch Status Distribution
                          </h4>
                          <p className="text-xs text-gray-500">
                            Allocation of cylinder batches by active status
                          </p>
                        </div>

                        {donutStats && donutStats.length > 0 ? (
                          <div className="flex flex-col sm:flex-row items-center justify-around my-2 gap-4">
                            {/* SVG Donut Chart */}
                            <div className="relative w-40 h-40 flex items-center justify-center">
                              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                                <circle
                                  cx="60"
                                  cy="60"
                                  r="50"
                                  fill="transparent"
                                  stroke="#f3f4f6"
                                  strokeWidth="10"
                                />
                                {donutStats.map((segment, idx) => (
                                  <circle
                                    key={idx}
                                    cx="60"
                                    cy="60"
                                    r="50"
                                    fill="transparent"
                                    stroke={segment.strokeColor}
                                    strokeWidth="10"
                                    strokeDasharray={segment.dashArray}
                                    strokeDashoffset={segment.dashOffset}
                                    className="transition-all duration-500"
                                    strokeLinecap="round"
                                  />
                                ))}
                              </svg>
                              <div className="absolute text-center">
                                <span className="text-2xl font-bold text-gray-900 block">
                                  {donutStats.reduce((sum, s) => sum + s.count, 0)}
                                </span>
                                <span className="text-[10px] uppercase font-semibold text-gray-500 tracking-wider">
                                  Total Batches
                                </span>
                              </div>
                            </div>

                            {/* Detailed batch statuses */}
                            <div className="space-y-3.5 w-full sm:w-1/2">
                              {donutStats.map((stat, idx) => (
                                <div key={idx} className="flex flex-col p-2 bg-gray-50 rounded-xl hover:shadow-sm transition-all duration-200">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
                                      <span
                                        className="w-2.5 h-2.5 rounded-full inline-block"
                                        style={{ backgroundColor: stat.strokeColor }}
                                      ></span>
                                      {stat.status}
                                    </span>
                                    <span className="text-xs font-bold text-gray-900">
                                      {stat.count} ({stat.percentage.toFixed(0)}%)
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-gray-500 pl-4">
                                    {stat.totalQuantity} cylinders allocated
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-10 text-gray-400 text-sm">
                            No batches registered.
                          </div>
                        )}
                        
                        <div className="pt-2 text-center text-xs text-purple-600 font-medium">
                          Active stock: {analyticsData.currentStock} cylinders available
                        </div>
                      </div>

                      {/* Recent Activity Log */}
                      <div className="bg-white rounded-2xl border border-gray-150 p-6 lg:col-span-2 shadow-sm">
                        <h4 className="font-semibold text-gray-900 text-base mb-4">
                          Detailed Adjustment History
                        </h4>
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                          {analyticsData.recentActivity && analyticsData.recentActivity.length > 0 ? (
                            analyticsData.recentActivity.map((activity) => (
                              <div
                                key={activity.id}
                                className="flex items-center justify-between p-3 bg-gray-50 hover:bg-white border border-gray-100 hover:shadow-sm rounded-xl transition-all duration-250"
                              >
                                <div className="flex items-center gap-3">
                                  <span
                                    className={`inline-flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold ${
                                      activity.delta > 0
                                        ? "bg-green-50 text-green-700 border border-green-150"
                                        : "bg-red-50 text-red-700 border border-red-150"
                                    }`}
                                  >
                                    {activity.delta > 0 ? "+" : ""}
                                    {activity.delta}
                                  </span>
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">
                                      {activity.reason}
                                    </p>
                                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                                      <span className="px-1.5 py-0.5 bg-gray-200/50 rounded font-medium text-[10px]">
                                        {activity.type}
                                      </span>
                                      {activity.batch && (
                                        <span>• Supplier: {activity.batch.supplier}</span>
                                      )}
                                      {activity.booking && (
                                        <span>• Customer: {activity.booking.userName}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <span className="text-xs text-gray-400 font-semibold text-right">
                                  <div>
                                    {new Date(activity.createdAt).toLocaleDateString(undefined, {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}
                                  </div>
                                  <div className="text-[10px] text-gray-400 mt-0.5">
                                    {new Date(activity.createdAt).toLocaleTimeString()}
                                  </div>
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-10 text-gray-400 text-sm">
                              No recent activity logged.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
