'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import SearchPanel from '@/components/SearchPanel';
import LeadsTable from '@/components/LeadsTable';
import EmailModal from '@/components/EmailModal';
import StatsBar from '@/components/StatsBar';
import LeadDetailPanel from '@/components/LeadDetailPanel';
import { Lead, SearchParams } from '@/types';
import { normalizePhoneE164, e164ToWaPhone } from '@/lib/phone';

type Toast = { id: number; message: string; type: 'success' | 'error' | 'info' };
let toastId = 0;

export default function Home() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searching, setSearching] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState<'idle' | 'waiting' | 'done'>('idle');
  const [loadingAudit, setLoadingAudit] = useState<string | null>(null);
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const [loadingWhatsApp, setLoadingWhatsApp] = useState<string | null>(null);
  const [loadingProcess, setLoadingProcess] = useState<string | null>(null);
  const [emailModalLead, setEmailModalLead] = useState<Lead | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Batch processing
  const [batchActive, setBatchActive] = useState(false);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchDone, setBatchDone] = useState(0);
  const [batchCurrentName, setBatchCurrentName] = useState<string | null>(null);
  const batchAbortRef = useRef(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);

  const mergeLeads = useCallback((newLeads: Lead[]) => {
    setLeads(prev => {
      const existingKeys = new Set(prev.map(l => (l.businessName + l.address).toLowerCase()));
      const fresh = newLeads.filter(l => !existingKeys.has((l.businessName + l.address).toLowerCase()));
      return [...fresh, ...prev];
    });
  }, []);

  useEffect(() => {
    fetch('/api/leads')
      .then(r => r.json())
      .then(data => setLeads(data.leads || []))
      .catch(() => {});
  }, []);

  // Keep detail panel in sync when leads update
  useEffect(() => {
    if (!detailLead) return;
    const updated = leads.find(l => l.id === detailLead.id);
    if (updated) setDetailLead(updated);
  }, [leads]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll Downloads folder after Chrome launch
  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    let attempts = 0;
    const MAX = 72;

    pollRef.current = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch('/api/check-import');
        const data = await res.json();

        if (data.status === 'imported') {
          clearInterval(pollRef.current!);
          setLaunching(false);
          setScrapeStatus('done');
          mergeLeads(data.leads);
          addToast(`✓ Imported ${data.count} leads from "${data.file}"`, 'success');
        } else if (data.status === 'error') {
          clearInterval(pollRef.current!);
          setLaunching(false);
          setScrapeStatus('idle');
          addToast(`Import error: ${data.error}`, 'error');
        } else if (attempts >= MAX) {
          clearInterval(pollRef.current!);
          setLaunching(false);
          setScrapeStatus('idle');
          addToast('Timed out. Did the extension download the CSV?', 'error');
          fetch('/api/check-import', { method: 'DELETE' });
        }
      } catch { /* network blip */ }
    }, 2500);
  }, [addToast, mergeLeads]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  // ─── Core actions ────────────────────────────────────────────────────────────

  const handleLaunch = async (params: SearchParams) => {
    setLaunching(true);
    setScrapeStatus('waiting');
    try {
      const res = await fetch('/api/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Launch failed');
      addToast('Chrome opened — run your extension to scrape, then export CSV', 'info');
      startPolling();
    } catch (err: unknown) {
      setLaunching(false);
      setScrapeStatus('idle');
      addToast(err instanceof Error ? err.message : 'Failed to open Chrome', 'error');
    }
  };

  const handleManualSearch = async (params: SearchParams) => {
    setSearching(true);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      mergeLeads(data.leads);
      addToast(`Found ${data.count} businesses in ${params.city}`, 'success');
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Search failed', 'error');
    } finally {
      setSearching(false);
    }
  };

  const handleImportCSV = async (file: File) => {
    setImporting(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/import-csv', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      mergeLeads(data.leads);
      addToast(`Imported ${data.count} leads from "${file.name}"`, 'success');
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Import failed', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleAudit = async (lead: Lead) => {
    setLoadingAudit(lead.id);
    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: lead.website, leadId: lead.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Audit failed');
      setLeads(prev =>
        prev.map(l => l.id === lead.id ? { ...l, auditData: data.auditData, status: 'audited' } : l)
      );
      addToast(`Audit done — ${lead.businessName}: ${data.auditData.performance}/100 perf`, 'success');
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Audit failed', 'error');
    } finally {
      setLoadingAudit(null);
    }
  };

  const handleGenerateEmail = async (lead: Lead) => {
    setLoadingEmail(lead.id);
    try {
      const res = await fetch('/api/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, lead }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      const updated: Lead = { ...lead, emailContent: data.emailContent, status: 'email_generated' };
      setLeads(prev => prev.map(l => l.id === lead.id ? updated : l));
      addToast(`Email ready for ${lead.businessName}`, 'success');
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Email generation failed', 'error');
    } finally {
      setLoadingEmail(null);
    }
  };

  const handleEmailSent = (updatedLead: Lead) => {
    setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
    addToast('Email sent!', 'success');
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/leads?id=${id}`, { method: 'DELETE' });
    setLeads(prev => prev.filter(l => l.id !== id));
    if (detailLead?.id === id) setDetailLead(null);
  };

  const handleWhatsApp = async (lead: Lead) => {
    if (!lead.phone) return;
    setLoadingWhatsApp(lead.id);
    try {
      // Use pre-generated message if available, else generate on the fly
      if (lead.whatsAppMessage) {
        const e164 = normalizePhoneE164(lead.phone, lead.country);
        const waLink = `whatsapp://send?phone=${e164ToWaPhone(e164)}&text=${encodeURIComponent(lead.whatsAppMessage)}`;
        window.open(waLink, '_self');
        addToast('Opened WhatsApp with pre-generated message', 'success');
      } else {
        const res = await fetch('/api/whatsapp-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId: lead.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to generate WhatsApp link');
        window.open(data.waLink, '_self');
        addToast('Opened WhatsApp link with custom message', 'success');
      }
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'WhatsApp link failed', 'error');
    } finally {
      setLoadingWhatsApp(null);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Delete all leads? This cannot be undone.')) return;
    await fetch('/api/leads?all=true', { method: 'DELETE' });
    setLeads([]);
    setDetailLead(null);
  };

  const handleProcessLead = async (lead: Lead) => {
    setLoadingProcess(lead.id);
    try {
      const res = await fetch('/api/automate-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, recipientEmail: lead.email || undefined, sendWhatsapp: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Process failed');
      const latest = await fetch('/api/leads').then(r => r.json());
      setLeads(latest.leads || []);
    } catch (err: unknown) {
      addToast(err instanceof Error ? err.message : 'Process failed', 'error');
    } finally {
      setLoadingProcess(null);
    }
  };

  const cancelScrape = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    fetch('/api/check-import', { method: 'DELETE' });
    setLaunching(false);
    setScrapeStatus('idle');
  };

  // ─── Notes & status ──────────────────────────────────────────────────────────

  const handleNotesChange = async (leadId: string, notes: string) => {
    try {
      await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: leadId, updates: { notes } }),
      });
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, notes } : l));
    } catch { /* silent */ }
  };

  const handleMarkReplied = async (lead: Lead) => {
    try {
      await fetch('/api/leads', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: lead.id, updates: { status: 'replied' } }),
      });
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: 'replied' } : l));
      addToast(`Marked ${lead.businessName} as replied`, 'success');
    } catch { /* silent */ }
  };

  // ─── Export CSV ──────────────────────────────────────────────────────────────

  const handleExportCSV = (leadsToExport: Lead[]) => {
    const headers = [
      'Business Name', 'Category', 'City', 'Country', 'Phone', 'Email', 'Website',
      'Rating', 'Reviews', 'GBP Score', 'Status', 'Email Sent', 'Notes',
    ];
    const rows = leadsToExport.map(l =>
      [
        l.businessName, l.category, l.city, l.country, l.phone, l.email || '',
        l.website, l.rating, l.reviews, l.gbpAuditScore, l.status,
        l.emailSent ? 'Yes' : 'No', l.notes || '',
      ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast(`Exported ${leadsToExport.length} leads to CSV`, 'success');
  };

  // ─── Bulk actions ────────────────────────────────────────────────────────────

  const handleBulkDelete = async (ids: string[]) => {
    if (!confirm(`Delete ${ids.length} leads? This cannot be undone.`)) return;
    for (const id of ids) {
      await fetch(`/api/leads?id=${id}`, { method: 'DELETE' });
    }
    setLeads(prev => prev.filter(l => !ids.includes(l.id)));
    if (detailLead && ids.includes(detailLead.id)) setDetailLead(null);
    addToast(`Deleted ${ids.length} leads`, 'success');
  };

  const handleBulkAudit = async (selectedLeads: Lead[]) => {
    const withWebsite = selectedLeads.filter(l => l.hasRealWebsite);
    if (withWebsite.length === 0) { addToast('None of the selected leads have websites to audit', 'error'); return; }
    addToast(`Auditing ${withWebsite.length} websites...`, 'info');
    for (const lead of withWebsite) {
      await handleAudit(lead);
    }
    addToast(`Audit complete for ${withWebsite.length} leads`, 'success');
  };

  const handleBulkGenerateEmail = async (selectedLeads: Lead[]) => {
    addToast(`Generating emails for ${selectedLeads.length} leads...`, 'info');
    for (const lead of selectedLeads) {
      await handleGenerateEmail(lead);
    }
    addToast(`Generated ${selectedLeads.length} emails`, 'success');
  };

  // ─── Batch process queue ─────────────────────────────────────────────────────

  const handleBatchProcess = async (leadsToProcess: Lead[]) => {
    if (batchActive) return;
    batchAbortRef.current = false;
    setBatchActive(true);
    setBatchTotal(leadsToProcess.length);
    setBatchDone(0);

    let done = 0;
    for (const lead of leadsToProcess) {
      if (batchAbortRef.current) break;
      setBatchCurrentName(lead.businessName);
      try {
        await handleProcessLead(lead);
      } catch { /* continue */ }
      done++;
      setBatchDone(done);
    }

    setBatchActive(false);
    setBatchCurrentName(null);
    if (!batchAbortRef.current) {
      addToast(`Batch complete — processed ${done} leads`, 'success');
    }
  };

  const handleBatchProcessAll = () => {
    const unprocessed = leads.filter(l => l.status === 'new' || l.status === 'audited');
    if (unprocessed.length === 0) {
      addToast('All leads are already processed', 'info');
      return;
    }
    handleBatchProcess(unprocessed);
  };

  const cancelBatch = () => {
    batchAbortRef.current = true;
    setBatchActive(false);
    setBatchCurrentName(null);
    addToast('Batch cancelled', 'info');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-screen-2xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="font-bold text-slate-800 text-lg tracking-tight">LeadTool Pro</span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              GBP Scraper + AI Outreach
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="h-2 w-2 rounded-full bg-green-400" />
            {leads.length} leads
          </div>
        </div>
      </header>

      {/* Waiting banner */}
      {scrapeStatus === 'waiting' && (
        <div className="bg-blue-600 text-white px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <svg className="animate-spin h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="font-medium">Watching Downloads for <code className="bg-blue-500 px-1 rounded">gbp_leads_*.csv</code>...</span>
            <span className="text-blue-200 text-xs hidden sm:block">Run your extension → Export CSV → file auto-imports</span>
          </div>
          <button onClick={cancelScrape} className="text-blue-200 hover:text-white text-xs underline shrink-0">
            Cancel
          </button>
        </div>
      )}

      <main className="max-w-screen-2xl mx-auto px-6 py-6">
        <div className="flex gap-6 items-start">
          {/* Sidebar */}
          <div className="w-72 shrink-0 sticky top-24">
            <SearchPanel
              onLaunch={handleLaunch}
              onManualSearch={handleManualSearch}
              onImportCSV={handleImportCSV}
              launching={launching}
              searching={searching}
              importing={importing}
            />
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            <StatsBar
              leads={leads}
              onClearAll={handleClearAll}
              onBatchProcessAll={handleBatchProcessAll}
              batchActive={batchActive}
              batchDone={batchDone}
              batchTotal={batchTotal}
              batchCurrentName={batchCurrentName}
              onCancelBatch={cancelBatch}
            />

            <LeadsTable
              leads={leads}
              onAudit={handleAudit}
              onGenerateEmail={handleGenerateEmail}
              onViewEmail={setEmailModalLead}
              onDelete={handleDelete}
              onWhatsApp={handleWhatsApp}
              onProcessLead={handleProcessLead}
              onOpenDetail={setDetailLead}
              onBulkAudit={handleBulkAudit}
              onBulkGenerateEmail={handleBulkGenerateEmail}
              onBulkDelete={handleBulkDelete}
              onBulkProcess={handleBatchProcess}
              onExportCSV={handleExportCSV}
              loadingAudit={loadingAudit}
              loadingEmail={loadingEmail}
              loadingWhatsApp={loadingWhatsApp}
              loadingProcess={loadingProcess}
              batchActive={batchActive}
            />

            {leads.length === 0 && !launching && (
              <div className="bg-white rounded-2xl border border-slate-200 p-8">
                <h3 className="font-semibold text-slate-800 text-center mb-6 text-lg">How it works</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {[
                    { icon: '🌐', title: 'Open Maps', desc: 'Pick city + type, click "Open Google Maps".' },
                    { icon: '🔍', title: 'Run Extension', desc: 'Click your GBP Scraper → Add to queue → Start scraping.' },
                    { icon: '⚡', title: 'Auto Import', desc: 'Export CSV from extension. Detects gbp_leads_*.csv automatically.' },
                    { icon: '📧', title: 'Batch Process', desc: 'Click "Process All Leads" — AI audits, writes & sends emails.' },
                  ].map(({ icon, title, desc }) => (
                    <div key={title} className="text-center">
                      <div className="text-3xl mb-3">{icon}</div>
                      <div className="font-semibold text-slate-800 mb-2 text-sm">{title}</div>
                      <div className="text-xs text-slate-500 leading-relaxed">{desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Detail panel */}
      {detailLead && (
        <LeadDetailPanel
          lead={detailLead}
          onClose={() => setDetailLead(null)}
          onAudit={handleAudit}
          onGenerateEmail={lead => { handleGenerateEmail(lead); }}
          onViewEmail={setEmailModalLead}
          onWhatsApp={handleWhatsApp}
          onNotesChange={handleNotesChange}
          onMarkReplied={handleMarkReplied}
          loadingAudit={loadingAudit}
          loadingEmail={loadingEmail}
          loadingWhatsApp={loadingWhatsApp}
        />
      )}

      {/* Email modal */}
      {emailModalLead && (
        <EmailModal
          lead={emailModalLead}
          onClose={() => setEmailModalLead(null)}
          onSent={handleEmailSent}
        />
      )}

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 pointer-events-auto max-w-sm ${
              toast.type === 'success' ? 'bg-green-600 text-white' :
              toast.type === 'error' ? 'bg-red-600 text-white' :
              'bg-slate-800 text-white'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}
