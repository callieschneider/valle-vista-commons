# Changelog

All notable changes to Valle Vista Commons will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
