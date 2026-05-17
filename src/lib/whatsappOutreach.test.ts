import { strict as assert } from 'node:assert';
import test from 'node:test';
import { buildWhatsAppFallbackMessage, hasRepeatedCta, validateWhatsAppMessage, WhatsAppMessageInput } from '@/lib/whatsappOutreach';

const baseInput: WhatsAppMessageInput = {
  business_name: 'Anaya Beauty Salon',
  business_type: 'Beauty Salon',
  city: 'Lahore',
  country: 'Pakistan',
  has_website: false,
  website_url: null,
  social_profile_url: 'https://instagram.com/anayabeautysalon',
  has_social_profile: true,
  google_rating: '4.6/5',
  review_count: 89,
  services: ['hair', 'bridal makeup'],
  gbp_issues: ['No professional website found'],
  website_audit: null,
  available_facts: ['Business type: Beauty Salon', 'Has website: no'],
  sender_website: 'hasnainsaeed.net',
  rules: {
    must_start_with: 'Salam',
    max_words: 90,
    banned_phrases: [],
    must_include_sender_website: 'hasnainsaeed.net',
  },
};

test('detects repeated CTA', () => {
  assert.equal(hasRepeatedCta('Can I share this? Would you like me to send it?'), true);
});

test('validates banned phrase and max length', () => {
  const longWithBanned = `Salam Anaya Beauty Salon, I help with qualified leads ${'word '.repeat(100)} My work: hasnainsaeed.net Can I share?`;
  const result = validateWhatsAppMessage(longWithBanned, baseInput);
  assert.equal(result.valid, false);
  assert.ok(result.reasons.some(r => r.includes('banned phrase')));
  assert.ok(result.reasons.some(r => r.includes('90 words')));
});

test('fallback message includes key required fields', () => {
  const msg = buildWhatsAppFallbackMessage(baseInput);
  assert.ok(msg.includes('Salam Anaya Beauty Salon'));
  assert.ok(msg.includes('hasnainsaeed.net'));
});
