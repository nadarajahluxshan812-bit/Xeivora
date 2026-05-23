# Xeivora

Xeivora is a production-ready AI workspace website built with Next.js. It serves a public SaaS frontend, a live chat workspace, orchestration APIs, and PostgreSQL-backed continuity memory from one deployable application.

## Stack

- Frontend: Next.js App Router + Tailwind CSS + Framer Motion
- Server runtime: Next.js route handlers on Node.js
- Database: PostgreSQL through `DATABASE_URL`
- AI providers: OpenAI, Anthropic, and Gemini
- Hosting target: Railway
- DNS and edge: Cloudflare

## Production Scripts

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start"
}
```

## Environment Variables

Server-side only variables:

```bash
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
DATABASE_URL=
DATABASE_POOL_MAX=10
DATABASE_SSL=false
OPENAI_MODEL=gpt-4o
ANTHROPIC_MODEL=claude-sonnet-4-20250514
GEMINI_MODEL=gemini-2.5-flash
PROVIDER_TIMEOUT_MS=15000
PROVIDER_STREAM_IDLE_TIMEOUT_MS=15000
```

Notes:

- `DATABASE_URL` enables PostgreSQL persistence for chats, memory, settings, traces, and continuity state.
- `DATABASE_SSL=false` is the default local and same-project Railway setup. If your connection path requires SSL, set `DATABASE_SSL=true`.
- No provider key is exposed to the client unless you intentionally create a `NEXT_PUBLIC_` variable.

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Copy the env template:

```bash
cp .env.example .env.local
```

3. Start the app:

```bash
npm run dev
```

4. Open:

```text
http://localhost:3000
```

## PostgreSQL Runtime

Xeivora automatically initializes its PostgreSQL schema on first use when `DATABASE_URL` is present.

Primary tables created by the runtime:

- `xeivora_chat_sessions`
- `xeivora_chat_messages`
- `xeivora_workspace_memory`
- `xeivora_workspace_session_memory`
- `xeivora_resource_items`
- `xeivora_resource_settings`

This covers:

- chat history
- lightweight user memory
- workspace preferences
- continuity events
- checkpoints
- orchestration traces

If `DATABASE_URL` is missing, Xeivora falls back to local JSON storage for development only.

## GitHub Deployment Prep

This project is now initialized as a git repository.

Typical first push flow:

```bash
git add .
git commit -m "Prepare Xeivora for Railway production deployment"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

Make sure `.env.local` stays uncommitted. It is already ignored by `.gitignore`.

## Railway Deployment

1. Push Xeivora to GitHub.
2. In Railway, create a new project.
3. Choose `Deploy from GitHub repo`.
4. Select the Xeivora repository.
5. Railway will detect the Node/Next.js app and run:
   `npm run build`
6. Set the Start Command to:
   `npm run start`
7. Add a PostgreSQL service:
   Railway project canvas → `+ New` → `Database` → `PostgreSQL`
8. In the Xeivora service Variables tab, add:
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `GEMINI_API_KEY`
   - `DATABASE_URL` as a Railway reference variable from the Postgres service
   - `DATABASE_SSL=false` unless your chosen connection path requires SSL
9. Deploy the staged changes.
10. In the service Settings → Networking section, generate a Railway public domain first to confirm the app is healthy.

## Cloudflare Domain Setup

Goal:

- `https://xeivora.com`
- `https://www.xeivora.com`

Recommended flow:

1. In Railway, open the Xeivora service.
2. Add a custom domain for `xeivora.com`.
3. Railway will give you:
   - one `CNAME` target
   - one `TXT` verification record
4. In Cloudflare DNS, add:
   - `CNAME` name `@` → Railway target
   - `TXT` name/value exactly as Railway shows for verification
5. Add `www`:
   - `CNAME` name `www` → `@`
6. Keep the web traffic CNAME proxied through Cloudflare.
7. Leave the TXT verification record as DNS-only.
8. In Cloudflare `SSL/TLS -> Overview`, set the mode to `Full`.
9. In `SSL/TLS -> Edge Certificates`, keep `Universal SSL` enabled.
10. If you want `www.xeivora.com` to redirect to `xeivora.com`, add a Cloudflare Bulk Redirect from `https://www.xeivora.com` to `https://xeivora.com` with status `301`.
11. Wait for Railway domain verification and SSL issuance.

Recommended Cloudflare SSL/TLS settings:

- SSL mode: `Full` for the proxied Railway + Cloudflare setup
- Always Use HTTPS: enabled

## Production URL Flow

```text
xeivora.com
-> Cloudflare DNS
-> Railway public networking
-> Xeivora Next.js app
-> PostgreSQL via DATABASE_URL
-> OpenAI / Anthropic / Gemini APIs
```

## Verification Checklist

- `npm run lint`
- `npm run build`
- at least one AI provider key configured in Railway
- `DATABASE_URL` connected from the Railway PostgreSQL service
- Railway-generated domain loads before custom-domain cutover
- Railway custom domain shows verified
- Cloudflare SSL mode set to `Full`

## Current API Surface

App Router endpoints now include:

- `GET /api/chat/bootstrap`
- `POST /api/chat`
- `POST /api/chat/sessions`
- `GET /api/chat/sessions/:sessionId`
- `POST /api/chat/sessions/:sessionId/stream`
- `GET /api/memory`
- `POST /api/memory`
- `PUT /api/memory/:id`
- `DELETE /api/memory/:id`
- `GET /api/workflows`
- `POST /api/workflows`
- `PUT /api/workflows/:id`
- `DELETE /api/workflows/:id`
- `GET /api/agents`
- `GET /api/orbit/overview`
- `GET /api/orbit/stream`
- `GET /api/status`
- `GET /api/continuity/events`
- `GET /api/settings`
- `PUT /api/settings`
- `GET /api/debug/providers`
- `POST /api/debug/openai`
- `POST /api/debug/anthropic`
- `POST /api/debug/gemini`

## Production Notes

- Xeivora no longer depends on the custom Express runtime for production startup.
- Railway-compatible startup logs now report provider and database availability without printing secrets.
- Provider fallbacks are real runtime failovers, not canned orchestration copy.
