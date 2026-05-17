import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Lead, AuditData, EmailContent } from '@/types';
import { buildWhatsAppFallbackMessage, buildWhatsAppInput, validateWhatsAppMessage } from '@/lib/whatsappOutreach';

const SENDER_NAME = process.env.SENDER_NAME || 'Your Name';
const SENDER_EMAIL = process.env.SMTP_USER || '';
const AI_PROVIDER = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-3.1-flash';

const SYSTEM_PROMPT = `You are a conversion-focused cold outreach writer for a web design agency.
Every email you write gets replies because it is specific and brief - never generic.

RULES:
- Open with ONE concrete, verifiable finding from the audit data (a real score, a missing feature, a specific issue name). NEVER write "I noticed your website" or "I came across your business" - those are banned.
- State the business impact in one plain sentence: what leads, bookings, or revenue they are losing RIGHT NOW because of that specific issue.
- Offer a free 3-point growth plan tailored to them - no sales call, no pricing, no packages.
- End with exactly ONE yes/no question: "Want me to send it?"
- Body: 80-120 words. Subject: 6-8 words, lowercase, sounds like a person not a campaign.
- No bullet lists. No markdown. Plain text only.
- Write as someone who audited their specific business - not a mass outreach tool.
Return JSON with exactly two keys: "subject" and "body".`;

const WA_SYSTEM_PROMPT = `You are a local business outreach copywriter.
Write short WhatsApp messages for website design/development outreach.

Rules:
- Message must feel human, local, respectful, and specific to the business.
- Avoid generic agency language, repetition, overpromising, and cold email style.
- Never use these phrases: qualified leads, growth plan, free 3-point plan, conversion-focused improvements, digital presence, increase bookings and qualified leads.
- Always start with "Salam".
- Always include the business name.
- Always mention one specific audit observation.
- Always explain why a website matters for this business type.
- Always include sender portfolio website: hasnainsaeed.net
- Always end with one soft question.
- Maximum 90 words.
- First decide the best outreach angle yourself from the provided lead facts (do not rely on fixed templates).
- Use one specific weak point and one relevant business-context detail to keep the message grounded.
- Output only the final WhatsApp message.`;

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

export async function generateEmail(lead: Lead, websiteAudit?: AuditData): Promise<EmailContent> {
  const prompt = buildEmailPrompt(lead, websiteAudit);
  const text = AI_PROVIDER === 'claude'
    ? await generateWithClaude(prompt, SYSTEM_PROMPT)
    : await generateWithGemini(prompt, SYSTEM_PROMPT);
  return parseEmailJSON(text, `Quick question about ${lead.businessName}`);
}

export async function generateWhatsAppMessage(lead: Lead, websiteAudit?: AuditData): Promise<string> {
  const input = buildWhatsAppInput(lead, websiteAudit);
  const prompt = buildWhatsAppPrompt(input);
  try {
    const first = AI_PROVIDER === 'claude'
      ? await generateWithClaude(prompt, WA_SYSTEM_PROMPT, 300)
      : await generateWithGemini(prompt, WA_SYSTEM_PROMPT, 300);
    const firstValidation = validateWhatsAppMessage(first, input);
    if (firstValidation.valid) return first;

    const retryPrompt = `${prompt}\n\nPrevious draft failed validation because: ${firstValidation.reasons.join('; ')}. Rewrite from scratch and return only the final WhatsApp message.`;
    const second = AI_PROVIDER === 'claude'
      ? await generateWithClaude(retryPrompt, WA_SYSTEM_PROMPT, 300)
      : await generateWithGemini(retryPrompt, WA_SYSTEM_PROMPT, 300);

    return validateWhatsAppMessage(second, input).valid ? second : buildWhatsAppFallbackMessage(input);
  } catch {
    return buildWhatsAppFallbackMessage(input);
  }
}

export function getActiveProvider(): string {
  return AI_PROVIDER === 'claude' ? 'Claude (Anthropic)' : `Gemini (${GEMINI_TEXT_MODEL})`;
}

function buildEmailPrompt(lead: Lead, websiteAudit?: AuditData): string {
  const stars = lead.rating > 0 ? `${lead.rating} stars (${lead.reviews} reviews)` : 'no rating yet';

  if (!lead.hasRealWebsite) {
    const hasSocial = !!lead.socialMedia && lead.socialMedia !== 'N/A';
    const socialLabel = hasSocial
      ? 'a social media page (' + lead.socialMedia.replace(/^https?:\/\//, '').split('/')[0] + ')'
      : 'a Google Business listing';
    return `Write a cold email to the owner of "${lead.businessName}", a ${lead.category} in ${lead.city}${lead.country ? ', ' + lead.country : ''}.

KEY FACTS:
- No real website - only ${socialLabel}
- Google rating: ${stars}
- Without a website, every competitor with one is capturing the searches they miss
${lead.description && lead.description !== 'N/A' ? `- Business description: ${lead.description}` : '- No business description on their listing'}
${lead.gbpPitchPoints && lead.gbpPitchPoints !== 'No major issues found' ? `- Pitch angles: ${lead.gbpPitchPoints}` : ''}

Open with the fact that they have no website and a competitor with one is already winning the searches for "${lead.category} in ${lead.city}". Make it feel urgent, not preachy.

Sender: ${SENDER_NAME}
Return JSON: {"subject": "...", "body": "..."}`;
  }

  return `Write a cold email to the owner of "${lead.businessName}", a ${lead.category} in ${lead.city}${lead.country ? ', ' + lead.country : ''}.

KEY FACTS TO USE:
- Website: ${lead.website}
- Google rating: ${stars}
- GBP audit score: ${lead.gbpAuditScore}/100

Sender: ${SENDER_NAME}
Return JSON: {"subject": "...", "body": "..."}`;
}

function buildWhatsAppPrompt(input: ReturnType<typeof buildWhatsAppInput>): string {
  return `Use this structured lead and audit data:\n${JSON.stringify(input, null, 2)}\n\nTask:\n1) Analyze the business type and available facts yourself.\n2) Decide the best outreach angle yourself.\n3) Write one WhatsApp outreach message following all system rules.\n\nImportant:\n- Do not invent facts.\n- If data is limited, infer only general business/customer-journey needs from the category, and phrase them carefully.\n- Mention at least one factual detail from provided data (issue, metric, service, or profile status).\n\nStyle constraints:\n- Keep it human, local, and respectful.\n- Avoid buzzwords and generic agency lines.\n- Do not mention that this is AI-generated.\n\nOutput only the final WhatsApp message text.`;
}
