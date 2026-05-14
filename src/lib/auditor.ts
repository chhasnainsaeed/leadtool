import axios from 'axios';
import * as cheerio from 'cheerio';
import { AuditData } from '@/types';

interface PSICategory {
  score: number | null;
}

interface PSIAudit {
  score: number | null;
  displayValue?: string;
  description?: string;
}

interface PSIResult {
  lighthouseResult?: {
    categories?: {
      performance?: PSICategory;
      accessibility?: PSICategory;
      seo?: PSICategory;
      'best-practices'?: PSICategory;
    };
    audits?: {
      'first-contentful-paint'?: PSIAudit;
      'largest-contentful-paint'?: PSIAudit;
      'cumulative-layout-shift'?: PSIAudit;
      'render-blocking-resources'?: PSIAudit;
      'uses-optimized-images'?: PSIAudit;
      'uses-responsive-images'?: PSIAudit;
      'unused-css-rules'?: PSIAudit;
      'unused-javascript'?: PSIAudit;
      'meta-description'?: PSIAudit;
      'document-title'?: PSIAudit;
      viewport?: PSIAudit;
    };
  };
}

function score(val: number | null | undefined): number {
  if (val == null) return 0;
  return Math.round(val * 100);
}

export async function auditWebsite(url: string): Promise<AuditData> {
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;

  const [psiData, seoChecks] = await Promise.allSettled([
    runPageSpeed(normalizedUrl),
    runSEOChecks(normalizedUrl),
  ]);

  const psi = psiData.status === 'fulfilled' ? psiData.value : null;
  const seo = seoChecks.status === 'fulfilled' ? seoChecks.value : getEmptySEO();

  const audits = psi?.lighthouseResult?.audits || {};
  const cats = psi?.lighthouseResult?.categories || {};

  const issues: string[] = [];
  const opportunities: string[] = [];

  const perfScore = score(cats.performance?.score);
  const accessScore = score(cats.accessibility?.score);
  const seoScore = score(cats.seo?.score);
  const bpScore = score(cats['best-practices']?.score);

  if (perfScore < 50) issues.push(`Poor mobile performance score (${perfScore}/100)`);
  else if (perfScore < 90) opportunities.push(`Performance can be improved (${perfScore}/100)`);

  if (!seo.hasSSL) issues.push('No SSL certificate (not HTTPS)');
  if (!seo.hasTitle) issues.push('Missing page title tag');
  if (!seo.hasMetaDescription) issues.push('Missing meta description');
  if (!seo.hasH1) issues.push('Missing H1 heading');
  if (!seo.hasMobileViewport) issues.push('Missing mobile viewport meta tag');

  if (audits['render-blocking-resources']?.score === 0)
    opportunities.push('Eliminate render-blocking resources');
  if (audits['uses-optimized-images']?.score !== null && (audits['uses-optimized-images']?.score || 1) < 1)
    opportunities.push('Optimize and compress images');
  if (audits['unused-css-rules']?.score !== null && (audits['unused-css-rules']?.score || 1) < 1)
    opportunities.push('Remove unused CSS');
  if (audits['unused-javascript']?.score !== null && (audits['unused-javascript']?.score || 1) < 1)
    opportunities.push('Remove unused JavaScript');

  return {
    performance: perfScore,
    accessibility: accessScore,
    seo: seoScore,
    bestPractices: bpScore,
    fcp: audits['first-contentful-paint']?.displayValue || 'N/A',
    lcp: audits['largest-contentful-paint']?.displayValue || 'N/A',
    cls: audits['cumulative-layout-shift']?.displayValue || 'N/A',
    hasSSL: seo.hasSSL,
    hasTitle: seo.hasTitle,
    titleText: seo.titleText,
    hasMetaDescription: seo.hasMetaDescription,
    metaDescription: seo.metaDescription,
    hasH1: seo.hasH1,
    hasMobileViewport: seo.hasMobileViewport,
    issues,
    opportunities,
  };
}

async function runPageSpeed(url: string): Promise<PSIResult> {
  const apiUrl =
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
    `?url=${encodeURIComponent(url)}&strategy=mobile` +
    `&category=performance&category=accessibility&category=seo&category=best-practices`;

  const res = await axios.get<PSIResult>(apiUrl, { timeout: 30000 });
  return res.data;
}

interface SEOChecks {
  hasSSL: boolean;
  hasTitle: boolean;
  titleText: string;
  hasMetaDescription: boolean;
  metaDescription: string;
  hasH1: boolean;
  hasMobileViewport: boolean;
}

async function runSEOChecks(url: string): Promise<SEOChecks> {
  const res = await axios.get(url, {
    timeout: 15000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeadTool/1.0)' },
    maxRedirects: 5,
  });

  const $ = cheerio.load(res.data as string);
  const title = $('title').text().trim();
  const metaDesc = $('meta[name="description"]').attr('content') || '';
  const h1 = $('h1').first().text().trim();
  const viewport = $('meta[name="viewport"]').attr('content') || '';

  return {
    hasSSL: url.startsWith('https://'),
    hasTitle: !!title,
    titleText: title,
    hasMetaDescription: !!metaDesc,
    metaDescription: metaDesc,
    hasH1: !!h1,
    hasMobileViewport: viewport.includes('width=device-width'),
  };
}

function getEmptySEO(): SEOChecks {
  return {
    hasSSL: false,
    hasTitle: false,
    titleText: '',
    hasMetaDescription: false,
    metaDescription: '',
    hasH1: false,
    hasMobileViewport: false,
  };
}
