import { Lead } from '@/types';

export function computeLeadScore(lead: Lead): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (!lead.hasRealWebsite) {
    score += 30;
    reasons.push('No real website');
  }
  if (lead.hasRealWebsite && (lead.auditData?.performance ?? 100) < 60) {
    score += 20;
    reasons.push('Weak site performance');
  }
  if (!lead.email && lead.phone) {
    score += 10;
    reasons.push('Phone present, email missing');
  }
  if (lead.reviews > 0 && lead.reviews < 60) {
    score += 10;
    reasons.push('Low review count');
  }
  if (lead.rating > 0 && lead.rating < 4.2) {
    score += 10;
    reasons.push('Below 4.2 rating');
  }
  if (lead.gbpIssuesCount > 0) {
    score += Math.min(20, lead.gbpIssuesCount * 2);
    reasons.push('GBP issues detected');
  }

  return { score: Math.max(0, Math.min(100, score)), reasons };
}

