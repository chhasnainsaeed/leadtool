import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mailer';
import { updateLead } from '@/lib/storage';

export async function POST(req: NextRequest) {
  try {
    const { leadId, to, subject, body } = await req.json() as {
      leadId: string;
      to: string;
      subject: string;
      body: string;
    };

    if (!to || !subject || !body) {
      return NextResponse.json({ error: 'to, subject, and body are required' }, { status: 400 });
    }

    await sendEmail({ to, subject, body });

    if (leadId) {
      updateLead(leadId, {
        email: to,
        emailSent: true,
        emailSentAt: new Date().toISOString(),
        status: 'sent',
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send email';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
