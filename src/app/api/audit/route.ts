import { NextRequest, NextResponse } from 'next/server';
import { auditWebsite } from '@/lib/auditor';
import { updateLead } from '@/lib/storage';

export async function POST(req: NextRequest) {
  try {
    const { url, leadId } = await req.json() as { url: string; leadId: string };

    if (!url) return NextResponse.json({ error: 'url is required' }, { status: 400 });

    const auditData = await auditWebsite(url);

    if (leadId) {
      await updateLead(leadId, { auditData, status: 'audited' });
    }

    return NextResponse.json({ auditData });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Audit failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
