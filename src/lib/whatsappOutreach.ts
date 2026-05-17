import { AuditData, Lead } from '@/types';

export const BANNED_PHRASES = [
  'qualified leads',
  'growth plan',
  'free 3-point plan',
  'conversion-focused improvements',
  'digital presence',
  'increase bookings and qualified leads',
];

export const GENERIC_PHRASES = [
  'i help businesses',
  'we help businesses',
  'i help local businesses',
  'we help local businesses',
  'local businesses like yours',
  'grow your business',
  'get more customers',
  'get more clients',
  'more leads',
  'online presence',
  'improve your online presence',
  'website improvements',
  'website solutions',
  'digital marketing',
  'digital solutions',
  'professional website for your business',
  'take your business to the next level',
  'stand out from competitors',
  'generate more sales',
  'increase your sales',
  'business growth',
];

export interface WhatsAppMessageInput {
  business_name: string;
  business_type: string;
  city: string | null;
  country: string | null;
  has_website: boolean;
  website_url: string | null;
  social_profile_url: string | null;
  has_social_profile: boolean;
  google_rating: string | null;
  review_count: number | null;
  services: string[];
  gbp_issues: string[];
  website_audit: {
    performance_score: number | null;
    seo_score: number | null;
    accessibility_score: number | null;
    best_practices_score: number | null;
    issues: string[];
    opportunities: string[];
    technical_checks: string[];
    visual_observation: string[];
  } | null;
  available_facts: string[];
  sender_website: 'hasnainsaeed.net';
  rules: {
    must_start_with: 'Salam';
    max_words: 90;
    banned_phrases: string[];
    must_include_sender_website: 'hasnainsaeed.net';
  };
}

export function buildWhatsAppInput(lead: Lead, websiteAudit?: AuditData): WhatsAppMessageInput {
  const gbpIssues = lead.gbpIssues && lead.gbpIssues !== 'N/A'
    ? lead.gbpIssues.replace(/[^\x20-\x7E]/g, '').split(' | ').map(s => s.trim()).filter(Boolean)
    : [];
  const technicalChecks: string[] = [];
  if (websiteAudit) {
    technicalChecks.push(`SSL: ${websiteAudit.hasSSL ? 'yes' : 'no'}`);
    technicalChecks.push(`Title tag: ${websiteAudit.hasTitle ? 'yes' : 'no'}`);
    technicalChecks.push(`Meta description: ${websiteAudit.hasMetaDescription ? 'yes' : 'no'}`);
    technicalChecks.push(`H1: ${websiteAudit.hasH1 ? 'yes' : 'no'}`);
    technicalChecks.push(`Mobile viewport: ${websiteAudit.hasMobileViewport ? 'yes' : 'no'}`);
    technicalChecks.push(`Schema markup: ${websiteAudit.hasSchema ? 'yes' : 'no'}`);
    technicalChecks.push(`Open Graph tags: ${websiteAudit.hasOgTags ? 'yes' : 'no'}`);
    technicalChecks.push(`Analytics: ${websiteAudit.hasAnalytics ? 'yes' : 'no'}`);
  }

  const services = lead.services && lead.services !== 'N/A'
    ? lead.services.split(',').map(s => s.trim()).filter(Boolean).slice(0, 10)
    : [];

  const availableFacts: string[] = [
    `Business type: ${lead.category || lead.businessType || 'Local Business'}`,
    `Has website: ${lead.hasRealWebsite ? 'yes' : 'no'}`,
    `Has social profile: ${!!lead.socialMedia && lead.socialMedia !== 'N/A' ? 'yes' : 'no'}`,
  ];
  if (lead.city) availableFacts.push(`City: ${lead.city}`);
  if (lead.country) availableFacts.push(`Country: ${lead.country}`);
  if (lead.rating > 0) availableFacts.push(`Google rating: ${lead.rating}/5`);
  if (lead.reviews > 0) availableFacts.push(`Review count: ${lead.reviews}`);
  if (gbpIssues.length > 0) availableFacts.push(`GBP issues count: ${gbpIssues.length}`);
  if (websiteAudit) {
    availableFacts.push(`Website performance score: ${websiteAudit.performance}`);
    availableFacts.push(`Website SEO score: ${websiteAudit.seo}`);
    availableFacts.push(`Website accessibility score: ${websiteAudit.accessibility}`);
    availableFacts.push(`Website best practices score: ${websiteAudit.bestPractices}`);
  }

  return {
    business_name: lead.businessName,
    business_type: lead.category || lead.businessType || 'Local Business',
    city: lead.city || null,
    country: lead.country || null,
    has_website: lead.hasRealWebsite,
    website_url: lead.hasRealWebsite ? lead.website : null,
    social_profile_url: !!lead.socialMedia && lead.socialMedia !== 'N/A' ? lead.socialMedia : null,
    has_social_profile: !!lead.socialMedia && lead.socialMedia !== 'N/A',
    google_rating: lead.rating > 0 ? `${lead.rating}/5` : null,
    review_count: lead.reviews > 0 ? lead.reviews : null,
    services,
    gbp_issues: gbpIssues.slice(0, 8),
    website_audit: websiteAudit ? {
      performance_score: websiteAudit.performance,
      seo_score: websiteAudit.seo,
      accessibility_score: websiteAudit.accessibility,
      best_practices_score: websiteAudit.bestPractices,
      issues: websiteAudit.issues.slice(0, 8),
      opportunities: websiteAudit.opportunities.slice(0, 8),
      technical_checks: technicalChecks,
      visual_observation: websiteAudit.visualIssues.slice(0, 6),
    } : null,
    available_facts: availableFacts,
    sender_website: 'hasnainsaeed.net',
    rules: {
      must_start_with: 'Salam',
      max_words: 90,
      banned_phrases: BANNED_PHRASES,
      must_include_sender_website: 'hasnainsaeed.net',
    },
  };
}

