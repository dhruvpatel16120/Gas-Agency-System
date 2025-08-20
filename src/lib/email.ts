import nodemailer from 'nodemailer';
import { EmailData, EmailTemplate } from '@/types';

// Email configuration - supports both SMTP_* and EMAIL_SERVER_* env names
const envHost = process.env.SMTP_HOST || process.env.EMAIL_SERVER_HOST || 'smtp.gmail.com';
const envPortStr = process.env.SMTP_PORT || process.env.EMAIL_SERVER_PORT || '587';
const envUser = process.env.SMTP_USER || process.env.EMAIL_SERVER_USER || '';
const envPass = process.env.SMTP_PASS || process.env.EMAIL_SERVER_PASSWORD || '';
const envFrom = process.env.SMTP_FROM || process.env.EMAIL_FROM || envUser;
const hasSmtpCreds = Boolean(
  (process.env.SMTP_USER && process.env.SMTP_PASS) ||
  (process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_PASSWORD)
);

const resolvedPort = parseInt(envPortStr);
const resolvedSecure = (process.env.SMTP_SECURE === 'true') || (process.env.EMAIL_SERVER_SECURE === 'true') || resolvedPort === 465;

const emailConfig = {
  host: envHost,
  port: resolvedPort,
  secure: resolvedSecure,
  auth: {
    user: envUser,
    pass: envPass,
  },
};

// Create transporter
const transporter = nodemailer.createTransport(emailConfig);

// Verify transporter connection
export const verifyEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log('Email server connection verified');
    return true;
  } catch (error) {
    console.error('Email server connection failed:', error);
    return false;
  }
};

