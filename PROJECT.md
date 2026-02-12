# Valle Vista Commons

**Privacy-first moderated community bulletin board.**

No accounts. No tracking. No personal information collected. Ever.

---

## Status: v1.2.0 — AI Rewrite, Undo, Universal Archive

| Feature | Status |
|---------|--------|
| Sectioned public board (Alerts, Happenings, Lost & Found, Neighbors, Board Notes) | ✅ |
| Anonymous tip submission with section picker | ✅ |
| hCaptcha + honeypot spam protection | ✅ |
| Two-tier auth: Super admin (env vars) + Mods (DB) | ✅ |
| Admin dashboard with review queue, AI analysis, edit, pin, urgent, expire | ✅ |
| AI-powered tip analysis via OpenRouter (background, non-blocking) | ✅ |
| AI-powered tip rewrite (apply auto, quick rewrite, or custom instructions) | ✅ |
| Quick AI Rewrite button on all posts (pending + live) | ✅ |
| 10-level undo history for edits and rewrites | ✅ |
| Universal archive (rejected, deleted, expired — collapsed by default) | ✅ |
| Soft-delete (no permanent deletion except explicit purge) | ✅ |
| Board Notes composer (mod-authored, skip review) | ✅ |
| Super admin panel (mod CRUD, LLM config, site settings) | ✅ |
| Configurable LLM models (analysis + rewrite) | ✅ |
| Section-aware auto-expiry (7d alerts, 14d others) | ✅ |
| Client-side search across all sections | ✅ |
| Rate limiting | ✅ |
| Railway deployment | ✅ |
| Tiptap rich text editor (public + admin) | ✅ |
| Image upload with EXIF/GPS stripping | ✅ |
| Video upload (MP4, WebM) | ✅ |
| HTML sanitization + safe rendering | ✅ |
| Railway volume for persistent uploads | ✅ |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express 4 |
| Database | PostgreSQL (Railway add-on) |
| ORM | Prisma 6 |
| Templates | EJS |
| CSS | Bootstrap 5 (CDN) |
| Security | Helmet, xss-filters, rate-limiter-flexible, sanitize-html |
| Captcha | hCaptcha (free tier) |
| AI | OpenRouter API (configurable models) |
| Rich Text | Tiptap 2 (CDN via esm.sh) |
| Uploads | multer (multipart), sharp (image processing) |
| Hosting | Railway (+ volume for uploads) |

---

## Architecture

Modular Express app with route files and shared lib modules.

```
Request → Express middleware (helmet, cors, rate-limit) → Route handler → Prisma query → EJS render → Response
```

### File Structure

```
server.js                    -- entry point: middleware, view engine, mount routers
routes/
  public.js                  -- GET / (board), GET /submit, POST /submit, POST /api/upload
  admin.js                   -- mod dashboard, approve/reject/edit/pin/rewrite/delete/notes
  super.js                   -- super admin: mod CRUD, LLM config, site settings
lib/
  db.js                      -- shared PrismaClient singleton
  auth.js                    -- requireMod(), requireSuperAdmin(), hashPassword()
  openrouter.js              -- chatCompletion() wrapper with AbortController timeout
  ai.js                      -- analyzeTip(), rewriteTip(), analyzeInBackground()
  upload.js                  -- multer config, processAndSave(), EXIF stripping
  sanitize.js                -- sanitizeRichText(), stripHtml()
public/
  js/
    editor.js                -- Tiptap editor module (ESM, CDN imports from esm.sh)
    submit-init.js           -- submit page editor initialization
    admin-init.js            -- admin page editor initialization
uploads/                     -- uploaded images/videos (gitignored, Railway volume)
views/
  board.ejs                  -- public board (sectioned)
  submit.ejs                 -- "Submit a Tip" form
  admin.ejs                  -- mod dashboard
  super.ejs                  -- super admin panel
  error.ejs                  -- error page
prisma/
  schema.prisma              -- Post, Mod, SiteSettings models
  seed.js                    -- seeds SiteSettings default row
```

### Routes

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | /api/upload | None | Upload image/video, returns JSON {url, type, filename} |
| GET | `/` | Public | Board — sectioned community board |
| GET | `/submit` | Public | Tip submission form |
| POST | `/submit` | Public + hCaptcha | Create pending tip |
| GET | `/admin` | Mod (Basic Auth) | Mod dashboard |
| POST | `/admin/approve/:id` | Mod | Approve pending tip |
| POST | `/admin/reject/:id` | Mod | Reject tip (moves to archive) |
| POST | `/admin/edit/:id` | Mod | Edit tip content (saves undo history) |
| POST | `/admin/rewrite/:id` | Mod | AI rewrite (apply/quick/custom, saves undo) |
| POST | `/admin/reanalyze/:id` | Mod | Retry AI analysis |
| POST | `/admin/undo/:id` | Mod | Undo last edit/rewrite (pops from history) |
| POST | `/admin/pin/:id` | Mod | Toggle pin |
| POST | `/admin/urgent/:id` | Mod | Toggle urgent |
| POST | `/admin/expire/:id` | Mod | Expire post (moves to archive) |
| POST | `/admin/delete/:id` | Mod | Soft-delete post (moves to archive) |
| POST | `/admin/restore/:id` | Mod | Restore archived post to pending |
| POST | `/admin/purge/:id` | Mod | Permanently delete from archive |
| POST | `/admin/notes` | Mod | Publish board note |
| POST | `/admin/modnote/:id` | Mod | Save internal mod note |
| GET | `/super` | Super Admin | Super admin panel |
| POST | `/super/mods/create` | Super Admin | Create mod |
| POST | `/super/mods/:id/toggle` | Super Admin | Enable/disable mod |
| POST | `/super/mods/:id/delete` | Super Admin | Delete mod |
| POST | `/super/settings/llm` | Super Admin | Save LLM model config |
| POST | `/super/settings/llm-test` | Super Admin | Test LLM connection |
| POST | `/super/settings/site` | Super Admin | Save site settings |
| GET | `/health` | Public | Health check |

