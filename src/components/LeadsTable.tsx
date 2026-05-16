'use client';

import { useState, useMemo } from 'react';
import { Lead } from '@/types';

interface Props {
  leads: Lead[];
  onAudit: (lead: Lead) => void;
  onGenerateEmail: (lead: Lead) => void;
  onViewEmail: (lead: Lead) => void;
  onDelete: (id: string) => void;
  onWhatsApp: (lead: Lead) => void;
  onSocialMessage: (lead: Lead) => void;
  onProcessLead: (lead: Lead) => void;
  onOpenDetail: (lead: Lead) => void;
  onBulkAudit: (leads: Lead[]) => void;
  onBulkGenerateEmail: (leads: Lead[]) => void;
  onBulkDelete: (ids: string[]) => void;
  onBulkProcess: (leads: Lead[]) => void;
  onExportCSV: (leads: Lead[]) => void;
  loadingAudit: string | null;
  loadingEmail: string | null;
  loadingWhatsApp: string | null;
  loadingProcess: string | null;
  batchActive?: boolean;
}

type SortCol = 'businessName' | 'rating' | 'reviews' | 'gbpAuditScore' | 'status' | 'createdAt';
type FilterKey = 'all' | 'website' | 'no-website' | 'audited' | 'ready' | 'sent' | 'replied';

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-slate-100 text-slate-600',
  audited: 'bg-blue-100 text-blue-700',
  email_generated: 'bg-purple-100 text-purple-700',
  sent: 'bg-green-100 text-green-700',
  replied: 'bg-emerald-100 text-emerald-700',
};

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  audited: 'Audited',
  email_generated: 'Email Ready',
  sent: 'Sent',
  replied: 'Replied',
};

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return (
    <svg className="h-3 w-3 text-slate-300" fill="currentColor" viewBox="0 0 20 20">
      <path d="M5 10l5-5 5 5H5zm10 0l-5 5-5-5h10z" />
    </svg>
  );
  return dir === 'asc' ? (
    <svg className="h-3 w-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M5 10l5-5 5 5H5z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg className="h-3 w-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M15 10l-5 5-5-5h10z" clipRule="evenodd" />
    </svg>
  );
}

