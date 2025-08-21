"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AdminNavbar from "@/components/AdminNavbar";
import {
  ArrowLeft,
  Save,
  Package,
  User,
  FileText,
  MessageSquare,
  Calendar,
} from "lucide-react";
import Link from "next/link";

export default function NewBatchPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    supplier: "",
    invoiceNo: "",
    quantity: "",
    notes: "",
    receivedAt: new Date().toISOString().split("T")[0],
  });

  if (status === "loading") return null;
  if (!session || session.user.role !== "ADMIN") return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/admin/inventory/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity),
        }),
      });

      if (res.ok) {
        router.push("/admin/inventory");
      }
    } catch (error) {
      console.error("Failed to create batch:", error);
    } finally {
      setLoading(false);
    }
  };

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
              <h1 className="text-3xl font-bold text-gray-900">
                Add New Batch
              </h1>
              <p className="text-gray-600">
                Create a new cylinder batch record
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Batch Information
                </h2>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    Supplier Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.supplier}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        supplier: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                    placeholder="Enter supplier name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <FileText className="w-4 h-4 inline mr-2" />
                    Invoice Number
                  </label>
                  <input
                    type="text"
                    value={formData.invoiceNo}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        invoiceNo: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                    placeholder="Invoice number (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Package className="w-4 h-4 inline mr-2" />
                    Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        quantity: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                    placeholder="Number of cylinders"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Received Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.receivedAt}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        receivedAt: e.target.value,
                      }))
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MessageSquare className="w-4 h-4 inline mr-2" />
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  rows={4}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                  placeholder="Additional notes about this batch..."
                />
              </div>

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
                  disabled={loading || !formData.supplier || !formData.quantity}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors duration-200 font-medium"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Create Batch
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
