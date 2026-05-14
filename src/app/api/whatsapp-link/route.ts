import { NextRequest, NextResponse } from 'next/server';
import { getLeadById } from '@/lib/storage';
import { generateEmail } from '@/lib/ai';

function normalizePhoneForWa(raw: string): string {
  return raw.replace(/[^\d]/g, '');
}

function buildWhatsAppMessage(leadName: string, emailBody: string): string {
  const firstLine = emailBody
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 4)
    .join(' ');

  return `Hi ${leadName}, ${firstLine} If you want, I can share a quick free website concept here.`;
}

export async function POST(req: NextRequest) {
  try {
    const { leadId } = (await req.json()) as { leadId?: string };
    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 });
    }

    const lead = getLeadById(leadId);
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
    if (!lead.phone) {
      return NextResponse.json({ error: 'Lead has no phone number' }, { status: 400 });
    }

    const phone = normalizePhoneForWa(lead.phone);
    if (!phone) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
    }

    const emailContent = await generateEmail(lead, lead.auditData);
    const message = buildWhatsAppMessage(lead.businessName, emailContent.body);
    const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    return NextResponse.json({
      ok: true,
      waLink,
      phone,
      message,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create WhatsApp link';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
