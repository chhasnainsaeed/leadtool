'use client';

import { useState, useEffect } from 'react';
import { Lead } from '@/types';

interface Props {
  lead: Lead | null;
  onClose: () => void;
  onAudit: (lead: Lead) => void;
  onGenerateEmail: (lead: Lead) => void;
  onViewEmail: (lead: Lead) => void;
  onWhatsApp: (lead: Lead) => void;
  onSocialMessage: (lead: Lead) => void;
  onNotesChange: (leadId: string, notes: string) => void;
  onMarkReplied: (lead: Lead) => void;
  loadingAudit: string | null;
  loadingEmail: string | null;
  loadingWhatsApp: string | null;
}

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</div>
      {children}
    </div>
  );
}

function ScoreGauge({ label, score }: { label: string; score: number }) {
  const textColor = score >= 90 ? 'text-green-700' : score >= 50 ? 'text-amber-700' : 'text-red-700';
  const barColor = score >= 90 ? 'bg-green-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="text-center">
      <div className={`text-xl font-bold ${textColor}`}>{score || '-'}</div>
      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
        <div className={`h-1.5 rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}

function checkBadge(val: boolean | null | undefined, label: string) {
  if (val === true) return <div key={label} className="flex items-center gap-1.5 px-2 py-1 rounded bg-green-50 text-green-700">✓ {label}</div>;
  if (val === false) return <div key={label} className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-50 text-red-700">✗ {label}</div>;
  return <div key={label} className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-50 text-slate-500">? {label}</div>;
}

export default function LeadDetailPanel({
  lead, onClose, onAudit, onGenerateEmail, onViewEmail, onWhatsApp,
  onSocialMessage,
  onNotesChange, onMarkReplied, loadingAudit, loadingEmail, loadingWhatsApp,
}: Props) {
  const [notes, setNotes] = useState(lead?.notes || '');
  const [notesDirty, setNotesDirty] = useState(false);

  useEffect(() => {
    setNotes(lead?.notes || '');
    setNotesDirty(false);
  }, [lead?.id, lead?.notes]);

  if (!lead) return null;

  const gbpIssueList = lead.gbpIssues && lead.gbpIssues !== 'N/A'
    ? lead.gbpIssues.replace(/[^\x20-\x7E]/g, '').split(' | ').map(s => s.trim()).filter(Boolean)
    : [];
  const pitchPoints = lead.gbpPitchPoints && lead.gbpPitchPoints !== 'N/A' && lead.gbpPitchPoints !== 'No major issues found'
    ? lead.gbpPitchPoints.split(' | ').map(s => s.trim()).filter(Boolean)
    : [];

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[460px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100 shrink-0 bg-white">
          <div className="min-w-0 flex-1 pr-3">
            <h2 className="font-bold text-slate-900 text-base leading-tight truncate">{lead.businessName}</h2>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {lead.category !== 'N/A' ? lead.category : lead.businessType} · {lead.city}{lead.country ? ', ' + lead.country : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 shrink-0 transition-colors">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-5 flex flex-col gap-5">
            <Section title="Google Business Profile">
              {gbpIssueList.length > 0 && (
                <ul className="space-y-1 mb-2">
                  {gbpIssueList.map((issue, i) => <li key={i} className="text-xs text-rose-700 bg-rose-50 px-2 py-1 rounded">✗ {issue}</li>)}
                </ul>
              )}
              {lead.status !== 'new' && pitchPoints.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-1.5">Imported GBP Suggestions</div>
                  <ul className="space-y-1">
                    {pitchPoints.map((p, i) => <li key={i} className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded">→ {p}</li>)}
                  </ul>
                </div>
              )}
            </Section>

            {lead.auditData && (
              <Section title="Website Audit (PageSpeed)">
                {(lead.auditData.auditScore !== undefined || lead.auditData.grade || lead.auditData.summary) && (
                  <div className="mb-2 rounded border border-slate-200 bg-slate-50 p-2">
                    <div className="flex items-center gap-2 mb-1">
                      {lead.auditData.auditScore !== undefined && (
                        <span className="text-xs font-semibold text-slate-700">AI Score: {lead.auditData.auditScore}/100</span>
                      )}
                      {lead.auditData.grade && (
                        <span className="text-xs font-semibold text-slate-700">Grade: {lead.auditData.grade}</span>
                      )}
                    </div>
                    {lead.auditData.summary && <p className="text-xs text-slate-600">{lead.auditData.summary}</p>}
                  </div>
                )}
                {(lead.auditData.psiSkipped || lead.auditData.crawlBlocked) && (
                  <div className="mb-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                    Audit incomplete: PageSpeed or crawler could not fully access this page. Some checks are marked unknown.
                  </div>
                )}
                <div className="grid grid-cols-4 gap-3 mb-3">
                  <ScoreGauge label="Performance" score={lead.auditData.performance} />
                  <ScoreGauge label="Accessibility" score={lead.auditData.accessibility} />
                  <ScoreGauge label="SEO" score={lead.auditData.seo} />
                  <ScoreGauge label="Best Practices" score={lead.auditData.bestPractices} />
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-xs mb-2">
                  {[
                    { label: 'SSL', val: lead.auditData.hasSSL },
                    { label: 'Title tag', val: lead.auditData.hasTitle },
                    { label: 'Meta description', val: lead.auditData.hasMetaDescription },
                    { label: 'H1 heading', val: lead.auditData.hasH1 },
                    { label: 'Mobile viewport', val: lead.auditData.hasMobileViewport },
                    { label: 'Schema markup', val: lead.auditData.hasSchema },
                    { label: 'Open Graph tags', val: lead.auditData.hasOgTags },
                    { label: 'Analytics', val: lead.auditData.hasAnalytics },
                  ].map(({ label, val }) => checkBadge(val, label))}
                </div>
                {!!lead.auditData.quickWins?.length && (
                  <div className="mb-2">
                    <div className="text-xs font-semibold text-slate-500 mb-1.5">Quick Wins</div>
                    <ul className="space-y-1">
                      {lead.auditData.quickWins.map((w, i) => <li key={i} className="text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded">• {w}</li>)}
                    </ul>
                  </div>
                )}
                {!!lead.auditData.strengths?.length && (
                  <div>
                    <div className="text-xs font-semibold text-slate-500 mb-1.5">Strengths</div>
                    <ul className="space-y-1">
                      {lead.auditData.strengths.map((s, i) => <li key={i} className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded">• {s}</li>)}
                    </ul>
                  </div>
                )}
              </Section>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
