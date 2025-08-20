import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Fetch comprehensive booking analytics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Calculate date range
    let dateFrom: Date, dateTo: Date;
    const now = new Date();
    
    switch (range) {
      case '7d':
        dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateTo = now;
        break;
      case '30d':
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateTo = now;
        break;
      case '90d':
        dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        dateTo = now;
        break;
      case '1y':
        dateFrom = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        dateTo = now;
        break;
      case 'custom':
        if (startDate && endDate) {
          dateFrom = new Date(startDate);
          dateTo = new Date(endDate);
        } else {
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          dateTo = now;
        }
        break;
      default:
        dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateTo = now;
    }

    // Build date filter
    const dateFilter = {
      createdAt: {
        gte: dateFrom,
        lte: dateTo
      }
    };

    // Get overview statistics
    const [
      totalBookings,
      totalRevenue,
      totalUsers,
      pendingBookings,
      deliveredBookings,
      cancelledBookings
    ] = await Promise.all([
      prisma.booking.count({ where: dateFilter }),
      prisma.payment.aggregate({
        where: {
          status: 'SUCCESS',
          booking: { ...dateFilter, status: { not: 'CANCELLED' } }
        },
        _sum: { amount: true }
      }),
      prisma.user.count({ where: dateFilter }),
      prisma.booking.count({ where: { ...dateFilter, status: 'PENDING' } }),
      prisma.booking.count({ where: { ...dateFilter, status: 'DELIVERED' } }),
      prisma.booking.count({ where: { ...dateFilter, status: 'CANCELLED' } })
    ]);

    // Calculate average delivery time
    const deliveredBookingsWithDates = await prisma.booking.findMany({
      where: { ...dateFilter, status: 'DELIVERED', deliveredAt: { not: null } },
      select: { createdAt: true, deliveredAt: true }
    });

    let averageDeliveryTime = 0;
    if (deliveredBookingsWithDates.length > 0) {
      const totalTime = deliveredBookingsWithDates.reduce((sum, booking) => {
        const created = new Date(booking.createdAt);
        const delivered = new Date(booking.deliveredAt!);
        return sum + (delivered.getTime() - created.getTime());
      }, 0);
      averageDeliveryTime = Math.round(totalTime / (24 * 60 * 60 * 1000)); // Convert to days
    }

    // Get daily trends for the last 30 days
    const dailyTrends = [];
    const currentDate = new Date(dateFrom);
    while (currentDate <= dateTo) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const [dayBookings, dayRevenue] = await Promise.all([
        prisma.booking.count({
          where: {
            createdAt: { gte: dayStart, lte: dayEnd }
          }
        }),
        prisma.payment.aggregate({
          where: {
            status: 'SUCCESS',
            booking: {
              createdAt: { gte: dayStart, lte: dayEnd },
              status: { not: 'CANCELLED' }
            }
          },
          _sum: { amount: true }
        })
      ]);

      dailyTrends.push({
        date: currentDate.toISOString().split('T')[0],
        bookings: dayBookings,
        revenue: dayRevenue._sum.amount || 0 // Amount is already in rupees
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Get status distribution
    const statusCounts = await prisma.booking.groupBy({
      by: ['status'],
      where: dateFilter,
      _count: { id: true }
    });

    const statusDistribution = statusCounts.map(status => ({
      status: status.status,
      count: status._count.id,
      percentage: Math.round((status._count.id / totalBookings) * 100)
    }));

    // Get payment method distribution
    const paymentMethodCounts = await prisma.booking.groupBy({
      by: ['paymentMethod'],
      where: dateFilter,
      _count: { id: true }
    });

    const paymentMethods = paymentMethodCounts.map(method => ({
      method: method.paymentMethod,
      count: method._count.id,
      percentage: Math.round((method._count.id / totalBookings) * 100)
    }));

    // Get top users by bookings
    const topUsers = await prisma.booking.groupBy({
      by: ['userId'],
      where: dateFilter,
      _count: { id: true },
      _sum: { quantity: true }
    });

    const topUsersWithDetails = await Promise.all(
      topUsers.slice(0, 10).map(async (user) => {
        const userDetails = await prisma.user.findUnique({
          where: { id: user.userId },
          select: { name: true }
        });
        
        const userRevenue = await prisma.payment.aggregate({
          where: {
            status: 'SUCCESS',
            booking: { userId: user.userId, ...dateFilter }
          },
          _sum: { amount: true }
        });

        return {
          userId: user.userId,
          name: userDetails?.name || 'Unknown',
          bookings: user._count.id,
          totalSpent: userRevenue._sum.amount || 0 // Amount is already in rupees
        };
      })
    );

    // Get delivery performance
    const deliveryStats = await prisma.booking.findMany({
      where: { ...dateFilter, status: 'DELIVERED', deliveredAt: { not: null } },
      select: { createdAt: true, deliveredAt: true, expectedDate: true }
    });

    let onTimeDeliveries = 0;
    let delayedDeliveries = 0;

    deliveryStats.forEach(booking => {
      const created = new Date(booking.createdAt);
      const delivered = new Date(booking.deliveredAt!);
      const expected = booking.expectedDate ? new Date(booking.expectedDate) : null;
      
      if (expected) {
        if (delivered <= expected) {
          onTimeDeliveries++;
        } else {
          delayedDeliveries++;
        }
      }
    });

    const analyticsData = {
      overview: {
        totalBookings,
        totalRevenue: totalRevenue._sum.amount || 0, // Amount is already in rupees
        totalUsers,
        averageDeliveryTime,
        pendingBookings,
        deliveredBookings,
        cancelledBookings
      },
      trends: {
        daily: dailyTrends,
        weekly: [], // Could be implemented similarly
        monthly: []  // Could be implemented similarly
      },
      statusDistribution,
      paymentMethods,
      topUsers: topUsersWithDetails,
      deliveryPerformance: {
        averageDeliveryTime,
        onTimeDeliveries,
        delayedDeliveries,
        totalDeliveries: deliveryStats.length
      }
    };

    return NextResponse.json({
      success: true,
      data: analyticsData
    });

  } catch (error) {
    console.error('Failed to fetch analytics:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to load analytics data' },
      { status: 500 }
    );
  }
}
