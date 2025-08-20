import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { withMiddleware, successResponse } from '@/lib/api-middleware';

async function getContactStatsHandler(_request: NextRequest) {
  try {
    // Get total counts
    const totalContacts = await (prisma as any).contactMessage.count();
    const newContacts = await (prisma as any).contactMessage.count({ where: { status: 'NEW' } });
    const openContacts = await (prisma as any).contactMessage.count({ where: { status: 'OPEN' } });
    const resolvedContacts = await (prisma as any).contactMessage.count({ where: { status: 'RESOLVED' } });
    const archivedContacts = await (prisma as any).contactMessage.count({ where: { status: 'ARCHIVED' } });

    // Get recent activity
    const recentContacts = await (prisma as any).contactMessage.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        subject: true,
        status: true,
        createdAt: true,
        user: { select: { name: true, email: true } }
      }
    });

    // Get contacts by category
    const contactsByCategory = await (prisma as any).contactMessage.groupBy({
      by: ['category'],
      _count: { category: true },
      where: { category: { not: null } }
    });

    // Get contacts by priority
    const contactsByPriority = await (prisma as any).contactMessage.groupBy({
      by: ['priority'],
      _count: { priority: true },
      where: { priority: { not: null } }
    });

    // Get average response time
    const contactsWithReplies = await (prisma as any).contactMessage.findMany({
      where: { 
        lastRepliedAt: { not: null },
        replies: { some: {} }
      },
      select: {
        createdAt: true,
        lastRepliedAt: true
      }
    });

    let averageResponseTime = 0;
    if (contactsWithReplies.length > 0) {
      const totalResponseTime = contactsWithReplies.reduce((acc: number, contact: any) => {
        const responseTime = new Date(contact.lastRepliedAt!).getTime() - new Date(contact.createdAt).getTime();
        return acc + responseTime;
      }, 0);
      averageResponseTime = Math.round(totalResponseTime / contactsWithReplies.length / (1000 * 60 * 60)); // in hours
    }

    // Get monthly trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrends = await (prisma as any).contactMessage.groupBy({
      by: ['createdAt'],
      _count: { createdAt: true },
      where: { createdAt: { gte: sixMonthsAgo } }
    });

    // Process monthly trends
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const monthCount = monthlyTrends.filter((item: any) => {
        const itemDate = new Date(item.createdAt);
        return itemDate.getFullYear() === date.getFullYear() && itemDate.getMonth() === date.getMonth();
      }).reduce((acc: number, item: any) => acc + item._count.createdAt, 0);

      monthlyData.push({
        month: monthKey,
        count: monthCount
      });
    }

    return successResponse({
      overview: {
        total: totalContacts,
        new: newContacts,
        open: openContacts,
        resolved: resolvedContacts,
        archived: archivedContacts
      },
      recentActivity: recentContacts.map((contact: any) => ({
        id: contact.id,
        subject: contact.subject,
        status: contact.status,
        createdAt: contact.createdAt,
        userName: contact.user.name,
        userEmail: contact.user.email
      })),
      categories: contactsByCategory.map((item: any) => ({
        category: item.category,
        count: item._count.category
      })),
      priorities: contactsByPriority.map((item: any) => ({
        priority: item.priority,
        count: item._count.priority
      })),
      metrics: {
        averageResponseTime,
        totalContacts,
        responseRate: totalContacts > 0 ? Math.round((contactsWithReplies.length / totalContacts) * 100) : 0
      },
      trends: monthlyData
    }, 'Contact statistics retrieved successfully');
  } catch (error) {
    console.error('Error fetching contact statistics:', error);
    return successResponse({
      overview: { total: 0, new: 0, open: 0, resolved: 0, archived: 0 },
      recentActivity: [],
      categories: [],
      priorities: [],
      metrics: { averageResponseTime: 0, totalContacts: 0, responseRate: 0 },
      trends: []
    }, 'Contact statistics retrieved successfully');
  }
}

export const GET = withMiddleware(getContactStatsHandler, { requireAuth: true, requireAdmin: true, validateContentType: false });


