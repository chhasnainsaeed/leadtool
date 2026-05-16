import fs from 'fs';
import path from 'path';
import { Lead, LeadsDB } from '@/types';
import { computeLeadScore } from '@/lib/leadScore';

const DB_PATH = path.join(process.cwd(), 'data', 'leads.json');

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

export function getAllLeads(): Lead[] {
  return ensureDB().leads.sort(
    (a, b) => (b.leadScore || 0) - (a.leadScore || 0) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getLeadById(id: string): Lead | undefined {
  return ensureDB().leads.find(l => l.id === id);
}

export function saveLeads(newLeads: Lead[]): void {
  const db = ensureDB();
  const keyToIndex = new Map<string, number>();
  db.leads.forEach((lead, i) => keyToIndex.set(dedupeKey(lead), i));

  for (const lead of newLeads) {
    const insight = computeLeadScore(lead);
    const normalized: Lead = {
      ...lead,
      leadScore: insight.score,
      leadScoreReasons: insight.reasons,
      priorityTier: insight.priorityTier,
      recommendedChannel: insight.recommendedChannel,
      outreachAngle: insight.outreachAngle,
    };
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

export function updateLead(id: string, updates: Partial<Lead>): Lead | null {
  const db = ensureDB();
  const idx = db.leads.findIndex(l => l.id === id);
  if (idx < 0) return null;
  const merged = { ...db.leads[idx], ...updates } as Lead;
  const insight = computeLeadScore(merged);
  db.leads[idx] = {
    ...merged,
    leadScore: insight.score,
    leadScoreReasons: insight.reasons,
    priorityTier: insight.priorityTier,
    recommendedChannel: insight.recommendedChannel,
    outreachAngle: insight.outreachAngle,
  };
  save(db);
  return db.leads[idx];
}

export function deleteLead(id: string): boolean {
  const db = ensureDB();
  const before = db.leads.length;
  db.leads = db.leads.filter(l => l.id !== id);
  if (db.leads.length < before) { save(db); return true; }
  return false;
}

export function clearAll(): void {
  save({ leads: [], lastUpdated: new Date().toISOString() });
}
