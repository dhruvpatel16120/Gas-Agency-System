import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Fetch booking statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Build date filter
    const dateFilter: any = {};
    if (dateFrom || dateTo) {
      dateFilter.createdAt = {};
      if (dateFrom) dateFilter.createdAt.gte = new Date(dateFrom);
      if (dateTo) dateFilter.createdAt.lte = new Date(dateTo);
    }
    
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev) console.log('Date filter constructed:', dateFilter);

    // Get booking counts by status
    const whereClause = Object.keys(dateFilter).length > 0 ? dateFilter : {};
    if (isDev) console.log('Using where clause for counts:', whereClause);

    // Early DB health check to avoid noisy stack traces when DB is offline
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      await prisma.$queryRaw`SELECT 1`;
    } catch (dbErr) {
      if (isDev) console.error('DB health check failed for stats endpoint:', dbErr);
      const emptyStats = {
        total: 0,
        pending: 0,
        approved: 0,
        outForDelivery: 0,
        delivered: 0,
        cancelled: 0,
        totalRevenue: 0,
        pendingRevenue: 0,
        averageDeliveryTime: 0,
        paymentMethodDistribution: {},
        recentBookings: [] as any[],
      };
      return NextResponse.json({ success: true, data: emptyStats, message: 'DB unavailable; returning default stats' });
    }
    
    let total = 0, pending = 0, approved = 0, outForDelivery = 0, delivered = 0, cancelled = 0;
    
    try {
      [total, pending, approved, outForDelivery, delivered, cancelled] = await Promise.all([
        prisma.booking.count({ where: whereClause }),
        prisma.booking.count({ where: { ...whereClause, status: 'PENDING' } }),
        prisma.booking.count({ where: { ...whereClause, status: 'APPROVED' } }),
        prisma.booking.count({ where: { ...whereClause, status: 'OUT_FOR_DELIVERY' } }),
        prisma.booking.count({ where: { ...whereClause, status: 'DELIVERED' } }),
        prisma.booking.count({ where: { ...whereClause, status: 'CANCELLED' } })
      ]);
      if (isDev) console.log('Counts fetched successfully:', { total, pending, approved, outForDelivery, delivered, cancelled });
    } catch (error) {
      if (isDev) console.error('Failed to fetch counts:', error);
      // Fallback to zeros and continue
      total = 0; pending = 0; approved = 0; outForDelivery = 0; delivered = 0; cancelled = 0;
    }

    // Get revenue data
    if (isDev) console.log('Fetching revenue data with whereClause:', whereClause);
    let revenueData, pendingRevenueData;
    
    try {
      revenueData = await prisma.payment.aggregate({
        where: {
          status: 'SUCCESS',
          booking: { 
            ...whereClause,
            status: { not: 'CANCELLED' } 
          }
        },
        _sum: { amount: true }
      });
      if (isDev) console.log('Revenue data result:', revenueData);

      pendingRevenueData = await prisma.payment.aggregate({
        where: {
          status: 'PENDING',
          booking: { 
            ...whereClause,
            status: { not: 'CANCELLED' } 
          }
        },
        _sum: { amount: true }
      });
      if (isDev) console.log('Pending revenue data result:', pendingRevenueData);
    } catch (error) {
      if (isDev) console.error('Failed to fetch revenue data:', error);
      revenueData = { _sum: { amount: 0 } };
      pendingRevenueData = { _sum: { amount: 0 } };
    }

    // Get average delivery time for delivered bookings
    if (isDev) console.log('Fetching delivered bookings with whereClause:', whereClause);
    let deliveredBookings, averageDeliveryTime = 0;
    
    try {
      deliveredBookings = await prisma.booking.findMany({
        where: {
          ...whereClause,
          status: 'DELIVERED',
          deliveredAt: { not: null }
        },
        select: {
          requestedAt: true,
          deliveredAt: true
        }
      });
      if (isDev) console.log('Found delivered bookings:', deliveredBookings.length);

      // Filter out any bookings with null requestedAt (shouldn't happen but defensive programming)
      const validDeliveries = deliveredBookings.filter(booking => 
        booking.deliveredAt && booking.requestedAt
      );

      const totalDeliveryTime = validDeliveries.reduce((total: number, booking: any) => {
        if (booking.deliveredAt && booking.requestedAt) {
          return total + (new Date(booking.deliveredAt).getTime() - new Date(booking.requestedAt).getTime());
        }
        return total;
      }, 0);

      averageDeliveryTime = validDeliveries.length > 0 
        ? Math.round(totalDeliveryTime / validDeliveries.length / (1000 * 60 * 60 * 24)) // Convert to days
        : 0;
        
      if (isDev) console.log('Delivery time calculation completed:', { averageDeliveryTime, validDeliveries: validDeliveries.length });
    } catch (error) {
      if (isDev) console.error('Failed to fetch delivery time data:', error);
      deliveredBookings = [];
      averageDeliveryTime = 0;
    }

    // Get payment method distribution
    let paymentMethodDistribution = {};
    try {
      const paymentMethodStats = await prisma.booking.groupBy({
        by: ['paymentMethod'],
        where: whereClause,
        _count: { id: true }
      });

      paymentMethodDistribution = paymentMethodStats.reduce((acc: Record<string, number>, stat: any) => {
        acc[stat.paymentMethod] = stat._count.id;
        return acc;
      }, {} as Record<string, number>);
      
      if (isDev) console.log('Payment method distribution calculated:', paymentMethodDistribution);
    } catch (error) {
      if (isDev) console.error('Failed to fetch payment method stats:', error);
      paymentMethodDistribution = {};
    }

    // Get recent activity
    let recentBookings = [];
    try {
      recentBookings = await prisma.booking.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          user: {
            select: { name: true, email: true }
          }
        }
      });
      if (isDev) console.log('Recent bookings fetched:', recentBookings.length);
    } catch (error) {
      if (isDev) console.error('Failed to fetch recent bookings:', error);
      recentBookings = [] as any[];
    }

    // Get pending UPI payments count
    const pendingUpiPayments = await prisma.payment.count({
      where: {
        method: 'UPI',
        status: 'PENDING'
      }
    });

    const stats = {
      total,
      pending,
      approved,
      outForDelivery,
      delivered,
      cancelled,
      totalRevenue: revenueData._sum.amount || 0,
      pendingRevenue: pendingRevenueData._sum.amount || 0,
      averageDeliveryTime,
      paymentMethodDistribution,
      recentBookings: recentBookings.map((booking: any) => ({
        id: booking.id,
        status: booking.status,
        quantity: booking.quantity,
        userName: booking.user.name,
        userEmail: booking.user.email,
        createdAt: booking.createdAt
      })),
      pendingUpiPayments
    };
    
    if (isDev) console.log('Stats object created successfully:', {
      total, pending, approved, outForDelivery, delivered, cancelled,
      totalRevenue: revenueData._sum.amount || 0,
      pendingRevenue: pendingRevenueData._sum.amount || 0,
      averageDeliveryTime
    });

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    // Final catch-all: return default stats instead of 500 to avoid terminal noise in dev
    if (process.env.NODE_ENV !== 'production') {
      console.error('Failed to fetch booking stats:', error);
    }
    
    // Log more details for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    
    const emptyStats = {
      total: 0,
      pending: 0,
      approved: 0,
      outForDelivery: 0,
      delivered: 0,
      cancelled: 0,
      totalRevenue: 0,
      pendingRevenue: 0,
      averageDeliveryTime: 0,
      paymentMethodDistribution: {},
      recentBookings: [] as any[],
    };
    return NextResponse.json({ success: true, data: emptyStats, message: 'DB error; returning default stats' });
  }
}
