import { NextRequest, NextResponse } from 'next/server';
import { getAllLeads, updateLead, deleteLead, clearAll } from '@/lib/storage';

export async function GET() {
  const leads = getAllLeads();
  return NextResponse.json({ leads });
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, updates } = await req.json() as { id: string; updates: Record<string, unknown> };
    const updated = updateLead(id, updates);
    if (!updated) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    return NextResponse.json({ lead: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Update failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const all = searchParams.get('all');

    if (all === 'true') {
      clearAll();
      return NextResponse.json({ success: true });
    }

    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const deleted = deleteLead(id);
    return NextResponse.json({ success: deleted });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Delete failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
