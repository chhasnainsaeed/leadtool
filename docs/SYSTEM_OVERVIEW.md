# LeadTool System Overview

This document explains how LeadTool works end-to-end: architecture, data model, request flow, AI generation, and operational behavior.

## 1) Purpose

LeadTool is a Next.js app for local business outreach:
- Collect/import leads
- Audit websites
- Generate outreach copy (email + WhatsApp/social)
- Send email through SMTP
- Track lifecycle/status per lead

Primary UI entrypoint:
- `src/app/page.tsx`

## 2) High-Level Architecture

Server and client live in one Next.js codebase.

- Frontend UI:
  - `src/app/page.tsx`
  - `src/components/*`
- API routes (backend logic):
  - `src/app/api/*/route.ts`
- Core domain libraries:
  - `src/lib/ai.ts` (LLM generation)
  - `src/lib/auditor.ts` (PageSpeed + visual audit)
  - `src/lib/storage.ts` (JSON database)
  - `src/lib/mailer.ts` (SMTP send)
  - `src/lib/whatsappOutreach.ts` (input shaping + validation + fallback)

Persistence:
- Local JSON DB at `data/leads.json`

## 3) Data Model

Types are defined in:
- `src/types/index.ts`

Core entities:
- `Lead`: business metadata + outreach state
- `AuditData`: technical/visual website audit results
- `EmailContent`: generated email subject/body

Lead status lifecycle:
- `new` -> `audited` -> `email_generated` -> `sent` -> `replied`

## 4) Lead Ingestion and Storage

Storage layer:
- `src/lib/storage.ts`

Key behaviors:
- Ensures DB file exists (`data/leads.json`)
- Reads/writes synchronously (`fs.readFileSync` / `fs.writeFileSync`)
- Deduplicates by composite key:
  - business name + address + normalized phone + canonical domain
- Recomputes lead scoring on save/update via:
  - `computeLeadScore` from `src/lib/leadScore.ts`

Important methods:
- `getAllLeads()`
- `getLeadById(id)`
- `saveLeads(newLeads)`
- `updateLead(id, updates)`
- `deleteLead(id)`
- `clearAll()`

## 5) Main Processing Pipeline (When You Click Process)

Primary API route:
- `src/app/api/automate-lead/route.ts`

`POST /api/automate-lead` flow:

1. Validate `leadId`, load lead from storage.
2. Determine website/social path:
  - If `hasRealWebsite` + URL:
    - Run `auditWebsite(url)`
    - Save `auditData`, set status `audited`
  - Else if social profile:
    - Build social DM message
    - Save `socialMessage`, set status `audited`
  - Else:
    - Skip audit, still move to `audited` if lead was `new`
3. Email generation/sending:
  - If `recipientEmail` provided:
    - Generate AI email (`generateEmail`)
    - Save `emailContent`, status `email_generated`
    - Send via SMTP (`sendEmail`)
    - Save `emailSent=true`, `emailSentAt`, status `sent`
  - Else: mark email generation/send as skipped
4. WhatsApp pre-generation:
  - If phone exists:
    - Check availability (`checkWhatsAppAvailability`)
    - Generate WhatsApp AI message (`generateWhatsAppMessage`)
    - Save `hasWhatsApp` + `whatsAppMessage`
  - Else: skip
5. Return structured result summary JSON.

## 6) Website Audit System

Audit implementation:
- `src/lib/auditor.ts`

What it collects:
- Lighthouse/PageSpeed category scores (performance, SEO, etc.)
- Core metrics (`FCP`, `LCP`, `CLS`)
- Technical checks (SSL, title/meta/H1, viewport, schema, OG, analytics)
- Issues and opportunities
- Visual screenshot-based critique using Gemini vision model

Model config for visual step:
- `GEMINI_VISUAL_MODEL` env var

Output stored in `lead.auditData`.

## 7) AI Content Generation

Main AI service:
- `src/lib/ai.ts`

Providers:
- Gemini (default) using `@google/generative-ai`
- Claude optional using `@anthropic-ai/sdk`

