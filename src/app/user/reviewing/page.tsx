"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import UserNavbar from "@/components/UserNavbar";
import { useEffect } from "react";

export default function PaymentReviewingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const bookingId = params.get("id") || "";

  useEffect(() => {
    if (status === "loading") return;
    if (!session) router.push("/login");
  }, [status, session, router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <UserNavbar />
      <main className="max-w-3xl mx-auto py-10 px-4">
        <div className="relative bg-white border rounded-2xl shadow p-8 overflow-hidden">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-100 rounded-full blur-2xl"></div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-yellow-100 rounded-full blur-2xl"></div>

          <div className="flex flex-col items-center text-center">
            <div className="relative w-24 h-24 mb-4">
              <div className="absolute inset-0 rounded-full bg-yellow-100 animate-ping" />
              <div className="absolute inset-2 rounded-full bg-yellow-200 animate-pulse" />
              <div className="relative w-full h-full flex items-center justify-center rounded-full bg-yellow-500 text-white text-2xl font-bold">
                ⏳
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Payment Under Review
            </h1>
            <p className="mt-2 text-gray-600 max-w-xl">
              We have recorded your payment. Our admin team will review it and
              notify you via email. Your booking will be approved as soon as
              payment is verified. Please check the website frequently for
              updates.
            </p>
            {bookingId && (
              <p className="mt-1 text-gray-500 text-sm">
                Booking ID: <span className="font-mono">{bookingId}</span>
              </p>
            )}

            <div className="mt-6 flex gap-3">
              {bookingId && (
                <button
                  onClick={() => router.push("/user")}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                >
                  Go to Dashboard
                </button>
              )}
              <button
                onClick={() => router.push("/user/bookings")}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                View History
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
