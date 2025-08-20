import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withMiddleware, successResponse } from '@/lib/api-middleware';

async function getPartnerDeliveriesHandler(request: NextRequest, context?: Record<string, unknown>): Promise<NextResponse> {
  try {
    const partnerId = (context as { params?: { id?: string } })?.params?.id || '';

    // Get delivery history for this partner
    const deliveries = await (prisma as any).deliveryAssignment.findMany({
      where: { partnerId },
      include: {
        booking: {
          select: {
            userName: true,
            userAddress: true,
            quantity: true
          }
        }
      },
      orderBy: { assignedAt: 'desc' },
      take: 50 // Limit to recent 50 deliveries
    });

    // Transform the data
    const transformedDeliveries = deliveries.map((delivery: any) => ({
      id: delivery.id,
      bookingId: delivery.bookingId,
      status: delivery.status,
      assignedAt: delivery.assignedAt,
      updatedAt: delivery.updatedAt,
      customerName: delivery.booking.userName,
      quantity: delivery.booking.quantity,
      address: delivery.booking.userAddress
    }));

    return successResponse(transformedDeliveries);
  } catch (error) {
    console.error('Error getting partner deliveries:', error);
    return successResponse([]);
  }
}

export const GET = withMiddleware(getPartnerDeliveriesHandler, { 
  requireAuth: true, 
  requireAdmin: true, 
  validateContentType: false 
});
