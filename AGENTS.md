# Agent Guidelines for Valle Vista Commons

> **This file provides essential guidance for AI agents working on this project.**
> Read this before making any code changes.

---

## Project Structure

**Git Repository:** This directory is a git repo.

- **Local path:** `/Users/schcw/Documents/Vibes/Valle Vista Commons/`
- **Remote origin:** `https://github.com/callieschneider/valle-vista-commons.git`
- **Default branch:** `main`

```
/Users/schcw/Documents/Vibes/Valle Vista Commons/
├── server.js            ← Entry point: middleware, view engine, mount routers
├── routes/
│   ├── public.js        ← Board, submit form, POST submit
│   ├── admin.js         ← Mod dashboard (approve, edit, rewrite, pin, etc.)
│   └── super.js         ← Super admin (mod CRUD, LLM config, site settings)
├── lib/
│   ├── db.js            ← Shared PrismaClient singleton
│   ├── auth.js          ← requireMod(), requireSuperAdmin(), hashPassword()
│   ├── openrouter.js    ← chatCompletion() with AbortController timeout
│   └── ai.js            ← analyzeTip(), rewriteTip(), analyzeInBackground()
├── prisma/
│   ├── schema.prisma    ← Post, Mod, SiteSettings models
│   ├── seed.js          ← SiteSettings default row seeder
│   └── migrations/      ← Migration history
├── views/
│   ├── board.ejs        ← Public sectioned board
│   ├── submit.ejs       ← "Submit a Tip" form
│   ├── admin.ejs        ← Mod dashboard
│   ├── super.ejs        ← Super admin panel
│   └── error.ejs        ← Error page
├── public/              ← Static assets (if any)
├── package.json
├── Procfile             ← Railway deployment
├── .env                 ← Local env vars (not committed)
└── .env.example         ← Template for env vars
```

**All commands run from workspace root:**
- `npm run dev` — Start with nodemon
- `npm start` — Production start
- `npm run migrate:dev` — Create new migration
- `npm run migrate` — Deploy migrations (production)
- `npm run seed` — Seed SiteSettings

---

## MANDATORY: Initial Assessment Before ANY Code Changes

Before making ANY code changes, you MUST:

1. **Read** `PROJECT.md` (project overview, tech stack, status)
2. **Read** `TODO.md` (current work items — check for in-progress tasks)
3. **Read** `server.js` + the relevant `routes/*.js` and `lib/*.js` files
4. **Read** `prisma/schema.prisma` (database schema)
5. **Check** `CHANGELOG.md` for recent changes

Then respond with:

```
INITIAL ASSESSMENT
Task: [your interpretation]
Files reviewed: [list]
Concerns: [any issues, or "None"]
Questions: [clarifications needed, or "None - ready to proceed"]
Scope: [small/medium/large]
```

**Wait for confirmation** if you have concerns or questions.

---

## When to Stop and Ask

Ask the user before proceeding when:
- Requirements could be interpreted multiple ways
- Change affects database schema, auth, or AI prompts
- Change could impact privacy guarantees (no PII, no IP logging, no tracking)
- Change touches multiple route files or lib modules
- A simpler approach exists

---

## Architecture Red Flags — Alert Immediately

| Red Flag | Why It's Dangerous |
|----------|-------------------|
| **Collecting PII** (emails, names, IPs in DB) | Core privacy promise — NEVER collect personal info |
| **Logging IP addresses** | Rate limiting uses IPs in-memory only, never persisted |
| **Adding sessions/cookies** | App is stateless by design — no tracking |
| **Bypassing mod/super auth** | `/admin` routes must use `requireMod`, `/super` must use `requireSuperAdmin` |
| **Direct DB manipulation without sanitization** | All inputs go through `xss-filters` |
| **Creating new PrismaClient instances** | Use `require('../lib/db')` — shared singleton |
| **`prisma db push --force-reset`** | Deletes entire database |
| **Hardcoded secrets** | Use environment variables |
| **Modifying AI prompts without review** | AI prompts affect analysis quality and PII detection |

---

## Critical Rules (Never Violate)

### 1. Privacy First
**No PII is collected, stored, or logged. Period.**
- No email addresses, names, or accounts
- IP addresses used only for in-memory rate limiting, never persisted
- No cookies, sessions, or tracking scripts
- Post content sent to OpenRouter only if API key is configured

### 2. All Tips Are Moderated
**Every public submission goes to `PENDING` status.** Posts only appear on the board after a mod approves them. Board Notes (mod-authored) skip the queue.

### 3. Input Sanitization
**All user input must pass through `xss-filters` before storage.** Use the `sanitize()` helper. Enforce length limits on all fields.

### 4. Two-Tier Auth
- **Super admin** (`requireSuperAdmin`): env vars only. Access to `/super` and `/admin`.
- **Mods** (`requireMod`): DB `Mod` table. Access to `/admin` only. Super admin creds also grant mod access.