---

## Database Schema

### Post
| Column | Type | Notes |
|--------|------|-------|
| id | String (cuid) | Primary key |
| title | VarChar(100) | Required |
| desc | Text | Required. Stores sanitized HTML from Tiptap editor |
| location | VarChar(100)? | Optional, intentionally vague |
| section | Enum: ALERT, HAPPENINGS, LOST_FOUND, NEIGHBORS, BOARD_NOTES | Board section |
| status | Enum: PENDING, LIVE, EXPIRED, REJECTED, DELETED | Moderation state |
| pinned | Boolean | Pinned to top of section |
| urgent | Boolean | Highlighted as urgent |
| modNote | Text? | Internal mod note (not public) |
| modPost | Boolean | True if mod-authored (Board Notes) |
| eventDate | DateTime? | For HAPPENINGS section |
| expiresAt | DateTime? | Custom expiry date |
| editedAt | DateTime? | Last edit timestamp |
| createdAt | DateTime | Auto-set |
| approvedAt | DateTime? | Set when approved |
| aiAnalysis | Json? | AI analysis result |
| descHistory | Json? | Array of {title, desc, timestamp} — last 10 versions for undo |

### Mod
| Column | Type | Notes |
|--------|------|-------|
| id | String (cuid) | Primary key |
| username | VarChar(50) | Unique, lowercase |
| passHash | VarChar(64) | SHA-256 hash |
| active | Boolean | Can be disabled |
| createdAt | DateTime | Auto-set |

### SiteSettings (singleton)
| Column | Type | Notes |
|--------|------|-------|
| id | String | Always "default" |
| boardName | String | Displayed on board |
| boardTagline | String | Subtitle |
| analysisModel | String | OpenRouter model ID for analysis |
| rewriteModel | String | OpenRouter model ID for rewrite |
| aboutText | Text? | About section content |
| updatedAt | DateTime | Auto-updated |

---

## Privacy Model

| Concern | Approach |
|---------|----------|
| User identity | None collected — fully anonymous |
| IP addresses | Used only for in-memory rate limiting; never stored |
| Cookies/Sessions | None. Stateless app. |
| Tracking | No analytics, no scripts, no pixels |
| Post content | Sanitized with xss-filters before storage |
| Location data | User-entered approximate text only (optional) |
| AI processing | Post content sent to OpenRouter only if API key is set; no PII should be in posts |

---

## Authentication

### Two-tier system

1. **Super Admin** — env vars `SUPER_ADMIN_USER`/`SUPER_ADMIN_PASS`. Access to `/super` (mod management, LLM config, site settings) and `/admin`.
2. **Mods** — DB `Mod` table, managed by super admin via `/super`. Access to `/admin` only.

Both use HTTP Basic Auth. No sessions, no cookies.

---

## AI Features (OpenRouter)

- **Auto-analysis**: When a tip is submitted, AI analyzes it in the background (fire-and-forget). Results shown in admin review queue.
- **Apply rewrite**: One-click apply of AI-suggested rewrite from analysis.
- **Custom rewrite**: Mod provides instructions, AI rewrites (intentionally blocking — mod waits).
- **Models configurable**: Super admin picks models for analysis and rewrite separately.
- **Graceful degradation**: If `OPENROUTER_API_KEY` is not set, all AI features are disabled. No data leaves server.

---

## Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DATABASE_URL` | Yes | — | Postgres connection (Railway auto-provides) |
| `SUPER_ADMIN_USER` | No | `super` | Super admin username |
| `SUPER_ADMIN_PASS` | Yes | — | Super admin password (REQUIRED for /super) |
| `OPENROUTER_API_KEY` | No | — | OpenRouter key (AI disabled if empty) |
| `HCAPTCHA_SITEKEY` | No | — | hCaptcha public key |
| `HCAPTCHA_SECRET` | No | — | hCaptcha secret key |
| `PORT` | No | `3000` | Server port (Railway auto-provides) |
| `NODE_ENV` | No | — | Set to `production` in Railway |
| `UPLOAD_DIR` | No | `./uploads` | Upload directory (Railway volume mounted at `/uploads/`) |

---

## Development

```bash
# Install
npm install

# Create/apply migrations
npm run migrate:dev

# Seed database
npm run seed

# Start dev server (with auto-reload)
npm run dev

# Open Prisma Studio (DB browser)
npm run studio
```

---

## Deployment (Railway)

1. Push to `main` branch → Railway auto-deploys
2. Procfile runs `prisma migrate deploy`, then `seed.js`, then `node server.js`
3. Railway provides `DATABASE_URL` and `PORT` automatically
4. Set `SUPER_ADMIN_PASS` in Railway environment variables
5. Optionally set `OPENROUTER_API_KEY` for AI features
6. Optionally set `HCAPTCHA_SITEKEY` and `HCAPTCHA_SECRET`
7. Add a Railway volume, mount at `/uploads/`, set `UPLOAD_DIR=/uploads/`
