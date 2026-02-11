# Changelog

All notable changes to Valle Vista Commons will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
