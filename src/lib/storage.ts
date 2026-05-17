import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { Lead, LeadsDB } from '@/types';
import { computeLeadScore } from '@/lib/leadScore';

const DB_PATH = path.join(process.cwd(), 'data', 'leads.json');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TABLE = 'leads';

export function getStorageProvider(): 'supabase' | 'local-json' {
  return SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? 'supabase' : 'local-json';
}

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

function ensureDB(): LeadsDB {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    const empty: LeadsDB = { leads: [], lastUpdated: new Date().toISOString() };
    fs.writeFileSync(DB_PATH, JSON.stringify(empty, null, 2));
    return empty;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function save(db: LeadsDB) {
  db.lastUpdated = new Date().toISOString();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function canonicalDomain(url: string): string {
  if (!url) return '';
  try {
    const host = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.toLowerCase();
    return host.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function dedupeKey(lead: Lead): string {
  const name = (lead.businessName || '').trim().toLowerCase();
  const address = (lead.address || '').trim().toLowerCase();
  const phone = (lead.phone || '').replace(/\D+/g, '');
  const domain = canonicalDomain(lead.website || lead.socialMedia || '');
  return [name, address, phone, domain].join('|');
}

function normalizeLead(lead: Lead): Lead {
  const insight = computeLeadScore(lead);
  return {
    ...lead,
    leadScore: insight.score,
    leadScoreReasons: insight.reasons,
    priorityTier: insight.priorityTier,
    recommendedChannel: insight.recommendedChannel,
    outreachAngle: insight.outreachAngle,
  };
}

function sanitizeImportedLead(lead: Lead): Lead {
  return {
    ...lead,
    auditData: undefined,
    emailContent: undefined,
    emailSent: false,
    emailSentAt: undefined,
    hasWhatsApp: undefined,
    whatsAppMessage: undefined,
    socialPlatform: undefined,
    socialMessage: undefined,
    notes: lead.notes || '',
    status: 'new',
  };
}

export async function getAllLeads(): Promise<Lead[]> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from(TABLE).select('payload').order('updated_at', { ascending: false });
    if (!error && data) {
      const leads = data.map((r: { payload: Lead }) => r.payload as Lead);
      return leads.sort((a: Lead, b: Lead) => (b.leadScore || 0) - (a.leadScore || 0) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }
  return ensureDB().leads.sort((a, b) => (b.leadScore || 0) - (a.leadScore || 0) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getLeadById(id: string): Promise<Lead | undefined> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.from(TABLE).select('payload').eq('id', id).maybeSingle();
    if (!error && data) return data.payload as Lead;
  }
  return ensureDB().leads.find(l => l.id === id);
}

export async function saveLeads(newLeads: Lead[]): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    const rows = newLeads.map(lead => {
      const normalized = normalizeLead(sanitizeImportedLead(lead));
      return { id: normalized.id, dedupe_key: dedupeKey(normalized), payload: normalized };
    });
    await supabase.from(TABLE).upsert(rows, { onConflict: 'id' });
    return;
  }

  const db = ensureDB();
  const keyToIndex = new Map<string, number>();
  db.leads.forEach((lead, i) => keyToIndex.set(dedupeKey(lead), i));
  for (const lead of newLeads) {
    const normalized = normalizeLead(sanitizeImportedLead(lead));
    const key = dedupeKey(normalized);
    const idxById = db.leads.findIndex(l => l.id === normalized.id);
    const idxByKey = keyToIndex.get(key);
    const idx = idxById >= 0 ? idxById : idxByKey ?? -1;
    if (idx >= 0) {
      db.leads[idx] = { ...db.leads[idx], ...normalized };
      keyToIndex.set(key, idx);
    } else {
      db.leads.push(normalized);
      keyToIndex.set(key, db.leads.length - 1);
    }
  }
  save(db);
}

export async function updateLead(id: string, updates: Partial<Lead>): Promise<Lead | null> {
  const supabase = getSupabase();
  if (supabase) {
    const existing = await getLeadById(id);
    if (!existing) return null;
    const merged = normalizeLead({ ...existing, ...updates } as Lead);
    await supabase.from(TABLE).upsert({ id: merged.id, dedupe_key: dedupeKey(merged), payload: merged }, { onConflict: 'id' });
    return merged;
  }
  const db = ensureDB();
  const idx = db.leads.findIndex(l => l.id === id);
  if (idx < 0) return null;
  db.leads[idx] = normalizeLead({ ...db.leads[idx], ...updates } as Lead);
  save(db);
  return db.leads[idx];
}

export async function deleteLead(id: string): Promise<boolean> {
  const supabase = getSupabase();
  if (supabase) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    return !error;
  }
  const db = ensureDB();
  const before = db.leads.length;
  db.leads = db.leads.filter(l => l.id !== id);
  if (db.leads.length < before) { save(db); return true; }
  return false;
}

export async function clearAll(): Promise<void> {
  const supabase = getSupabase();
  if (supabase) {
    await supabase.from(TABLE).delete().neq('id', '');
    return;
  }
  save({ leads: [], lastUpdated: new Date().toISOString() });
}
