import axios from 'axios';

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
 * Uses Twilio Lookup v2 to detect line type.
 * Returns true if likely WhatsApp-capable (mobile/voip/unknown),
 * false if definitely not (landline/toll-free), null if check unavailable.
 */
export async function checkWhatsAppAvailability(phone: string): Promise<boolean | null> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) return null;

  const normalized = normalizePhone(phone);
  if (!normalized) return null;

  try {
    const url = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(normalized)}?Fields=line_type_intelligence`;
    const res = await axios.get<{ line_type_intelligence?: { type?: string } }>(url, {
      auth: { username: accountSid, password: authToken },
      timeout: 10_000,
    });
    const lineType = res.data?.line_type_intelligence?.type;
    if (lineType === 'landline' || lineType === 'toll-free') return false;
    return true;
  } catch {
    // Lookup failed (quota, network, etc.) — assume available
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
