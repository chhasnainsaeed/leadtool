// In-memory session shared between launch and check-import routes
export interface ScrapeSession {
  city: string;
  country: string;
  businessType: string;
  businessQuery: string;
  startedAt: number;
  importedFile?: string;
}

let current: ScrapeSession | null = null;

export const scrapeSession = {
  set(session: ScrapeSession) { current = session; },
  get(): ScrapeSession | null { return current; },
  markImported(file: string) { if (current) current.importedFile = file; },
  clear() { current = null; },
};
