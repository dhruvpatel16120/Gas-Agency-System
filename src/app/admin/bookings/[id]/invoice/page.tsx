"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import AdminNavbar from "@/components/AdminNavbar";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Download, Mail, User, MapPin, Printer } from "lucide-react";

type Booking = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  userAddress: string;
  paymentMethod: "COD" | "UPI";
  quantity: number;
  receiverName?: string | null;
  receiverPhone?: string | null;
  status: string;
  requestedAt: string;
  expectedDate?: string | null;
  deliveryDate?: string | null;
  deliveredAt?: string | null;
  notes?: string | null;
  paymentStatus?: "PENDING" | "SUCCESS" | "FAILED";
  paymentAmount?: number;
  createdAt: string;
};

export default function InvoicePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) router.push("/login");
    else if (session.user.role !== "ADMIN") router.push("/user");
  }, [session, status, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const bookingRes = await fetch(`/api/bookings/${bookingId}`, {
        cache: "no-store",
      });

      if (bookingRes.ok) {
        const bookingData = await bookingRes.json();
        setBooking(bookingData.data);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (session?.user?.role === "ADMIN" && bookingId) {
      void loadData();
    }
  }, [session, bookingId, loadData]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/bookings/${bookingId}/invoice`);

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `invoice-${bookingId.slice(-8).toUpperCase()}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        console.log("PDF downloaded successfully!");

        // Show success message
        alert("PDF downloaded successfully! Check your Downloads folder.");
      } else {
        const errorData = await res.json();
        console.error("Download failed:", errorData);
        alert(
          `Failed to download PDF: ${errorData.message || "Unknown error"}`,
        );
      }
    } catch (error) {
      console.error("Failed to download PDF:", error);
      alert("Failed to download PDF. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const sendInvoiceEmail = async () => {
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/send-invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        alert("Invoice sent to customer email successfully!");
      } else {
        alert("Failed to send invoice email");
      }
    } catch (error) {
      console.error("Failed to send invoice email:", error);
      alert("Failed to send invoice email");
    }
  };

  const calculateTotal = () => {
    if (!booking) return 0;
    return booking.quantity * 1100; // Fixed price per cylinder
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (status === "loading") return null;
  if (!session || session.user.role !== "ADMIN") return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading invoice...</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center py-12">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Data Not Found
              </h2>
              <p className="text-gray-600 mb-4">
                Unable to load booking or company information.
              </p>
              <button
                onClick={() => router.push("/admin/bookings")}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Back to Bookings
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Booking
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Invoice #{booking.id}
                </h1>
                <p className="text-sm text-gray-600">
                  Generate and manage invoice for this booking
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={sendInvoiceEmail}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Mail className="w-4 h-4" />
                Send Email
              </button>
              <button
                onClick={handleDownloadPDF}
                disabled={loading}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  loading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                } text-white`}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download PDF
                  </>
                )}
              </button>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            </div>
          </div>

          {/* Invoice */}
          <div className="bg-white shadow-lg rounded-lg overflow-hidden print:shadow-none">
            {/* Invoice Header */}
            <div className="p-8 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">
                    Gas Agency System
                  </h2>
                  <div className="mt-2 space-y-1 text-gray-600">
                    <p>123 Main Street, City, State 12345</p>
                    <p>Phone: +91-1234567890</p>
                    <p>Email: info@gasagency.com</p>
                    <p>GST: 27ABCDE1234F1Z5</p>
                  </div>
                </div>
                <div className="text-right">
                  <h1 className="text-2xl font-bold text-gray-900">INVOICE</h1>
                  <div className="mt-2 space-y-1 text-gray-600">
                    <p>
                      <strong>Invoice #:</strong> {booking.id}
                    </p>
                    <p>
                      <strong>Date:</strong> {formatDate(booking.createdAt)}
                    </p>
                    <p>
                      <strong>Due Date:</strong> {formatDate(booking.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div className="p-8 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Bill To
                  </h3>
                  <div className="space-y-1 text-gray-700">
                    <p className="font-medium">{booking.userName}</p>
                    <p>{booking.userAddress}</p>
                    <p>Phone: {booking.userPhone}</p>
                    <p>Email: {booking.userEmail}</p>
                    <p>User ID: {booking.userId}</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Ship To
                  </h3>
                  <div className="space-y-1 text-gray-700">
                    <p className="font-medium">
                      {booking.receiverName || booking.userName}
                    </p>
                    <p>{booking.userAddress}</p>
                    <p>Phone: {booking.receiverPhone || booking.userPhone}</p>
                    {booking.expectedDate && (
                      <p>
                        Expected Delivery: {formatDate(booking.expectedDate)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Items */}
            <div className="p-8 border-b border-gray-200">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">
                      Description
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">
                      Quantity
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">
                      Unit Price
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          Gas Cylinder
                        </p>
                        <p className="text-sm text-gray-600">
                          LPG Gas Cylinder (14.2 kg)
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right text-gray-900">
                      {booking.quantity}
                    </td>
                    <td className="py-4 px-4 text-right text-gray-900">
                      {formatCurrency(1100)}
                    </td>
                    <td className="py-4 px-4 text-right font-medium text-gray-900">
                      {formatCurrency(booking.quantity * 1100)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Invoice Summary */}
            <div className="p-8">
              <div className="flex justify-end">
                <div className="w-64">
                  <div className="space-y-3">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(calculateTotal())}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>GST (18%):</span>
                      <span>{formatCurrency(calculateTotal() * 0.18)}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex justify-between text-lg font-bold text-gray-900">
                        <span>Total:</span>
                        <span>{formatCurrency(calculateTotal() * 1.18)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">
                  Payment Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                  <div>
                    <p>
                      <strong>Payment Method:</strong> {booking.paymentMethod}
                    </p>
                    <p>
                      <strong>Payment Status:</strong>{" "}
                      {booking.paymentStatus || "PENDING"}
                    </p>
                  </div>
                  <div>
                    <p>
                      <strong>Booking Status:</strong> {booking.status}
                    </p>
                    <p>
                      <strong>Requested On:</strong>{" "}
                      {formatDate(booking.requestedAt)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {booking.notes && (
                <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-2">Notes</h4>
                  <p className="text-gray-700">{booking.notes}</p>
                </div>
              )}

              {/* Terms and Conditions */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-2">
                  Terms & Conditions
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Payment is due upon delivery for COD orders</li>
                  <li>• UPI payments must be completed before delivery</li>
                  <li>
                    • Delivery will be made within 24-48 hours of approval
                  </li>
                  <li>• Cylinders must be returned in good condition</li>
                  <li>• This invoice is valid for 30 days</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          header,
          nav,
          button {
            display: none !important;
          }
          main {
            margin: 0 !important;
            padding: 0 !important;
          }
          .bg-gray-50 {
            background-color: white !important;
          }
        }
      `}</style>
    </div>
  );
}
