import { Lead } from '@/types';

export function buildFallbackOutreachMessage(lead: Lead): string {
  return `Hi ${lead.businessName}, I noticed your business and wanted to offer a free quick website growth idea tailored for you. If interested, I can share it in 2-3 lines.`;
}

export function buildSocialOutreachMessage(lead: Lead, platform: 'facebook' | 'instagram'): string {
  if (platform === 'instagram') {
    return `Hi ${lead.businessName}, I found your Instagram and wanted to share a quick idea to help turn more profile visitors into paying clients. If you're open, I can send a short free suggestion.`;
  }
  return `Hi ${lead.businessName}, I came across your Facebook page and wanted to share a simple idea to help you get more leads from your online presence. I can send a short free suggestion if you want.`;
}

export function detectSocialPlatform(url?: string): 'facebook' | 'instagram' | null {
  if (!url) return null;
  const v = url.toLowerCase();
  if (v.includes('facebook.com')) return 'facebook';
  if (v.includes('instagram.com')) return 'instagram';
  return null;
}
