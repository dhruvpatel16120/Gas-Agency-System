import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

// POST - Send various types of emails
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id: bookingId } = await params;
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
            phone: true,
          },
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found" },
        { status: 404 },
      );
    }

    let emailSent = false;
    let emailType = "";

    switch (type) {
      case "confirmation":
        emailSent = await sendConfirmationEmail(booking);
        emailType = "Confirmation";
        break;

      case "delivery":
        emailSent = await sendDeliveryEmail(booking);
        emailType = "Delivery Information";
        break;

      case "reminder":
        emailSent = await sendReminderEmail(booking);
        emailType = "Reminder";
        break;

      case "payment":
        emailSent = await sendPaymentReminderEmail(booking);
        emailType = "Payment Reminder";
        break;

      case "invoice":
        emailSent = await sendInvoiceEmailWithPDF(booking);
        emailType = "Invoice";
        break;

      case "cancellation":
        const { reason } = additionalData || {};
        emailSent = await sendCancellationEmail(booking, reason);
        emailType = "Cancellation";
        break;

      default:
        return NextResponse.json(
          { success: false, message: "Invalid email type" },
          { status: 400 },
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
          createdAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: `${emailType} email sent successfully`,
      });
    } else {
      return NextResponse.json(
        { success: false, message: "Failed to send email" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Failed to send email:", error);
    return NextResponse.json(
      { success: false, message: "Failed to send email" },
      { status: 500 },
    );
  }
}

// Email sending functions
type EmailBooking = {
  id: string;
  quantity: number;
  paymentMethod: string;
  expectedDate?: Date | string | null;
  userAddress?: string | null;
  user: { name: string; email: string; phone?: string | null };
  payments: Array<{ amount: number }>;
};

async function sendConfirmationEmail(booking: EmailBooking) {
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
        <p><strong>Expected Delivery:</strong> ${booking.expectedDate ? new Date(booking.expectedDate).toLocaleDateString() : "To be scheduled"}</p>
      </div>

      <p>We will notify you once your delivery is scheduled.</p>
      <p>Thank you for choosing our service!</p>
    </div>
  `;

  return await sendEmail(booking.user.email, subject, html);
}

async function sendDeliveryEmail(booking: EmailBooking) {
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
        <p><strong>Expected Date:</strong> ${booking.expectedDate ? new Date(booking.expectedDate).toLocaleDateString() : "To be confirmed"}</p>
      </div>

      <p>Please ensure someone is available to receive the delivery.</p>
      <p>Thank you!</p>
    </div>
  `;

  return await sendEmail(booking.user.email, subject, html);
}

async function sendReminderEmail(booking: EmailBooking) {
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
        <p><strong>Expected Delivery:</strong> ${booking.expectedDate ? new Date(booking.expectedDate).toLocaleDateString() : "To be scheduled"}</p>
      </div>

      <p>Please ensure someone is available to receive the delivery.</p>
      <p>Thank you!</p>
    </div>
  `;

  return await sendEmail(booking.user.email, subject, html);
}

async function sendPaymentReminderEmail(booking: EmailBooking) {
  const subject = `Payment Reminder - ${booking.id}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Payment Reminder</h2>
      <p>Dear ${booking.user.name},</p>
      <p>Your gas cylinder booking is pending payment completion.</p>
      
      <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Payment Details:</h3>
        <p><strong>Booking ID:</strong> ${booking.id}</p>
        <p><strong>Amount Due:</strong> ₹${booking.payments[0]?.amount || 0}</p>
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

async function sendCancellationEmail(booking: EmailBooking, reason?: string) {
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
        <p><strong>Cancellation Reason:</strong> ${reason || "Not specified"}</p>
      </div>

      <p>If you have any questions about this cancellation, please contact our support team.</p>
      <p>We apologize for any inconvenience caused.</p>
      <p>Thank you for understanding.</p>
    </div>
  `;

  return await sendEmail(booking.user.email, subject, html);
}

async function sendInvoiceEmailWithPDF(booking: EmailBooking) {
  try {
    // Create a simple invoice HTML
    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice - ${booking.id}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .invoice-details { margin-bottom: 30px; }
          .customer-details { margin-bottom: 30px; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .items-table th, .items-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          .total { text-align: right; font-weight: bold; font-size: 18px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Gas Agency System</h1>
          <h2>Invoice</h2>
        </div>
        
        <div class="invoice-details">
          <p><strong>Invoice Number:</strong> INV-${booking.id.slice(-8).toUpperCase()}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>Booking ID:</strong> ${booking.id}</p>
        </div>
        
        <div class="customer-details">
          <p><strong>Customer:</strong> ${booking.user.name}</p>
          <p><strong>Email:</strong> ${booking.user.email}</p>
          <p><strong>Phone:</strong> ${booking.user.phone}</p>
          <p><strong>Address:</strong> ${booking.userAddress}</p>
        </div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Gas Cylinder (14.2 kg)</td>
              <td>${booking.quantity}</td>
              <td>₹1,100</td>
              <td>₹${(booking.quantity * 1100).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
        
        <div class="total">
          <p>Total Amount: ₹${(booking.quantity * 1100).toLocaleString()}</p>
        </div>
        
        <div style="margin-top: 40px; text-align: center; color: #666;">
          <p>Thank you for your business!</p>
          <p>Gas Agency System</p>
        </div>
      </body>
      </html>
    `;

    // For now, send a simple HTML email since we don't have PDF generation
    // In a real implementation, you would convert this HTML to PDF using a library like Puppeteer
    const subject = `Invoice for Your Gas Cylinder Delivery - Booking ${booking.id}`;

    return await sendEmail(booking.user.email, subject, invoiceHtml);
  } catch (error) {
    console.error("Failed to send invoice email:", error);
    return false;
  }
}
