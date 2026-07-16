import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withMiddleware, successResponse } from "@/lib/api-middleware";

async function getContactStatsHandler(_request: NextRequest) {
  void _request;
  try {
    // 1) Single query for all status counts (replaces 5 separate COUNT queries)
    const statusCounts = await prisma.contactMessage.groupBy({
      by: ["status"],
      _count: { status: true },
    });

    const countMap: Record<string, number> = {};
    for (const row of statusCounts) {
      countMap[row.status] = row._count.status;
    }
    const totalContacts =
      (countMap["NEW"] || 0) +
      (countMap["OPEN"] || 0) +
      (countMap["RESOLVED"] || 0) +
      (countMap["ARCHIVED"] || 0);

    // 2) Run remaining queries in parallel (categories, priorities, recent, response time)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [
      recentContacts,
      contactsByCategory,
      contactsByPriority,
      contactsWithReplies,
      monthlyTrends,
    ] = await Promise.all([
      // Recent activity
      prisma.contactMessage.findMany({
        take: 7,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          subject: true,
          status: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
        },
      }),
      // By category
      prisma.contactMessage.groupBy({
        by: ["category"],
        _count: { category: true },
        where: { category: { not: null } },
      }),
      // By priority
      prisma.contactMessage.groupBy({
        by: ["priority"],
        _count: { priority: true },
        where: { priority: { not: null } },
      }),
      // For response time calculation
      prisma.contactMessage.findMany({
        where: {
          lastRepliedAt: { not: null },
          replies: { some: {} },
        },
        select: {
          createdAt: true,
          lastRepliedAt: true,
        },
      }),
      // Monthly trends using raw SQL for proper month grouping
      // (the previous groupBy on createdAt grouped by exact timestamp which is useless)
      prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
        SELECT TO_CHAR("createdAt", 'YYYY-MM') AS month, COUNT(*)::bigint AS count
        FROM "contact_messages"
        WHERE "createdAt" >= ${sixMonthsAgo}
        GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
        ORDER BY month ASC
      `,
    ]);

    // Calculate average response time
    let averageResponseTime = 0;
    if (contactsWithReplies.length > 0) {
      const totalResponseTime = contactsWithReplies.reduce(
        (acc: number, contact: { createdAt: Date; lastRepliedAt: Date | null }) => {
          const responseTime =
            new Date(contact.lastRepliedAt as Date).getTime() -
            new Date(contact.createdAt).getTime();
          return acc + responseTime;
        },
        0,
      );
      averageResponseTime = Math.round(
        totalResponseTime / contactsWithReplies.length / (1000 * 60 * 60),
      ); // in hours
    }

    // Build monthly data for the last 6 months (fill gaps with zero)
    const trendMap = new Map<string, number>();
    for (const row of monthlyTrends) {
      trendMap.set(row.month, Number(row.count));
    }
    const monthlyData: Array<{ month: string; count: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthlyData.push({
        month: monthKey,
        count: trendMap.get(monthKey) || 0,
      });
    }

    return successResponse(
      {
        overview: {
          total: totalContacts,
          new: countMap["NEW"] || 0,
          open: countMap["OPEN"] || 0,
          resolved: countMap["RESOLVED"] || 0,
          archived: countMap["ARCHIVED"] || 0,
        },
        recentActivity: recentContacts.map((contact) => ({
          id: contact.id,
          subject: contact.subject,
          status: contact.status,
          createdAt: contact.createdAt,
          userName: contact.user.name,
          userEmail: contact.user.email,
        })),
        categories: contactsByCategory.map((item) => ({
          category: item.category,
          count: item._count.category,
        })),
        priorities: contactsByPriority.map((item) => ({
          priority: item.priority,
          count: item._count.priority,
        })),
        metrics: {
          averageResponseTime,
          totalContacts,
          responseRate:
            totalContacts > 0
              ? Math.round((contactsWithReplies.length / totalContacts) * 100)
              : 0,
        },
        trends: monthlyData,
      },
      "Contact statistics retrieved successfully",
    );
  } catch (error) {
    console.error("Error fetching contact statistics:", error);
    return successResponse(
      {
        overview: { total: 0, new: 0, open: 0, resolved: 0, archived: 0 },
        recentActivity: [],
        categories: [],
        priorities: [],
        metrics: { averageResponseTime: 0, totalContacts: 0, responseRate: 0 },
        trends: [],
      },
      "Contact statistics retrieved successfully",
    );
  }
}


export const GET = withMiddleware(getContactStatsHandler, {
  requireAuth: true,
  requireAdmin: true,
  validateContentType: false,
});
