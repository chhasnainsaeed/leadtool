import { Lead } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface SerpResult {
  title?: string;
  place_id?: string;
  address?: string;
  phone?: string;
  website?: string;
  rating?: number;
  reviews?: number;
  type?: string;
}

export async function searchGoogleBusiness(
  businessQuery: string,
  city: string,
  country: string
): Promise<Lead[]> {
  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) throw new Error('SERPAPI_KEY is not set in .env.local');

  const q = `${businessQuery} in ${city}, ${country}`;
  const url = `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(q)}&api_key=${apiKey}&num=20`;

  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SerpAPI error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const results: SerpResult[] = data.local_results || [];

  return results.map((r): Lead => ({
    id: uuidv4(),
    businessName: r.title || 'Unknown',
    category: r.type || businessQuery,
    address: r.address || '',
    phone: r.phone || '',
    website: r.website || '',
    hasWebsite: !!r.website,
    hasRealWebsite: !!r.website,
    socialMedia: '',
    rating: r.rating || 0,
    reviews: r.reviews || 0,
    priceRange: '',
    hours: '',
    services: '',
    bookingLink: '',
    description: '',
    claimed: '',
    plusCode: '',
    gbpUrl: '',
    gbpAuditScore: 0,
    gbpIssuesCount: 0,
    gbpIssues: '',
    gbpPitchPoints: '',
    city,
    country,
    businessType: businessQuery,
    emailSent: false,
    status: 'new',
    createdAt: new Date().toISOString(),
    sourcePlatform: 'google_maps_serpapi',
  }));
}
