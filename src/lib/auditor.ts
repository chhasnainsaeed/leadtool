import axios from 'axios';
import * as cheerio from 'cheerio';
import { AuditData } from '@/types';

const PSI_TIMEOUT = 45_000;
const CRAWL_TIMEOUT = 20_000;
const PSI_RETRY_DELAY = 4_000;

const CRAWL_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
];

interface PSICategory { score: number | null; }
interface PSIAudit {
  score: number | null;
  displayValue?: string;
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
      'uses-text-compression'?: PSIAudit;
      'efficient-animated-content'?: PSIAudit;
      'server-response-time'?: PSIAudit;
    };
  };
}

interface SEOChecks {
  hasSSL: boolean;
  hasTitle: boolean;
  titleText: string;
  titleTooShort: boolean;
  titleTooLong: boolean;
  hasMetaDescription: boolean;
  metaDescription: string;
  metaDescTooShort: boolean;
  metaDescTooLong: boolean;
  hasH1: boolean;
  h1Text: string;
  multipleH1: boolean;
  hasMobileViewport: boolean;
  hasCanonical: boolean;
  hasOgTags: boolean;
  hasSchema: boolean;
  hasAnalytics: boolean;
  imagesWithoutAlt: number;
  totalImages: number;
  crawlBlocked: boolean;
}

