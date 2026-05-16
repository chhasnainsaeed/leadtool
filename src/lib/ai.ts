import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Lead, AuditData, EmailContent } from '@/types';

const SENDER_NAME = process.env.SENDER_NAME || 'Your Name';
const SENDER_EMAIL = process.env.SMTP_USER || '';
const AI_PROVIDER = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-3-pro-preview';

const SYSTEM_PROMPT = `You are an elite outbound copywriter for a web growth agency.
Goal: get a reply from local business owners using concise, high-conversion outreach.
Write plain text only (no markdown, no bullet lists), 80-140 words max.
Use this flow:
1) Personalized hook with a specific observation
2) Business impact in plain words (lost leads/bookings/revenue)
3) Low-friction value offer (free 3-point growth plan)
4) One yes/no CTA
Tone: confident, professional, human, never spammy.
Never mention pricing or packages.
Return JSON with exactly two keys: "subject" and "body".`;

// ── Gemini ──────────────────────────────────────────────────────────────────
async function generateWithGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set in .env.local');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: GEMINI_TEXT_MODEL,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 0.8,
    },
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  // Strip markdown code fences if Gemini wraps the JSON
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

// ── Claude ───────────────────────────────────────────────────────────────────
async function generateWithClaude(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set in .env.local');

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });
  return message.content[0].type === 'text' ? message.content[0].text : '';
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

// ── Main export ───────────────────────────────────────────────────────────────
export async function generateEmail(lead: Lead, websiteAudit?: AuditData): Promise<EmailContent> {
  const prompt = buildPrompt(lead, websiteAudit);

  let text: string;
  if (AI_PROVIDER === 'claude') {
    text = await generateWithClaude(prompt);
  } else {
    // Default: Gemini (free tier: 1,500 requests/day)
    text = await generateWithGemini(prompt);
  }

  return parseEmailJSON(text, `Quick question about ${lead.businessName}`);
}

export function getActiveProvider(): string {
  return AI_PROVIDER === 'claude' ? 'Claude (Anthropic)' : `Gemini (${GEMINI_TEXT_MODEL})`;
}

// ── Prompt builder ────────────────────────────────────────────────────────────
function buildPrompt(lead: Lead, websiteAudit?: AuditData): string {
  const stars = lead.rating > 0 ? `${lead.rating} stars (${lead.reviews} reviews)` : 'no rating yet';

  if (!lead.hasRealWebsite) {
    const hasSocial = !!lead.socialMedia && lead.socialMedia !== 'N/A';
    return `Write a cold email to the owner of "${lead.businessName}", a ${lead.category} in ${lead.city}${lead.country ? ', ' + lead.country : ''}.

They have NO real website — only ${hasSocial ? 'a social media page (' + lead.socialMedia.replace(/^https?:\/\//, '').split('/')[0] + ')' : 'a Google Business listing'}.
Google rating: ${stars}
${lead.description && lead.description !== 'N/A' ? `Business description: ${lead.description}` : 'No business description on their Google listing.'}
${lead.gbpPitchPoints && lead.gbpPitchPoints !== 'No major issues found' ? `Pitch angles: ${lead.gbpPitchPoints}` : ''}

I build websites for local ${lead.category}s. Write an email that:
1. Opens with a direct personalized hook
2. Explains impact: missed local leads and bookings
3. Offers a free 3-point growth plan tailored to their business
4. Ends with a yes/no CTA: "Want me to send it?"
5. Keeps body between 80 and 140 words

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
    if (websiteAudit.psiSkipped) techDetails.push('page speed could not be measured (possible server issues)');
  }

  const visualFindings = websiteAudit?.visualIssues ?? [];

  return `Write a cold email to the owner of "${lead.businessName}", a ${lead.category} in ${lead.city}${lead.country ? ', ' + lead.country : ''}.

Website: ${lead.website}
Google rating: ${stars}
GBP audit score: ${lead.gbpAuditScore}/100
${allIssues.length > 0 ? `Critical issues found:\n${allIssues.map(i => '- ' + i).join('\n')}` : 'No critical issues detected by our audit.'}
${allOpportunities.length > 0 ? `\nImprovement opportunities:\n${allOpportunities.map(o => '- ' + o).join('\n')}` : ''}
${visualFindings.length > 0 ? `\nVisual design problems (from screenshot analysis):\n${visualFindings.map(v => '- ' + v).join('\n')}` : ''}
${techDetails.length > 0 ? `\nAdditional technical findings: ${techDetails.join(', ')}` : ''}
${perfScore !== undefined && perfScore > 0 ? `\nWebsite mobile performance: ${perfScore}/100` : ''}
${pitchPoints.length > 0 ? `\nKey pitch angles:\n${pitchPoints.map(p => '- ' + p).join('\n')}` : ''}

I'm a web designer. Write an email that:
1. Mentions ONE specific issue I noticed (most impactful)
2. Explains business impact in one sentence (lost leads/bookings)
3. Offers a free 3-point growth plan tailored to them
4. Ends with one yes/no CTA: "Want me to send it?"
5. Keeps body between 80 and 140 words

Sender: ${SENDER_NAME}
Return JSON: {"subject": "...", "body": "..."}`;
}

