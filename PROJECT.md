# Valle Vista Commons

**Privacy-first moderated community bulletin board.**

No accounts. No tracking. No personal information collected. Ever.

---

## Status: v1.5.0 — Tiptap Enhanced + In-Editor AI Rewrite

| Feature | Status |
|---------|--------|
| Sectioned public board (Alerts, Happenings, Lost & Found, Neighbors, Board Notes) | ✅ |
| Anonymous tip submission with section picker | ✅ |
| Interactive map picker on submit form with geocoding | ✅ |
| Clickable mini-maps on board postcards (expand to modal) | ✅ |
| Map pin editor in admin dashboard with geocoding | ✅ |
| hCaptcha + honeypot spam protection | ✅ |
| Two-tier auth: Super admin (env vars) + Mods (DB) | ✅ |
| **Unified admin with left sidebar navigation (9 tabs)** | ✅ |
| **Dashboard overview with stat cards and quick actions** | ✅ |
| **Block list for anonymous submitters (auto-reject or auto-flag)** | ✅ |
| **Activity log tracking all moderator actions** | ✅ |
| **Custom LLM model ID support (any OpenRouter model)** | ✅ |
| **Client-side tab switching with URL hash persistence** | ✅ |
| **Responsive mobile sidebar with hamburger toggle** | ✅ |
| Admin review queue with AI analysis, edit, pin, urgent, expire | ✅ |
| AI-powered tip analysis via OpenRouter (background, non-blocking) | ✅ |
| AI-powered tip rewrite (apply auto, quick rewrite, or custom instructions) | ✅ |
| Quick AI Rewrite button on all posts (pending + live) | ✅ |
| **In-editor AI Rewrite (🤖) with per-mod rate limits** | ✅ |
| **Rewrite logs & stats in super admin mod management** | ✅ |
| **Configurable rewrite limits per mod (post + hourly)** | ✅ |
| 10-level undo history for edits and rewrites | ✅ |
| Dedicated archive tab with status filters | ✅ |
| Soft-delete (no permanent deletion except explicit purge) | ✅ |
| Board Notes composer (mod-authored, skip review) | ✅ |
| Super admin features (mod CRUD, LLM config, site settings) — in sidebar | ✅ |
| Configurable LLM models: Grok 4.1 Fast, Haiku 3.5, Sonnet 4.5 + more | ✅ |
| **Configurable rewrite prompt template** | ✅ |
| Section-aware auto-expiry (7d alerts, 14d others) | ✅ |
| Client-side search across all sections | ✅ |
| Rate limiting | ✅ |
| Railway deployment | ✅ |
| **Tiptap rich text editor with Strikethrough, H1-H4 headings** | ✅ |
| Image upload with EXIF/GPS stripping | ✅ |
| Video upload (MP4, WebM) | ✅ |
| HTML sanitization + safe rendering | ✅ |
| Railway volume for persistent uploads | ✅ |
| Feather Icons (inline SVG) for consistent UI | ✅ |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express 4 |
| Database | PostgreSQL (Railway add-on) |
| ORM | Prisma 6 |
| Templates | EJS |
| CSS | Custom design system (`public/css/style.css`) + Bootstrap 5 (CDN, admin only) |
| Fonts | Inter (Google Fonts CDN) |
| Theming | 5 color schemes × 2 modes (light/dark), localStorage persistence |
| Security | Helmet, xss-filters, rate-limiter-flexible, sanitize-html |
| Captcha | hCaptcha (free tier) |
| AI | OpenRouter API (configurable models) |
| Rich Text | Tiptap 2 (CDN via esm.sh) |
| Maps | Leaflet 1.9.4 + OpenStreetMap tiles (CDN via unpkg) |
|| Icons | Feather Icons (inline SVG) |
| Geocoding | Nominatim (forward + reverse geocoding, client-side) |
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
  css/
    style.css                -- shared design system (schemes, dark mode, all components)
  js/
    theme.js                 -- dark/light mode + color scheme controller (localStorage)
    map-picker.js            -- Leaflet map picker utility (ESM, geocoding, bounds)
    submit-map.js            -- submit page map initialization (ESM)
    admin-maps.js            -- admin page map initialization (ESM)
    board-maps.js            -- board mini-map modal (ESM)
    editor.js                -- Tiptap editor module (ESM, CDN imports from esm.sh)
    submit-init.js           -- submit page editor initialization
    admin-init.js            -- admin page editor initialization
    admin-sidebar.js         -- sidebar tab switching, URL hash, mobile toggle
    board-search.js          -- client-side search filter
    category-select.js       -- category selection handler
    lightbox.js              -- image lightbox viewer
uploads/                     -- uploaded images/videos (gitignored, Railway volume)
views/
  board.ejs                  -- public board (sectioned)
  submit.ejs                 -- "Submit a Tip" form
  admin.ejs                  -- unified admin dashboard (sidebar + 9 tab panels)
  super.ejs                  -- (deprecated) super admin panel — GET now redirects to /admin
  error.ejs                  -- error page
prisma/
  schema.prisma              -- Post, Mod, SiteSettings models
  seed.js                    -- seeds SiteSettings default row
