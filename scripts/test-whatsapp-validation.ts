import { buildWhatsAppFallbackMessage, buildWhatsAppInput, validateWhatsAppMessage } from '../src/lib/whatsappOutreach';
import type { AuditData, Lead } from '../src/types';

function mkLead(partial: Partial<Lead>): Lead {
  return {
    id: 'test-id',
    businessName: 'Test Business',
    category: 'Local Business',
    address: 'N/A',
    phone: '+923001112233',
    website: '',
    hasWebsite: false,
    hasRealWebsite: false,
    socialMedia: 'N/A',
    rating: 0,
    reviews: 0,
    priceRange: 'N/A',
    hours: 'N/A',
    services: 'N/A',
    bookingLink: 'N/A',
    description: 'N/A',
    claimed: 'N/A',
    plusCode: 'N/A',
    gbpUrl: 'N/A',
    gbpAuditScore: 0,
    gbpIssuesCount: 0,
    gbpIssues: 'N/A',
    gbpPitchPoints: 'N/A',
    city: 'Lahore',
    country: 'Pakistan',
    businessType: 'Local Business',
    emailSent: false,
    status: 'new',
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

function mkAudit(partial: Partial<AuditData>): AuditData {
  return {
    performance: 58,
    accessibility: 72,
    seo: 61,
    bestPractices: 69,
    fcp: '2.8s',
    lcp: '4.2s',
    cls: '0.19',
    hasSSL: true,
    hasTitle: true,
    titleText: 'Example',
    hasMetaDescription: false,
    metaDescription: '',
    hasH1: true,
    h1Text: 'Welcome',
    hasMobileViewport: true,
    hasSchema: false,
    hasOgTags: false,
    hasAnalytics: false,
    imagesWithoutAlt: 4,
    issues: ['slow mobile load time', 'missing meta description'],
    opportunities: ['improve first contentful paint', 'add clear CTA above the fold'],
    visualIssues: ['crowded hero section', 'weak contrast in call-to-action button'],
    crawlBlocked: false,
    psiSkipped: false,
    visualSkipped: false,
    ...partial,
  };
}

function runCase(title: string, lead: Lead, audit?: AuditData) {
  const input = buildWhatsAppInput(lead, audit);
  const fallback = buildWhatsAppFallbackMessage(input);
  const good = `Salam ${input.business_name}, your ${input.business_type.toLowerCase()} profile looks solid, but ${input.services[0] || 'service details'} and contact flow could be clearer for customers. I can share practical improvement ideas. hasnainsaeed.net Can I send them?`;
  const bad = `Hi there, we increase qualified leads and offer a free 3-point plan with conversion-focused improvements. Would you like this? Can I send this?`;

  console.log(`\n=== ${title} ===`);
  console.log('Input:', JSON.stringify(input, null, 2));
  console.log('Fallback:', fallback);
  console.log('Validation (good):', validateWhatsAppMessage(good, input));
  console.log('Validation (bad):', validateWhatsAppMessage(bad, input));
}

function runGenericWordingCheck() {
  const lead = mkLead({
    businessName: 'ABC Clinic',
    category: 'Clinic',
    businessType: 'Clinic',
    hasWebsite: false,
    hasRealWebsite: false,
    services: 'General Checkup, Dental Care',
    gbpIssues: 'No website listed',
  });
  const input = buildWhatsAppInput(lead);
  const bad = 'Salam ABC Business, I help local businesses grow their online presence and get more customers. You can check my work here hasnainsaeed.net. Can I send details?';
  const good = 'Salam ABC Clinic, I noticed patients may need clearer appointment, timings, and location details before contacting. For a clinic, that trust step matters. I can share a few simple website ideas. hasnainsaeed.net';
  console.log('\n=== Generic Agency Wording Rule ===');
  console.log('Validation (expected invalid):', validateWhatsAppMessage(bad, input));
  console.log('Validation (expected valid):', validateWhatsAppMessage(good, input));
}

runCase(
  'Salon with no website',
  mkLead({
    businessName: 'Anaya Beauty Salon',
    category: 'Beauty Salon',
    businessType: 'Beauty Salon',
    hasWebsite: false,
    hasRealWebsite: false,
    website: '',
    socialMedia: 'https://instagram.com/anayabeautysalon',
    rating: 4.6,
    reviews: 89,
    services: 'Hair, Bridal Makeup, Skin Care',
    gbpIssues: 'No website listed | Incomplete service details',
  }),
);

runCase(
  'Clinic with website audit issue',
  mkLead({
    businessName: 'Nova Dental Clinic',
    category: 'Dental Clinic',
    businessType: 'Dental Clinic',
    hasWebsite: true,
    hasRealWebsite: true,
    website: 'https://novadental.example',
    rating: 4.8,
    reviews: 132,
    services: 'Root Canal, Dental Implants',
    gbpIssues: 'Slow response to inquiries',
  }),
  mkAudit({ issues: ['mobile pages load slowly', 'missing meta description'] }),
);

runCase(
  'Restaurant with social profile only',
  mkLead({
    businessName: 'Spice Route Kitchen',
    category: 'Restaurant',
    businessType: 'Restaurant',
    hasWebsite: false,
    hasRealWebsite: false,
    socialMedia: 'https://facebook.com/spiceroutekitchen',
    services: 'Dine In, Delivery, Catering',
    rating: 4.4,
    reviews: 57,
    gbpIssues: 'No direct order page',
  }),
);

runCase(
  'Construction company with limited data',
  mkLead({
    businessName: 'BuildCore Contractors',
    category: 'Construction Company',
    businessType: 'Construction',
    hasWebsite: false,
    hasRealWebsite: false,
    socialMedia: 'N/A',
    services: 'N/A',
    gbpIssues: 'N/A',
    rating: 0,
    reviews: 0,
  }),
);

runCase(
  'Lead with weak/no audit data',
  mkLead({
    businessName: 'City Care Services',
    category: 'Home Services',
    businessType: 'Home Services',
    hasWebsite: true,
    hasRealWebsite: true,
    website: 'https://citycare.example',
    socialMedia: 'N/A',
    services: 'AC Repair, Plumbing',
    gbpIssues: 'N/A',
    rating: 4.1,
    reviews: 21,
  }),
  mkAudit({ issues: [], opportunities: [], visualIssues: [] }),
);

runGenericWordingCheck();
