import { NextRequest, NextResponse } from 'next/server';
import { searchGoogleBusiness } from '@/lib/serpapi';
import { saveLeads } from '@/lib/storage';
import { SearchParams } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SearchParams;
    const { city, country, businessType, businessQuery } = body;

    if (!city || !country || !businessQuery) {
      return NextResponse.json({ error: 'city, country and businessQuery are required' }, { status: 400 });
    }

    const leads = await searchGoogleBusiness(businessQuery, city, country);
    await saveLeads(leads);

    return NextResponse.json({ leads, count: leads.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Search failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
