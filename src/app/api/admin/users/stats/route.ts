import { withMiddleware, successResponse } from "@/lib/api-middleware";
import { prisma } from "@/lib/db";

async function statsHandler() {
  const [totalUsers, admins, users, withQuotaLow, totalBookings] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { role: "USER" } }),
      prisma.user.count({ where: { remainingQuota: { lte: 2 } } }),
      prisma.booking.count(),
    ]);
  return successResponse(
    { totalUsers, admins, users, withQuotaLow, totalBookings },
    "User stats",
  );
}

export const GET = withMiddleware(statsHandler, {
  requireAuth: true,
  requireAdmin: true,
  validateContentType: false,
});
