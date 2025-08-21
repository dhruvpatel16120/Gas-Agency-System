import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Prisma, PaymentStatus } from "@prisma/client";

// GET - Fetch all UPI payments for review
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // Build where clause
    const whereClause: Prisma.PaymentWhereInput = {
      method: "UPI",
      ...(status ? { status: status as PaymentStatus } : {}),
      ...(search
        ? {
            OR: [
              { booking: { userName: { contains: search, mode: "insensitive" } } },
              { booking: { userEmail: { contains: search, mode: "insensitive" } } },
              { booking: { userPhone: { contains: search } } },
              { booking: { id: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        booking: {
          select: {
            id: true,
            userName: true,
            userEmail: true,
            userPhone: true,
            quantity: true,
            status: true,
            paymentMethod: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error("Failed to fetch UPI payments:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load payments" },
      { status: 500 },
    );
  }
}
