import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Minimal webhook mock: expects JSON { bookingId, status, upiTxnId } with header X-UPI-Signature matching WEBHOOK_SECRET
export async function POST(request: NextRequest) {
  try {
    const secret = process.env.WEBHOOK_SECRET;
    if (!secret)
      return NextResponse.json(
        { success: false, message: "Webhook not configured" },
        { status: 503 },
      );

    const signature =
      request.headers.get("x-upi-signature") ||
      request.headers.get("X-UPI-Signature");
    if (!signature || signature !== secret) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { bookingId, status, upiTxnId } = await request.json();
    if (!bookingId || !status) {
      return NextResponse.json(
        { success: false, message: "Invalid payload" },
        { status: 400 },
      );
    }

    const payment = await prisma.payment.findFirst({
      where: { bookingId },
      orderBy: { createdAt: "desc" },
    });
    if (!payment)
      return NextResponse.json(
        { success: false, message: "Payment not found" },
        { status: 404 },
      );

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: status === 'SUCCESS' ? 'SUCCESS' : status === 'FAILED' ? 'FAILED' : 'PENDING',
        upiTxnId: upiTxnId || payment.upiTxnId,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (e) {
    console.error("Webhook error:", e);
    return NextResponse.json(
      { success: false, message: "Webhook failed" },
      { status: 500 },
    );
  }
}
