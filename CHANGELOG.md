# Changelog

All notable changes to Valle Vista Commons will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## 2026-02-11 - Submit Form Validation UX

### Summary
Improved submit form with required field indicators and inline validation. Users now see clear `*` markers on required fields and get a specific error banner below the submit button when fields are missing, instead of a browser alert dialog.

### Added
- **Required field indicators** — Title, Description, and Category labels now show red `*`
- **Inline validation banner** — appears below submit button listing exactly which fields are missing
- **Field-level error highlighting** — missing fields get red border/outline
- **Shake animation** on validation banner for attention
- **Auto-clear errors** — field error state clears as user interacts with the field

### Changed
- Replaced `alert('Please add a description.')` with comprehensive client-side validation
- Removed native `required` attributes to let custom validation handle everything consistently

### Files Changed
- `views/submit.ejs` — added `*` spans, validation banner div, removed native `required`
- `public/js/submit-init.js` — full validation logic replacing `alert()`
- `public/css/style.css` — `.required-star`, `.validation-banner`, `.field-error`, shake keyframes

---

## 2026-02-12 - Interactive Map Picker (Updated)

### Summary
Added optional interactive map picker for posts using Leaflet + OpenStreetMap with Valle Vista Commons-specific bounds and geocoding. Submit form shows inline compact map (always visible) with discreet pin button for address lookup. Board mini-maps are clickable thumbnails that expand to interactive modal. Feather Icons (inline SVG) established as the standard icon system.

### Added
- **Inline map on submit form** — 280px height compact map (always visible, no toggle)
- **Pin button with geocoding** — discreet Feather icon button (map pin) to left of location field
- **Forward geocoding** — type address, click pin button, map centers and drops pin automatically
- **Clickable mini-maps on board** — posts with coordinates show 180px thumbnail maps
- **Modal expansion** — clicking board mini-map opens full interactive modal with pan/zoom
- **Valle Vista bounds** — map restricted to area: center (45.487792, -122.445500), zoom 14-19
- **Admin map editor with pin button** — edit forms include same pin button + geocoding workflow
- **Wide container on submit** — submit page now uses `vvc-container--wide` matching admin width
- **Reverse geocoding** — coordinates automatically resolved to nearest address via Nominatim
- **Three new Post fields** — `latitude` (Float?), `longitude` (Float?), `locationName` (VarChar 200?)
- **Leaflet 1.9.4** — loaded via unpkg CDN, no npm dependency
- **OpenStreetMap tiles** — free map tiles from OSM, no API key required
- **Coordinate validation** — server validates lat (-90 to 90) and lng (-180 to 180)
- **Map utility module** (`public/js/map-picker.js`) — reusable ES module with `geocodeAndCenter()`
- **Three map scripts** — `submit-map.js`, `board-maps.js`, `admin-maps.js`
- **PATTERNS.md** — comprehensive documentation of code patterns, Feather Icons system, map integration

### Changed
- **CSP updated** — added `unpkg.com` (Leaflet), `tile.openstreetmap.org` (tiles), `nominatim.openstreetmap.org` (geocoding)
- **CSS** — added `.map-pin-btn`, `.submit-map-container`, `.map-modal`, modal styles
- **Submit route** — saves latitude, longitude, locationName fields
- **Admin edit route** — saves latitude, longitude, locationName fields with validation
- **PROJECT.md** — updated status to v1.3.0, added Feather Icons + forward geocoding to tech stack

### Privacy
- **No auto-geolocation** — users must manually drop a pin (no location permission requested)
- **Manual pin drop only** — respects existing privacy model (no tracking, no PII)
- **Optional feature** — users can skip the map entirely, text location field still works

### Database Migration
- `20260212035516_add_map_coordinates` — added `latitude`, `longitude`, `locationName` to Post model

### Icon System
- **Feather Icons (inline SVG)** — established as standard, documented in PATTERNS.md
- **Map pin icon** — `<svg viewBox="0 0 24 24">` with path for pin shape, used on submit + admin forms

---

## 2026-02-12 - Anonymous Submitter Tracking

### Summary
Added optional anonymous submitter tracking so admins can identify repeat posters without collecting any personal information. Each submitter gets a sequential user number (e.g. "User #14") derived from a one-way hash of their IP address. No raw IPs are ever stored.

