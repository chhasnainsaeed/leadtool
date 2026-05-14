import axios from 'axios';
import * as cheerio from 'cheerio';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AuditData } from '@/types';

const PSI_TIMEOUT = 45_000;
const CRAWL_TIMEOUT = 20_000;
const PSI_RETRY_DELAY = 4_000;

const CRAWL_USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
];

// ── PSI types ─────────────────────────────────────────────────────────────────

interface PSICategory { score: number | null; }

interface PSIAudit {
  score: number | null;
  displayValue?: string;
  details?: {
    // final-screenshot
    data?: string;
    // full-page-screenshot
    screenshot?: { data: string; width: number; height: number };
  };
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
      'unused-css-rules'?: PSIAudit;
      'unused-javascript'?: PSIAudit;
      'uses-text-compression'?: PSIAudit;
      'server-response-time'?: PSIAudit;
      'final-screenshot'?: PSIAudit;
      'full-page-screenshot'?: PSIAudit;
    };
  };
}

// ── SEO crawl types ───────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(val: number | null | undefined): number {
  return val == null ? 0 : Math.round(val * 100);
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

function extractScreenshot(psi: PSIResult | null): string | null {
  if (!psi?.lighthouseResult?.audits) return null;
  const audits = psi.lighthouseResult.audits;

  // Prefer full-page screenshot, fall back to final-screenshot thumbnail
  const fullPage = audits['full-page-screenshot']?.details?.screenshot?.data;
  if (fullPage) return fullPage;

  const finalShot = audits['final-screenshot']?.details?.data;
  if (finalShot) return finalShot;

  return null;
}

// ── PageSpeed Insights ────────────────────────────────────────────────────────

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

// ── HTML crawl ────────────────────────────────────────────────────────────────

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

  const allImgs = $('img');
  let noAlt = 0;
  allImgs.each((_, el) => {
    const alt = $(el).attr('alt');
    if (alt === undefined || alt === '') noAlt++;
  });

  const htmlLower = html.toLowerCase();
  const hasAnalytics =
    htmlLower.includes('gtag(') ||
    htmlLower.includes('googletagmanager.com') ||
    htmlLower.includes('google-analytics.com') ||
    htmlLower.includes('fbq(') || htmlLower.includes('connect.facebook.net') ||
    htmlLower.includes('hotjar.com') ||
    htmlLower.includes('plausible.io');

  const hasSchema =
    $('script[type="application/ld+json"]').length > 0 ||
    htmlLower.includes('schema.org');

  const hasOgTags =
    $('meta[property="og:title"]').length > 0 &&
    $('meta[property="og:image"]').length > 0;

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
    hasCanonical: $('link[rel="canonical"]').length > 0,
    hasOgTags,
    hasSchema,
    hasAnalytics,
    imagesWithoutAlt: noAlt,
    totalImages: allImgs.length,
    crawlBlocked: false,
  };
}

// ── Gemini Visual Audit ───────────────────────────────────────────────────────

interface VisualResult {
  issues: string[];
  opportunities: string[];
}

