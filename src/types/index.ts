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
  performance: number;
  accessibility: number;
  seo: number;
  bestPractices: number;
  fcp: string;
  lcp: string;
  cls: string;
  hasSSL: boolean;
  hasTitle: boolean;
  titleText: string;
  hasMetaDescription: boolean;
  metaDescription: string;
  hasH1: boolean;
  h1Text: string;
  hasMobileViewport: boolean;
  hasSchema: boolean;
  hasOgTags: boolean;
  hasAnalytics: boolean;
  imagesWithoutAlt: number;
  issues: string[];
  opportunities: string[];
  crawlBlocked: boolean;
  psiSkipped: boolean;
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
