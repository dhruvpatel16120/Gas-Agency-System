import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { withMiddleware, parseRequestBody, successResponse } from '@/lib/api-middleware';
import { NotFoundError, ConflictError } from '@/lib/error-handler';
import crypto from 'crypto';
import { sendEmailVerification, sendPasswordResetEmail } from '@/lib/email';

async function postActionHandler(request: NextRequest, context?: Record<string, unknown>) {
  const paramsPromise = (context as any)?.params as Promise<{ id?: string }> | { id?: string } | undefined;
  const { id } = paramsPromise ? (typeof (paramsPromise as any).then === 'function' ? await (paramsPromise as Promise<{ id?: string }>) : (paramsPromise as { id?: string })) : { id: undefined };
  if (!id) throw new NotFoundError('User ID is required');

  const { action } = await parseRequestBody<{ action: string }>(request);
  if (!action) throw new ConflictError('Action is required');

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, name: true } });
  if (!user) throw new NotFoundError('User not found');

  if (action === 'resendVerification') {
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await prisma.user.update({ where: { id: user.id }, data: { emailVerificationToken: token, emailVerificationExpiry: expiry } });
    await sendEmailVerification(user.email, user.name, token);
    return successResponse(null, 'Verification email sent');
  }

  if (action === 'sendPasswordReset') {
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.user.update({ where: { id: user.id }, data: { resetToken: token, resetTokenExpiry: expiry } });
    await sendPasswordResetEmail(user.email, user.name, token);
    return successResponse(null, 'Password reset email sent');
  }

  throw new ConflictError('Unknown action');
}

export const POST = withMiddleware(postActionHandler, { requireAuth: true, requireAdmin: true, validateContentType: true });


