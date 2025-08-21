"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AdminNavbar from "@/components/AdminNavbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";

export default function NewDeliveryPartnerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) router.push("/login");
    else if (session.user.role !== "ADMIN") router.push("/user");
  }, [session, status, router]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") || ""),
      phone: String(fd.get("phone") || ""),
      email: String(fd.get("email") || ""),
      vehicleNumber: String(fd.get("vehicleNumber") || ""),
      serviceArea: String(fd.get("serviceArea") || ""),
      capacityPerDay: Number(fd.get("capacityPerDay") || 20),
      isActive: String(fd.get("isActive") || "") === "on",
    };
    try {
      const res = await fetch("/api/admin/deliveries/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message || "Failed to create");
        return;
      }
      router.push("/admin/deliveries");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading") return null;
  if (!session || session.user.role !== "ADMIN") return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-gray-900">
              New Delivery Partner
            </h2>
          </div>
          <Card className="border-purple-200">
            <CardHeader className="p-4 border-b bg-gradient-to-r from-gray-50 to-white rounded-t-xl">
              <CardTitle>Partner Details</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {error && (
                <div className="mb-3 rounded border border-red-200 bg-red-50 text-red-700 p-2 text-sm">
                  {error}
                </div>
              )}
              <form
                onSubmit={onSubmit}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div>
                  <label className="text-sm text-gray-600">Name</label>
                  <input
                    name="name"
                    required
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Phone</label>
                  <input
                    name="phone"
                    required
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">
                    Email (optional)
                  </label>
                  <input
                    name="email"
                    type="email"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Vehicle No.</label>
                  <input
                    name="vehicleNumber"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Service Area</label>
                  <input
                    name="serviceArea"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">
                    Capacity / Day
                  </label>
                  <input
                    name="capacityPerDay"
                    type="number"
                    min={1}
                    defaultValue={20}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div className="md:col-span-2 flex items-center gap-2">
                  <input
                    id="isActive"
                    name="isActive"
                    type="checkbox"
                    defaultChecked
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-700">
                    Active
                  </label>
                </div>
                <div className="md:col-span-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="border rounded px-4 py-2 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={saving}
                    className="bg-purple-600 text-white rounded px-4 py-2 disabled:opacity-50"
                  >
                    {saving ? "Creating..." : "Create Partner"}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