### Added
- **Submitter model** — new DB table with auto-incrementing ID and SHA-256 hash column
- **Post → Submitter relation** — nullable FK on Post, populated at submission time
- **`resolveSubmitter()` helper** in `routes/public.js` — computes salted IP hash, finds or creates Submitter record
- **"User #N" badge** on admin dashboard — shown on pending, live, and archived posts (not on mod-authored Board Notes)
- **Post count per submitter** — badge shows "(7 posts)" when a submitter has multiple posts
- **`AUTHOR_HASH_SALT` env var** — secret salt for hashing. Feature is disabled when not set.
- **Race condition handling** — `P2002` unique constraint catch in case two concurrent requests create the same Submitter

### Changed
- Admin dashboard queries now `include: { submitter: { select: { id: true } } }` for all post lists
- Admin dashboard receives `submitterCounts` map for post count display
- CSS: added `.badge-submitter` styles

### Privacy
- **No raw IPs are stored** — only a one-way SHA-256 hash
- **Hash is irreversible** — cannot be reversed to obtain the original IP
- **Salt is a secret env var** — not committed to repo
- **Admin-only** — user numbers are never shown on the public board
- **Gracefully disabled** — if `AUTHOR_HASH_SALT` is not set, no hashing occurs and no submitter data is stored

### Database Migration
- `20260212035502_add_submitter_tracking`: Added `submitters` table, `submitter_id` FK on `posts`

### Environment Variables
- `AUTHOR_HASH_SALT` (optional) — random secret string for IP hashing

### Files Changed
- `prisma/schema.prisma` — Submitter model, Post relation
- `routes/public.js` — crypto import, `resolveSubmitter()`, wired into POST /submit
- `routes/admin.js` — include submitter in queries, compute submitterCounts
- `views/admin.ejs` — User #N badge in pending, live, and archive sections
- `public/css/style.css` — `.badge-submitter` styles
- `.env.example` — AUTHOR_HASH_SALT placeholder
- `PROJECT.md` — schema docs, privacy model, env vars

---

## 2026-02-12 - Design System v2: Themes, Dark Mode, Modern UI

### Summary
Complete visual redesign. Replaced inline Bootstrap-only styling with a custom CSS design system featuring 5 color schemes, dark/light mode, Inter font, and modern Framer-style UI.

### Added
- **Custom CSS design system** (`public/css/style.css`) — 700+ lines of hand-written CSS replacing inline styles
- **5 color schemes**: Forest Green (default), Terracotta, Slate Blue, Sage, Indigo
- **Dark mode** + light mode with smooth transitions — respects OS `prefers-color-scheme` on first visit
- **Theme controller** (`public/js/theme.js`) — saves preferences to localStorage (no cookies, privacy-first)
- **Dark/light toggle** on all pages (pill-style sun/moon switcher)
- **Scheme picker** (colored dots) on board and admin pages
- **Inter font** via Google Fonts CDN — clean, modern typography
- **Staggered fade-in animations** on board post cards
- **SVG search icon** in search bar
- **SVG plus icon** on FAB (replaces raw "+" text)
- **Category grid** on submit page (2×2 visual cards replace `<select>` dropdown)
- **Success state card** with checkmark icon on submit confirmation
- **Privacy lock icon** on submit page footer note

