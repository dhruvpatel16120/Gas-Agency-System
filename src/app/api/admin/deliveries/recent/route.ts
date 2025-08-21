import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { withMiddleware, successResponse } from "@/lib/api-middleware";

async function getRecentDeliveriesHandler(_request: NextRequest) {
  void _request;
  try {
    // Get recent deliveries with customer and partner information
    const recentDeliveries = await prisma.deliveryAssignment.findMany({
      take: 10,
      orderBy: {
        assignedAt: "desc",
      },
      include: {
        booking: {
          select: {
            userName: true,
            userPhone: true,
            userEmail: true,
            userAddress: true,
            quantity: true,
            deliveryDate: true,
          },
        },
        partner: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    });

    // Transform the data to match the expected format
    const transformedDeliveries = recentDeliveries.map((delivery) => ({
      id: delivery.id,
      bookingId: delivery.bookingId,
      customerName: delivery.booking.userName,
      customerPhone: delivery.booking.userPhone,
      customerEmail: delivery.booking.userEmail,
      address: delivery.booking.userAddress,
      quantity: delivery.booking.quantity,
      status: delivery.status,
      partnerId: delivery.partnerId,
      partnerName: delivery.partner?.name || "Unassigned",
      partnerPhone: delivery.partner?.phone || "",
      assignedAt: delivery.assignedAt,
      expectedDelivery:
        delivery.scheduledDate ||
        delivery.booking.deliveryDate ||
        delivery.assignedAt,
      notes: delivery.notes,
      priority: delivery.priority || "MEDIUM",
    }));

    return successResponse(transformedDeliveries);
  } catch (error) {
    console.error("Error getting recent deliveries:", error);
    return successResponse([]);
  }
}

export const GET = withMiddleware(getRecentDeliveriesHandler, {
  requireAuth: true,
  requireAdmin: true,
  validateContentType: false,
});
