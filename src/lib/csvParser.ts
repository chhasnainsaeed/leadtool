import { Lead } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Social media domains that are NOT real websites
const SOCIAL_DOMAINS = ['instagram.com', 'facebook.com', 'twitter.com', 'x.com', 'tiktok.com', 'linkedin.com', 'youtube.com'];

function isSocialOnly(url: string): boolean {
  if (!url || url === 'N/A') return false;
  try {
    const hostname = new URL(url.startsWith('http') ? url : 'https://' + url).hostname.replace('www.', '');
    return SOCIAL_DOMAINS.some(d => hostname.includes(d));
  } catch {
    return false;
  }
}

function isRealWebsite(url: string): boolean {
  if (!url || url === 'N/A' || url.trim() === '') return false;
  return !isSocialOnly(url);
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// GBP scraper column headers + fallback aliases for the app's own export format
const GBP_HEADERS = [
  'Business Name', 'Category', 'Rating', 'Reviews', 'Phone', 'Address',
  'Website', 'Email', 'Price Range', 'Hours', 'Photos', 'Services', 'Booking Link',
  'Social Media', 'Plus Code', 'Claimed', 'Description', 'GBP URL',
  'Search City', 'Search Country', 'Search Category',
  'Audit Score', 'Issues Count', 'Issues Found', 'Pitch Points',
];

// Column aliases: app-export header → canonical GBP header
const ALIASES: Record<string, string> = {
  'City': 'Search City',
  'Country': 'Search Country',
  'GBP Score': 'Audit Score',
};

function buildIndexMap(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  const normalize = (s: string) => s.replace(/^"|"$/g, '').trim();

  // Primary: exact GBP header match
  GBP_HEADERS.forEach(h => {
    const idx = headers.findIndex(col => normalize(col) === h);
    if (idx >= 0) map[h] = idx;
  });

  // Fallback: alias headers (only if canonical wasn't found)
  Object.entries(ALIASES).forEach(([alias, canonical]) => {
    if (map[canonical] === undefined) {
      const idx = headers.findIndex(col => normalize(col) === alias);
      if (idx >= 0) map[canonical] = idx;
    }
  });

  // Email flexible match
  if (map.Email === undefined) {
    const emailIdx = headers.findIndex(col => {
      const n = normalize(col).toLowerCase();
      return n === 'email' || n === 'e-mail' || n === 'contact email';
    });
    if (emailIdx >= 0) map.Email = emailIdx;
  }
  return map;
}

export function parseGBPCsv(
  content: string,
  sourceFile = '',
  defaultCity = '',
  defaultCountry = '',
  defaultBusinessType = ''
): Lead[] {
  const lines = content.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];

  const rawHeaders = parseCSVLine(lines[0]);
  const idx = buildIndexMap(rawHeaders);

  const get = (cols: string[], field: string): string => {
    const i = idx[field];
    return i !== undefined ? (cols[i] || '').trim().replace(/^"|"$/g, '') : '';
  };

  const leads: Lead[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.every(c => !c || c === '""')) continue;

    const name = get(cols, 'Business Name');
    if (!name) continue;

    const website = get(cols, 'Website');
    const email = get(cols, 'Email');
    const socialMedia = get(cols, 'Social Media');
    const hasWeb = isRealWebsite(website);
    // If no real website but has social — use social as fallback display
    const displayWebsite = hasWeb ? website : (isSocialOnly(website) ? website : '');

    const rating = parseFloat(get(cols, 'Rating')) || 0;
    const reviews = parseInt(get(cols, 'Reviews')) || 0;
    const auditScore = parseInt(get(cols, 'Audit Score')) || 0;
    const issuesCount = parseInt(get(cols, 'Issues Count')) || 0;

    const city = get(cols, 'Search City') || defaultCity;
    const country = get(cols, 'Search Country') || defaultCountry;
    const category = get(cols, 'Search Category') || get(cols, 'Category') || defaultBusinessType;

    leads.push({
      id: uuidv4(),
      businessName: name,
      category: get(cols, 'Category'),
      address: get(cols, 'Address'),
      phone: get(cols, 'Phone'),
      email,
      website: displayWebsite,
      hasWebsite: !!displayWebsite,
      hasRealWebsite: hasWeb,
      socialMedia: isSocialOnly(website) ? website : socialMedia,
      rating,
      reviews,
      priceRange: get(cols, 'Price Range'),
      hours: get(cols, 'Hours'),
      services: get(cols, 'Services'),
      bookingLink: get(cols, 'Booking Link'),
      description: get(cols, 'Description'),
      claimed: get(cols, 'Claimed'),
      plusCode: get(cols, 'Plus Code'),
      gbpUrl: get(cols, 'GBP URL'),
      gbpAuditScore: auditScore,
      gbpIssuesCount: issuesCount,
      gbpIssues: get(cols, 'Issues Found'),
      gbpPitchPoints: get(cols, 'Pitch Points'),
      city,
      country,
      businessType: category,
      emailSent: false,
      status: 'new',
      createdAt: new Date().toISOString(),
      sourceFile,
    });
  }

  return leads;
}
