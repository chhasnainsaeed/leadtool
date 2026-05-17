import { NextRequest, NextResponse } from 'next/server';
import { generateEmail } from '@/lib/ai';
import { getLeadById, updateLead } from '@/lib/storage';
import { Lead } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const { leadId, lead: leadOverride } = await req.json() as { leadId?: string; lead?: Lead };

    let lead: Lead | undefined;
    if (leadId) {
      lead = await getLeadById(leadId);
      if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    } else if (leadOverride) {
      lead = leadOverride;
    } else {
      return NextResponse.json({ error: 'leadId or lead object is required' }, { status: 400 });
    }

    if (!lead.email) {
      return NextResponse.json({ error: 'Lead has no email; skip email generation.' }, { status: 400 });
    }
    const emailContent = await generateEmail(lead, lead.auditData);

    if (leadId) {
      await updateLead(leadId, { emailContent, status: 'email_generated' });
    }

    return NextResponse.json({ emailContent });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Email generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
