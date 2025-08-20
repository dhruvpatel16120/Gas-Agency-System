import { NextRequest } from 'next/server';
import { withMiddleware, successResponse } from '@/lib/api-middleware';
import { verifyEmailConnection } from '@/lib/email';

async function getEmailDiagnostics(_request: NextRequest) {
  const requiredEnv = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'NEXTAUTH_URL', 'EMAIL_SERVER_HOST', 'EMAIL_SERVER_PORT', 'EMAIL_SERVER_USER', 'EMAIL_SERVER_PASSWORD', 'EMAIL_FROM'] as const;
  const envStatus = Object.fromEntries(requiredEnv.map((key) => [key, Boolean(process.env[key])]));

  const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_SERVER_PORT || '587');
  const secure = (process.env.SMTP_SECURE === 'true') || (process.env.EMAIL_SERVER_SECURE === 'true') || port === 465;

  const verified = await verifyEmailConnection();

  return successResponse(
    {
      verified,
      envPresent: envStatus,
      host: process.env.SMTP_HOST || process.env.EMAIL_SERVER_HOST || null,
      port,
      secure,
    },
    'SMTP diagnostics'
  );
}

export const GET = withMiddleware(getEmailDiagnostics, { requireAuth: true, requireAdmin: true, validateContentType: false });


