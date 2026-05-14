'use client';

import { useState } from 'react';
import { Lead } from '@/types';

interface Props {
  lead: Lead;
  onClose: () => void;
  onSent: (lead: Lead) => void;
}

export default function EmailModal({ lead, onClose, onSent }: Props) {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState(lead.emailContent?.subject || '');
  const [body, setBody] = useState(lead.emailContent?.body || '');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSend = async () => {
    if (!recipientEmail || !subject || !body) {
      setError('Please fill in all fields');
      return;
    }
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, to: recipientEmail, subject, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      setSuccess(true);
      onSent({ ...lead, emailSent: true, emailSentAt: new Date().toISOString(), status: 'sent' });
      setTimeout(onClose, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-800">Send Email</h2>
            <p className="text-xs text-slate-500">{lead.businessName} · {lead.city}, {lead.country}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
              <svg className="h-5 w-5 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              <span className="text-green-700 font-medium text-sm">Email sent successfully!</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Business info */}
          <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-500">Business</span>
              <div className="font-medium text-slate-800">{lead.businessName}</div>
            </div>
            <div>
              <span className="text-slate-500">Type</span>
              <div className="font-medium text-slate-800">{lead.businessType}</div>
            </div>
            {lead.phone && (
              <div>
                <span className="text-slate-500">Phone</span>
                <div className="font-medium text-slate-800">{lead.phone}</div>
              </div>
            )}
            {lead.website && (
              <div>
                <span className="text-slate-500">Website</span>
                <a href={lead.website} target="_blank" rel="noreferrer" className="font-medium text-blue-600 hover:underline truncate block">
                  {lead.website.replace(/^https?:\/\//, '')}
                </a>
              </div>
            )}
          </div>

          {/* Audit summary (if available) */}
          {lead.auditData && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="text-xs font-semibold text-amber-700 mb-2">Website Audit Summary</div>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {[
                  { label: 'Perf', score: lead.auditData.performance },
                  { label: 'Access', score: lead.auditData.accessibility },
                  { label: 'SEO', score: lead.auditData.seo },
                  { label: 'BP', score: lead.auditData.bestPractices },
                ].map(({ label, score }) => (
                  <div key={label} className="text-center">
                    <div className={`text-lg font-bold ${score >= 90 ? 'text-green-600' : score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                      {score}
                    </div>
                    <div className="text-xs text-slate-500">{label}</div>
                  </div>
                ))}
              </div>
              {lead.auditData.issues.length > 0 && (
                <ul className="text-xs text-amber-700 space-y-0.5">
                  {lead.auditData.issues.slice(0, 3).map((issue, i) => (
                    <li key={i} className="flex items-center gap-1">
                      <span>•</span> {issue}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Recipient */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Recipient Email *
            </label>
            <input
              type="email"
              value={recipientEmail}
              onChange={e => setRecipientEmail(e.target.value)}
              placeholder="owner@business.com"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Subject *
            </label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
              Email Body *
            </label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={10}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {lead.emailSent ? `Previously sent ${lead.emailSentAt ? new Date(lead.emailSentAt).toLocaleDateString() : ''}` : 'Not sent yet'}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || success || !recipientEmail}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              {sending ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                  </svg>
                  Send Email
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
