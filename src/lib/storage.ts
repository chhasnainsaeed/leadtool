import fs from 'fs';
import path from 'path';
import { Lead, LeadsDB } from '@/types';

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

export function getAllLeads(): Lead[] {
  return ensureDB().leads.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getLeadById(id: string): Lead | undefined {
  return ensureDB().leads.find(l => l.id === id);
}

export function saveLeads(newLeads: Lead[]): void {
  const db = ensureDB();
  for (const lead of newLeads) {
    const idx = db.leads.findIndex(l => l.id === lead.id);
    if (idx >= 0) db.leads[idx] = lead;
    else db.leads.push(lead);
  }
  save(db);
}

export function updateLead(id: string, updates: Partial<Lead>): Lead | null {
  const db = ensureDB();
  const idx = db.leads.findIndex(l => l.id === id);
  if (idx < 0) return null;
  db.leads[idx] = { ...db.leads[idx], ...updates };
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