### Changed
- All 5 EJS views completely rewritten with new markup and CSS classes
- Board: section headers now use dot + uppercase label + hairline (was colored background bars)
- Board: post cards show accent bar on hover only (was always-visible left border)
- Submit: category picker is now a visual 2×2 grid (was dropdown)
- Submit: page title changed to "Share with the neighborhood"
- Admin/Super: all forms, buttons, badges, panels restyled with design system tokens
- Error page: consistent styling with design system
- CSP updated in `server.js` for Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`)
- Bootstrap kept on admin/super pages (for collapse functionality) but layered under custom CSS

### Removed
- All inline `<style>` blocks from EJS templates (styles now in shared CSS file)
- Mockup HTML files (development artifacts)

### New Files
- `public/css/style.css` — shared design system
- `public/js/theme.js` — theme/scheme controller

### Files Changed
- `views/board.ejs`, `views/submit.ejs`, `views/admin.ejs`, `views/super.ejs`, `views/error.ejs` — complete rewrites
- `server.js` — CSP update for font CDN

---

## 2026-02-12 - AI Rewrite, Undo History, Universal Archive

### Added
- **Quick AI Rewrite button** on every pending and live post (always visible when API key is configured, no prior analysis needed)
- **Undo system** with 10-level history — every edit and rewrite saves the previous version; undo button shows remaining count
- **DELETED status** — posts are never hard-deleted; delete button soft-deletes to archive
- **Universal archive** — houses all rejected, deleted, and expired posts with status badges (REJECTED, DELETED, EXPIRED)
- Archive is **collapsed by default** with click-to-expand header
- `descHistory` JSON field on Post model for undo stack

### Changed
- Delete action now soft-deletes (sets status to DELETED) instead of permanently removing posts
- Archive section renamed from "Archive (Rejected)" to "Archive" and includes all non-live/non-pending posts
- Rewrite route now supports `action=quick` (no custom instructions, just clean up)
- Purge button renamed from "Delete" to "Purge" for clarity in archive
- Reject confirmation text updated to reflect archive behavior

### Fixed
- `.env` duplicate `OPENROUTER_API_KEY` causing "no API key configured" warning

### Database Migrations
- `20260212031445_undo_history_and_deleted_status`: Added `descHistory` JSON field, `DELETED` enum value to Status

---

## 2026-02-11 - Rejected Post Archive, Resizable Images, UX Fixes

### Added
- **REJECTED status** — rejected posts move to archive instead of being deleted
- **Archive section** in admin dashboard with restore (back to pending) and permanent delete
- **Resizable images** in Tiptap editor via `tiptap-extension-resize-image` — drag corners to resize
- **Inline images** — resized photos can sit side by side
- **Discard button** on all admin edit forms
- **Super admin file sync endpoint** (`POST /super/sync-upload`) for migrating uploads to Railway volume

### Fixed
- Board search CSP violation — moved inline script to external `public/js/board-search.js`

### Changed
- Reject action: `delete` → `update { status: REJECTED }`
- Images set to `display: inline-block` for side-by-side layout
- `reject` confirmation text updated (no longer says "delete")

### Schema
- Added `REJECTED` to `Status` enum (migration: `add_rejected_status`)

---

## 2026-02-11 - Rich Text Editor & Media Uploads

### Added
- **Tiptap rich text editor** on submit form, admin edit forms, and board notes composer
  - Bold, italic, links, image upload, video upload
  - Public submitters get simple mode (bold, italic, links, media)
  - Mods get full mode (+ headings, lists, blockquotes)
- **Image/video upload endpoint** (`POST /api/upload`)
  - Images: JPG, PNG, GIF, WebP — max 10MB, auto-resized to 1920px
  - Videos: MP4, WebM — max 50MB
  - EXIF/GPS metadata stripped from images for privacy (via `sharp`)
  - UUID filenames prevent collisions
- **HTML sanitization** via `sanitize-html`
  - Whitelisted tags: p, br, strong, em, u, s, h1-h3, ul, ol, li, blockquote, a, img, video
  - External images/videos blocked (only `/uploads/` paths allowed)
  - Links forced to `target="_blank" rel="noopener noreferrer"`
- Rich content rendering on public board with safe HTML output
- CSP updated for `esm.sh` (Tiptap CDN) and media serving
- AI analysis strips HTML before sending to LLM

### Changed
- `desc` field: `VarChar(500)` → `Text` (Prisma migration)
- Submit form: textarea replaced with Tiptap editor
- Admin edit forms: textarea replaced with Tiptap editor
- Board notes composer: textarea replaced with Tiptap editor
- Board view: post descriptions render as rich HTML

### Dependencies Added
- `multer` ^2.0.2 — multipart file upload handling
- `sanitize-html` ^2.17.0 — HTML sanitization
- `sharp` ^0.34.5 — image processing, EXIF stripping

### New Files
- `lib/upload.js` — multer config, file processing, EXIF stripping
- `lib/sanitize.js` — HTML sanitization and plain text extraction
- `public/js/editor.js` — Tiptap editor module (ESM, loaded from esm.sh CDN)
- `public/js/submit-init.js` — submit page editor initialization
- `public/js/admin-init.js` — admin page editor initialization

### Environment Variables
- `UPLOAD_DIR` — upload directory path (Railway volume at `/uploads/`, or `./uploads` locally)

---

## 2026-02-11 - Favicon

### Added
- SVG favicon: two overlapping V's (VV) on a rounded green (`#2d6a4f`) square. Back V in lighter green, front V in white.
- `<link rel="icon">` added to all 5 EJS views (board, submit, admin, super, error).

