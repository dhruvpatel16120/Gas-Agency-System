import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { withMiddleware, successResponse } from '@/lib/api-middleware';

async function getActiveDeliveriesHandler(request: NextRequest) {
  try {
    // Get all active deliveries (not delivered or failed)
    const activeDeliveries = await (prisma as any).deliveryAssignment.findMany({
      where: {
        status: {
          notIn: ['DELIVERED', 'FAILED']
        }
      },
      include: {
        booking: {
          select: {
            userName: true,
            userPhone: true,
            userEmail: true,
            userAddress: true,
            quantity: true,
            deliveryDate: true
          }
        },
        partner: {
          select: {
            name: true,
            phone: true
          }
        }
      },
      orderBy: {
        assignedAt: 'asc'
      }
    });

    // Transform the data to match the expected format
    const transformedDeliveries = activeDeliveries.map((delivery: any) => ({
      id: delivery.id,
      bookingId: delivery.bookingId,
      customerName: delivery.booking.userName,
      customerPhone: delivery.booking.userPhone,
      customerEmail: delivery.booking.userEmail,
      address: delivery.booking.userAddress,
      quantity: delivery.booking.quantity,
      status: delivery.status,
      partnerId: delivery.partnerId,
      partnerName: delivery.partner?.name || 'Unassigned',
      partnerPhone: delivery.partner?.phone || '',
      assignedAt: delivery.assignedAt,
      expectedDelivery: delivery.scheduledDate || delivery.booking.deliveryDate || delivery.assignedAt,
      notes: delivery.notes,
      priority: delivery.priority || 'MEDIUM'
    }));

    return successResponse(transformedDeliveries);
  } catch (error) {
    console.error('Error getting active deliveries:', error);
    return successResponse([]);
  }
}

export const GET = withMiddleware(getActiveDeliveriesHandler, { 
  requireAuth: true, 
  requireAdmin: true, 
  validateContentType: false 
});
