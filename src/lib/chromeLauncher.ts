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

export function launchChrome(url: string): void {
  const chromePath = findChrome();
  if (!chromePath) {
    throw new Error(
      'Chrome not found. Make sure Google Chrome is installed at the default location.'
    );
  }
  const child = spawn(chromePath, [url], { detached: true, stdio: 'ignore' });
  child.unref();
}
