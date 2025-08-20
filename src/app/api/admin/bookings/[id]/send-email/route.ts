import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';

// POST - Send various types of emails
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const bookingId = params.id;
    const body = await request.json();
    const { type, additionalData } = body;

    // Get booking with user info
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: 'Booking not found' },
        { status: 404 }
      );
    }

    let emailSent = false;
    let emailType = '';

    switch (type) {
      case 'confirmation':
        emailSent = await sendConfirmationEmail(booking);
        emailType = 'Confirmation';
        break;

      case 'delivery':
        emailSent = await sendDeliveryEmail(booking);
        emailType = 'Delivery Information';
        break;

      case 'reminder':
        emailSent = await sendReminderEmail(booking);
        emailType = 'Reminder';
        break;

      case 'payment':
        emailSent = await sendPaymentReminderEmail(booking);
        emailType = 'Payment Reminder';
        break;

      case 'cancellation':
        const { reason } = additionalData || {};
        emailSent = await sendCancellationEmail(booking, reason);
        emailType = 'Cancellation';
        break;

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid email type' },
          { status: 400 }
        );
    }

    if (emailSent) {
      // Create email event in booking history
      await prisma.bookingEvent.create({
        data: {
          bookingId: bookingId,
          status: booking.status,
          title: `${emailType} Email Sent`,
          description: `${emailType} email sent to ${booking.user.email}`,
          createdAt: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        message: `${emailType} email sent successfully`
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'Failed to send email' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Failed to send email:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to send email' },
      { status: 500 }
    );
  }
}

// Email sending functions
async function sendConfirmationEmail(booking: any) {
  const subject = `Booking Confirmation - ${booking.id}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4f46e5;">Booking Confirmation</h2>
      <p>Dear ${booking.user.name},</p>
      <p>Your gas cylinder booking has been confirmed!</p>
      
      <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Booking Details:</h3>
        <p><strong>Booking ID:</strong> ${booking.id}</p>
        <p><strong>Quantity:</strong> ${booking.quantity} cylinder(s)</p>
        <p><strong>Payment Method:</strong> ${booking.paymentMethod}</p>
        <p><strong>Expected Delivery:</strong> ${booking.expectedDate ? new Date(booking.expectedDate).toLocaleDateString() : 'To be scheduled'}</p>
      </div>

      <p>We will notify you once your delivery is scheduled.</p>
      <p>Thank you for choosing our service!</p>
    </div>
  `;

  return await sendEmail(booking.user.email, subject, html);
}

async function sendDeliveryEmail(booking: any) {
  const subject = `Delivery Information - ${booking.id}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #059669;">Delivery Information</h2>
      <p>Dear ${booking.user.name},</p>
      <p>Your gas cylinder delivery has been scheduled!</p>
      
      <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Delivery Details:</h3>
        <p><strong>Booking ID:</strong> ${booking.id}</p>
        <p><strong>Quantity:</strong> ${booking.quantity} cylinder(s)</p>
        <p><strong>Delivery Address:</strong> ${booking.userAddress}</p>
        <p><strong>Expected Date:</strong> ${booking.expectedDate ? new Date(booking.expectedDate).toLocaleDateString() : 'To be confirmed'}</p>
      </div>

      <p>Please ensure someone is available to receive the delivery.</p>
      <p>Thank you!</p>
    </div>
  `;

  return await sendEmail(booking.user.email, subject, html);
}

async function sendReminderEmail(booking: any) {
  const subject = `Delivery Reminder - ${booking.id}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #d97706;">Delivery Reminder</h2>
      <p>Dear ${booking.user.name},</p>
      <p>This is a friendly reminder about your upcoming gas cylinder delivery.</p>
      
      <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Booking Details:</h3>
        <p><strong>Booking ID:</strong> ${booking.id}</p>
        <p><strong>Quantity:</strong> ${booking.quantity} cylinder(s)</p>
        <p><strong>Expected Delivery:</strong> ${booking.expectedDate ? new Date(booking.expectedDate).toLocaleDateString() : 'To be scheduled'}</p>
      </div>

      <p>Please ensure someone is available to receive the delivery.</p>
      <p>Thank you!</p>
    </div>
  `;

  return await sendEmail(booking.user.email, subject, html);
}

async function sendPaymentReminderEmail(booking: any) {
  const subject = `Payment Reminder - ${booking.id}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Payment Reminder</h2>
      <p>Dear ${booking.user.name},</p>
      <p>Your gas cylinder booking is pending payment completion.</p>
      
      <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Payment Details:</h3>
        <p><strong>Booking ID:</strong> ${booking.id}</p>
        <p><strong>Amount Due:</strong> ₹${(booking.payments[0]?.amount || 0)}</p>
        <p><strong>Payment Method:</strong> ${booking.paymentMethod}</p>
        <p><strong>Status:</strong> Pending</p>
      </div>

      <p>Please complete your payment to proceed with the delivery.</p>
      <p>If you have any questions, please contact our support team.</p>
      <p>Thank you!</p>
    </div>
  `;

  return await sendEmail(booking.user.email, subject, html);
}

async function sendCancellationEmail(booking: any, reason?: string) {
  const subject = `Booking Cancellation - ${booking.id}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Booking Cancellation</h2>
      <p>Dear ${booking.user.name},</p>
      <p>Your gas cylinder booking has been cancelled.</p>
      
      <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Booking Details:</h3>
        <p><strong>Booking ID:</strong> ${booking.id}</p>
        <p><strong>Quantity:</strong> ${booking.quantity} cylinder(s)</p>
        <p><strong>Cancellation Reason:</strong> ${reason || 'Not specified'}</p>
      </div>

      <p>If you have any questions about this cancellation, please contact our support team.</p>
      <p>We apologize for any inconvenience caused.</p>
      <p>Thank you for understanding.</p>
    </div>
  `;

  return await sendEmail(booking.user.email, subject, html);
}