### Files Changed
- `public/favicon.svg`: New
- `views/board.ejs`, `views/submit.ejs`, `views/admin.ejs`, `views/super.ejs`, `views/error.ejs`: Added favicon link tag

---

## 2026-02-11 - Board Expansion v1.0.0

### Summary
Major expansion: flat feed transformed into sectioned community board with AI-powered tip analysis, mod editorial tools, two-tier authentication, and super admin control panel.

### Added
- **Sectioned board**: Alerts, Happenings, Lost & Found, Neighbors, Board Notes — each with accent colors, icons, and section-aware auto-expiry (7d alerts, 14d others)
- **Two-tier auth**: Super admin (env vars) manages mods via `/super`; mods (DB) manage content via `/admin`
- **Mod model**: DB-managed mod accounts with username/password, enable/disable, CRUD via super admin
- **SiteSettings model**: Board name, tagline, about text, LLM model selections — all editable via super admin
- **AI analysis**: OpenRouter-powered auto-analysis of submitted tips (background, fire-and-forget). Shows urgency, PII detection, suggested section, recommendation, sentiment, and rewrite suggestion
- **AI rewrite**: One-click apply of AI suggestion, or custom rewrite with mod instructions
- **Admin overhaul**: Review queue with AI panel, section reassignment on approve, edit forms, pin/unpin, mark urgent, expire now, delete, board notes composer, mod notes
- **Super admin panel**: Mod CRUD, LLM model config (8 curated models), LLM connection test, site settings editor
- **Client-side search**: Search bar filters all posts across sections without server round-trip
- **Board Notes composer**: Mods can publish notes directly (skip review queue)

### Changed
- `server.js` slimmed to entry point only — routes moved to `routes/public.js`, `routes/admin.js`, `routes/super.js`
- Shared logic moved to `lib/db.js`, `lib/auth.js`, `lib/openrouter.js`, `lib/ai.js`
- Post model: `tag` field replaced by `section` enum; added `pinned`, `urgent`, `modNote`, `modPost`, `eventDate`, `expiresAt`, `editedAt`, `aiAnalysis` fields; `location` now optional
- Submit form: "Submit a Tip" messaging, section picker replaces tags, location optional
- Auth: `ADMIN_USER`/`ADMIN_PASS` replaced by DB-managed mods + `SUPER_ADMIN_USER`/`SUPER_ADMIN_PASS`
- Procfile: now runs seed script on every deploy (idempotent upsert)

### Removed
- `views/index.ejs` (replaced by `views/board.ejs`)
- `Tag` enum (replaced by `Section` enum)
- `ADMIN_USER`/`ADMIN_PASS` env vars (replaced by super admin + DB mods)

### Files Changed
- `server.js`: Complete rewrite (entry point only)
- `prisma/schema.prisma`: Post modified, Mod and SiteSettings added, Section enum replaces Tag
- `prisma/seed.js`: New — seeds SiteSettings default row
- `prisma/migrations/board_expansion/`: New migration
- `routes/public.js`, `routes/admin.js`, `routes/super.js`: New route modules
- `lib/db.js`, `lib/auth.js`, `lib/openrouter.js`, `lib/ai.js`: New lib modules
- `views/board.ejs`: New — sectioned public board
- `views/submit.ejs`: Updated — section picker, new messaging
- `views/admin.ejs`: Complete overhaul
- `views/super.ejs`: New — super admin panel
- `Procfile`, `.env`, `.env.example`, `package.json`, `PROJECT.md`: Updated

### Database Migration
- Single migration `board_expansion` — drops Tag enum, adds Section enum, Mod table, SiteSettings table, new Post fields
- Clean slate migration (no data to preserve)

### Dependencies
- No new production dependencies (still 7)
- OpenRouter uses built-in `fetch()`, password hashing uses built-in `crypto`

---

## 2026-02-11 - Spec Enhancements (7 improvements from prompt review)

### Summary
Incorporated best ideas from a second spec review: new tags, honeypot anti-spam, tighter admin auth, better timestamps, DB hygiene, wider location field, and optimized health check routing.

