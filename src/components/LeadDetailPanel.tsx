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
      <div className={`text-xl font-bold ${textColor}`}>{score || '—'}</div>
      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
        <div className={`h-1.5 rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
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
    ? lead.gbpIssues.replace(/[❌⚠️✅]/g, '').split(' | ').map(s => s.trim()).filter(Boolean)
    : [];
  const pitchPoints = lead.gbpPitchPoints && lead.gbpPitchPoints !== 'N/A' && lead.gbpPitchPoints !== 'No major issues found'
    ? lead.gbpPitchPoints.split(' | ').map(s => s.trim()).filter(Boolean)
    : [];

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[460px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100 shrink-0 bg-white">
          <div className="min-w-0 flex-1 pr-3">
            <h2 className="font-bold text-slate-900 text-base leading-tight truncate">{lead.businessName}</h2>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {lead.category !== 'N/A' ? lead.category : lead.businessType} · {lead.city}{lead.country ? ', ' + lead.country : ''}
            </p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[lead.status] || STATUS_COLORS.new}`}>
                {STATUS_LABELS[lead.status] || lead.status}
              </span>
              {lead.rating > 0 && (
                <span className="text-xs text-amber-600 font-medium">★ {lead.rating.toFixed(1)} ({lead.reviews.toLocaleString()} reviews)</span>
              )}
              {!lead.hasRealWebsite && (
                <span className="text-xs text-red-500 font-medium">No website</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 shrink-0 transition-colors">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 flex flex-col gap-5">

            {/* Contact */}
            <Section title="Contact Info">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                {lead.phone && (
                  <div>
                    <dt className="text-slate-500 mb-0.5">Phone</dt>
                    <dd><a href={`tel:${lead.phone}`} className="font-medium text-slate-800 hover:text-blue-600">{lead.phone}</a></dd>
                  </div>
                )}
                {lead.email && (
                  <div>
                    <dt className="text-slate-500 mb-0.5">Email</dt>
                    <dd><a href={`mailto:${lead.email}`} className="font-medium text-blue-600 hover:underline truncate block">{lead.email}</a></dd>
                  </div>
                )}
                {lead.hasRealWebsite && (
                  <div className="col-span-2">
                    <dt className="text-slate-500 mb-0.5">Website</dt>
                    <dd>
                      <a href={lead.website} target="_blank" rel="noreferrer" className="font-medium text-blue-600 hover:underline break-all">
                        {lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      </a>
                    </dd>
                  </div>
                )}
                {!lead.hasRealWebsite && lead.socialMedia && lead.socialMedia !== 'N/A' && (
                  <div className="col-span-2">
                    <dt className="text-slate-500 mb-0.5">Social Media</dt>
                    <dd><a href={lead.socialMedia} target="_blank" rel="noreferrer" className="font-medium text-orange-600 hover:underline">{lead.socialMedia.replace(/^https?:\/\//, '').split('/')[0]}</a></dd>
                  </div>
                )}
                {lead.address && lead.address !== 'N/A' && (
                  <div className="col-span-2">
                    <dt className="text-slate-500 mb-0.5">Address</dt>
                    <dd className="font-medium text-slate-700">{lead.address}</dd>
                  </div>
                )}
                {lead.hours && lead.hours !== 'N/A' && (
                  <div className="col-span-2">
                    <dt className="text-slate-500 mb-0.5">Hours</dt>
                    <dd className="font-medium text-slate-700 text-xs">{lead.hours}</dd>
                  </div>
                )}
              </dl>
            </Section>

            {/* GBP Audit */}
            <Section title="Google Business Profile">
              <div className="flex items-center gap-3 mb-3">
                {lead.gbpAuditScore ? (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-sm font-bold ${
                    lead.gbpAuditScore >= 80 ? 'text-green-700 bg-green-50 border-green-200'
                    : lead.gbpAuditScore >= 50 ? 'text-amber-700 bg-amber-50 border-amber-200'
                    : 'text-red-700 bg-red-50 border-red-200'
                  }`}>
                    {lead.gbpAuditScore}/100
                    <span className="font-normal text-xs opacity-70">
                      {lead.gbpAuditScore >= 80 ? 'Good' : lead.gbpAuditScore >= 50 ? 'Fair' : 'Poor'}
                    </span>
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">No GBP score</span>
                )}
                {lead.gbpUrl && (
                  <a href={lead.gbpUrl} target="_blank" rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                    View on Maps
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
              {gbpIssueList.length > 0 && (
                <div className="mb-2">
                  <div className="text-xs font-semibold text-slate-500 mb-1.5">Issues found</div>
                  <ul className="space-y-1">
                    {gbpIssueList.map((issue, i) => (
                      <li key={i} className="text-xs text-rose-700 bg-rose-50 px-2 py-1 rounded flex items-start gap-1.5">
                        <span className="shrink-0">✗</span> {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {lead.status !== 'new' && pitchPoints.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-slate-500 mb-1.5">Imported GBP Suggestions</div>
                  <ul className="space-y-1">
                    {pitchPoints.map((p, i) => (
                      <li key={i} className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded">→ {p}</li>
                    ))}
                  </ul>
                </div>
              )}
              {lead.description && lead.description !== 'N/A' && (
                <div className="mt-2 text-xs text-slate-600 bg-slate-50 rounded p-2 leading-relaxed">{lead.description}</div>
              )}
            </Section>

            {/* Website Audit */}
            {lead.auditData ? (
              <>
                {/* Screenshot + Visual Audit */}
                {lead.auditData.screenshotDataUrl && (
                  <Section title="Visual Audit (Gemini)">
                    <div className="rounded-lg overflow-hidden border border-slate-200 mb-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={lead.auditData.screenshotDataUrl}
                        alt="Website screenshot"
                        className="w-full object-cover"
                        style={{ maxHeight: 200, objectPosition: 'top' }}
                      />
                    </div>
                    {lead.auditData.visualIssues.length > 0 ? (
                      <ul className="space-y-1">
                        {lead.auditData.visualIssues.map((issue, i) => (
                          <li key={i} className="text-xs text-purple-700 bg-purple-50 px-2 py-1.5 rounded flex items-start gap-1.5">
                            <span className="shrink-0 mt-0.5">👁</span> {issue}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-green-600 bg-green-50 px-2 py-1.5 rounded">✓ No visual design issues detected</p>
                    )}
                    {lead.auditData.visualSkipped && (
                      <p className="text-xs text-slate-400 italic">Screenshot unavailable — visual audit skipped</p>
                    )}
                  </Section>
                )}

                <Section title="Website Audit (PageSpeed)">
                  <div className="grid grid-cols-4 gap-3 mb-3">
                    <ScoreGauge label="Performance" score={lead.auditData.performance} />
                    <ScoreGauge label="Accessibility" score={lead.auditData.accessibility} />
                    <ScoreGauge label="SEO" score={lead.auditData.seo} />
                    <ScoreGauge label="Best Practices" score={lead.auditData.bestPractices} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs bg-slate-50 rounded-lg p-2 mb-2">
                    <div><span className="text-slate-500">FCP </span><span className="font-semibold">{lead.auditData.fcp}</span></div>
                    <div><span className="text-slate-500">LCP </span><span className="font-semibold">{lead.auditData.lcp}</span></div>
                    <div><span className="text-slate-500">CLS </span><span className="font-semibold">{lead.auditData.cls}</span></div>
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
                    ].map(({ label, val }) => (
                      <div key={label} className={`flex items-center gap-1.5 px-2 py-1 rounded ${val ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {val ? '✓' : '✗'} {label}
                      </div>
                    ))}
                  </div>
                  {lead.auditData.issues.length > 0 && (
                    <div className="mb-2">
                      <div className="text-xs font-semibold text-slate-500 mb-1.5">Issues</div>
                      <ul className="space-y-1">
                        {lead.auditData.issues.map((issue, i) => (
                          <li key={i} className="text-xs text-rose-700 bg-rose-50 px-2 py-1 rounded">✗ {issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {lead.auditData.opportunities.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-slate-500 mb-1.5">Opportunities</div>
                      <ul className="space-y-1">
                        {lead.auditData.opportunities.map((op, i) => (
                          <li key={i} className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">↑ {op}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {lead.auditData.titleText && (
                    <div className="mt-2 text-xs text-slate-500 bg-slate-50 rounded p-2">
                      <span className="font-medium">Title: </span>{lead.auditData.titleText}
                    </div>
                  )}
                </Section>
              </>
            ) : lead.hasRealWebsite ? (
              <Section title="Website Audit">
                <p className="text-xs text-slate-400 italic">Not audited yet — click Audit Website below.</p>
              </Section>
            ) : null}

            {/* Email info */}
            {lead.emailContent && (
              <Section title="Generated Email">
                <div className="bg-slate-50 rounded-lg p-3 text-xs">
                  <div className="font-semibold text-slate-700 mb-1">Subject:</div>
                  <div className="text-slate-600 mb-2">{lead.emailContent.subject}</div>
                  <div className="font-semibold text-slate-700 mb-1">Preview:</div>
                  <div className="text-slate-500 leading-relaxed line-clamp-3">{lead.emailContent.body}</div>
                </div>
                {lead.emailSent && lead.emailSentAt && (
                  <div className="mt-1 text-xs text-green-600">✓ Sent on {new Date(lead.emailSentAt).toLocaleDateString()}</div>
                )}
              </Section>
            )}

            {/* Notes */}
            <Section title="Notes">
              <textarea
                value={notes}
                onChange={e => { setNotes(e.target.value); setNotesDirty(true); }}
                placeholder="Add notes about this lead — follow-up dates, responses, context..."
                rows={3}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-slate-700 placeholder:text-slate-400"
              />
              {notesDirty && (
                <button
                  onClick={() => { onNotesChange(lead.id, notes); setNotesDirty(false); }}
                  className="mt-1.5 px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Notes
                </button>
              )}
            </Section>

          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-slate-100 flex flex-col gap-2 shrink-0 bg-white">
          <div className="flex gap-2">
            {lead.hasRealWebsite && (
              <button
                onClick={() => onAudit(lead)}
                disabled={loadingAudit === lead.id}
                className="flex-1 px-3 py-2 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                {loadingAudit === lead.id ? 'Auditing...' : '↗ Audit Website'}
              </button>
            )}
            <button
              onClick={() => onGenerateEmail(lead)}
              disabled={loadingEmail === lead.id}
              className="flex-1 px-3 py-2 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              {loadingEmail === lead.id ? 'Generating...' : '✦ Generate Email'}
            </button>
            {lead.status !== 'new' && !lead.hasRealWebsite && lead.website && lead.website !== 'N/A' && (lead.website.includes('facebook.com') || lead.website.includes('instagram.com')) && (
              <button
                onClick={() => onSocialMessage(lead)}
                className="flex-1 px-3 py-2 border border-blue-200 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-50 transition-colors"
              >
                {lead.website.includes('instagram.com') ? 'Open Instagram' : 'Open Facebook'}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {lead.phone && lead.status !== 'new' && (() => {
              const noWA = lead.hasWhatsApp === false;
              const waVerified = lead.hasWhatsApp === true;
              return (
                <>
                  <button
                    onClick={() => !noWA && onWhatsApp(lead)}
                    disabled={loadingWhatsApp === lead.id || noWA}
                    title={noWA ? 'No WhatsApp on this number' : waVerified ? 'WhatsApp verified ✓' : 'Open WhatsApp'}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors border ${
                      noWA
                        ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40'
                    }`}
                  >
                    {loadingWhatsApp === lead.id ? '...' : noWA ? '💬 No WhatsApp' : waVerified ? '💬 WhatsApp ✓' : '💬 WhatsApp'}
                  </button>
                  {noWA && (
                    <a
                      href={`tel:${lead.phone}`}
                      title="Call this number"
                      className="flex-1 px-3 py-2 text-xs font-medium rounded-lg border bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors text-center"
                    >
                      📞 Call
                    </a>
                  )}
                </>
              );
            })()}
            {lead.emailContent && (
              <button
                onClick={() => onViewEmail(lead)}
                className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors border ${
                  lead.emailSent
                    ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                    : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
                }`}
              >
                {lead.emailSent ? '✓ View Sent Email' : '→ Send Email'}
              </button>
            )}
            {lead.status !== 'replied' && (
              <button
                onClick={() => onMarkReplied(lead)}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-100 transition-colors"
              >
                ✓ Mark Replied
              </button>
            )}
          </div>
        </div>

      </div>
    </>
  );
}
