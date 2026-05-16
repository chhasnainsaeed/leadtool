import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Lead, AuditData, EmailContent } from '@/types';

const SENDER_NAME = process.env.SENDER_NAME || 'Your Name';
const SENDER_EMAIL = process.env.SMTP_USER || '';
const AI_PROVIDER = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-3-flash-preview';

const SYSTEM_PROMPT = `You are a conversion-focused cold outreach writer for a web design agency.
Every email you write gets replies because it is specific and brief — never generic.

RULES:
- Open with ONE concrete, verifiable finding from the audit data (a real score, a missing feature, a specific issue name). NEVER write "I noticed your website" or "I came across your business" — those are banned.
- State the business impact in one plain sentence: what leads, bookings, or revenue they are losing RIGHT NOW because of that specific issue.
- Offer a free 3-point growth plan tailored to them — no sales call, no pricing, no packages.
- End with exactly ONE yes/no question: "Want me to send it?"
- Body: 80-120 words. Subject: 6-8 words, lowercase, sounds like a person not a campaign.
- No bullet lists. No markdown. Plain text only.
- Write as someone who audited their specific business — not a mass outreach tool.
Return JSON with exactly two keys: "subject" and "body".`;

const WA_SYSTEM_PROMPT = `You are writing a WhatsApp cold message for a web design agency.
This lands on someone's phone — it must feel personal, direct, and human. No corporate tone.

RULES:
- Start with "Hi [BusinessName],"
- Immediately mention ONE specific finding from the data (no website, slow speed score, missing booking form, no photos, low reviews, etc.). Be concrete.
- One sentence: what that specific issue is costing them (leads, bookings, customers going to competitors)
- Soft close: "Would a free 3-point growth plan for [BusinessName] be useful?"
- 50-70 words total. Casual but credible. One relevant emoji max.
- Return plain text only — no JSON, no subject line, no markdown.`;

// ── Gemini ──────────────────────────────────────────────────────────────────
async function generateWithGemini(prompt: string, systemInstruction: string, maxTokens = 1024): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set in .env.local');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: GEMINI_TEXT_MODEL,
    systemInstruction,
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.85,
    },
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

// ── Claude ───────────────────────────────────────────────────────────────────
async function generateWithClaude(prompt: string, systemInstruction: string, maxTokens = 1024): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set in .env.local');

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system: systemInstruction,
    messages: [{ role: 'user', content: prompt }],
  });
  return message.content[0].type === 'text' ? message.content[0].text.trim() : '';
}

// ── Parser ───────────────────────────────────────────────────────────────────
function parseEmailJSON(text: string, fallbackSubject: string): EmailContent {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : text) as EmailContent;
    return {
      subject: parsed.subject || fallbackSubject,
      body: (parsed.body || text)
        .replace(/\[Your Name\]/gi, SENDER_NAME)
        .replace(/\[Sender\]/gi, SENDER_NAME)
        .replace(/\[Your Email\]/gi, SENDER_EMAIL),
    };
  } catch {
    return { subject: fallbackSubject, body: text };
  }
}

// ── Email generation ──────────────────────────────────────────────────────────
export async function generateEmail(lead: Lead, websiteAudit?: AuditData): Promise<EmailContent> {
  const prompt = buildEmailPrompt(lead, websiteAudit);
  const text = AI_PROVIDER === 'claude'
    ? await generateWithClaude(prompt, SYSTEM_PROMPT)
    : await generateWithGemini(prompt, SYSTEM_PROMPT);
  return parseEmailJSON(text, `Quick question about ${lead.businessName}`);
}

// ── WhatsApp message generation ───────────────────────────────────────────────
export async function generateWhatsAppMessage(lead: Lead, websiteAudit?: AuditData): Promise<string> {
  const prompt = buildWhatsAppPrompt(lead, websiteAudit);
  try {
    const text = AI_PROVIDER === 'claude'
      ? await generateWithClaude(prompt, WA_SYSTEM_PROMPT, 300)
      : await generateWithGemini(prompt, WA_SYSTEM_PROMPT, 300);
    return text;
  } catch {
    return `Hi ${lead.businessName}, I found a few quick wins in your online presence that could bring in more local leads. Would a free 3-point growth plan be useful?`;
  }
}

export function getActiveProvider(): string {
  return AI_PROVIDER === 'claude' ? 'Claude (Anthropic)' : `Gemini (${GEMINI_TEXT_MODEL})`;
}

