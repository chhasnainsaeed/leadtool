import { Lead } from '@/types';

export function buildFallbackOutreachMessage(lead: Lead): string {
  return `Hi ${lead.businessName}, I noticed your business and wanted to offer a free quick website growth idea tailored for you. If interested, I can share it in 2-3 lines.`;
}

export function detectSocialPlatform(url?: string): 'facebook' | 'instagram' | null {
  if (!url) return null;
  const v = url.toLowerCase();
  if (v.includes('facebook.com')) return 'facebook';
  if (v.includes('instagram.com')) return 'instagram';
  return null;
}

