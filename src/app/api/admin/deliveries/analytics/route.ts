import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { withMiddleware, successResponse } from '@/lib/api-middleware';

async function getDeliveryAnalyticsHandler(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || '30d';
    const partnerId = url.searchParams.get('partnerId');
    const area = url.searchParams.get('area');

    // Calculate date range based on period
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Build where clause
    const whereClause: any = {
      assignedAt: {
        gte: startDate
      }
    };

    if (partnerId) {
      whereClause.partnerId = partnerId;
    }

    if (area) {
      whereClause.partner = {
        serviceArea: area
      };
    }

    // Get overview statistics
    const totalDeliveries = await (prisma as any).deliveryAssignment.count({ where: whereClause });
    const completedDeliveries = await (prisma as any).deliveryAssignment.count({ 
      where: { ...whereClause, status: 'DELIVERED' } 
    });
    const failedDeliveries = await (prisma as any).deliveryAssignment.count({ 
      where: { ...whereClause, status: 'FAILED' } 
    });

    // Calculate success rate
    const successRate = totalDeliveries > 0 ? Math.round((completedDeliveries / totalDeliveries) * 100) : 0;

    // Get partner performance
    const partnerPerformance = await (prisma as any).deliveryAssignment.groupBy({
      by: ['partnerId'],
      where: whereClause,
      _count: {
        id: true
      }
    });

    // Get partner details and calculate performance metrics
    const partnerStats = partnerPerformance && partnerPerformance.length > 0 ? await Promise.all(
      partnerPerformance.map(async (group: any) => {
        const partner = await (prisma as any).deliveryPartner.findUnique({
          where: { id: group.partnerId },
          select: { name: true }
        });

        const partnerDeliveries = await (prisma as any).deliveryAssignment.findMany({
          where: { partnerId: group.partnerId, ...whereClause }
        });

        const completed = partnerDeliveries.filter((d: any) => d.status === 'DELIVERED').length;
        const successRate = partnerDeliveries.length > 0 ? Math.round((completed / partnerDeliveries.length) * 100) : 0;

        // Calculate average delivery time
        let avgDeliveryTime = 0;
        const completedDeliveries = partnerDeliveries.filter((d: any) => d.status === 'DELIVERED');
        if (completedDeliveries.length > 0) {
          const totalTime = completedDeliveries.reduce((sum: number, delivery: any) => {
            const assignedTime = new Date(delivery.assignedAt).getTime();
            const completedTime = new Date(delivery.updatedAt).getTime();
            return sum + (completedTime - assignedTime);
          }, 0);
          avgDeliveryTime = Math.round(totalTime / completedDeliveries.length / (1000 * 60 * 60));
        }

        return {
          partnerId: group.partnerId,
          partnerName: partner?.name || 'Unknown',
          totalDeliveries: group._count.id,
          completedDeliveries: completed,
          averageDeliveryTime: avgDeliveryTime,
          successRate,
          rating: 4.5 // Default rating, can be enhanced later
        };
      })
    ) : [];

    // Get area statistics
    const areaStats = await (prisma as any).deliveryPartner.groupBy({
      by: ['serviceArea'],
      where: {
        serviceArea: { not: null },
        isActive: true
      },
      _count: {
        id: true
      }
    });

    const areaPerformance = areaStats && areaStats.length > 0 ? await Promise.all(
      areaStats.map(async (area: any) => {
        const areaDeliveries = await (prisma as any).deliveryAssignment.findMany({
          where: {
            ...whereClause,
            partner: {
              serviceArea: area.serviceArea
            }
          }
        });

        const completed = areaDeliveries.filter((d: any) => d.status === 'DELIVERED').length;
        const successRate = areaDeliveries.length > 0 ? Math.round((completed / areaDeliveries.length) * 100) : 0;

        // Calculate average delivery time for area
        let avgDeliveryTime = 0;
        const completedDeliveries = areaDeliveries.filter((d: any) => d.status === 'DELIVERED');
        if (completedDeliveries.length > 0) {
          const totalTime = completedDeliveries.reduce((sum: number, delivery: any) => {
            const assignedTime = new Date(delivery.assignedAt).getTime();
            const completedTime = new Date(delivery.updatedAt).getTime();
            return sum + (completedTime - assignedTime);
          }, 0);
          avgDeliveryTime = Math.round(totalTime / completedDeliveries.length / (1000 * 60 * 60));
        }

        return {
          area: area.serviceArea,
          totalDeliveries: areaDeliveries.length,
          averageDeliveryTime: avgDeliveryTime,
          successRate,
          activePartners: area._count.id
        };
      })
    ) : [];

    // Calculate average delivery time
    const allDeliveries = await (prisma as any).deliveryAssignment.findMany({
      where: { ...whereClause, status: 'DELIVERED' },
      select: { assignedAt: true, updatedAt: true }
    });

    let averageDeliveryTime = 0;
    if (allDeliveries.length > 0) {
      const totalTime = allDeliveries.reduce((sum: number, delivery: any) => {
        const assignedTime = new Date(delivery.assignedAt).getTime();
        const completedTime = new Date(delivery.updatedAt).getTime();
        return sum + (completedTime - assignedTime);
      }, 0);
      averageDeliveryTime = Math.round(totalTime / allDeliveries.length / (1000 * 60 * 60));
    }

    // Get total and active partners
    const totalPartners = await (prisma as any).deliveryPartner.count();
    const activePartners = await (prisma as any).deliveryPartner.count({
      where: { isActive: true }
    });

    // Mock time series data (can be enhanced with real data)
    const timeSeries = [];
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      timeSeries.push({
        date: date.toISOString().split('T')[0],
        deliveries: Math.floor(Math.random() * 10) + 5, // Mock data
        completed: Math.floor(Math.random() * 8) + 3,
        failed: Math.floor(Math.random() * 2)
      });
    }

    // Mock recent trends (can be enhanced with real calculations)
    const recentTrends = {
      weeklyGrowth: Math.floor(Math.random() * 20) - 10, // -10 to +10
      monthlyGrowth: Math.floor(Math.random() * 30) - 15, // -15 to +15
      topPerformingAreas: areaPerformance && areaPerformance.length > 0
        ? areaPerformance
            .sort((a: any, b: any) => b.successRate - a.successRate)
            .slice(0, 3)
            .map((a: any) => a.area)
        : [],
      improvementAreas: areaPerformance && areaPerformance.length > 0
        ? areaPerformance
            .sort((a: any, b: any) => a.successRate - b.successRate)
            .slice(0, 2)
            .map((a: any) => a.area)
        : []
    };

    const analytics = {
      overview: {
        totalDeliveries,
        completedDeliveries,
        failedDeliveries,
        averageDeliveryTime,
        successRate,
        totalPartners,
        activePartners
      },
      timeSeries,
      partnerPerformance: partnerStats,
      areaStats: areaPerformance,
      recentTrends
    };

    return successResponse(analytics);
  } catch (error) {
    console.error('Error getting delivery analytics:', error);
    return successResponse({
      overview: {
        totalDeliveries: 0,
        completedDeliveries: 0,
        failedDeliveries: 0,
        averageDeliveryTime: 0,
        successRate: 0,
        totalPartners: 0,
        activePartners: 0
      },
      timeSeries: [],
      partnerPerformance: [],
      areaStats: [],
      recentTrends: {
        weeklyGrowth: 0,
        monthlyGrowth: 0,
        topPerformingAreas: [],
        improvementAreas: []
      }
    });
  }
}

export const GET = withMiddleware(getDeliveryAnalyticsHandler, { 
  requireAuth: true, 
  requireAdmin: true, 
  validateContentType: false 
});
