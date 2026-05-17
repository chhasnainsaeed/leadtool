export interface City {
  name: string;
  country: string;
  region?: string;
}

export interface BusinessType {
  label: string;
  category: string;
  query: string;
}

export interface AuditData {
  auditScore?: number;
  grade?: string;
  summary?: string;
  performance: number;
  accessibility: number;
  seo: number;
  bestPractices: number;
  fcp: string;
  lcp: string;
  cls: string;
  hasSSL: boolean | null;
  hasTitle: boolean | null;
  titleText: string;
  hasMetaDescription: boolean | null;
  metaDescription: string;
  hasH1: boolean | null;
  h1Text: string;
  hasMobileViewport: boolean | null;
  hasSchema: boolean | null;
  hasOgTags: boolean | null;
  hasAnalytics: boolean | null;
  imagesWithoutAlt: number;
  issues: string[];
  opportunities: string[];
  quickWins?: string[];
  strengths?: string[];
  visualIssues: string[];
  screenshotDataUrl?: string;
  crawlBlocked: boolean;
  psiSkipped: boolean;
  visualSkipped: boolean;
}

export interface EmailContent {
  subject: string;
  body: string;
}

export type LeadStatus = 'new' | 'audited' | 'email_generated' | 'sent' | 'replied';

export interface Lead {
  id: string;
  businessName: string;
  category: string;
  address: string;
  phone: string;
  email?: string;
  website: string;
  hasWebsite: boolean;
  hasRealWebsite: boolean;        // true only if website is NOT social media
  socialMedia: string;
  rating: number;
  reviews: number;
  priceRange: string;
  hours: string;
  services: string;
  bookingLink: string;
  description: string;
  claimed: string;
  plusCode: string;
  gbpUrl: string;
  // GBP audit (from extension)
  gbpAuditScore: number;
  gbpIssuesCount: number;
  gbpIssues: string;
  gbpPitchPoints: string;
  // Search context
  city: string;
  country: string;
  businessType: string;
  // Website audit (PageSpeed)
  auditData?: AuditData;
  // Email
  emailContent?: EmailContent;
  emailSent: boolean;
  emailSentAt?: string;
  status: LeadStatus;
  createdAt: string;
  // source tracking
  sourceFile?: string;
  sourcePlatform?: string;
  leadScore?: number;
  leadScoreReasons?: string[];
  priorityTier?: 'P1' | 'P2' | 'P3';
  recommendedChannel?: 'email' | 'whatsapp' | 'social' | 'call';
  outreachAngle?: string;
  // WhatsApp
  hasWhatsApp?: boolean | null;
  whatsAppMessage?: string;
  socialPlatform?: 'facebook' | 'instagram' | null;
  socialMessage?: string;
  // user notes
  notes?: string;
}

export interface SearchParams {
  city: string;
  country: string;
  businessType: string;
  businessQuery: string;
}

export interface LeadsDB {
  leads: Lead[];
  lastUpdated: string;
}
