# LeadTool

LeadTool is a Next.js 16 app for finding local business leads, generating outreach emails and WhatsApp outreach messages with AI, and sending emails through SMTP.

## WhatsApp Message Generation

- Uses structured lead + audit input (business type, website state, weak points, and message angle).
- Enforces local-style constraints: starts with `Salam`, includes business name, includes `hasnainsaeed.net`, and stays under 90 words.
- Applies one automatic regeneration if output violates banned phrases or formatting rules.
- Falls back to a deterministic template if AI generation fails validation twice or provider fails.

## Requirements

- Node.js 20+
- npm
- Google Chrome installed (for map-launch flow)

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create or update `.env.local` with required values:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_TEXT_MODEL=gemini-3.1-flash
GEMINI_VISUAL_MODEL=gemini-3.1-flash
ANTHROPIC_API_KEY=...
SERPAPI_KEY=...

SMTP_HOST=smtp.titan.email
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=you@domain.com
SMTP_PASS=your_password
SMTP_FROM=you@domain.com
SENDER_NAME=LeadTool
```

3. Start development server:

```bash
npm run dev
```

## SMTP Checks

Run a direct SMTP connectivity/auth test:

```bash
npm run smtp:check
```

Runtime API diagnostic:

- `GET /api/test-smtp`

It returns:
- `ok: true` when SMTP verify succeeds
- `ok: false` and a descriptive `error` when it fails

## Build

```bash
npm run build
```

## Deploy (Hostinger or any Node host)

Set the same environment variables from `.env.local` in your hosting dashboard:

- `AI_PROVIDER`
- `GEMINI_API_KEY` and/or `ANTHROPIC_API_KEY`
- `SERPAPI_KEY` (if using SerpAPI)
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `SENDER_NAME`

After setting env vars, restart/redeploy the app.

## Troubleshooting SMTP

- `Invalid login` / `535`: credentials are wrong or mailbox auth policy blocks login.
- `TLS` / certificate errors: use `587 + SMTP_SECURE=false` or `465 + SMTP_SECURE=true`.
- `ETIMEDOUT` / `EACCES` / `ECONNREFUSED`: outbound SMTP blocked by local/server/network firewall.

If outbound SMTP is blocked by your hosting provider/network, use an HTTPS email API provider (Resend/SendGrid/Postmark) instead of SMTP.
