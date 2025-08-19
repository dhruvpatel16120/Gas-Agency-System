import nodemailer from 'nodemailer';
import { EmailData, EmailTemplate } from '@/types';

// Create transporter for Gmail SMTP
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

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

// Send email function
export const sendEmail = async (emailData: EmailData): Promise<boolean> => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_SERVER_USER,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text || emailData.html.replace(/<[^>]*>/g, ''),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
};

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