### Changes
1. **Added Animal + Event tags** — Prisma enum expanded, new migration applied. Submit form dropdown, feed filter buttons, and admin dashboard all updated with color-coded badges (Animal: orange, Event: purple).
2. **Honeypot anti-spam field** — Hidden `website` input on submit form. Bots that fill it get a fake success response; post is silently discarded. Layered on top of existing hCaptcha + rate limiting.
3. **ADMIN_USER env var** — Basic auth now checks both username and password (was password-only). Defaults to `admin` if not set.
4. **Relative timestamps** — Feed shows "just now", "2h ago", "3d ago", "yesterday" instead of formatted dates.
5. **Auto-expire UPDATE** — Feed route runs `UPDATE posts SET status='EXPIRED'` for posts older than 14 days before fetching. Keeps DB clean instead of just filtering at query time.
6. **Location field widened** — VarChar(50) → VarChar(100). Form maxlength updated to match.
7. **Health check before middleware** — `/health` now mounts before helmet/cors/rate-limit so Railway health probes aren't affected by middleware.

### Files Changed
- `server.js`: All 7 changes (honeypot check, ADMIN_USER, timeAgo helper, auto-expire query, VALID_TAGS constant, health route moved)
- `prisma/schema.prisma`: Tag enum + location width
- `prisma/migrations/..._add_animal_event_tags_widen_location/`: New migration
- `views/index.ejs`: New tag filters + colors, relative timestamps
- `views/submit.ejs`: Honeypot field, new tag options, location maxlength=100
- `views/admin.ejs`: New tag colors
- `.env` / `.env.example`: Added ADMIN_USER

### Breaking Changes
- None (additive only)

### Testing
- All routes return correct HTTP codes
- Honeypot silently discards bot submissions
- Wrong admin username returns 401
- ANIMAL tag filter works on feed
- Relative timestamps render correctly
- Auto-expire query runs on feed load

---

## 2026-02-11 - Initial Build

### Summary
Full app scaffold: Express server, Prisma schema, EJS views, Railway deployment. Privacy-first anonymous bulletin board with moderated posting.

### Features
- **Public feed** (`/`): Browse approved posts with tag filtering (Vehicle/Person/Other) and search. Posts auto-expire after 14 days. Mobile-first Bootstrap UI.
- **Anonymous submissions** (`/submit`): Title, description (500 chars), approximate location, category tag. hCaptcha integration (optional, skips if keys not set). Rate-limited to 5 submissions/min/IP.
- **Admin dashboard** (`/admin`): HTTP Basic Auth (single password from `ADMIN_PASS` env). Pending posts queue with approve/reject. Delete any live post.
- **Security**: Helmet (CSP, HSTS, etc.), CORS, xss-filters on all inputs, HTTPS redirect in production, no stack traces in errors, `noindex` meta.
- **Privacy**: Zero PII collected. No sessions, cookies, or tracking. IP addresses used only for in-memory rate limiting, never persisted.

### Files
- `server.js`: Complete Express app — routes, middleware, auth, rate limiting, hCaptcha verification
- `prisma/schema.prisma`: Post model with Tag/Status enums
- `prisma/migrations/20260211213347_init/`: Initial migration
- `views/index.ejs`: Public feed with search + tag filters
- `views/submit.ejs`: Anonymous submission form with hCaptcha + char counter
- `views/admin.ejs`: Admin dashboard — pending queue + live post management
- `views/error.ejs`: Generic error page
- `Procfile`: Railway deployment (migrate + start)
- `package.json`: 7 production deps, 2 dev deps

### Database Schema
```
Post {
  id         String   @id @default(cuid())
  title      String   @db.VarChar(100)
  desc       String   @db.VarChar(500)
  location   String   @db.VarChar(50)
  tag        Tag      (VEHICLE | PERSON | OTHER)
  status     Status   (PENDING | LIVE | EXPIRED)
  createdAt  DateTime
  approvedAt DateTime?
}
```

### Deployment
- Platform: Railway (Postgres add-on)
- Auto-deploy from GitHub `main` branch
- Procfile runs migrations on every deploy
- Env vars: `DATABASE_URL` (auto), `ADMIN_PASS`, `HCAPTCHA_SITEKEY`, `HCAPTCHA_SECRET`

### Dependencies (9 total)
- Production: @prisma/client, cors, ejs, express, helmet, rate-limiter-flexible, xss-filters
- Dev: nodemon, prisma
