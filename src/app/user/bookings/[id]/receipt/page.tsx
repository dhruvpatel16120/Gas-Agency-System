"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import UserNavbar from "@/components/UserNavbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";

type Booking = {
  id: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  userAddress: string;
  quantity: number;
  paymentMethod: "COD" | "UPI";
  paymentStatus?: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";
  paymentAmount?: number; // in paise
  createdAt: string;
};

export default function ReceiptPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const bookingId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/login");
      return;
    }
    const load = async () => {
      try {
        const res = await fetch(`/api/bookings/${bookingId}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (json.success) setBooking(json.data);
      } finally {
        setLoading(false);
      }
    };
    if (bookingId) void load();
  }, [status, session, bookingId, router]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Preparing receipt...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Receipt not available.</p>
        </div>
      </div>
    );
  }

  const amountRupees =
    typeof booking.paymentAmount === "number"
      ? booking.paymentAmount
      : undefined;

  return (
    <div className="min-h-screen bg-gray-50">
      <UserNavbar />
      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Receipt</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-white p-6 rounded-lg border" id="receipt">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Gas Agency System
                    </h2>
                    <p className="text-xs text-gray-500">
                      Official Payment Receipt
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      Date: {new Date(booking.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      Booking ID: {booking.id}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Billed To
                    </h3>
                    <div className="text-sm text-gray-700">
                      <p>{booking.userName}</p>
                      <p>{booking.userEmail}</p>
                      <p>{booking.userPhone}</p>
                      <p className="truncate">{booking.userAddress}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Payment Info
                    </h3>
                    <div className="text-sm text-gray-700">
                      <p>Method: {booking.paymentMethod}</p>
                      <p>Status: {booking.paymentStatus}</p>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3">Item</th>
                        <th className="px-4 py-3">Qty</th>
                        <th className="px-4 py-3">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="px-4 py-3">Gas Cylinder</td>
                        <td className="px-4 py-3">{booking.quantity}</td>
                        <td className="px-4 py-3">
                          {amountRupees != null
                            ? formatCurrency(amountRupees)
                            : "-"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-end mt-6">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Download / Print
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