// Send email function (supports both legacy object signature and positional args)
export async function sendEmail(
  toOrData: string | { to: string; subject: string; html: string; text?: string },
  subjectArg?: string,
  htmlArg?: string,
  textArg?: string
): Promise<boolean> {
  try {
    let to: string;
    let subject: string;
    let html: string;
    let text: string | undefined;

    if (typeof toOrData === 'string') {
      to = toOrData;
      subject = subjectArg || '';
      html = htmlArg || '';
      text = textArg;
    } else if (toOrData && typeof toOrData === 'object') {
      to = toOrData.to;
      subject = toOrData.subject;
      html = toOrData.html;
      text = toOrData.text;
    } else {
      console.error('sendEmail called with invalid arguments');
      return false;
    }

    if (!to || !subject || !html) {
      console.error('sendEmail missing required fields', { hasTo: !!to, hasSubject: !!subject, hasHtml: !!html });
      return false;
    }

    // If no SMTP credentials, log the email instead
    if (!hasSmtpCreds) {
      console.warn('SMTP credentials are not configured (set SMTP_USER/SMTP_PASS or EMAIL_SERVER_USER/EMAIL_SERVER_PASSWORD). Emails will not be delivered.');
      console.log('=== EMAIL WOULD BE SENT ===');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('HTML length:', html.length);
      console.log('===========================');
      return true; // Simulate success for development
    }

    const mailOptions = {
      from: envFrom,
      to,
      subject,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

// Send payment reminder email
export async function sendPaymentReminder(
  userEmail: string,
  userName: string,
  bookingId: string,
  amount: number,
  paymentMethod: string
): Promise<boolean> {
  const subject = `Payment Reminder - Booking ${bookingId}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Payment Reminder</h2>
      <p>Dear ${userName},</p>
      <p>Your gas cylinder booking is pending payment completion.</p>
      
      <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Payment Details:</h3>
        <p><strong>Booking ID:</strong> ${bookingId}</p>
        <p><strong>Amount Due:</strong> ₹${amount}</p>
        <p><strong>Payment Method:</strong> ${paymentMethod}</p>
        <p><strong>Status:</strong> Pending</p>
      </div>

      <p>Please complete your payment to proceed with the delivery.</p>
      <p>If you have any questions, please contact our support team.</p>
      <p>Thank you!</p>
    </div>
  `;

  return await sendEmail(userEmail, subject, html);
}

// Send cancellation email with reason
export async function sendCancellationEmail(
  userEmail: string,
  userName: string,
  bookingId: string,
  reason: string
): Promise<boolean> {
  const subject = `Booking Cancellation - ${bookingId}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">Booking Cancellation</h2>
      <p>Dear ${userName},</p>
      <p>Your gas cylinder booking has been cancelled.</p>
      
      <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Cancellation Details:</h3>
        <p><strong>Booking ID:</strong> ${bookingId}</p>
        <p><strong>Cancellation Reason:</strong> ${reason}</p>
      </div>

      <p>If you have any questions about this cancellation, please contact our support team.</p>
      <p>We apologize for any inconvenience caused.</p>
      <p>Thank you for understanding.</p>
    </div>
  `;

  return await sendEmail(userEmail, subject, html);
}

// Send delivery status update email
export async function sendDeliveryStatusEmail(
  userEmail: string,
  userName: string,
  bookingId: string,
  status: string,
  additionalInfo?: string
): Promise<boolean> {
  const subject = `Delivery Status Update - ${bookingId}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #059669;">Delivery Status Update</h2>
      <p>Dear ${userName},</p>
      <p>Your gas cylinder delivery status has been updated.</p>
      
      <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Status Update:</h3>
        <p><strong>Booking ID:</strong> ${bookingId}</p>
        <p><strong>New Status:</strong> ${status}</p>
        ${additionalInfo ? `<p><strong>Additional Info:</strong> ${additionalInfo}</p>` : ''}
      </div>

      <p>We will keep you updated on any further changes.</p>
      <p>Thank you!</p>
    </div>
  `;

  return await sendEmail(userEmail, subject, html);
}

// Email templates
export const emailTemplates = {
  welcome: (userName: string): EmailTemplate => ({
    subject: 'Welcome to Gas Agency System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #006d3b;">Welcome to Gas Agency System!</h2>
        <p>Hello ${userName},</p>
        <p>Thank you for registering with our Gas Agency System. Your account has been successfully created.</p>
        <p>You can now:</p>
        <ul>
          <li>Book gas cylinders</li>
          <li>Track your bookings</li>
          <li>View your delivery history</li>
          <li>Manage your profile</li>
        </ul>
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <p>Best regards,<br>Gas Agency Team</p>
      </div>
    `,
    text: `Welcome to Gas Agency System! Hello ${userName}, Thank you for registering with our Gas Agency System. Your account has been successfully created.`,
  }),

  bookingConfirmationDetailed: (
    userName: string,
    details: {
      id: string;
      paymentMethod: string;
      quantity: number;
      receiverName: string;
      receiverPhone: string;
      expectedDate?: Date;
      notes?: string;
      userEmail: string;
      userPhone: string;
      userAddress: string;
    }
  ): EmailTemplate => ({
    subject: 'Booking Confirmation - Gas Agency System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
        <h2 style="color: #006d3b;">Booking Confirmation</h2>
        <p>Hello ${userName},</p>
        <p>Your gas cylinder booking has been submitted successfully. Below are your booking details:</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Booking ID:</strong> ${details.id}</p>
          <p><strong>Payment Method:</strong> ${details.paymentMethod}</p>
          <p><strong>Quantity:</strong> ${details.quantity}</p>
          <p><strong>Receiver Name:</strong> ${details.receiverName}</p>
          <p><strong>Receiver Phone:</strong> ${details.receiverPhone}</p>
          <p><strong>Expected Delivery:</strong> ${details.expectedDate ? details.expectedDate.toLocaleDateString() : 'Not specified'}</p>
          ${details.notes ? `<p><strong>Notes:</strong> ${details.notes}</p>` : ''}
        </div>
        <div style="background-color: #eef7ff; padding: 15px; border-radius: 8px; margin: 16px 0;">
          <p style="margin:0 0 8px 0;"><strong>Profile on File</strong></p>
          <p style="margin:2px 0;">Email: ${details.userEmail}</p>
          <p style="margin:2px 0;">Phone: ${details.userPhone}</p>
          <p style="margin:2px 0;">Address: ${details.userAddress}</p>
        </div>
        <p>We will notify you once your booking is approved and a definitive delivery date is scheduled.</p>
        <p>Thank you for choosing our service!</p>
        <p>Best regards,<br>Gas Agency Team</p>
      </div>
    `,
    text: `Booking Confirmation - Hello ${userName}. Booking ID: ${details.id}. Payment: ${details.paymentMethod}. Quantity: ${details.quantity}. Receiver: ${details.receiverName} (${details.receiverPhone}). Expected: ${details.expectedDate ? details.expectedDate.toLocaleDateString() : 'Not specified'}. Notes: ${details.notes || '-'} | Profile -> Email: ${details.userEmail}, Phone: ${details.userPhone}, Address: ${details.userAddress}`,
  }),

  bookingApproved: (userName: string, bookingId: string, deliveryDate: string): EmailTemplate => ({
    subject: 'Booking Approved - Gas Agency System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #006d3b;">Booking Approved!</h2>
        <p>Hello ${userName},</p>
        <p>Great news! Your gas cylinder booking has been approved.</p>
        <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Booking ID:</strong> ${bookingId}</p>
          <p><strong>Delivery Date:</strong> ${deliveryDate}</p>
          <p><strong>Status:</strong> Approved</p>
        </div>
        <p>Please ensure someone is available at your address on the delivery date.</p>
        <p>Thank you for your patience!</p>
        <p>Best regards,<br>Gas Agency Team</p>
      </div>
    `,
    text: `Booking Approved! - Hello ${userName}, Great news! Your gas cylinder booking has been approved. Booking ID: ${bookingId}, Delivery Date: ${deliveryDate}`,
  }),

  bookingDelivered: (userName: string, bookingId: string): EmailTemplate => ({
    subject: 'Cylinder Delivered - Gas Agency System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #006d3b;">Cylinder Delivered</h2>
        <p>Hello ${userName},</p>
        <p>Your gas cylinder has been successfully delivered!</p>
        <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Booking ID:</strong> ${bookingId}</p>
          <p><strong>Status:</strong> Delivered</p>
          <p><strong>Delivery Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        <p>Thank you for using our service. You can book another cylinder when needed.</p>
        <p>Best regards,<br>Gas Agency Team</p>
      </div>
    `,
    text: `Cylinder Delivered - Hello ${userName}, Your gas cylinder has been successfully delivered! Booking ID: ${bookingId}`,
  }),

  outForDelivery: (
    userName: string,
    bookingId: string,
    partner?: { name?: string; phone?: string }
  ): EmailTemplate => ({
    subject: 'Out for Delivery - Gas Agency System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #006d3b;">Your Cylinder Is Out for Delivery</h2>
        <p>Hello ${userName},</p>
        <p>Your gas cylinder is on its way.</p>
        <div style="background-color: #eef7ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Booking ID:</strong> ${bookingId}</p>
          <p><strong>Status:</strong> Out for Delivery</p>
          ${partner?.name ? `<p><strong>Delivery Partner:</strong> ${partner.name}</p>` : ''}
          ${partner?.phone ? `<p><strong>Contact:</strong> ${partner.phone}</p>` : ''}
        </div>
        <p>Please ensure someone is available to receive the delivery.</p>
        <p>Best regards,<br>Gas Agency Team</p>
      </div>
    `,
    text: `Out for Delivery - Hello ${userName}, Your cylinder for booking ${bookingId} is out for delivery.${partner?.name ? ` Partner: ${partner.name}.` : ''}${partner?.phone ? ` Contact: ${partner.phone}.` : ''}`,
  }),

  bookingCancelled: (userName: string, bookingId: string, cancelledBy: 'User' | 'Admin'): EmailTemplate => ({
    subject: 'Booking Cancelled - Gas Agency System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #b91c1c;">Booking Cancelled</h2>
        <p>Hello ${userName},</p>
        <p>Your booking has been cancelled by <strong>${cancelledBy}</strong>.</p>
        <div style="background-color: #fef2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Booking ID:</strong> ${bookingId}</p>
          <p><strong>Status:</strong> Cancelled</p>
        </div>
        <p>If this was a mistake, you can create a new booking at any time.</p>
        <p>Best regards,<br>Gas Agency Team</p>
      </div>
    `,
    text: `Booking Cancelled - Hello ${userName}, Your booking (${bookingId}) has been cancelled by ${cancelledBy}.`,
  }),

  passwordReset: (userName: string, resetLink: string): EmailTemplate => ({
    subject: 'Password Reset Request - Gas Agency System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #006d3b;">Password Reset Request</h2>
        <p>Hello ${userName},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background-color: #006d3b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        </div>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <p>This link will expire in 1 hour.</p>
        <p>Best regards,<br>Gas Agency Team</p>
      </div>
    `,
    text: `Password Reset Request - Hello ${userName}, We received a request to reset your password. Please visit: ${resetLink}`,
  }),

  emailVerification: (userName: string, verificationLink: string): EmailTemplate => ({
    subject: 'Email Verification - Gas Agency System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #006d3b;">Verify Your Email Address</h2>
        <p>Hello ${userName},</p>
        <p>Thank you for registering with Gas Agency System! Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #006d3b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
        </div>
        <p>This verification link will expire in 24 hours.</p>
        <p>If you didn't create an account, please ignore this email.</p>
        <p>Best regards,<br>Gas Agency Team</p>
      </div>
    `,
    text: `Email Verification - Hello ${userName}, Please verify your email address by visiting: ${verificationLink}`,
  }),
  bookingRequestReceived: (
    userName: string,
    details: {
      id: string;
      paymentMethod: string;
      quantity: number;
      receiverName?: string;
      receiverPhone?: string;
      expectedDate?: Date;
      notes?: string;
      userEmail?: string;
      userPhone?: string;
      userAddress?: string;
    }
  ): EmailTemplate => ({
    subject: 'Booking Request Received - Gas Agency System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
        <h2 style="color: #006d3b;">Booking Request Received</h2>
        <p>Hello ${userName},</p>
        <p>We have received your booking request. Our team will review it and notify you once it is approved.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Booking ID:</strong> ${details.id}</p>
          <p><strong>Payment Method:</strong> ${details.paymentMethod}</p>
          <p><strong>Quantity:</strong> ${details.quantity}</p>
          ${details.receiverName ? `<p><strong>Receiver Name:</strong> ${details.receiverName}</p>` : ''}
          ${details.receiverPhone ? `<p><strong>Receiver Phone:</strong> ${details.receiverPhone}</p>` : ''}
          <p><strong>Expected Delivery (requested):</strong> ${details.expectedDate ? details.expectedDate.toLocaleDateString() : 'Not specified'}</p>
          ${details.notes ? `<p><strong>Notes:</strong> ${details.notes}</p>` : ''}
        </div>
        <div style="background-color: #eef7ff; padding: 15px; border-radius: 8px; margin: 16px 0;">
          <p style="margin:0 0 8px 0;"><strong>Profile on File</strong></p>
          ${details.userEmail ? `<p style="margin:2px 0;">Email: ${details.userEmail}</p>` : ''}
          ${details.userPhone ? `<p style="margin:2px 0;">Phone: ${details.userPhone}</p>` : ''}
          ${details.userAddress ? `<p style="margin:2px 0;">Address: ${details.userAddress}</p>` : ''}
        </div>
        <p>This is not a confirmation. You will receive a separate confirmation email once your booking is approved.</p>
        <p>Best regards,<br>Gas Agency Team</p>
      </div>
    `,
    text: `Booking Request Received - Hello ${userName}. Booking ID: ${details.id}. Payment: ${details.paymentMethod}. Quantity: ${details.quantity}. Receiver: ${details.receiverName || '-'} (${details.receiverPhone || '-' }). Expected (requested): ${details.expectedDate ? details.expectedDate.toLocaleDateString() : 'Not specified'}. Notes: ${details.notes || '-'} | Profile -> Email: ${details.userEmail || '-'}, Phone: ${details.userPhone || '-'}, Address: ${details.userAddress || '-'}`,
  }),
  contactAcknowledgement: (
    userName: string,
    details: { subject: string }
  ): EmailTemplate => ({
    subject: 'We received your message - Gas Agency Support',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto;">
        <h2 style="color: #006d3b;">Thanks for contacting us</h2>
        <p>Hello ${userName},</p>
        <p>We've received your message regarding <strong>${details.subject}</strong>. Our support team will get back to you as soon as possible.</p>
        <p>If this is urgent, you can reply directly to this email.</p>
        <p>Best regards,<br/>Gas Agency Support Team</p>
      </div>
    `,
    text: `Thanks for contacting us. Hello ${userName}, we've received your message regarding ${details.subject}. Our support team will get back to you as soon as possible.`,
  }),
  contactAdminNotification: (
    payload: {
      fromName: string;
      fromEmail: string;
      subject: string;
      category?: string;
      priority?: string;
      relatedBookingId?: string;
      preferredContact?: string;
      phone?: string;
      message: string;
    }
  ): EmailTemplate => ({
    subject: `[Contact] ${payload.subject} - ${payload.fromName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 720px; margin: 0 auto;">
        <h2 style="color: #111827;">New Contact Form Submission</h2>
        <p><strong>From:</strong> ${payload.fromName} &lt;${payload.fromEmail}&gt;</p>
        ${payload.phone ? `<p><strong>Phone:</strong> ${payload.phone}</p>` : ''}
        <div style="background:#f3f4f6; padding:12px; border-radius:8px; margin:16px 0;">
          <p style="margin:4px 0;"><strong>Subject:</strong> ${payload.subject}</p>
          ${payload.category ? `<p style="margin:4px 0;"><strong>Category:</strong> ${payload.category}</p>` : ''}
          ${payload.priority ? `<p style="margin:4px 0;"><strong>Priority:</strong> ${payload.priority}</p>` : ''}
          ${payload.preferredContact ? `<p style="margin:4px 0;"><strong>Preferred Contact:</strong> ${payload.preferredContact}</p>` : ''}
          ${payload.relatedBookingId ? `<p style="margin:4px 0;"><strong>Related Booking:</strong> ${payload.relatedBookingId}</p>` : ''}
        </div>
        <div style="background:#ffffff; border:1px solid #e5e7eb; padding:12px; border-radius:8px;">
          <p style="margin:0 0 6px 0;"><strong>Message</strong></p>
          <pre style="white-space:pre-wrap; font-family:inherit; line-height:1.5;">${payload.message}</pre>
        </div>
      </div>
    `,
    text: `New Contact Submission\nFrom: ${payload.fromName} <${payload.fromEmail}>${payload.phone ? `\nPhone: ${payload.phone}` : ''}\nSubject: ${payload.subject}\n${payload.category ? `Category: ${payload.category}\n` : ''}${payload.priority ? `Priority: ${payload.priority}\n` : ''}${payload.preferredContact ? `Preferred Contact: ${payload.preferredContact}\n` : ''}${payload.relatedBookingId ? `Related Booking: ${payload.relatedBookingId}\n` : ''}\n\nMessage:\n${payload.message}`,
  }),
};

// Send welcome email
export const sendWelcomeEmail = async (email: string, userName: string): Promise<boolean> => {
  const template = emailTemplates.welcome(userName);
  return sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
};

// Send booking confirmation email
export const sendBookingConfirmationEmail = async (
  params:
    | {
        toEmail: string;
        userName: string;
        booking: {
          id: string;
          paymentMethod: string;
          quantity: number;
          receiverName: string;
          receiverPhone: string;
          expectedDate?: Date;
          notes?: string;
          userEmail: string;
          userPhone: string;
          userAddress: string;
        };
      }
    | {
        // Backward compatibility simple shape
        toEmail: string;
        userName: string;
        bookingId: string;
        paymentMethod: string;
      }
): Promise<boolean> => {
  if ('booking' in params) {
    const template = emailTemplates.bookingConfirmationDetailed(params.userName, {
      id: params.booking.id,
      paymentMethod: params.booking.paymentMethod,
      quantity: params.booking.quantity,
      receiverName: params.booking.receiverName,
      receiverPhone: params.booking.receiverPhone,
      expectedDate: params.booking.expectedDate,
      notes: params.booking.notes,
      userEmail: params.booking.userEmail,
      userPhone: params.booking.userPhone,
      userAddress: params.booking.userAddress,
    });
    return sendEmail({ to: params.toEmail, subject: template.subject, html: template.html, text: template.text });
  }
  const template = emailTemplates.bookingConfirmationDetailed(params.userName, {
    id: params.bookingId,
    paymentMethod: params.paymentMethod,
    quantity: 1,
    receiverName: '-',
    receiverPhone: '-',
    expectedDate: undefined,
    notes: undefined,
    userEmail: '-',
    userPhone: '-',
    userAddress: '-',
  });
  return sendEmail({ to: params.toEmail, subject: template.subject, html: template.html, text: template.text });
};

// Send booking request received email (pending approval)
export const sendBookingRequestEmail = async (
  params: {
    toEmail: string;
    userName: string;
    booking: {
      id: string;
      paymentMethod: string;
      quantity: number;
      receiverName?: string;
      receiverPhone?: string;
      expectedDate?: Date;
      notes?: string;
      userEmail?: string;
      userPhone?: string;
      userAddress?: string;
    };
  }
): Promise<boolean> => {
  const template = emailTemplates.bookingRequestReceived(params.userName, params.booking);
  return sendEmail({ to: params.toEmail, subject: template.subject, html: template.html, text: template.text });
};

// Send booking approval email
export const sendBookingApprovalEmail = async (
  email: string,
  userName: string,
  bookingId: string,
  deliveryDate: string
): Promise<boolean> => {
  const template = emailTemplates.bookingApproved(userName, bookingId, deliveryDate);
  return sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
};

// Send delivery confirmation email
export const sendDeliveryConfirmationEmail = async (
  email: string,
  userName: string,
  bookingId: string
): Promise<boolean> => {
  const template = emailTemplates.bookingDelivered(userName, bookingId);
  return sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
};

export const sendBookingCancellationEmail = async (
  email: string,
  userName: string,
  bookingId: string,
  cancelledBy: 'User' | 'Admin'
): Promise<boolean> => {
  const template = emailTemplates.bookingCancelled(userName, bookingId, cancelledBy);
  return sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
};

export const sendOutForDeliveryEmail = async (
  email: string,
  userName: string,
  bookingId: string,
  partner?: { name?: string; phone?: string }
): Promise<boolean> => {
  const template = emailTemplates.outForDelivery(userName, bookingId, partner);
  return sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
};

// Send password reset email
export const sendPasswordResetEmail = async (
  email: string,
  userName: string,
  resetToken: string
): Promise<boolean> => {
  const resetLink = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;
  const template = emailTemplates.passwordReset(userName, resetLink);
  return sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
};

// Send email verification
export const sendEmailVerification = async (
  email: string,
  userName: string,
  verificationToken: string
): Promise<boolean> => {
  const verificationLink = `${process.env.NEXTAUTH_URL}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
  const template = emailTemplates.emailVerification(userName, verificationLink);
  return sendEmail({
    to: email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
};

// Contact form emails
export const sendContactAcknowledgementEmail = async (
  toEmail: string,
  userName: string,
  subject: string
): Promise<boolean> => {
  const template = emailTemplates.contactAcknowledgement(userName, { subject });
  return sendEmail({ to: toEmail, subject: template.subject, html: template.html, text: template.text });
};

export const sendContactFormToAdmin = async (
  payload: {
    fromName: string;
    fromEmail: string;
    subject: string;
    category?: string;
    priority?: string;
    relatedBookingId?: string;
    preferredContact?: string;
    phone?: string;
    message: string;
  }
): Promise<boolean> => {
  const adminEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER || process.env.EMAIL_SERVER_USER;
  if (!adminEmail) {
    console.error('No SUPPORT_EMAIL or EMAIL_SERVER_USER configured');
    return false;
  }
  const template = emailTemplates.contactAdminNotification(payload);
  return sendEmail({ to: adminEmail, subject: template.subject, html: template.html, text: template.text });
};
