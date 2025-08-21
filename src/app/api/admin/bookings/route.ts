import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma, BookingStatus, PaymentMethod } from "@prisma/client";
import { withMiddleware, parseRequestBody } from "@/lib/api-middleware";
import { z } from "zod";

// GET - Fetch all bookings with filters
async function listBookingsHandler(
  request: NextRequest,
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const paymentMethod = searchParams.get("paymentMethod");
    const search = searchParams.get("search");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.BookingWhereInput = {};

    if (status) where.status = status as BookingStatus;
    if (paymentMethod) where.paymentMethod = paymentMethod as PaymentMethod;
    if (search) {
      where.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { userName: { contains: search, mode: "insensitive" } },
        { userPhone: { contains: search, mode: "insensitive" } },
        { userEmail: { contains: search, mode: "insensitive" } },
      ];
    }
    if (dateFrom || dateTo) {
      where.createdAt = {} as Prisma.DateTimeFilter;
      if (dateFrom) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(dateFrom);
      if (dateTo) (where.createdAt as Prisma.DateTimeFilter).lte = new Date(dateTo);
    }

    // Get bookings with user info
    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              address: true,
            },
          },
          payments: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          assignment: {
            include: {
              partner: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                },
              },
            },
          },
          reservation: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    // Transform data for frontend
    type BookingWithRelations = Prisma.BookingGetPayload<{
      include: {
        user: {
          select: { id: true; name: true; email: true; phone: true; address: true };
        };
        payments: true;
        assignment: { include: { partner: { select: { id: true; name: true; phone: true } } } };
        reservation: true;
      };
    }>;

    const bookingsWithRelations = bookings as unknown as BookingWithRelations[];

    const transformedBookings = bookingsWithRelations.map((booking) => ({
      id: booking.id,
      userId: booking.userId,
      userName: booking.user.name,
      userEmail: booking.user.email,
      userPhone: booking.user.phone,
      userAddress: booking.user.address,
      paymentMethod: booking.paymentMethod,
      quantity: booking.quantity,
      receiverName: booking.receiverName,
      receiverPhone: booking.receiverPhone,
      status: booking.status,
      requestedAt: booking.requestedAt,
      expectedDate: booking.expectedDate,
      deliveryDate: booking.deliveryDate,
      deliveredAt: booking.deliveredAt,
      notes: booking.notes,
      paymentStatus:
        booking.payments[0]?.status ||
        (booking.status === "CANCELLED" ? "CANCELLED" : "PENDING"),
      paymentAmount: booking.payments[0]?.amount,
      deliveryPartnerId: booking.assignment?.partnerId,
      deliveryPartnerName: booking.assignment?.partner?.name,
      cylinderReserved: Boolean(booking.reservation),
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        data: transformedBookings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Failed to fetch bookings:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch bookings" },
      { status: 500 },
    );
  }
}

// POST - Create new booking
async function createBookingHandler(
  request: NextRequest,
): Promise<NextResponse> {
  try {
    const createSchema = z.object({
      userId: z.string().min(1),
      userName: z.string().min(1),
      userEmail: z.string().email().nullable().optional(),
      userPhone: z.string().nullable().optional(),
      userAddress: z.string().nullable().optional(),
      quantity: z.number().int().min(1).max(1000),
      paymentMethod: z.enum(["COD", "UPI"]),
      receiverName: z.string().optional(),
      receiverPhone: z.string().optional(),
      expectedDate: z.string().optional(),
      notes: z.string().max(1000).optional(),
      status: z
        .enum([
          "PENDING",
          "APPROVED",
          "OUT_FOR_DELIVERY",
          "DELIVERED",
          "CANCELLED",
        ])
        .default("APPROVED"),
    });

    const parsed = createSchema.parse(await parseRequestBody(request));
    const {
      userId,
      userName,
      userEmail,
      userPhone,
      userAddress,
      quantity,
      paymentMethod,
      receiverName,
      receiverPhone,
      expectedDate,
      notes,
      status,
    } = parsed;

    // Validate required fields
    if (!userId || !quantity || !paymentMethod) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 },
      );
    }

    // Check user quota
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { remainingQuota: true },
    });

    if (!user || user.remainingQuota < quantity) {
      return NextResponse.json(
        { success: false, message: "User quota exceeded" },
        { status: 400 },
      );
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        userId,
        userName,
        userEmail,
        userPhone,
        userAddress,
        quantity,
        paymentMethod,
        receiverName,
        receiverPhone,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        notes,
        status,
        requestedAt: new Date(),
      },
    });

    // Update user quota
    await prisma.user.update({
      where: { id: userId },
      data: { remainingQuota: { decrement: quantity } },
    });

    // Create booking event
    await prisma.bookingEvent.create({
      data: {
        bookingId: booking.id,
        status: status,
        title: `Booking ${status.toLowerCase()}`,
        description: `Booking created by admin with status: ${status}`,
        createdAt: new Date(),
      },
    });

    // Create payment record
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: quantity * 1100, // ₹1100 per cylinder
        method: paymentMethod,
        status: paymentMethod === "UPI" ? "PENDING" : "PENDING",
        createdAt: new Date(),
      },
    });

    // Send confirmation email if UPI payment
    if (paymentMethod === "UPI") {
      // This will be handled by the email service
      console.log("UPI payment pending - email should be sent");
    }

    return NextResponse.json({
      success: true,
      message: "Booking created successfully",
      data: booking,
    });
  } catch (error) {
    console.error("Failed to create booking:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create booking" },
      { status: 500 },
    );
  }
}

export const GET = withMiddleware(listBookingsHandler, {
  requireAuth: true,
  requireAdmin: true,
});
export const POST = withMiddleware(createBookingHandler, {
  requireAuth: true,
  requireAdmin: true,
  validateContentType: true,
});
