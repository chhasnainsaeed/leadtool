import { NextRequest, NextResponse } from 'next/server';
import { getLeadById } from '@/lib/storage';
import { generateEmail } from '@/lib/ai';
import { buildWhatsAppMessage, checkWhatsAppAvailability } from '@/lib/whatsapp';
import { normalizePhoneE164, e164ToWaPhone } from '@/lib/phone';

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

    const e164 = normalizePhoneE164(lead.phone, lead.country);
    if (!e164) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 });
    }

    const waAvailable = checkWhatsAppAvailability(e164, lead.country);
    if (waAvailable === false) {
      return NextResponse.json({ error: 'This number appears to be a landline — WhatsApp not available' }, { status: 400 });
    }

    const emailContent = await generateEmail(lead, lead.auditData);
    const message = buildWhatsAppMessage(lead.businessName, emailContent.body);
    const waLink = `whatsapp://send?phone=${e164ToWaPhone(e164)}&text=${encodeURIComponent(message)}`;

    return NextResponse.json({
      ok: true,
      waLink,
      phone: e164,
      message,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create WhatsApp link';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
