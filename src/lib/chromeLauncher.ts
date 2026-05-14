import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe')
    : '',
  process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, 'Chromium\\Application\\chrome.exe')
    : '',
].filter(Boolean);

function findChrome(): string | null {
  return CHROME_PATHS.find(p => p && fs.existsSync(p)) || null;
}

export function buildMapsUrl(businessQuery: string, city: string, country: string): string {
  const q = encodeURIComponent(`${businessQuery} in ${city}, ${country}`);
  return `https://www.google.com/maps/search/${q}`;
}

export function launchChrome(url: string): boolean {
  const chromePath = findChrome();
  if (!chromePath) {
    return false;
  }
  const child = spawn(chromePath, [url], { detached: true, stdio: 'ignore' });
  child.unref();
  return true;
}
