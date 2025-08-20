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
    
    console.log('Date filter constructed:', dateFilter);

    // Get booking counts by status
    const whereClause = Object.keys(dateFilter).length > 0 ? dateFilter : {};
    console.log('Using where clause for counts:', whereClause);
    
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
      console.log('Counts fetched successfully:', { total, pending, approved, outForDelivery, delivered, cancelled });
    } catch (error) {
      console.error('Failed to fetch counts:', error);
      throw error;
    }

    // Get revenue data
    console.log('Fetching revenue data with whereClause:', whereClause);
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
      console.log('Revenue data result:', revenueData);

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
      console.log('Pending revenue data result:', pendingRevenueData);
    } catch (error) {
      console.error('Failed to fetch revenue data:', error);
      throw error;
    }

    // Get average delivery time for delivered bookings
    console.log('Fetching delivered bookings with whereClause:', whereClause);
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
      console.log('Found delivered bookings:', deliveredBookings.length);

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
        
      console.log('Delivery time calculation completed:', { averageDeliveryTime, validDeliveries: validDeliveries.length });
    } catch (error) {
      console.error('Failed to fetch delivery time data:', error);
      throw error;
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
      
      console.log('Payment method distribution calculated:', paymentMethodDistribution);
    } catch (error) {
      console.error('Failed to fetch payment method stats:', error);
      throw error;
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
      console.log('Recent bookings fetched:', recentBookings.length);
    } catch (error) {
      console.error('Failed to fetch recent bookings:', error);
      throw error;
    }

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
      }))
    };
    
    console.log('Stats object created successfully:', {
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
    console.error('Failed to fetch booking stats:', error);
    
    // Log more details for debugging
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch booking stats',
        error: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