### 5. Shared PrismaClient
**Always use `require('../lib/db')`.** Never create `new PrismaClient()` in route or lib files.

---

## Key Patterns

### Adding a New Route
1. Add handler in the appropriate `routes/*.js` file
2. Create/update EJS template in `views/`
3. Apply correct auth middleware (`requireMod` or `requireSuperAdmin`)
4. Sanitize all inputs with `sanitize()` helper
5. For admin/super: use query params for error/success messages (`?error=xxx&msg=yyy`)

### Modifying the Database
1. Edit `prisma/schema.prisma`
2. Run `npm run migrate:dev -- --name description_of_change`
3. Update `prisma/seed.js` if SiteSettings changed
4. Update `PROJECT.md` with schema changes

### AI Features
- **Auto-analysis**: `analyzeInBackground(postId)` — fire-and-forget, called after submit response is sent
- **Custom rewrite**: `rewriteTip(post, instructions)` — intentionally blocking (mod waits)
- **All AI calls**: wrapped in try/catch, return null on failure. UI shows "unavailable" gracefully.
- **No API key**: All AI features disabled. `chatCompletion` returns null immediately.

### Environment Variables
| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | Postgres connection (Railway provides) |
| `SUPER_ADMIN_USER` | No | Super admin username (default: "super") |
| `SUPER_ADMIN_PASS` | Yes | Super admin password (REQUIRED for /super) |
| `OPENROUTER_API_KEY` | No | OpenRouter key (AI disabled if empty) |
| `HCAPTCHA_SITEKEY` | No | hCaptcha site key (skip captcha if empty) |
| `HCAPTCHA_SECRET` | No | hCaptcha secret key |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | Set to `production` in Railway |

### Deployment
- **Platform:** Railway
- **Repo:** GitHub → Railway auto-deploys on push to `main`
- **Procfile:** `web: npx prisma migrate deploy && node prisma/seed.js && node server.js`
- Migrations + seed run automatically on every deploy

---

## Working Documents — How to Use Them

Three documents track ongoing work. **Read all three at the start of every session.**

| Document | What It Tracks | When to Update |
|----------|---------------|----------------|
| `TODO.md` | Actionable items for now/next session | Add items as discovered. Update status when starting/finishing work. Move completed items to DONE section. |
| `PLANNING.md` | Planning protocol for larger features | Reference before creating any plan. Follow the structure defined there. |
| `CHANGELOG.md` | Version history of shipped changes | Add an entry every time you complete work — no exceptions. |

### TODO.md Workflow
1. **Start of session:** Read `TODO.md`. Look for `IN PROGRESS` items first (pick up where last session left off), then `PENDING` items by priority (HIGH → MEDIUM → LOW).
2. **Starting work:** Update the item's status to `IN PROGRESS`.
3. **Finishing work:** Move the item to the DONE section with a `Completed` date.
4. **Discovered work:** Add new items in the appropriate priority tier as you find them.
5. **Update the `Last updated` date** at the top of the file whenever you modify it.

### PLANNING.md Workflow
- **Before creating any plan**, read `PLANNING.md` for the required structure and rules.
- Plans are for multi-file features, schema changes, or anything the user explicitly asks to plan.
- Skip planning for single-file fixes, copy changes, or simple styling.

### CHANGELOG.md Workflow
- **Every completed piece of work** gets a changelog entry — no exceptions.
- Follow the [Keep a Changelog](https://keepachangelog.com/) format already in use.
- Group entries by date. Use Added/Changed/Fixed/Removed/Schema sections as appropriate.

---

## After Completing Work (REQUIRED)

1. **Update `TODO.md`** — mark items done, add any new items discovered
2. **Update `CHANGELOG.md`** with what changed
3. **Update `PROJECT.md`** if features or schema changed
4. **Test locally** — `npm run dev` and verify the change works
5. **Verify the build** — the app must start without errors

---

## Never Do These

- Collect personal information (emails, names, phone numbers)
- Log IP addresses to disk or database
- Add sessions, cookies, or tracking
- Bypass auth on `/admin` or `/super` routes
- Store unsanitized user input
- Hardcode secrets
- Create new PrismaClient instances (use `lib/db.js`)
- Add dependencies without asking
- Skip `TODO.md` or `CHANGELOG.md` updates
- Run `prisma db push --force-reset`
- Claim something works without testing
- Modify AI prompts without user review

---

## Documentation

| Document | Purpose | When to Read |
|----------|---------|--------------|
| `PROJECT.md` | Project overview, tech stack, status | **Always read first** |
| `AGENTS.md` | Agent guidelines (this file) | Before any code changes |
| `TODO.md` | Actionable items for current/next session | **Every session** — check for in-progress and pending work |
| `CHANGELOG.md` | Version history | Check recent changes; update after every completed task |
| `PLANNING.md` | Planning protocol for larger features | Before creating any plan |
| `README.md` | Setup & deploy instructions | Reference |

---

**Remember**: When in doubt, **ASK**. Don't assume. The user prefers explicit questions over incorrect implementations.
