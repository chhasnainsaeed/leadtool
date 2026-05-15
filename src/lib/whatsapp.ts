import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';
import { normalizePhoneE164 } from './phone';

/**
 * Offline check using libphonenumber-js number type detection.
 * Pass `country` (lead.country) so local numbers without a dial code are
 * parsed correctly before the type check.
 * Returns false only for definite landlines/toll-free numbers.
 * Mobile, VoIP, and ambiguous numbers return true (optimistic).
 * Returns null if the number can't be parsed at all.
 */
export function checkWhatsAppAvailability(phone: string, country?: string): boolean | null {
  const normalized = normalizePhoneE164(phone, country);
  if (!normalized) return null;

  try {
    if (!isValidPhoneNumber(normalized)) return null;
    const parsed = parsePhoneNumber(normalized);
    const type = parsed.getType();
    if (type === 'FIXED_LINE' || type === 'TOLL_FREE' || type === 'PREMIUM_RATE' || type === 'SHARED_COST') {
      return false;
    }
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
