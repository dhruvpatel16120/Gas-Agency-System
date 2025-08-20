import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Fetch all bookings with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const paymentMethod = searchParams.get('paymentMethod');
    const paymentStatus = searchParams.get('paymentStatus');
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (status) where.status = status;
    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { userName: { contains: search, mode: 'insensitive' } },
        { userPhone: { contains: search, mode: 'insensitive' } },
        { userEmail: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
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
              address: true
            }
          },
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 1
          },
          deliveryAssignment: {
            include: {
              partner: {
                select: {
                  id: true,
                  name: true,
                  phone: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.booking.count({ where })
    ]);

    // Transform data for frontend
    const transformedBookings = bookings.map(booking => ({
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
      paymentStatus: booking.payments[0]?.status || 'PENDING',
      paymentAmount: booking.payments[0]?.amount,
      deliveryPartnerId: booking.deliveryAssignment?.partnerId,
      deliveryPartnerName: booking.deliveryAssignment?.partner?.name,
      cylinderReserved: booking.cylinderReserved,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt
    }));

    return NextResponse.json({
      success: true,
      data: {
        data: transformedBookings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Failed to fetch bookings:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

// POST - Create new booking
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
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
      status = 'APPROVED'
    } = body;

    // Validate required fields
    if (!userId || !quantity || !paymentMethod) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check user quota
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { remainingQuota: true }
    });

    if (!user || user.remainingQuota < quantity) {
      return NextResponse.json(
        { success: false, message: 'User quota exceeded' },
        { status: 400 }
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
        cylinderReserved: true
      }
    });

    // Update user quota
    await prisma.user.update({
      where: { id: userId },
      data: { remainingQuota: { decrement: quantity } }
    });

    // Create booking event
    await prisma.bookingEvent.create({
      data: {
        bookingId: booking.id,
        status: status,
        title: `Booking ${status.toLowerCase()}`,
        description: `Booking created by admin with status: ${status}`,
        createdAt: new Date()
      }
    });

    // Create payment record
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        amount: quantity * 1000, // Assuming ₹1000 per cylinder
        method: paymentMethod,
        status: paymentMethod === 'UPI' ? 'PENDING' : 'PENDING',
        createdAt: new Date()
      }
    });

    // Send confirmation email if UPI payment
    if (paymentMethod === 'UPI') {
      // This will be handled by the email service
      console.log('UPI payment pending - email should be sent');
    }

    return NextResponse.json({
      success: true,
      message: 'Booking created successfully',
      data: booking
    });
  } catch (error) {
    console.error('Failed to create booking:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create booking' },
      { status: 500 }
    );
  }
}
