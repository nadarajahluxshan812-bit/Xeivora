# Xeivora — Production Deployment Checklist

Audited against `main` @ `3111aac`. Lint ✅, build ✅ (28/28 pages), production `npm start` boots clean and all core flows work or degrade gracefully. **Do not deploy until the blockers below are resolved.**

---

## 1. Environment variables (verified against the actual code)

The original task list had two names that the code does **not** use — corrected here.

### Required (core)
| Variable | Purpose | Notes |
|---|---|---|
| `DATABASE_URL` | Postgres persistence | **Required for production.** Without it the app falls back to JSON files on local disk (ephemeral). |
| `DATABASE_SSL` | `true` for managed Postgres | Most hosts require SSL. |
| `OPENAI_API_KEY` | OpenAI provider + image generation | See billing blocker §6. |
| `ANTHROPIC_API_KEY` | Claude provider | |
| `GEMINI_API_KEY` | Google Gemini provider | ⚠️ The task's `GOOGLE_GENERATIVE_AI_API_KEY` is **not used**. Code reads `GEMINI_API_KEY` (falls back to `GOOGLE_API_KEY`). |
| `INTEGRATIONS_ENCRYPTION_KEY` | Encrypts stored OAuth tokens (GitHub etc.) | ⚠️ **Set explicitly.** If unset it silently derives a key from `STRIPE_SECRET_KEY`/`GOOGLE_CLIENT_SECRET`/`OPENAI_API_KEY`/`DATABASE_URL`, then a hardcoded dev key — rotating any of those would make all stored tokens undecryptable. |
| `NEXT_PUBLIC_APP_URL` | Public origin for OAuth redirects + Stripe return URLs | Also accepts `PUBLIC_APP_URL`/`APP_URL`. Defaults to `https://xeivora.com`. **Set to the real domain.** |

### ❌ Not required (task-list items the code does not use)
- **`AUTH_SECRET`** — sessions are opaque random tokens stored SHA-256-hashed (`auth-store.js`); there is no session-signing secret. Nothing to set.
- **`GOOGLE_GENERATIVE_AI_API_KEY`** — use `GEMINI_API_KEY` instead.

### Optional integrations (app runs fine without them — verified graceful)
| Variable | Enables | Without it |
|---|---|---|
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub repo tab (OAuth) | GitHub tab shows "GitHub isn't configured" |
| `GITHUB_REDIRECT_URI` | OAuth callback override | Derived from app URL |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | "Continue with Google" login + Drive/Gmail | Email/password login still works |
| `VERCEL_TOKEN` | Deployments tab (deploy via Vercel) | Deployments tab shows "Vercel isn't configured" |
| `VERCEL_TEAM_ID` | Scope Vercel calls to a team | Personal scope |
| `STRIPE_SECRET_KEY` | Billing | Checkout returns a graceful 400 |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification | Webhook rejects events |
| `STRIPE_PRO_PRICE_ID` / `STRIPE_STARTER_PRICE_ID` | Checkout line items | Checkout 400 ("plan not configured") |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client Stripe.js | |
| `OPENWEATHER_API_KEY` / `OLLAMA_*` | Weather tool / local models | Tools degrade gracefully |

---

## 2. Missing-env handling — ✅ verified
The app does **not** crash when optional integrations are absent:
- No provider keys → `simulation` local-fallback responses.
- No `DATABASE_URL` → JSON file storage (dev only — see blocker).
- No `STRIPE_SECRET_KEY` → `getStripe()` throws only when a Stripe route is called (lazy), returning a 400; app boots fine.
- GitHub/Vercel unconfigured → tabs render "not configured" states.

Verified in production mode: signup/login, project creation, chat (real Gemini), `/chat`, `/dashboard`, `/dashboard/[id]`, `/preview`, `/memory`, `/timeline`, `/integrations`, `/pricing` all return 200; GitHub `configured=false`, Vercel `configured=false`, Stripe checkout `400` — no crashes.

---

## 3–5. Build & runtime — ✅ verified
- `npm run lint` → exit 0
- `npm run build` → exit 0 (compiled, types valid, 28/28 pages)
- `npm start` → boots clean, no startup errors
- Flows: signup ✅ login ✅ project ✅ chat ✅ (Gemini "Rome") preview ✅ workspace ✅ memory ✅ timeline ✅ GitHub graceful ✅ Vercel graceful ✅ pricing ✅

---

## 6. Production blockers & checklist

### 🔴 Blockers (resolve before deploy)
1. **Persistence / ephemeral filesystem.** Ten stores (`chat-store`, `mvp-store`, `workspace-store`, `auth-store`, `preview-store`, `integration-store`, etc.) write JSON to `process.cwd()/data/*.json` when `DATABASE_URL` is unset. On serverless (Vercel) the filesystem is read-only/ephemeral → data loss and write failures. **Set `DATABASE_URL` (managed Postgres) + `DATABASE_SSL=true`.** The schemas are auto-created on first use (`ensure*Schema`).
2. **File uploads write to local disk.** `app/api/files` writes to `process.cwd()/data/uploads` via `fs.writeFile` **regardless of `DATABASE_URL`**. This fails on serverless and is non-persistent. **Either** deploy to a host with a persistent disk (Railway/VM/Fly volume) **or** move uploads to object storage (S3 / Vercel Blob) before enabling file uploads in production.
3. **OpenAI billing hard limit.** The account currently returns `400 Billing hard limit has been reached`, which disables image generation and pushes some coding/API prompts into `simulation` fallback. Raise/clear the OpenAI billing limit (Gemini/Anthropic are unaffected).

### 🟡 Required setup (per enabled feature)
4. **Database migration/storage:** provision Postgres, set `DATABASE_URL`/`DATABASE_SSL`; tables auto-migrate on boot. Plan a persistent path or object storage for `/data/uploads`.
5. **Domain / DNS:** point the domain at the host; set `NEXT_PUBLIC_APP_URL=https://<domain>`.
6. **Stripe webhook:** create the endpoint `https://<domain>/api/stripe/webhook`, set `STRIPE_WEBHOOK_SECRET`, and set `STRIPE_SECRET_KEY` + `STRIPE_PRO_PRICE_ID` + `STRIPE_STARTER_PRICE_ID` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
7. **GitHub OAuth callback:** in the GitHub OAuth app, set the callback to `https://<domain>/api/integrations/github/callback` (and `https://<domain>/api/auth/github/callback` if GitHub login is used). Set `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET`.
8. **Vercel token:** create a Vercel access token, set `VERCEL_TOKEN` (+ `VERCEL_TEAM_ID` for team scope). Linked Vercel projects need a connected Git repo to deploy from.
9. **Encryption key:** set `INTEGRATIONS_ENCRYPTION_KEY` to a fixed random value and never rotate it without re-linking integrations.

### Run command
- Build: `npm run build`; Start: `npm start` (Next.js production server). The documented dev command is `npm run dev` (Turbopack).
