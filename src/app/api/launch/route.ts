import { NextRequest, NextResponse } from 'next/server';
import { launchChrome, buildMapsUrl } from '@/lib/chromeLauncher';
import { scrapeSession } from '@/lib/scrapeSession';

export async function POST(req: NextRequest) {
  try {
    const { businessQuery, city, country, businessType } = await req.json() as {
      businessQuery: string;
      city: string;
      country: string;
      businessType: string;
    };

    if (!businessQuery || !city || !country) {
      return NextResponse.json({ error: 'businessQuery, city and country are required' }, { status: 400 });
    }

    const url = buildMapsUrl(businessQuery, city, country);
    launchChrome(url);

    // Record session so check-import knows what to expect
    scrapeSession.set({ city, country, businessType, businessQuery, startedAt: Date.now() });

    return NextResponse.json({ success: true, url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to launch Chrome';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
