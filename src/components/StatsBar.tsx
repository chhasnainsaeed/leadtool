'use client';

import { Lead } from '@/types';

interface Props {
  leads: Lead[];
  onClearAll: () => void;
  onBatchProcessAll: () => void;
  batchActive: boolean;
  batchDone: number;
  batchTotal: number;
  batchCurrentName: string | null;
  onCancelBatch: () => void;
}

export default function StatsBar({
  leads, onClearAll, onBatchProcessAll, batchActive, batchDone, batchTotal, batchCurrentName, onCancelBatch,
}: Props) {
  const total = leads.length;
  const withWebsite = leads.filter(l => l.hasRealWebsite).length;
  const audited = leads.filter(l => !!l.auditData).length;
  const ready = leads.filter(l => l.status === 'email_generated').length;
  const sent = leads.filter(l => l.emailSent).length;
  const replied = leads.filter(l => l.status === 'replied').length;

  if (total === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Batch progress bar */}
      {batchActive && (
        <div className="bg-blue-600 px-5 py-3 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-white">
                Batch processing: {batchCurrentName || '...'}
              </span>
              <span className="text-xs text-blue-200">{batchDone}/{batchTotal}</span>
            </div>
            <div className="w-full bg-blue-500 rounded-full h-1.5">
              <div
                className="bg-white h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${batchTotal > 0 ? (batchDone / batchTotal) * 100 : 0}%` }}
              />
            </div>
          </div>
          <button
            onClick={onCancelBatch}
            className="text-xs text-blue-200 hover:text-white underline shrink-0 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Stats + actions */}
      <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-6 flex-wrap">
          {[
            { label: 'Total', value: total, color: 'text-slate-800' },
            { label: 'Has Website', value: withWebsite, color: 'text-blue-600' },
            { label: 'Audited', value: audited, color: 'text-indigo-600' },
            { label: 'Email Ready', value: ready, color: 'text-purple-600' },
            { label: 'Sent', value: sent, color: 'text-green-600' },
            { label: 'Replied', value: replied, color: 'text-emerald-600' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onBatchProcessAll}
            disabled={batchActive}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold rounded-xl transition-colors"
          >
            {batchActive ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing...
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Process All Leads
              </>
            )}
          </button>
          <button
            onClick={onClearAll}
            className="text-xs text-red-400 hover:text-red-600 transition-colors flex items-center gap-1 px-2 py-2"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear all
          </button>
        </div>
      </div>
    </div>
  );
}
