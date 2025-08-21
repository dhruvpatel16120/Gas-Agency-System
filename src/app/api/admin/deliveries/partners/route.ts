import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  withMiddleware,
  parseRequestBody,
  successResponse,
} from "@/lib/api-middleware";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const listQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? Math.min(100, parseInt(v, 10)) : 10)),
  search: z.string().optional(),
  isActive: z
    .string()
    .optional()
    .transform((v) =>
      v === "true" ? true : v === "false" ? false : undefined,
    ),
  includeStats: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

const createSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(6).max(20),
  email: z
    .string()
    .email()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  vehicleNumber: z.string().max(50).optional(),
  serviceArea: z.string().max(120).optional(),
  capacityPerDay: z.number().int().min(1).max(500).optional().default(20),
  isActive: z.boolean().optional().default(true),
});

async function listPartnersHandler(request: NextRequest) {
  const url = new URL(request.url);
  const parsed = listQuerySchema.parse(
    Object.fromEntries(url.searchParams.entries()),
  );
  const where: Prisma.DeliveryPartnerWhereInput = {};
  if (parsed.search) {
    where.OR = [
      { name: { contains: parsed.search, mode: "insensitive" } },
      { phone: { contains: parsed.search, mode: "insensitive" } },
      { email: { contains: parsed.search, mode: "insensitive" } },
      { serviceArea: { contains: parsed.search, mode: "insensitive" } },
    ];
  }
  if (typeof parsed.isActive === "boolean") where.isActive = parsed.isActive;

  const total = await prisma.deliveryPartner.count({ where });
  const data = await prisma.deliveryPartner.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (parsed.page - 1) * parsed.limit,
    take: parsed.limit,
  });

  // If stats are requested, enhance the data with delivery statistics
  if (parsed.includeStats) {
    const enhancedData = await Promise.all(
      data.map(async (partner) => {
        // Get delivery statistics for this partner
        const totalDeliveries = await prisma.deliveryAssignment.count({
          where: { partnerId: partner.id },
        });

        const completedDeliveries = await prisma.deliveryAssignment.count({
          where: {
            partnerId: partner.id,
            status: "DELIVERED",
          },
        });

        // Get current assignments for today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const currentAssignments = await prisma.deliveryAssignment.count({
          where: {
            partnerId: partner.id,
            assignedAt: {
              gte: today,
            },
            status: {
              notIn: ["DELIVERED", "FAILED"],
            },
          },
        });

        // Calculate average rating (mock for now, can be enhanced)
        const averageRating = 4.5;

        // Get last active date
        const lastAssignment = await prisma.deliveryAssignment.findFirst({
          where: { partnerId: partner.id },
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true },
        });

        const lastActive = lastAssignment?.updatedAt || partner.createdAt;

        return {
          ...partner,
          totalDeliveries,
          completedDeliveries,
          currentAssignments,
          averageRating,
          lastActive,
        };
      }),
    );

    return successResponse(
      {
        data: enhancedData,
        pagination: {
          page: parsed.page,
          limit: parsed.limit,
          total,
          totalPages: Math.ceil(total / parsed.limit),
        },
      },
      "Delivery partners retrieved with stats",
    );
  }

  return successResponse(
    {
      data,
      pagination: {
        page: parsed.page,
        limit: parsed.limit,
        total,
        totalPages: Math.ceil(total / parsed.limit),
      },
    },
    "Delivery partners retrieved",
  );
}

async function createPartnerHandler(request: NextRequest) {
  const body = await parseRequestBody(request);
  const payload = createSchema.parse(body);
  const created = await prisma.deliveryPartner.create({ data: payload });
  return successResponse(created, "Delivery partner created", 201);
}

export const GET = withMiddleware(listPartnersHandler, {
  requireAuth: true,
  requireAdmin: true,
  validateContentType: false,
});
export const POST = withMiddleware(createPartnerHandler, {
  requireAuth: true,
  requireAdmin: true,
  validateContentType: true,
});
