import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET - Fetch payments for a specific booking
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const bookingId = params.id;

    // Get payments for the booking
    const payments = await prisma.payment.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Failed to fetch payments:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}
