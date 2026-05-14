import { NextResponse } from 'next/server';
import { verifyConnection } from '@/lib/mailer';

export async function GET() {
  const result = await verifyConnection();
  const host = process.env.SMTP_HOST || '';
  const port = Number(process.env.SMTP_PORT || 0);
  const secure = process.env.SMTP_SECURE === 'true';
  return NextResponse.json({
    ...result,
    config: {
      host,
      port,
      secure,
      hasUser: Boolean(process.env.SMTP_USER),
      hasPass: Boolean(process.env.SMTP_PASS),
    },
  });
}
