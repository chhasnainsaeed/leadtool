'use client';

import { Lead } from '@/types';

interface Props {
  leads: Lead[];
  onAudit: (lead: Lead) => void;
  onGenerateEmail: (lead: Lead) => void;
  onViewEmail: (lead: Lead) => void;
  onDelete: (id: string) => void;
  loadingAudit: string | null;
  loadingEmail: string | null;
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

function GBPScore({ score }: { score: number }) {
  if (!score) return <span className="text-slate-300 text-xs">—</span>;
  const color = score >= 80 ? 'text-green-600 bg-green-50 border-green-200'
    : score >= 50 ? 'text-amber-600 bg-amber-50 border-amber-200'
    : 'text-red-600 bg-red-50 border-red-200';
  const label = score >= 80 ? 'Good' : score >= 50 ? 'Fair' : 'Poor';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-bold ${color}`}>
      {score}<span className="font-normal opacity-60">/100</span>
      <span className="font-medium">{label}</span>
    </span>
  );
}

function Stars({ rating, reviews }: { rating: number; reviews: number }) {
  if (!rating) return <span className="text-slate-300 text-xs">No rating</span>;
  return (
    <div>
      <span className="flex items-center gap-0.5 text-xs">
        <svg className="h-3 w-3 text-amber-400 fill-amber-400" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
        <span className="font-semibold text-slate-700">{rating.toFixed(1)}</span>
      </span>
      <div className="text-xs text-slate-400">{reviews.toLocaleString()} reviews</div>
    </div>
  );
}

function WebsiteCell({ lead }: { lead: Lead }) {
  if (lead.hasRealWebsite) {
    return (
      <a href={lead.website} target="_blank" rel="noreferrer"
        className="text-blue-600 hover:underline text-xs truncate block max-w-[130px]"
        title={lead.website}>
        {lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
      </a>
    );
  }
  if (lead.socialMedia && lead.socialMedia !== 'N/A') {
    const domain = lead.socialMedia.replace(/^https?:\/\//, '').split('/')[0];
    return (
      <div>
        <span className="text-xs text-orange-500 font-medium flex items-center gap-1">
          <span>📱</span> Social only
        </span>
        <a href={lead.socialMedia} target="_blank" rel="noreferrer"
          className="text-xs text-slate-400 hover:underline truncate block max-w-[130px]">
          {domain}
        </a>
      </div>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-red-500 font-medium">
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
      </svg>
      No website
    </span>
  );
}

function IssuesBadge({ issues, count }: { issues: string; count: number }) {
  if (!count || !issues || issues === 'N/A') return <span className="text-slate-300 text-xs">—</span>;
  const list = issues.replace(/[❌⚠️✅]/g, '').split(' | ').map(s => s.trim()).filter(Boolean);
  return (
    <div className="space-y-0.5">
      {list.slice(0, 2).map((issue, i) => (
        <div key={i} className="text-xs text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded truncate max-w-[160px]" title={issue}>
          {issue}
        </div>
      ))}
      {list.length > 2 && (
        <div className="text-xs text-slate-400">+{list.length - 2} more</div>
      )}
    </div>
  );
}

export default function LeadsTable({
  leads, onAudit, onGenerateEmail, onViewEmail, onDelete, loadingAudit, loadingEmail
}: Props) {
  if (leads.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center py-24 text-center">
        <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <svg className="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
        <h3 className="text-slate-700 font-semibold text-lg">No leads yet</h3>
        <p className="text-slate-400 text-sm mt-1">Use your Chrome extension to scrape businesses, then import the CSV</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Business</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Rating</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Website</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">GBP Score</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Issues</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {leads.map(lead => (
              <tr key={lead.id} className="hover:bg-slate-50 transition-colors group">
                {/* Business */}
                <td className="px-4 py-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800 truncate max-w-[200px]">{lead.businessName}</div>
                    <div className="text-xs text-slate-400 truncate max-w-[200px]">
                      {lead.category && lead.category !== 'N/A' ? lead.category : lead.businessType}
                    </div>
                    <div className="text-xs text-slate-400 truncate max-w-[200px]">{lead.city}</div>
                  </div>
                </td>

                {/* Rating */}
                <td className="px-4 py-3">
                  <Stars rating={lead.rating} reviews={lead.reviews} />
                </td>

                {/* Website */}
                <td className="px-4 py-3">
                  <WebsiteCell lead={lead} />
                </td>

                {/* GBP Score */}
                <td className="px-4 py-3">
                  <GBPScore score={lead.gbpAuditScore} />
                </td>

                {/* Issues */}
                <td className="px-4 py-3">
                  <IssuesBadge issues={lead.gbpIssues} count={lead.gbpIssuesCount} />
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[lead.status] || STATUS_COLORS.new}`}>
                    {STATUS_LABELS[lead.status] || lead.status}
                  </span>
                  {lead.emailSent && lead.emailSentAt && (
                    <div className="text-xs text-slate-400 mt-0.5">
                      {new Date(lead.emailSentAt).toLocaleDateString()}
                    </div>
                  )}
                </td>

                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Audit website (only if real website) */}
                    {lead.hasRealWebsite && (
                      <button
                        onClick={() => onAudit(lead)}
                        disabled={loadingAudit === lead.id}
                        title="Audit website with PageSpeed"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-40 transition-colors"
                      >
                        {loadingAudit === lead.id ? (
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                          </svg>
                        )}
                      </button>
                    )}

                    {/* View GBP listing */}
                    {lead.gbpUrl && (
                      <a
                        href={lead.gbpUrl}
                        target="_blank"
                        rel="noreferrer"
                        title="View on Google Maps"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                      </a>
                    )}

                    {/* Generate AI email */}
                    <button
                      onClick={() => onGenerateEmail(lead)}
                      disabled={loadingEmail === lead.id}
                      title="Generate AI cold email"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 disabled:opacity-40 transition-colors"
                    >
                      {loadingEmail === lead.id ? (
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
                        </svg>
                      )}
                    </button>

                    {/* View/send email */}
                    {lead.emailContent && (
                      <button
                        onClick={() => onViewEmail(lead)}
                        title={lead.emailSent ? 'View sent email' : 'Send email'}
                        className={`p-1.5 rounded-lg transition-colors ${
                          lead.emailSent
                            ? 'text-green-600 bg-green-50'
                            : 'text-slate-400 hover:text-green-600 hover:bg-green-50'
                        }`}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                        </svg>
                      </button>
                    )}

                    {/* Delete */}
                    <button
                      onClick={() => onDelete(lead.id)}
                      title="Delete"
                      className="p-1.5 rounded-lg text-slate-200 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
