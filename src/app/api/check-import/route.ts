import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { scrapeSession } from '@/lib/scrapeSession';
import { parseGBPCsv } from '@/lib/csvParser';
import { saveLeads } from '@/lib/storage';

const DOWNLOADS_DIR = path.join(os.homedir(), 'Downloads');

// Matches the GBP scraper's exact naming: gbp_leads_*.csv and gbp_pitch_*.csv
function isGBPFile(filename: string): boolean {
  return /^gbp_(leads|pitch)_.+\.csv$/i.test(filename);
}

export async function GET() {
  const session = scrapeSession.get();

  if (!session) {
    // No active session — still check for any recent GBP CSV (last 60s)
    return await checkForRecentFile(Date.now() - 60_000, null);
  }

  if (session.importedFile) {
    return NextResponse.json({ status: 'already_imported', file: session.importedFile });
  }

  return await checkForRecentFile(session.startedAt, session);
}

async function checkForRecentFile(since: number, session: ReturnType<typeof scrapeSession.get>) {
  let files: fs.Dirent[];
  try {
    files = fs.readdirSync(DOWNLOADS_DIR, { withFileTypes: true });
  } catch {
    return NextResponse.json({ status: 'waiting', error: 'Cannot read Downloads folder' });
  }

  const candidates = files
    .filter(f => f.isFile() && isGBPFile(f.name))
    .map(f => {
      const fullPath = path.join(DOWNLOADS_DIR, f.name);
      const stat = fs.statSync(fullPath);
      return { name: f.name, path: fullPath, mtime: stat.mtimeMs };
    })
    .filter(f => f.mtime >= since - 3000)   // 3s grace window
    .sort((a, b) => b.mtime - a.mtime);     // newest first

  if (candidates.length === 0) {
    return NextResponse.json({ status: 'waiting' });
  }

  const newest = candidates[0];

  try {
    const content = fs.readFileSync(newest.path, 'utf-8');
    const leads = parseGBPCsv(
      content,
      newest.name,
      session?.city,
      session?.country,
      session?.businessType
    );

    if (leads.length === 0) {
      return NextResponse.json({ status: 'waiting', hint: 'CSV found but empty or unrecognized format' });
    }

    await saveLeads(leads);
    if (session) scrapeSession.markImported(newest.name);

    return NextResponse.json({ status: 'imported', file: newest.name, count: leads.length, leads });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Parse error';
    return NextResponse.json({ status: 'error', error: message });
  }
}

export async function DELETE() {
  scrapeSession.clear();
  return NextResponse.json({ success: true });
}
