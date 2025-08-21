"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import AdminNavbar from "@/components/AdminNavbar";
import { toast } from "react-hot-toast";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { ArrowLeft, Save, User, Package, CheckCircle } from "lucide-react";

type User = {
  id: string;
  name: string;
  email: string;
  userId: string;
  phone: string;
  address: string;
  remainingQuota: number;
};

export default function NewBookingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  // Form fields
  const [formData, setFormData] = useState({
    quantity: 1,
    paymentMethod: "COD" as "COD" | "UPI",
    receiverName: "",
    receiverPhone: "",
    expectedDate: "",
    notes: "",
    deliveryAddress: "",
  });

  useEffect(() => {
    if (status === "loading") return;
    if (!session) router.push("/login");
    else if (session.user.role !== "ADMIN") router.push("/user");
  }, [session, status, router]);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users?limit=1000", {
        cache: "no-store",
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setUsers(result.data.data);
        setFilteredUsers(result.data.data);
      }
    } catch (error) {
      console.error("Failed to load users:", error);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.role === "ADMIN") {
      void loadUsers();
    }
  }, [session, loadUsers]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(
        (user) =>
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.phone.includes(searchQuery) ||
          user.userId.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setSelectedUserId(user.id);
    setFormData((prev) => ({
      ...prev,
      deliveryAddress: user.address,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) {
      toast.error("Please select a user first");
      return;
    }

    if (formData.quantity > selectedUser.remainingQuota) {
      toast.error(
        `User only has ${selectedUser.remainingQuota} cylinders remaining in their quota`,
      );
      return;
    }

    setLoading(true);
    try {
      const payload = {
        userId: selectedUser.id,
        userName: selectedUser.name,
        userEmail: selectedUser.email,
        userPhone: selectedUser.phone,
        userAddress: formData.deliveryAddress,
        quantity: formData.quantity,
        paymentMethod: formData.paymentMethod,
        receiverName: formData.receiverName || selectedUser.name,
        receiverPhone: formData.receiverPhone || selectedUser.phone,
        expectedDate: formData.expectedDate || null,
        notes: formData.notes,
        status: "APPROVED", // Admin-created bookings are auto-approved
      };

      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        toast.success("Booking created successfully");
        router.push("/admin/bookings");
      } else {
        toast.error(result.message || "Failed to create booking");
      }
    } catch (error) {
      console.error("Failed to create booking:", error);
      toast.error("Failed to create booking");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") return null;
  if (!session || session.user.role !== "ADMIN") return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Bookings
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Create New Booking
              </h1>
              <p className="text-sm text-gray-600">
                Manually create a new gas cylinder booking
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* User Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Select Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Users
                  </label>
                  <input
                    type="text"
                    placeholder="Search by name, email, phone, or user ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {filteredUsers.length > 0 && (
                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => handleUserSelect(user)}
                        className={`p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                          selectedUserId === user.id
                            ? "bg-purple-50 border-purple-200"
                            : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">
                              {user.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.phone}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                              Quota: {user.remainingQuota}
                            </div>
                            <div className="text-xs text-gray-500">
                              cylinders
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedUser && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Selected Customer</span>
                    </div>
                    <div className="mt-2 text-sm text-green-700">
                      <div>
                        <strong>Name:</strong> {selectedUser.name}
                      </div>
                      <div>
                        <strong>Email:</strong> {selectedUser.email}
                      </div>
                      <div>
                        <strong>Phone:</strong> {selectedUser.phone}
                      </div>
                      <div>
                        <strong>Remaining Quota:</strong>{" "}
                        {selectedUser.remainingQuota} cylinders
                      </div>
                    </div>
                  </div>
                )}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={selectedUser?.remainingQuota || 12}
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          quantity: parseInt(e.target.value) || 1,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Max: {selectedUser?.remainingQuota || 12} cylinders
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          paymentMethod: e.target.value as "COD" | "UPI",
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    >
                      <option value="COD">Cash on Delivery</option>
                      <option value="UPI">UPI Payment</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Receiver Name
                    </label>
                    <input
                      type="text"
                      placeholder="Leave empty to use customer name"
                      value={formData.receiverName}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          receiverName: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Receiver Phone
                    </label>
                    <input
                      type="tel"
                      placeholder="Leave empty to use customer phone"
                      value={formData.receiverPhone}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          receiverPhone: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={formData.expectedDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        expectedDate: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to auto-calculate based on availability
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Address
                  </label>
                  <textarea
                    rows={3}
                    value={formData.deliveryAddress}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        deliveryAddress: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Delivery address (defaults to customer address)"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Additional notes or special instructions..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedUser || loading}
                className="inline-flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Create Booking
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