Provider selector:
- `AI_PROVIDER` env var (`gemini` or `claude`)

### 7.1 Email Generation

Function:
- `generateEmail(lead, websiteAudit?)`

Prompt source:
- `buildEmailPrompt(...)`

System constraints:
- Concrete audit observation first
- Specific impact
- Single soft CTA
- JSON output: `{ "subject", "body" }`

### 7.2 WhatsApp Generation

Function:
- `generateWhatsAppMessage(lead, websiteAudit?)`

Input shaping:
- `buildWhatsAppInput(...)` in `src/lib/whatsappOutreach.ts`

Prompt pattern:
- Structured JSON input embedded in prompt
- Includes `message_angle`
- Requires weak-point or industry-specific mention

Validation + retry:
1. Generate first draft
2. Validate against rules (`validateWhatsAppMessage`)
3. If invalid, regenerate once with failure reasons
4. If still invalid or provider error, use deterministic fallback template

Rules enforced include:
- Must start with `Salam`
- Must include business name
- Must include `hasnainsaeed.net`
- Max 90 words
- Banned phrase filtering

## 8) Message Angle Logic (WhatsApp)

File:
- `src/lib/whatsappOutreach.ts`

Angle selection now uses:
- Business context (has website, social-only, low site score, etc.)
- Weak point + service context
- Deterministic seeded variation (`hashString` + `pickBySeed`)

This prevents repetitive pitch angles across audits while staying stable for the same lead context.

## 9) Frontend Behavior

Main page orchestration:
- `src/app/page.tsx`

Key responsibilities:
- Load/display leads
- Trigger API calls (audit, generate email, process, WhatsApp link, etc.)
- Update local UI state with returned lead changes
- Show toast notifications for progress/errors

Core UI components:
- `LeadsTable` (list/filter/sort/bulk actions)
- `LeadDetailPanel` (deep lead view + actions)
- `EmailModal` (review/send email flow)
- `SearchPanel`, `StatsBar`

## 10) API Route Map

- `POST /api/search`: acquire leads via configured search source
- `POST /api/import-csv`: import leads from extension/export format
- `GET /api/check-import`: check for import files
- `POST /api/audit`: audit one website
- `POST /api/generate-email`: generate one email
- `POST /api/automate-lead`: full pipeline for one lead
- `POST /api/whatsapp-link`: build WhatsApp deeplink text/link
- `POST /api/send-email`: SMTP send
- `PATCH/DELETE /api/leads`: update/delete lead
- `POST /api/launch`: launch browser helper flow
- `GET /api/test-smtp`: SMTP diagnostics

## 11) Environment Variables

Common required keys:
- `AI_PROVIDER`
- `GEMINI_API_KEY`
- `GEMINI_TEXT_MODEL`
- `GEMINI_VISUAL_MODEL`
- `ANTHROPIC_API_KEY` (only if using Claude)
- `SERPAPI_KEY` (if using SerpAPI path)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `SENDER_NAME`

## 12) Failure and Fallback Strategy

- AI output malformed:
  - Email: robust JSON parse fallback
  - WhatsApp: validation + one retry + hard fallback template
- Missing recipient email:
  - Skip send, keep generated context where applicable
- No website/social:
  - Skip technical audit and continue pipeline
- Provider errors:
  - Return safe fallback message where implemented

## 13) Practical Debug Checklist

1. Verify env vars in `.env.local`.
2. Confirm active AI provider/model in `src/lib/ai.ts` behavior.
3. Check `data/leads.json` for persisted state transitions.
4. Call `GET /api/test-smtp` before send workflows.
5. Inspect API route responses in browser/network console.
6. If WhatsApp copy feels repetitive, inspect `getMessageAngle()` output and input seed fields.

## 14) Suggested Next Improvements

1. Add explicit audit/job logs with timestamps per lead (not just final state).
2. Add queue/worker for batch process to avoid long request blocking.
3. Move JSON DB to SQLite/Postgres for concurrency safety.
4. Add automated tests for API routes and pipeline state transitions.
5. Add prompt/version metadata per generated message for traceability.

