import { Lead } from '@/types';
import { buildWhatsAppFallbackMessage, buildWhatsAppInput } from '@/lib/whatsappOutreach';

export function buildFallbackOutreachMessage(lead: Lead): string {
  return buildWhatsAppFallbackMessage(buildWhatsAppInput(lead));
}

export function buildSocialOutreachMessage(lead: Lead, platform: 'facebook' | 'instagram'): string {
  if (platform === 'instagram') {
    return `Hi ${lead.businessName}, I found your Instagram and see strong potential to convert more profile visitors into paying clients. I can send a free 3-point growth plan tailored to your business with practical improvements for your online presence.`;
  }
  return `Hi ${lead.businessName}, I came across your Facebook page and noticed opportunities to increase inquiries from people already finding you online. I can send a free 3-point growth plan tailored to your business if you'd like.`;
}

export function detectSocialPlatform(url?: string): 'facebook' | 'instagram' | null {
  if (!url) return null;
  const v = url.toLowerCase();
  if (v.includes('facebook.com')) return 'facebook';
  if (v.includes('instagram.com')) return 'instagram';
  return null;
}