export function buildWhatsAppFallbackMessage(input: WhatsAppMessageInput): string {
  return `Salam ${input.business_name}, I checked your online presence and noticed there may be room to make your website/contact path clearer for customers. I can share a few simple improvement ideas. hasnainsaeed.net`;
}

export function hasRepeatedCta(message: string): boolean {
  const ctas = ['can i share', 'would you like', 'can i send', 'want me to send'];
  const lower = message.toLowerCase();
  let hits = 0;
  for (const cta of ctas) {
    if (lower.includes(cta)) hits += 1;
  }
  return hits > 1;
}

export function hasGenericAgencyWording(message: string): boolean {
  const lower = message.toLowerCase();
  return GENERIC_PHRASES.some(p => lower.includes(p));
}

export function hasConcreteAnchor(message: string, input: WhatsAppMessageInput): boolean {
  const lower = message.toLowerCase();
  const serviceMention = input.services.some(s => s && lower.includes(s.toLowerCase()));
  const gbpIssueMention = input.gbp_issues.some(i => i && lower.includes(i.toLowerCase()));
  const auditIssueMention = (input.website_audit?.issues || []).some(i => i && lower.includes(i.toLowerCase()));
  const auditOppMention = (input.website_audit?.opportunities || []).some(o => o && lower.includes(o.toLowerCase()));
  const observationWords = [
    'no website', 'social', 'google', 'reviews', 'rating', 'website', 'mobile', 'speed',
    'contact', 'booking', 'appointment', 'menu', 'photos', 'location', 'timings',
  ];
  const observationMention = observationWords.some(w => lower.includes(w));
  return serviceMention || gbpIssueMention || auditIssueMention || auditOppMention || observationMention;
}

export function validateWhatsAppMessage(message: string, input: WhatsAppMessageInput): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const lower = message.toLowerCase();
  const wordCount = message.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount > 90) reasons.push('Message exceeds 90 words');
  if (!lower.includes('salam')) reasons.push('Missing Salam');
  if (!lower.includes(input.business_name.toLowerCase())) reasons.push('Missing business name');
  if (!lower.includes('hasnainsaeed.net')) reasons.push('Missing sender website');
  if (BANNED_PHRASES.some(p => lower.includes(p))) reasons.push('Contains banned phrase');
  if (hasRepeatedCta(message)) reasons.push('Repeated CTA');
  if (hasGenericAgencyWording(message) && !hasConcreteAnchor(message, input)) {
    reasons.push('Generic agency wording without concrete business context');
  }

  if (!hasConcreteAnchor(message, input)) reasons.push('Too generic: no factual issue or service context mentioned');

  return { valid: reasons.length === 0, reasons };
}
