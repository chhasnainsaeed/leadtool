import { Lead } from '@/types';

type ScoreResult = {
  score: number;
  reasons: string[];
  priorityTier: 'P1' | 'P2' | 'P3';
  recommendedChannel: 'email' | 'whatsapp' | 'social' | 'call';
  outreachAngle: string;
};

const CATEGORY_BONUS: Record<string, number> = {
  'Beauty & Wellness': 8,
  'Medical & Dental': 10,
  Construction: 8,
  Legal: 9,
  Restaurants: 6,
  'Automotive': 7,
};

function normalizeCategory(v: string): string {
  return (v || '').trim();
}

export function computeLeadScore(lead: Lead): ScoreResult {
  let score = 0;
  const reasons: string[] = [];
  const category = normalizeCategory(lead.category || lead.businessType);
  score += CATEGORY_BONUS[category] || 4;

  if (!lead.hasRealWebsite) {
    score += 28;
    reasons.push('No real website');
  }
  if (lead.hasRealWebsite && (lead.auditData?.performance ?? 100) < 60) {
    score += 18;
    reasons.push('Low website performance');
  }
  if (lead.gbpAuditScore > 0 && lead.gbpAuditScore < 55) {
    score += 14;
    reasons.push('Weak GBP optimization');
  }
  if (lead.gbpIssuesCount > 0) {
    score += Math.min(14, lead.gbpIssuesCount * 2);
    reasons.push('Multiple GBP issues');
  }
  if (lead.reviews > 0 && lead.reviews < 50) {
    score += 8;
    reasons.push('Low review volume');
  }
  if (lead.rating > 0 && lead.rating < 4.2) {
    score += 8;
    reasons.push('Rating below 4.2');
  }

  const hasEmail = !!lead.email;
  const hasPhone = !!lead.phone;
  const hasSocial = !!lead.socialMedia && lead.socialMedia !== 'N/A';
  if (hasEmail) score += 10;
  if (hasPhone) score += 8;
  if (hasSocial) score += 5;

  let recommendedChannel: ScoreResult['recommendedChannel'] = 'email';
  if (!hasEmail && hasPhone) recommendedChannel = 'whatsapp';
  else if (!hasEmail && !hasPhone && hasSocial) recommendedChannel = 'social';
  else if (!hasEmail && hasPhone && lead.hasWhatsApp === false) recommendedChannel = 'call';

  const outreachAngle = !lead.hasRealWebsite
    ? 'Missing high-converting website presence'
    : (lead.auditData?.performance ?? 100) < 60
      ? 'Performance and conversion leak fixes'
      : lead.gbpIssuesCount > 0
        ? 'Google profile trust and discovery improvements'
        : 'Conversion-focused growth optimizations';

  const finalScore = Math.max(0, Math.min(100, score));
  const priorityTier: ScoreResult['priorityTier'] = finalScore >= 75 ? 'P1' : finalScore >= 50 ? 'P2' : 'P3';

  return { score: finalScore, reasons, priorityTier, recommendedChannel, outreachAngle };
}

