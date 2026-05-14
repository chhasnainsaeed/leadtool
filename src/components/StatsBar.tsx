'use client';

import { Lead } from '@/types';

interface Props {
  leads: Lead[];
  onClearAll: () => void;
}

export default function StatsBar({ leads, onClearAll }: Props) {
  const total = leads.length;
  const withWebsite = leads.filter(l => l.hasWebsite).length;
  const noWebsite = leads.filter(l => !l.hasWebsite).length;
  const sent = leads.filter(l => l.emailSent).length;
  const ready = leads.filter(l => l.status === 'email_generated').length;

  const stats = [
    { label: 'Total Leads', value: total, color: 'text-slate-800' },
    { label: 'Have Website', value: withWebsite, color: 'text-blue-600' },
    { label: 'No Website', value: noWebsite, color: 'text-red-500' },
    { label: 'Email Ready', value: ready, color: 'text-purple-600' },
    { label: 'Emails Sent', value: sent, color: 'text-green-600' },
  ];

  if (total === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-6 py-4 flex items-center justify-between flex-wrap gap-4">
      <div className="flex items-center gap-8 flex-wrap">
        {stats.map(s => (
          <div key={s.label} className="text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>
      <button
        onClick={onClearAll}
        className="text-xs text-red-400 hover:text-red-600 transition-colors flex items-center gap-1"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
        </svg>
        Clear all leads
      </button>
    </div>
  );
}
