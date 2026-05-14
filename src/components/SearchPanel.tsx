'use client';

import { useState, useMemo, useRef } from 'react';
import { COUNTRIES, getCitiesByCountry } from '@/data/cities';
import { BUSINESS_TYPES, CATEGORIES, getBusinessTypesByCategory } from '@/data/businessTypes';
import { SearchParams } from '@/types';

interface Props {
  onLaunch: (params: SearchParams) => void;
  onManualSearch: (params: SearchParams) => void;
  onImportCSV: (file: File) => void;
  launching: boolean;
  searching: boolean;
  importing: boolean;
}

export default function SearchPanel({ onLaunch, onManualSearch, onImportCSV, launching, searching, importing }: Props) {
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [businessTypeQuery, setBusinessTypeQuery] = useState('');
  const [businessTypeLabel, setBusinessTypeLabel] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const cities = useMemo(() => (country ? getCitiesByCountry(country) : []), [country]);
  const businessTypes = useMemo(
    () => (category ? getBusinessTypesByCategory(category) : BUSINESS_TYPES),
    [category]
  );

  const params: SearchParams = {
    city,
    country,
    businessType: businessTypeLabel,
    businessQuery: businessTypeQuery,
  };

  const canSearch = country && city && businessTypeQuery;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) onImportCSV(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImportCSV(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-0.5">Find Leads</h2>
        <p className="text-xs text-slate-400">Powered by your GBP Scraper extension — free</p>
      </div>

      {/* Country */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Country</label>
        <select
          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={country}
          onChange={e => { setCountry(e.target.value); setCity(''); }}
        >
          <option value="">Select country...</option>
          {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* City */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">City</label>
        <select
          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
          value={city}
          onChange={e => setCity(e.target.value)}
          disabled={!country}
        >
          <option value="">{country ? 'Select city...' : 'Choose country first'}</option>
          {cities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
      </div>

      {/* Category */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Category</label>
        <select
          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={category}
          onChange={e => { setCategory(e.target.value); setBusinessTypeQuery(''); setBusinessTypeLabel(''); }}
        >
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Business Type */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Business Type</label>
        <select
          className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={businessTypeQuery}
          onChange={e => {
            setBusinessTypeQuery(e.target.value);
            const found = BUSINESS_TYPES.find(b => b.query === e.target.value);
            setBusinessTypeLabel(found?.label || e.target.value);
          }}
        >
          <option value="">Select type...</option>
          {businessTypes.map(b => <option key={b.query} value={b.query}>{b.label}</option>)}
        </select>
      </div>

      {/* Launch Chrome */}
      <button
        onClick={() => onLaunch(params)}
        disabled={!canSearch || launching || searching || importing}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
      >
        {launching ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Waiting for CSV...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
            </svg>
            Open Google Maps
          </>
        )}
      </button>

      <div className="text-xs text-slate-400 text-center -mt-2">
        Opens Maps → run your extension → CSV auto-imports
      </div>

      {/* Divider */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-slate-100"/>
        <span className="text-xs text-slate-400">or import directly</span>
        <div className="flex-1 h-px bg-slate-100"/>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
          dragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileInput}
        />
        {importing ? (
          <div className="flex items-center justify-center gap-2 text-blue-600 text-sm">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Importing...
          </div>
        ) : (
          <>
            <div className="text-2xl mb-1">📁</div>
            <div className="text-xs font-medium text-slate-600">Drop <code className="bg-slate-100 px-1 rounded">gbp_leads_*.csv</code> here</div>
            <div className="text-xs text-slate-400 mt-0.5">or click to browse</div>
          </>
        )}
      </div>

      {/* SerpAPI fallback */}
      <button
        onClick={() => onManualSearch(params)}
        disabled={!canSearch || searching || launching || importing}
        className="w-full border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-500 font-medium py-2 rounded-xl transition-colors text-xs flex items-center justify-center gap-1.5"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        {searching ? 'Searching...' : 'SerpAPI fallback (requires key)'}
      </button>
    </div>
  );
}
