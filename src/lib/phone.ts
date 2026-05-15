import { parsePhoneNumber, CountryCode } from 'libphonenumber-js';

const COUNTRY_TO_ALPHA2: Record<string, CountryCode> = {
  'Argentina': 'AR',
  'Australia': 'AU',
  'Austria': 'AT',
  'Bahrain': 'BH',
  'Belgium': 'BE',
  'Brazil': 'BR',
  'Canada': 'CA',
  'Chile': 'CL',
  'China': 'CN',
  'Colombia': 'CO',
  'Czech Republic': 'CZ',
  'Denmark': 'DK',
  'Egypt': 'EG',
  'Finland': 'FI',
  'France': 'FR',
  'Germany': 'DE',
  'Ghana': 'GH',
  'Greece': 'GR',
  'Hong Kong': 'HK',
  'Hungary': 'HU',
  'India': 'IN',
  'Indonesia': 'ID',
  'Ireland': 'IE',
  'Israel': 'IL',
  'Italy': 'IT',
  'Japan': 'JP',
  'Jordan': 'JO',
  'Kenya': 'KE',
  'Kuwait': 'KW',
  'Malaysia': 'MY',
  'Mexico': 'MX',
  'Netherlands': 'NL',
  'New Zealand': 'NZ',
  'Nigeria': 'NG',
  'Norway': 'NO',
  'Pakistan': 'PK',
  'Peru': 'PE',
  'Philippines': 'PH',
  'Poland': 'PL',
  'Portugal': 'PT',
  'Qatar': 'QA',
  'Romania': 'RO',
  'Saudi Arabia': 'SA',
  'Singapore': 'SG',
  'South Africa': 'ZA',
  'South Korea': 'KR',
  'Spain': 'ES',
  'Sweden': 'SE',
  'Switzerland': 'CH',
  'Thailand': 'TH',
  'Turkey': 'TR',
  'United Arab Emirates': 'AE',
  'United Kingdom': 'GB',
  'United States': 'US',
};

/**
 * Returns E.164 format (+XXXXXXXXX). If the number has no country code and
 * `country` is provided, the matching dial code is prepended automatically.
 */
export function normalizePhoneE164(raw: string, country?: string): string {
  const cleaned = raw.replace(/[^\d+]/g, '');
  if (!cleaned) return '';

  if (cleaned.startsWith('+')) {
    try {
      const parsed = parsePhoneNumber(cleaned);
      if (parsed.isValid()) return parsed.number;
    } catch {}
    return cleaned;
  }

  if (country) {
    const alpha2 = COUNTRY_TO_ALPHA2[country];
    if (alpha2) {
      try {
        const parsed = parsePhoneNumber(cleaned, alpha2);
        if (parsed.isValid()) return parsed.number;
      } catch {}
    }
  }

  return `+${cleaned}`;
}

/** Strips E.164 leading + for use in whatsapp:// URI phone param. */
export function e164ToWaPhone(e164: string): string {
  return e164.replace(/^\+/, '');
}