// ── Email prompt builder ──────────────────────────────────────────────────────
function buildEmailPrompt(lead: Lead, websiteAudit?: AuditData): string {
  const stars = lead.rating > 0 ? `${lead.rating} stars (${lead.reviews} reviews)` : 'no rating yet';

  if (!lead.hasRealWebsite) {
    const hasSocial = !!lead.socialMedia && lead.socialMedia !== 'N/A';
    const socialLabel = hasSocial
      ? 'a social media page (' + lead.socialMedia.replace(/^https?:\/\//, '').split('/')[0] + ')'
      : 'a Google Business listing';
    return `Write a cold email to the owner of "${lead.businessName}", a ${lead.category} in ${lead.city}${lead.country ? ', ' + lead.country : ''}.

KEY FACTS:
- No real website — only ${socialLabel}
- Google rating: ${stars}
- Without a website, every competitor with one is capturing the searches they miss
${lead.description && lead.description !== 'N/A' ? `- Business description: ${lead.description}` : '- No business description on their listing'}
${lead.gbpPitchPoints && lead.gbpPitchPoints !== 'No major issues found' ? `- Pitch angles: ${lead.gbpPitchPoints}` : ''}

Open with the fact that they have no website and a competitor with one is already winning the searches for "${lead.category} in ${lead.city}". Make it feel urgent, not preachy.

Sender: ${SENDER_NAME}
Return JSON: {"subject": "...", "body": "..."}`;
  }

  const gbpIssueList = lead.gbpIssues && lead.gbpIssues !== 'N/A'
    ? lead.gbpIssues.replace(/[❌⚠️✅]/g, '').split(' | ').map(s => s.trim()).filter(Boolean)
    : [];

  const pitchPoints = lead.gbpPitchPoints && lead.gbpPitchPoints !== 'N/A' && lead.gbpPitchPoints !== 'No major issues found'
    ? lead.gbpPitchPoints.split(' | ').map(s => s.trim()).filter(Boolean)
    : [];

  const allIssues = [...gbpIssueList, ...(websiteAudit?.issues || [])].slice(0, 5);
  const allOpportunities = (websiteAudit?.opportunities || []).slice(0, 3);
  const perfScore = websiteAudit?.performance;

  const techDetails: string[] = [];
  if (websiteAudit) {
    if (!websiteAudit.hasAnalytics) techDetails.push('no analytics tracking');
    if (!websiteAudit.hasSchema) techDetails.push('no structured data for Google');
    if (!websiteAudit.hasOgTags) techDetails.push('no social sharing preview (Open Graph)');
    if (websiteAudit.imagesWithoutAlt > 0) techDetails.push(`${websiteAudit.imagesWithoutAlt} images missing alt text`);
    if (websiteAudit.crawlBlocked) techDetails.push('site blocks search engine crawlers');
    if (websiteAudit.psiSkipped) techDetails.push('page speed could not be measured');
  }

  const visualFindings = websiteAudit?.visualIssues ?? [];

  // Pick the single most impactful issue to lead with
  const topIssue = perfScore !== undefined && perfScore > 0 && perfScore < 50
    ? `mobile performance score of ${perfScore}/100 (half their visitors leave before the page loads)`
    : allIssues[0] || pitchPoints[0] || 'GBP profile missing key information';

  return `Write a cold email to the owner of "${lead.businessName}", a ${lead.category} in ${lead.city}${lead.country ? ', ' + lead.country : ''}.

KEY FACTS TO USE:
- Website: ${lead.website}
- Google rating: ${stars}
- GBP audit score: ${lead.gbpAuditScore}/100
- TOP ISSUE TO LEAD WITH: ${topIssue}
${allIssues.length > 0 ? `- Other issues found:\n${allIssues.map(i => '  * ' + i).join('\n')}` : ''}
${allOpportunities.length > 0 ? `- Quick wins available:\n${allOpportunities.map(o => '  * ' + o).join('\n')}` : ''}
${visualFindings.length > 0 ? `- Visual design problems:\n${visualFindings.map(v => '  * ' + v).join('\n')}` : ''}
${techDetails.length > 0 ? `- Technical findings: ${techDetails.join(', ')}` : ''}
${pitchPoints.length > 0 ? `- Pitch angles:\n${pitchPoints.map(p => '  * ' + p).join('\n')}` : ''}

INSTRUCTION: Lead with the TOP ISSUE exactly — name it specifically. Don't soften it. Make the business impact crystal clear in one sentence.

Sender: ${SENDER_NAME}
Return JSON: {"subject": "...", "body": "..."}`;
}

// ── WhatsApp prompt builder ───────────────────────────────────────────────────
function buildWhatsAppPrompt(lead: Lead, websiteAudit?: AuditData): string {
  const stars = lead.rating > 0 ? `${lead.rating}/5 stars (${lead.reviews} reviews)` : 'no Google rating';

  if (!lead.hasRealWebsite) {
    return `Write a WhatsApp message to the owner of "${lead.businessName}", a ${lead.category} in ${lead.city}${lead.country ? ', ' + lead.country : ''}.

FACTS:
- No website — only a Google listing or social page
- ${stars}
${lead.gbpPitchPoints && lead.gbpPitchPoints !== 'No major issues found' ? `- Issues: ${lead.gbpPitchPoints}` : ''}

Lead with: they have no website so every search for "${lead.category} in ${lead.city}" sends customers to a competitor who does.
50-70 words. Return plain text only.`;
  }

  const issues = [
    ...(lead.gbpIssues && lead.gbpIssues !== 'N/A'
      ? lead.gbpIssues.replace(/[❌⚠️✅]/g, '').split(' | ').map(s => s.trim()).filter(Boolean)
      : []),
    ...(websiteAudit?.issues || []),
  ].slice(0, 3);

  const perfScore = websiteAudit?.performance;

  const topFinding = perfScore !== undefined && perfScore > 0 && perfScore < 55
    ? `mobile speed score: ${perfScore}/100`
    : issues[0] || (lead.gbpPitchPoints && lead.gbpPitchPoints !== 'No major issues found' ? lead.gbpPitchPoints.split(' | ')[0] : '');

  return `Write a WhatsApp message to the owner of "${lead.businessName}", a ${lead.category} in ${lead.city}${lead.country ? ', ' + lead.country : ''}.

FACTS:
- Website: ${lead.website}
- ${stars}
- GBP score: ${lead.gbpAuditScore}/100
${topFinding ? `- TOP ISSUE: ${topFinding}` : ''}
${issues.length > 1 ? `- Other issues: ${issues.slice(1).join(', ')}` : ''}

Lead with the TOP ISSUE — name it specifically and say what it's costing them.
50-70 words. Return plain text only.`;
}
