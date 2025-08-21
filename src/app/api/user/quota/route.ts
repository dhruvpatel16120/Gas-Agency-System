import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, successResponse } from "@/lib/api-middleware";

// GET - Get user's remaining quota
async function getQuotaHandler(
  request: NextRequest,
  context?: Record<string, unknown>,
) {
  const session = context?.session as { user: { id: string } } | undefined;
  if (!session?.user?.id) {
    throw new Error("Session not found");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      remainingQuota: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return successResponse(
    { remainingQuota: user.remainingQuota },
    "Quota retrieved successfully",
  );
}

// Export with middleware
export const GET = withAuth(getQuotaHandler);