PATTERNS.md                  -- code patterns, conventions, and design decisions
```

### Routes

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | /api/upload | None | Upload image/video, returns JSON {url, type, filename} |
| GET | `/` | Public | Board — sectioned community board |
| GET | `/submit` | Public | Tip submission form |
| POST | `/submit` | Public + hCaptcha | Create pending tip |
| GET | `/admin` | Mod (Basic Auth) | Unified admin dashboard (all tabs) |
| POST | `/admin/approve/:id` | Mod | Approve pending tip |
| POST | `/admin/reject/:id` | Mod | Reject tip (moves to archive) |
| POST | `/admin/edit/:id` | Mod | Edit tip content (saves undo history) |
| POST | `/admin/rewrite/:id` | Mod | AI rewrite (apply/quick/custom, saves undo) |
| POST | `/admin/reanalyze/:id` | Mod | Retry AI analysis |
| POST | `/admin/undo/:id` | Mod | Undo last edit/rewrite (pops from history) |
| POST | `/admin/api/rewrite-editor` | Mod | In-editor AI rewrite with rate limits (JSON endpoint) |
| POST | `/admin/pin/:id` | Mod | Toggle pin |
| POST | `/admin/urgent/:id` | Mod | Toggle urgent |
| POST | `/admin/expire/:id` | Mod | Expire post (moves to archive) |
| POST | `/admin/delete/:id` | Mod | Soft-delete post (moves to archive) |
| POST | `/admin/restore/:id` | Mod | Restore archived post to pending |
| POST | `/admin/purge/:id` | Mod | Permanently delete from archive |
| POST | `/admin/notes` | Mod | Publish board note |
| POST | `/admin/modnote/:id` | Mod | Save internal mod note |
| POST | `/admin/block/:submitterId` | Mod | Block a submitter |
| POST | `/admin/unblock/:submitterId` | Mod | Unblock a submitter |
| GET | `/super` | Super Admin | Redirects to /admin?tab=moderators |
| POST | `/super/mods/create` | Super Admin | Create mod |
| POST | `/super/mods/:id/toggle` | Super Admin | Enable/disable mod |
| POST | `/super/mods/:id/delete` | Super Admin | Delete mod |
| POST | `/super/mods/:id/rewrite-settings` | Super Admin | Update mod rewrite limits |
| POST | `/super/settings/llm` | Super Admin | Save LLM model config (+ custom models) |
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
| latitude | Float? | Map pin latitude coordinate (-90 to 90) |
| longitude | Float? | Map pin longitude coordinate (-180 to 180) |
| locationName | VarChar(200)? | Resolved address from reverse geocoding |
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
| rewriteCount | Int | Number of in-editor AI rewrites (for rate limiting) |
| submitterId | Int? | FK → Submitter. Anonymous submitter tracking (admin-only) |

### Submitter
| Column | Type | Notes |
|--------|------|-------|
| id | Int (autoincrement) | Sequential user number (User #1, #2, etc.) |
| hash | VarChar(64) | SHA-256 hash of IP + salt. One-way, irreversible. |
| blocked | Boolean | Whether submitter is blocked |
| blockAction | VarChar(10)? | "REJECT" (silent auto-reject) or "FLAG" (auto-flag in queue) |
| blockedAt | DateTime? | When the block was applied |
| blockedBy | VarChar(50)? | Username of mod who blocked |
| blockReason | VarChar(200)? | Optional reason for blocking |
| createdAt | DateTime | Auto-set |

### Mod
| Column | Type | Notes |
|--------|------|-------|
| id | String (cuid) | Primary key |
| username | VarChar(50) | Unique, lowercase |
| passHash | VarChar(64) | SHA-256 hash |
| active | Boolean | Can be disabled |
| rewriteEnabled | Boolean | Can this mod use in-editor AI rewrite? |
| rewriteLimitPerPost | Int | Max in-editor rewrites per post (default 10) |
| rewriteLimitPerHour | Int | Max in-editor rewrites per hour (default 5) |
| createdAt | DateTime | Auto-set |

### RewriteLog
| Column | Type | Notes |
|--------|------|-------|
| id | String (cuid) | Primary key |
| postId | String | FK → Post |
| modId | String | FK → Mod |
| createdAt | DateTime | Auto-set |

### SiteSettings (singleton)
| Column | Type | Notes |
|--------|------|-------|
| id | String | Always "default" |
| boardName | String | Displayed on board |
| boardTagline | String | Subtitle |
| analysisModel | String | OpenRouter model ID for analysis |
| rewriteModel | String | OpenRouter model ID for rewrite |
| customAnalysisModel | VarChar(100)? | Custom model override (any OpenRouter model) |
| customRewriteModel | VarChar(100)? | Custom model override (any OpenRouter model) |
| rewritePrompt | Text? | Custom prompt for in-editor AI rewrite |
| aboutText | Text? | About section content |
| updatedAt | DateTime | Auto-updated |

### AuditLog
| Column | Type | Notes |
|--------|------|-------|
| id | String (cuid) | Primary key |
| action | VarChar(50) | Action type (approve, reject, block, etc.) |
| postId | String? | Related post ID (if applicable) |
| targetId | String? | Target entity ID (submitter/mod for block/admin actions) |
| modUser | VarChar(50) | Username of mod who performed action |
| details | Text? | Human-readable description |
| createdAt | DateTime | Auto-set |

---

## Privacy Model

| Concern | Approach |
|---------|----------|
| User identity | None collected — fully anonymous |
| IP addresses | Used only for in-memory rate limiting; never stored as raw IPs |
| Submitter tracking | Optional. When `AUTHOR_HASH_SALT` is set, a one-way SHA-256 hash of IP+salt is stored and mapped to a sequential user number. Raw IPs are never persisted. Only visible to admins. Disabled if salt is empty. |
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
| `AUTHOR_HASH_SALT` | No | — | Secret salt for anonymous submitter tracking. When set, submitters get sequential user numbers visible to admins. |

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
