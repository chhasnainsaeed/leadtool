import axios from 'axios';
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

interface WhatsAppResult {
  ok: boolean;
  sid?: string;
  error?: string;
}

function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/[^\d+]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('+')) return cleaned;
  return `+${cleaned}`;
}

/**
 * Free offline check using libphonenumber-js number type detection.
 * Returns false only if the number is definitively a landline/toll-free.
 * Mobile, VoIP, and ambiguous numbers return true (optimistic).
 * Returns null if the number can't be parsed at all.
 */
export function checkWhatsAppAvailability(phone: string): boolean | null {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;

  try {
    if (!isValidPhoneNumber(normalized)) return null;
    const parsed = parsePhoneNumber(normalized);
    const type = parsed.getType();
    // Definite landlines — WhatsApp not possible
    if (type === 'FIXED_LINE' || type === 'TOLL_FREE' || type === 'PREMIUM_RATE' || type === 'SHARED_COST') {
      return false;
    }
    // MOBILE, VOIP, FIXED_LINE_OR_MOBILE, PERSONAL_NUMBER, UAN, UNKNOWN, undefined → assume yes
    return true;
  } catch {
    return null;
  }
}

export function buildWhatsAppMessage(businessName: string, emailBody: string): string {
  const firstLines = emailBody
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(' ');
  return `Hi ${businessName}, ${firstLines} Happy to share a free website concept if you're interested.`;
}

export async function sendWhatsAppMessage(to: string, body: string): Promise<WhatsAppResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken || !from) {
    return {
      ok: false,
      error: 'WhatsApp not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM.',
    };
  }

  const normalized = normalizePhone(to);
  if (!normalized) {
    return { ok: false, error: 'Invalid phone number for WhatsApp.' };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const params = new URLSearchParams();
    params.append('From', `whatsapp:${from}`);
    params.append('To', `whatsapp:${normalized}`);
    params.append('Body', body);

    const res = await axios.post(url, params, {
      auth: { username: accountSid, password: authToken },
      timeout: 20000,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return { ok: true, sid: res.data?.sid };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown WhatsApp send error';
    return { ok: false, error: message };
  }
}
