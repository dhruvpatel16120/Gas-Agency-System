"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AdminNavbar from "@/components/AdminNavbar";
import {
  ArrowLeft,
  Save,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  FileText,
  Calendar,
} from "lucide-react";
import Link from "next/link";

export default function AdjustStockPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: "CORRECTION",
    delta: "",
    reason: "",
    notes: "",
    adjustmentDate: new Date().toISOString().split("T")[0],
  });

  if (status === "loading") return null;
  if (!session || session.user.role !== "ADMIN") return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/admin/inventory/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          delta: parseInt(formData.delta),
        }),
      });

      if (res.ok) {
        router.push("/admin/inventory");
      }
    } catch (error) {
      console.error("Failed to adjust stock:", error);
    } finally {
      setLoading(false);
    }
  };

  const quickAdjustments = [
    { label: "+10", value: 10, type: "positive" },
    { label: "+25", value: 25, type: "positive" },
    { label: "+50", value: 50, type: "positive" },
    { label: "+100", value: 100, type: "positive" },
    { label: "-10", value: -10, type: "negative" },
    { label: "-25", value: -25, type: "negative" },
    { label: "-50", value: -50, type: "negative" },
    { label: "-100", value: -100, type: "negative" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 text-black">
      <AdminNavbar />
      <main className="max-w-4xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link
              href="/admin/inventory"
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Inventory
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Adjust Stock</h1>
              <p className="text-gray-600">
                Make stock adjustments and corrections
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Stock Adjustment
                </h2>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Quick Adjustments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Quick Adjustments
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {quickAdjustments.map((adjustment) => (
                    <button
                      key={adjustment.label}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          delta: adjustment.value.toString(),
                        }))
                      }
                      className={`p-3 rounded-lg border-2 transition-all duration-200 font-medium ${
                        adjustment.type === "positive"
                          ? "border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300"
                          : "border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
                      }`}
                    >
                      {adjustment.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Package className="w-4 h-4 inline mr-2" />
                    Adjustment Type *
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, type: e.target.value }))
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                  >
                    <option value="RECEIVE">Receive (Add Stock)</option>
                    <option value="ISSUE">Issue (Remove Stock)</option>
                    <option value="DAMAGE">Damage (Remove Stock)</option>
                    <option value="AUDIT">Audit Correction</option>
                    <option value="CORRECTION">General Correction</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {parseInt(formData.delta) >= 0 ? (
                      <TrendingUp className="w-4 h-4 inline mr-2 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 inline mr-2 text-red-600" />
                    )}
                    Quantity Change *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.delta}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        delta: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                    placeholder="Enter positive or negative number"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Positive numbers add stock, negative numbers remove stock
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <AlertTriangle className="w-4 h-4 inline mr-2" />
                    Reason *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.reason}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        reason: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                    placeholder="e.g., Purchase, damaged, audit, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Adjustment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.adjustmentDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        adjustmentDate: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="w-4 h-4 inline mr-2" />
                  Additional Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                  placeholder="Additional details about this adjustment..."
                />
              </div>

              {/* Summary */}
              {formData.delta && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-2">
                    Adjustment Summary
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Type:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {formData.type}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Change:</span>
                      <span
                        className={`ml-2 font-medium ${
                          parseInt(formData.delta) >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {parseInt(formData.delta) >= 0 ? "+" : ""}
                        {formData.delta} cylinders
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Reason:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {formData.reason}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Date:</span>
                      <span className="ml-2 font-medium text-gray-900">
                        {formData.adjustmentDate}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => router.push("/admin/inventory")}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !formData.delta || !formData.reason}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors duration-200 font-medium"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Applying...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Apply Adjustment
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
