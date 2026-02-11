# Valle Vista Commons

**Privacy-first anonymous neighborhood bulletin board.**

No accounts. No tracking. No personal information collected. Ever.

---

## Status: v0.2.0 — Enhanced

| Feature | Status |
|---------|--------|
| Public feed with search + filters | ✅ |
| Anonymous post submission | ✅ |
| hCaptcha spam protection (optional) | ✅ |
| Honeypot anti-spam | ✅ |
| Admin moderation dashboard | ✅ |
| Rate limiting | ✅ |
| 5 tag categories (Vehicle/Person/Animal/Event/Other) | ✅ |
| Relative timestamps | ✅ |
| Auto-expire old posts (DB cleanup) | ✅ |
| Railway deployment | ✅ |

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
| Security | Helmet, xss-filters, rate-limiter-flexible |
| Captcha | hCaptcha (free tier) |
| Hosting | Railway |

---

## Architecture

Single-file Express server (`server.js`) with EJS server-side rendering. No build step. No frontend framework. No bundler.

```
Request → Express middleware (helmet, cors, rate-limit) → Route handler → Prisma query → EJS render → Response
```

### Routes

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/` | Public | Feed — browse approved posts |
| GET | `/submit` | Public | Submission form |
| POST | `/submit` | Public + hCaptcha | Create pending post |
| GET | `/admin` | Basic Auth | Admin dashboard |
| POST | `/admin/approve/:id` | Basic Auth | Approve a pending post |
| POST | `/admin/reject/:id` | Basic Auth | Reject (delete) a pending post |
| POST | `/admin/delete/:id` | Basic Auth | Delete any post |
| GET | `/health` | Public | Health check endpoint |

---

## Database Schema

### Post
| Column | Type | Notes |
|--------|------|-------|
| id | String (cuid) | Primary key |
| title | VarChar(100) | Required |
| desc | VarChar(500) | Required |
| location | VarChar(100) | Approximate location, intentionally vague |
| tag | Enum: VEHICLE, PERSON, ANIMAL, EVENT, OTHER | Filterable category |
| status | Enum: PENDING, LIVE, EXPIRED | Moderation state |
| createdAt | DateTime | Auto-set |
| approvedAt | DateTime? | Set when admin approves |

---

## Privacy Model

| Concern | Approach |
|---------|----------|
| User identity | None collected — fully anonymous |
| IP addresses | Used only for in-memory rate limiting; never stored to disk or DB |
| Cookies/Sessions | None. Stateless app. |
| Tracking | No analytics, no scripts, no pixels |
| Post content | Sanitized with xss-filters before storage |
| Location data | User-entered approximate text only (e.g., "Elm St"), not GPS |

---

## Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `DATABASE_URL` | Yes | — | Postgres connection (Railway auto-provides) |
| `ADMIN_USER` | No | `admin` | Admin dashboard username |
| `ADMIN_PASS` | Yes | `admin` | Admin dashboard password |
| `HCAPTCHA_SITEKEY` | No | — | hCaptcha public key |
| `HCAPTCHA_SECRET` | No | — | hCaptcha secret key |
| `PORT` | No | `3000` | Server port (Railway auto-provides) |
| `NODE_ENV` | No | — | Set to `production` in Railway |

---

## Development

```bash
# Install
npm install

# Create/apply migrations (requires DATABASE_URL)
npm run migrate:dev

# Start dev server (with auto-reload)
npm run dev

# Open Prisma Studio (DB browser)
npm run studio
```

---

## Deployment (Railway)

1. Push to `main` branch → Railway auto-deploys
2. Procfile runs `prisma migrate deploy` then `node server.js`
3. Railway provides `DATABASE_URL` and `PORT` automatically
4. Set `ADMIN_PASS` in Railway environment variables
5. Optionally set `HCAPTCHA_SITEKEY` and `HCAPTCHA_SECRET`