async function runVisualAudit(screenshotDataUrl: string): Promise<VisualResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { issues: [], opportunities: [] };

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Parse data URL → mimeType + base64
    const commaIdx = screenshotDataUrl.indexOf(',');
    const header = screenshotDataUrl.slice(0, commaIdx);
    const base64Data = screenshotDataUrl.slice(commaIdx + 1);
    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';

    const result = await model.generateContent([
      {
        inlineData: { data: base64Data, mimeType },
      },
      {
        text: `You are a professional web designer reviewing this website screenshot for a sales outreach tool.
Analyze what you see and identify specific, concrete problems a web designer could fix and pitch.

Look for:
- Outdated or unprofessional design (old gradients, clip art, bad fonts, clashing colors)
- No visible call-to-action button (Book Now, Call Us, Get a Quote, Contact, etc.)
- No phone number or contact info visible above the fold
- Missing or broken hero/banner image
- Cluttered or confusing layout that's hard to navigate
- Poor color contrast making text hard to read
- Generic stock photos or placeholder content
- No trust signals visible (reviews, certifications, years in business, testimonials)
- Looks bad on mobile (if you can tell from the screenshot)
- No clear headline explaining what the business does

Return ONLY valid JSON — no explanation, no markdown:
{"issues": ["specific issue 1", "specific issue 2"], "opportunities": ["quick win 1", "quick win 2"]}

Max 3 issues, max 2 opportunities. Be specific to what you actually see. If the site looks professional and modern, return {"issues": [], "opportunities": []}.`,
      },
    ]);

    const text = result.response
      .text()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : text) as VisualResult;

    return {
      issues: Array.isArray(parsed.issues) ? parsed.issues.slice(0, 3) : [],
      opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities.slice(0, 2) : [],
    };
  } catch (err) {
    console.warn('[auditor] Visual audit failed:', (err as Error).message);
    return { issues: [], opportunities: [] };
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function auditWebsite(url: string): Promise<AuditData> {
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;

  // PSI and HTML crawl run in parallel
  const [psiSettled, fetchSettled] = await Promise.allSettled([
    runPageSpeed(normalizedUrl),
    fetchHTML(normalizedUrl),
  ]);

  const psi = psiSettled.status === 'fulfilled' ? psiSettled.value : null;
  const { html, blocked } = fetchSettled.status === 'fulfilled'
    ? fetchSettled.value
    : { html: '', blocked: true };

  const seo = runSEOChecks(normalizedUrl, html, blocked);
  const screenshotDataUrl = extractScreenshot(psi) ?? undefined;

  // Visual audit runs after PSI (needs screenshot)
  const visual = screenshotDataUrl
    ? await runVisualAudit(screenshotDataUrl)
    : { issues: [], opportunities: [] };

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

  // ── Crawl notice ──────────────────────────────────────────────────────────────
  if (seo.crawlBlocked) {
    opportunities.push('Site blocked automated crawlers — some SEO tools may not index it');
  }

  // ── PageSpeed scores ──────────────────────────────────────────────────────────
  if (psi) {
    if (perfScore < 50)      issues.push(`Very slow mobile load speed (${perfScore}/100) — visitors likely bouncing`);
    else if (perfScore < 75) opportunities.push(`Mobile performance needs work (${perfScore}/100)`);

    if (accessScore < 70)    issues.push(`Poor accessibility score (${accessScore}/100)`);
    if (seoScore > 0 && seoScore < 70) issues.push(`Low Lighthouse SEO score (${seoScore}/100)`);
    if (bpScore < 70)        opportunities.push(`Best practices score is low (${bpScore}/100)`);

    const serverResp = audits['server-response-time'];
    if (serverResp?.score !== null && (serverResp?.score ?? 1) < 0.5)
      issues.push('Slow server response time (TTFB) — hosting may need upgrading');

    if (audits['render-blocking-resources']?.score === 0)
      opportunities.push('Render-blocking resources slowing page load (CSS/JS in <head>)');
    if ((audits['uses-optimized-images']?.score ?? 1) < 0.9)
      opportunities.push('Images not optimized — converting to WebP could reduce load time');
    if ((audits['unused-css-rules']?.score ?? 1) < 0.9)
      opportunities.push('Unused CSS loaded on every page (wasted bandwidth)');
    if ((audits['unused-javascript']?.score ?? 1) < 0.9)
      opportunities.push('Unused JavaScript loaded — slowing Time to Interactive');
    if ((audits['uses-text-compression']?.score ?? 1) < 0.9)
      opportunities.push('Text compression (gzip/brotli) not enabled on server');
  }

  // ── On-page SEO ───────────────────────────────────────────────────────────────
  if (!seo.crawlBlocked) {
    if (!seo.hasTitle)              issues.push('Missing <title> tag — critical for Google rankings');
    else if (seo.titleTooShort)     opportunities.push(`Page title too short (${seo.titleText.length} chars) — aim for 30–60`);
    else if (seo.titleTooLong)      opportunities.push(`Page title too long (${seo.titleText.length} chars) — Google truncates after 60`);

    if (!seo.hasMetaDescription)    issues.push('Missing meta description — Google writes its own, often poorly');
    else if (seo.metaDescTooShort)  opportunities.push('Meta description too short — missing chance to attract clicks');
    else if (seo.metaDescTooLong)   opportunities.push('Meta description too long — will be cut off in search results');

    if (!seo.hasH1)                 issues.push('No H1 heading — search engines can\'t identify the page topic');
    else if (seo.multipleH1)        opportunities.push('Multiple H1 tags found — should have exactly one');

    if (!seo.hasMobileViewport)     issues.push('Missing mobile viewport tag — site likely broken on phones');
    if (!seo.hasCanonical)          opportunities.push('No canonical tag — duplicate content may split SEO value');
    if (!seo.hasOgTags)             opportunities.push('No Open Graph tags — links shared on social show no preview image');
    if (!seo.hasSchema)             opportunities.push('No structured data (schema.org) — missing rich results in Google');
    if (!seo.hasAnalytics)          opportunities.push('No analytics detected — owner may not be tracking traffic or conversions');

    if (seo.imagesWithoutAlt > 0) {
      const label = seo.imagesWithoutAlt === 1
        ? '1 image has no alt text'
        : `${seo.imagesWithoutAlt} of ${seo.totalImages} images have no alt text`;
      opportunities.push(`${label} — hurts accessibility and image SEO`);
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
    visualIssues: visual.issues,
    screenshotDataUrl,
    crawlBlocked: seo.crawlBlocked,
    psiSkipped: !psi,
    visualSkipped: !screenshotDataUrl,
  };
}