function pct(val: number | null | undefined): number {
  return val == null ? 0 : Math.round(val * 100);
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function runPageSpeed(url: string): Promise<PSIResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  const endpoint =
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed` +
    `?url=${encodeURIComponent(url)}&strategy=mobile` +
    (apiKey ? `&key=${encodeURIComponent(apiKey)}` : '') +
    `&category=performance&category=accessibility&category=seo&category=best-practices`;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await axios.get<PSIResult>(endpoint, { timeout: PSI_TIMEOUT });
      return res.data;
    } catch (err) {
      if (attempt === 0) {
        await sleep(PSI_RETRY_DELAY);
      } else {
        console.warn('[auditor] PSI failed after retry:', (err as Error).message);
      }
    }
  }
  return null;
}

async function fetchHTML(url: string): Promise<{ html: string; blocked: boolean }> {
  for (const ua of CRAWL_USER_AGENTS) {
    try {
      const res = await axios.get<string>(url, {
        timeout: CRAWL_TIMEOUT,
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        maxRedirects: 5,
        responseType: 'text',
      });
      const html = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      // Detect bot-protection / blank pages
      if (html.length < 500) continue;
      return { html, blocked: false };
    } catch {
      // try next user agent
    }
  }
  return { html: '', blocked: true };
}

function runSEOChecks(url: string, html: string, blocked: boolean): SEOChecks {
  if (blocked || !html) {
    return {
      hasSSL: url.startsWith('https://'),
      hasTitle: false, titleText: '', titleTooShort: false, titleTooLong: false,
      hasMetaDescription: false, metaDescription: '', metaDescTooShort: false, metaDescTooLong: false,
      hasH1: false, h1Text: '', multipleH1: false,
      hasMobileViewport: false, hasCanonical: false,
      hasOgTags: false, hasSchema: false, hasAnalytics: false,
      imagesWithoutAlt: 0, totalImages: 0,
      crawlBlocked: true,
    };
  }

  const $ = cheerio.load(html);

  const title = $('title').first().text().trim();
  const metaDesc = $('meta[name="description"]').attr('content')?.trim() || '';
  const h1Tags = $('h1');
  const h1Text = h1Tags.first().text().trim();
  const viewport = $('meta[name="viewport"]').attr('content') || '';

  // Images without alt
  const allImgs = $('img');
  let noAlt = 0;
  allImgs.each((_, el) => {
    const alt = $(el).attr('alt');
    if (alt === undefined || alt === '') noAlt++;
  });

  // Analytics: GA4, GTM, Meta Pixel, Hotjar, Plausible
  const htmlLower = html.toLowerCase();
  const hasAnalytics =
    htmlLower.includes('gtag(') ||
    htmlLower.includes('googletagmanager.com') ||
    htmlLower.includes('google-analytics.com') ||
    htmlLower.includes('fbq(') || htmlLower.includes('connect.facebook.net') ||
    htmlLower.includes('hotjar.com') ||
    htmlLower.includes('plausible.io');

  // Structured data
  const hasSchema =
    $('script[type="application/ld+json"]').length > 0 ||
    htmlLower.includes('schema.org');

  // Open Graph
  const hasOgTags =
    $('meta[property="og:title"]').length > 0 &&
    $('meta[property="og:image"]').length > 0;

  // Canonical
  const hasCanonical = $('link[rel="canonical"]').length > 0;

  return {
    hasSSL: url.startsWith('https://'),
    hasTitle: !!title,
    titleText: title,
    titleTooShort: !!title && title.length < 30,
    titleTooLong: !!title && title.length > 60,
    hasMetaDescription: !!metaDesc,
    metaDescription: metaDesc,
    metaDescTooShort: !!metaDesc && metaDesc.length < 70,
    metaDescTooLong: !!metaDesc && metaDesc.length > 160,
    hasH1: h1Tags.length > 0,
    h1Text,
    multipleH1: h1Tags.length > 1,
    hasMobileViewport: viewport.includes('width=device-width'),
    hasCanonical,
    hasOgTags,
    hasSchema,
    hasAnalytics,
    imagesWithoutAlt: noAlt,
    totalImages: allImgs.length,
    crawlBlocked: false,
  };
}

export async function auditWebsite(url: string): Promise<AuditData> {
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;

  const [psiResult, fetchResult] = await Promise.allSettled([
    runPageSpeed(normalizedUrl),
    fetchHTML(normalizedUrl),
  ]);

  const psi = psiResult.status === 'fulfilled' ? psiResult.value : null;
  const { html, blocked } = fetchResult.status === 'fulfilled'
    ? fetchResult.value
    : { html: '', blocked: true };

  const seo = runSEOChecks(normalizedUrl, html, blocked);
  const audits = psi?.lighthouseResult?.audits || {};
  const cats = psi?.lighthouseResult?.categories || {};

  const perfScore = pct(cats.performance?.score);
  const accessScore = pct(cats.accessibility?.score);
  const seoScore = pct(cats.seo?.score);
  const bpScore = pct(cats['best-practices']?.score);

  const issues: string[] = [];
  const opportunities: string[] = [];

  // ── SSL ───────────────────────────────────────────────────────────────────────
  if (!seo.hasSSL) issues.push('No SSL certificate — site runs on HTTP (not secure)');

  // ── Crawl blocked ─────────────────────────────────────────────────────────────
  if (seo.crawlBlocked) {
    opportunities.push('Site blocked automated crawlers — some SEO tools may not index it');
  }

  // ── Performance (PSI) ─────────────────────────────────────────────────────────
  if (psi) {
    if (perfScore < 50)       issues.push(`Very slow mobile load speed (${perfScore}/100) — visitors likely bouncing`);
    else if (perfScore < 75)  opportunities.push(`Mobile performance needs work (${perfScore}/100)`);

    if (accessScore < 70)     issues.push(`Poor accessibility score (${accessScore}/100)`);
    if (seoScore > 0 && seoScore < 70) issues.push(`Low Lighthouse SEO score (${seoScore}/100)`);
    if (bpScore < 70)         opportunities.push(`Best practices score is low (${bpScore}/100)`);

    const serverResp = audits['server-response-time'];
    if (serverResp?.score !== null && (serverResp?.score ?? 1) < 0.5)
      issues.push('Slow server response time (TTFB) — hosting may need upgrading');

    if (audits['render-blocking-resources']?.score === 0)
      opportunities.push('Render-blocking resources slowing page load (CSS/JS in <head>)');
    if ((audits['uses-optimized-images']?.score ?? 1) < 0.9)
      opportunities.push('Images not optimized — converting to WebP could reduce load time');
    if ((audits['unused-css-rules']?.score ?? 1) < 0.9)
      opportunities.push('Unused CSS is loaded on every page (wasted bandwidth)');
    if ((audits['unused-javascript']?.score ?? 1) < 0.9)
      opportunities.push('Unused JavaScript is loaded — slowing Time to Interactive');
    if ((audits['uses-text-compression']?.score ?? 1) < 0.9)
      opportunities.push('Text compression (gzip/brotli) not enabled on server');
  }

  // ── On-page SEO (from HTML) ───────────────────────────────────────────────────
  if (!seo.crawlBlocked) {
    if (!seo.hasTitle)                issues.push('Missing page <title> tag — critical for Google rankings');
    else if (seo.titleTooShort)       opportunities.push(`Page title is too short (${seo.titleText.length} chars) — aim for 30–60`);
    else if (seo.titleTooLong)        opportunities.push(`Page title is too long (${seo.titleText.length} chars) — Google truncates after 60`);

    if (!seo.hasMetaDescription)      issues.push('Missing meta description — Google writes its own, often poorly');
    else if (seo.metaDescTooShort)    opportunities.push('Meta description is too short — missing chance to attract clicks');
    else if (seo.metaDescTooLong)     opportunities.push('Meta description is too long and will be cut off in search results');

    if (!seo.hasH1)                   issues.push('No H1 heading on the page — search engines can\'t identify the main topic');
    else if (seo.multipleH1)          opportunities.push('Multiple H1 tags found — should have exactly one');

    if (!seo.hasMobileViewport)       issues.push('Missing mobile viewport meta tag — site likely broken on phones');

    if (!seo.hasCanonical)            opportunities.push('No canonical tag — duplicate content may split SEO value');
    if (!seo.hasOgTags)               opportunities.push('No Open Graph tags — links shared on Facebook/WhatsApp show no preview image');
    if (!seo.hasSchema)               opportunities.push('No structured data (schema.org) — missing rich results in Google');
    if (!seo.hasAnalytics)            opportunities.push('No analytics detected — owner may not be tracking traffic or conversions');

    if (seo.imagesWithoutAlt > 0) {
      const phrasing = seo.imagesWithoutAlt === 1
        ? '1 image has no alt text'
        : `${seo.imagesWithoutAlt} of ${seo.totalImages} images have no alt text`;
      opportunities.push(`${phrasing} — hurts accessibility and image SEO`);
    }
  }

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
    h1Text: seo.h1Text,
    hasMobileViewport: seo.hasMobileViewport,
    hasSchema: seo.hasSchema,
    hasOgTags: seo.hasOgTags,
    hasAnalytics: seo.hasAnalytics,
    imagesWithoutAlt: seo.imagesWithoutAlt,
    issues,
    opportunities,
    crawlBlocked: seo.crawlBlocked,
    psiSkipped: !psi,
  };
}
