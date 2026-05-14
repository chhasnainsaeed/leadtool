import { NextRequest, NextResponse } from 'next/server';
import { parseGBPCsv } from '@/lib/csvParser';
import { saveLeads } from '@/lib/storage';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    if (!file.name.endsWith('.csv')) return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 });

    const content = await file.text();
    const leads = parseGBPCsv(content, file.name);

    if (leads.length === 0) {
      return NextResponse.json({ error: 'No leads found in CSV — check the file format' }, { status: 422 });
    }

    saveLeads(leads);
    return NextResponse.json({ count: leads.length, leads });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Import failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