function GBPScore({ score }: { score: number }) {
  if (!score) return <span className="text-slate-300 text-xs">—</span>;
  const color = score >= 80
    ? 'text-green-600 bg-green-50 border-green-200'
    : score >= 50
    ? 'text-amber-600 bg-amber-50 border-amber-200'
    : 'text-red-600 bg-red-50 border-red-200';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-bold ${color}`}>
      {score}<span className="font-normal opacity-60">/100</span>
    </span>
  );
}

function Stars({ rating, reviews }: { rating: number; reviews: number }) {
  if (!rating) return <span className="text-slate-300 text-xs">—</span>;
  return (
    <div>
      <div className="flex items-center gap-0.5 text-xs">
        <svg className="h-3 w-3 text-amber-400 fill-amber-400" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        <span className="font-semibold text-slate-700">{rating.toFixed(1)}</span>
      </div>
      <div className="text-xs text-slate-400">{reviews.toLocaleString()} reviews</div>
    </div>
  );
}

function WebsiteCell({ lead }: { lead: Lead }) {
  if (lead.hasRealWebsite) {
    return (
      <a href={lead.website} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
        className="text-blue-600 hover:underline text-xs truncate block max-w-[130px]"
        title={lead.website}>
        {lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
      </a>
    );
  }
  if (lead.socialMedia && lead.socialMedia !== 'N/A') {
    return (
      <div>
        <span className="text-xs text-orange-500 font-medium flex items-center gap-1">📱 Social only</span>
        <a href={lead.socialMedia} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
          className="text-xs text-slate-400 hover:underline truncate block max-w-[120px]">
          {lead.socialMedia.replace(/^https?:\/\//, '').split('/')[0]}
        </a>
      </div>
    );
  }
  return <span className="text-xs text-red-500 font-medium flex items-center gap-1">✗ No website</span>;
}

export default function LeadsTable({
  leads, onAudit, onGenerateEmail, onViewEmail, onDelete, onWhatsApp,
  onSocialMessage,
  onProcessLead, onOpenDetail, onBulkAudit, onBulkGenerateEmail, onBulkDelete,
  onBulkProcess, onExportCSV, loadingAudit, loadingEmail, loadingWhatsApp,
  loadingProcess, batchActive,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortCol, setSortCol] = useState<SortCol>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');

  const countries = useMemo(() =>
    [...new Set(leads.map(l => l.country).filter(Boolean))].sort(),
  [leads]);

  const cities = useMemo(() =>
    [...new Set(
      leads
        .filter(l => !countryFilter || l.country === countryFilter)
        .map(l => l.city)
        .filter(Boolean)
    )].sort(),
  [leads, countryFilter]);

  const filtered = useMemo(() => {
    let r = leads;
    if (filter === 'website') r = r.filter(l => l.hasRealWebsite);
    else if (filter === 'no-website') r = r.filter(l => !l.hasRealWebsite);
    else if (filter === 'audited') r = r.filter(l => !!l.auditData);
    else if (filter === 'ready') r = r.filter(l => l.status === 'email_generated');
    else if (filter === 'sent') r = r.filter(l => l.emailSent);
    else if (filter === 'replied') r = r.filter(l => l.status === 'replied');

    if (countryFilter) r = r.filter(l => l.country === countryFilter);
    if (cityFilter) r = r.filter(l => l.city === cityFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(l =>
        l.businessName.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q) ||
        (l.category || '').toLowerCase().includes(q) ||
        (l.email || '').toLowerCase().includes(q)
      );
    }

    return [...r].sort((a, b) => {
      let av: string | number, bv: string | number;
      if (sortCol === 'businessName') { av = a.businessName.toLowerCase(); bv = b.businessName.toLowerCase(); }
      else if (sortCol === 'rating') { av = a.rating || 0; bv = b.rating || 0; }
      else if (sortCol === 'reviews') { av = a.reviews || 0; bv = b.reviews || 0; }
      else if (sortCol === 'gbpAuditScore') { av = a.gbpAuditScore || 0; bv = b.gbpAuditScore || 0; }
      else if (sortCol === 'status') { av = a.status; bv = b.status; }
      else { av = a.createdAt; bv = b.createdAt; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [leads, filter, countryFilter, cityFilter, search, sortCol, sortDir]);

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const allSelected = filtered.length > 0 && filtered.every(l => selected.has(l.id));
  const someSelected = filtered.some(l => selected.has(l.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected(prev => { const s = new Set(prev); filtered.forEach(l => s.delete(l.id)); return s; });
    } else {
      setSelected(prev => { const s = new Set(prev); filtered.forEach(l => s.add(l.id)); return s; });
    }
  };

  const toggleOne = (id: string) => {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };

  const selectedLeads = filtered.filter(l => selected.has(l.id));
  const selectedIds = selectedLeads.map(l => l.id);

  const TABS: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: leads.length },
    { key: 'website', label: 'Has Website', count: leads.filter(l => l.hasRealWebsite).length },
    { key: 'no-website', label: 'No Website', count: leads.filter(l => !l.hasRealWebsite).length },
    { key: 'audited', label: 'Audited', count: leads.filter(l => !!l.auditData).length },
    { key: 'ready', label: 'Email Ready', count: leads.filter(l => l.status === 'email_generated').length },
    { key: 'sent', label: 'Sent', count: leads.filter(l => l.emailSent).length },
    { key: 'replied', label: 'Replied', count: leads.filter(l => l.status === 'replied').length },
  ];

  if (leads.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center py-24 text-center">
        <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <svg className="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h3 className="text-slate-700 font-semibold text-lg">No leads yet</h3>
        <p className="text-slate-400 text-sm mt-1">Use the sidebar to scrape or import leads</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

      {/* Tabs + Search */}
      <div className="px-4 pt-3 pb-2 border-b border-slate-100 flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setFilter(tab.key); setSelected(new Set()); setCountryFilter(''); setCityFilter(''); }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
              <span className={`px-1 rounded text-xs ${filter === tab.key ? 'bg-blue-500' : 'bg-slate-200 text-slate-500'}`}>
                {tab.count}
              </span>
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            {/* Country filter */}
            {countries.length > 0 && (
              <select
                value={countryFilter}
                onChange={e => { setCountryFilter(e.target.value); setCityFilter(''); setSelected(new Set()); }}
                className="py-1.5 pl-2 pr-7 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-600 bg-white"
              >
                <option value="">All Countries</option>
                {countries.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
            {/* City filter — only shown when a country is selected or cities exist */}
            {cities.length > 0 && (
              <select
                value={cityFilter}
                onChange={e => { setCityFilter(e.target.value); setSelected(new Set()); }}
                className="py-1.5 pl-2 pr-7 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-600 bg-white"
              >
                <option value="">All Cities</option>
                {cities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            )}
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name, city, category..."
                className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-b border-blue-100 flex-wrap">
          <span className="text-xs font-semibold text-blue-700 shrink-0">{selected.size} selected</span>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => { onBulkProcess(selectedLeads); setSelected(new Set()); }}
              disabled={batchActive}
              className="px-2.5 py-1 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors"
            >
              ▶ Process All
            </button>
            <button
              onClick={() => onBulkAudit(selectedLeads)}
              disabled={batchActive}
              className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              ↗ Audit Websites
            </button>
            <button
              onClick={() => onBulkGenerateEmail(selectedLeads)}
              disabled={batchActive}
              className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              ✦ Generate Emails
            </button>
            <button
              onClick={() => onExportCSV(selectedLeads)}
              className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 transition-colors"
            >
              ↓ Export CSV
            </button>
            <button
              onClick={() => { onBulkDelete(selectedIds); setSelected(new Set()); }}
              className="px-2.5 py-1 bg-white border border-red-200 text-red-500 text-xs font-medium rounded-lg hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          </div>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            ✕ Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-3 w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                  onChange={toggleAll}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </th>
              <th
                className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer select-none hover:text-slate-700"
                onClick={() => toggleSort('businessName')}
              >
                <div className="flex items-center gap-1">
                  Business <SortIcon active={sortCol === 'businessName'} dir={sortDir} />
                </div>
              </th>
              <th
                className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer select-none hover:text-slate-700"
                onClick={() => toggleSort('rating')}
              >
                <div className="flex items-center gap-1">
                  Rating <SortIcon active={sortCol === 'rating'} dir={sortDir} />
                </div>
              </th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Website</th>
              <th
                className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer select-none hover:text-slate-700"
                onClick={() => toggleSort('gbpAuditScore')}
              >
                <div className="flex items-center gap-1">
                  GBP Score <SortIcon active={sortCol === 'gbpAuditScore'} dir={sortDir} />
                </div>
              </th>
              <th
                className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer select-none hover:text-slate-700"
                onClick={() => toggleSort('status')}
              >
                <div className="flex items-center gap-1">
                  Status <SortIcon active={sortCol === 'status'} dir={sortDir} />
                </div>
              </th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">
                  No leads match your search
                </td>
              </tr>
            ) : filtered.map(lead => (
              <tr
                key={lead.id}
                onClick={() => onOpenDetail(lead)}
                className={`hover:bg-blue-50/30 transition-colors cursor-pointer ${selected.has(lead.id) ? 'bg-blue-50/50' : ''}`}
              >
                {/* Checkbox */}
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(lead.id)}
                    onChange={() => toggleOne(lead.id)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </td>

                {/* Business */}
                <td className="px-3 py-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800 truncate max-w-[190px] text-sm">{lead.businessName}</div>
                    <div className="text-xs text-slate-400 truncate max-w-[190px]">
                      {lead.category && lead.category !== 'N/A' ? lead.category : lead.businessType}
                    </div>
                    <div className="text-xs text-slate-400 truncate max-w-[190px]">{lead.city}</div>
                    {lead.notes && (
                      <div className="text-xs text-amber-600 truncate max-w-[190px] mt-0.5">📝 {lead.notes}</div>
                    )}
                  </div>
                </td>

                {/* Rating */}
                <td className="px-3 py-3">
                  <Stars rating={lead.rating} reviews={lead.reviews} />
                </td>

                {/* Website */}
                <td className="px-3 py-3">
                  <WebsiteCell lead={lead} />
                  {lead.auditData && (
                    <div className="text-xs text-slate-400 mt-0.5">
                      Perf: <span className={
                        lead.auditData.performance >= 90 ? 'text-green-600 font-medium'
                        : lead.auditData.performance >= 50 ? 'text-amber-600 font-medium'
                        : 'text-red-600 font-medium'
                      }>{lead.auditData.performance}</span>
                    </div>
                  )}
                </td>

                {/* GBP Score */}
                <td className="px-3 py-3">
                  <GBPScore score={lead.gbpAuditScore} />
                </td>

                {/* Status */}
                <td className="px-3 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[lead.status] || STATUS_COLORS.new}`}>
                    {STATUS_LABELS[lead.status] || lead.status}
                  </span>
                  {lead.emailSent && lead.emailSentAt && (
                    <div className="text-xs text-slate-400 mt-0.5">{new Date(lead.emailSentAt).toLocaleDateString()}</div>
                  )}
                </td>

                {/* Actions */}
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">

                    {/* Process */}
                    <button
                      onClick={() => onProcessLead(lead)}
                      disabled={loadingProcess === lead.id || batchActive}
                      title="Audit + generate email"
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-colors whitespace-nowrap"
                    >
                      {loadingProcess === lead.id ? '...' : 'Process'}
                    </button>

                    {/* Send email if ready */}
                    {lead.emailContent && (
                      <button
                        onClick={() => onViewEmail(lead)}
                        title={lead.emailSent ? 'View sent email' : 'Send email'}
                        className={`p-1.5 rounded-lg transition-colors ${
                          lead.emailSent
                            ? 'text-green-600 bg-green-50 hover:bg-green-100'
                            : 'text-purple-600 bg-purple-50 hover:bg-purple-100'
                        }`}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </button>
                    )}

                    {/* WhatsApp / Call buttons based on WA availability */}
                    {lead.phone && (() => {
                      const waChecked = lead.hasWhatsApp !== undefined && lead.hasWhatsApp !== null;
                      const hasWA = lead.hasWhatsApp !== false; // true or null/undefined = show WA
                      const noWA = lead.hasWhatsApp === false;
                      const waIcon = (
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                      );
                      return (
                        <>
                          {/* WhatsApp button */}
                          <button
                            onClick={() => hasWA ? onWhatsApp(lead) : undefined}
                            disabled={loadingWhatsApp === lead.id || noWA}
                            title={noWA ? 'No WhatsApp on this number' : waChecked ? 'WhatsApp verified' : 'Open WhatsApp'}
                            className={`p-1.5 rounded-lg transition-colors ${
                              noWA
                                ? 'text-slate-300 bg-slate-50 cursor-not-allowed'
                                : waChecked
                                  ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                                  : 'text-emerald-500 bg-emerald-50 hover:bg-emerald-100'
                            }`}
                          >
                            {loadingWhatsApp === lead.id ? (
                              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : waIcon}
                          </button>

                          {/* Call button — only shown when WhatsApp confirmed absent */}
                          {noWA && (
                            <a
                              href={`tel:${lead.phone}`}
                              title="Call this number"
                              className="p-1.5 rounded-lg text-blue-500 bg-blue-50 hover:bg-blue-100 transition-colors"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                            </a>
                          )}
                        </>
                      );
                    })()}

                    {!lead.hasRealWebsite && lead.website && lead.website !== 'N/A' && (lead.website.includes('facebook.com') || lead.website.includes('instagram.com')) && (
                      <button
                        onClick={() => onSocialMessage(lead)}
                        title={lead.website.includes('instagram.com') ? 'Open Instagram' : 'Open Facebook'}
                        className="p-1.5 rounded-lg text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                      >
                        {lead.website.includes('instagram.com') ? 'IG' : 'FB'}
                      </button>
                    )}

                    {/* Delete */}
                    <button
                      onClick={() => onDelete(lead.id)}
                      title="Delete"
                      className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {filtered.length > 0 && (
        <div className="px-4 py-2 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {filtered.length} of {leads.length} leads</span>
          <button
            onClick={() => onExportCSV(filtered)}
            className="flex items-center gap-1 text-slate-400 hover:text-blue-600 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export {filtered.length} to CSV
          </button>
        </div>
      )}
    </div>
  );
}
