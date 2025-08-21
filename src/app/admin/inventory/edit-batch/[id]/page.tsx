"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import AdminNavbar from "@/components/AdminNavbar";
import {
  ArrowLeft,
  Save,
  Trash2,
  Package,
  FileText,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";

export default function EditBatchPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const batchId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    supplier: "",
    invoiceNo: "",
    quantity: "",
    notes: "",
    receivedAt: new Date().toISOString().split("T")[0],
    status: "ACTIVE",
  });

  const loadBatch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/inventory/batches/${batchId}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const batch = data.data;
          setFormData({
            supplier: batch.supplier || "",
            invoiceNo: batch.invoiceNo || "",
            quantity: batch.quantity?.toString() || "",
            notes: batch.notes || "",
            receivedAt: batch.receivedAt
              ? new Date(batch.receivedAt).toISOString().split("T")[0]
              : "",
            status: batch.status || "ACTIVE",
          });
        }
      }
    } catch (error) {
      console.error("Failed to load batch:", error);
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    if (batchId) {
      loadBatch();
    }
  }, [batchId, loadBatch]);

  if (status === "loading") return null;
  if (!session || session.user.role !== "ADMIN") return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/admin/inventory/batches/${batchId}`, {
        method: "PUT",
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
      console.error("Failed to update batch:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this batch?")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/inventory/batches/${batchId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.push("/admin/inventory");
      }
    } catch (error) {
      console.error("Failed to delete batch:", error);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30 text-black">
        <AdminNavbar />
        <main className="max-w-4xl mx-auto py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            <span className="ml-4 text-gray-500">Loading batch...</span>
          </div>
        </main>
      </div>
    );
  }

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
              <h1 className="text-3xl font-bold text-gray-900">Edit Batch</h1>
              <p className="text-gray-600">
                Update batch information and status
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Batch Details
                </h2>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Package className="w-4 h-4 inline mr-2" />
                    Supplier *
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
                    placeholder="Supplier name"
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <AlertTriangle className="w-4 h-4 inline mr-2" />
                    Status *
                  </label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: e.target.value as
                          | "ACTIVE"
                          | "DEPLETED"
                          | "EXPIRED",
                      }))
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="DEPLETED">Depleted</option>
                    <option value="EXPIRED">Expired</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="w-4 h-4 inline mr-2" />
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                  placeholder="Additional notes about this batch..."
                />
              </div>

              <div className="flex items-center gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors duration-200 font-medium"
                >
                  {deleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Batch
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/admin/inventory")}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 font-medium"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || !formData.supplier || !formData.quantity}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors duration-200 font-medium"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
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
