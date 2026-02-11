# Valle Vista Commons

Privacy-first anonymous neighborhood bulletin board. No accounts, no tracking, no personal information.

Neighbors can post about suspicious vehicles, people, or general neighborhood alerts. All posts are reviewed by moderators before going live. Posts auto-expire after 14 days.

---

## Quick Start (Local)

```bash
# Clone
git clone https://github.com/callieschneider/valle-vista-commons.git
cd valle-vista-commons

# Install
npm install

# Set up environment
cp .env.example .env
# Edit .env with your DATABASE_URL (needs a Postgres instance)

# Run migrations
npm run migrate:dev

# Start
npm run dev
```

Open http://localhost:3000

Admin dashboard: http://localhost:3000/admin (default password: `admin`)

---

## Deploy to Railway

### 1. Create Project
- Go to [railway.app](https://railway.app) and create a new project
- Connect the GitHub repo: `callieschneider/valle-vista-commons`

### 2. Add Postgres
- In your Railway project, click **+ New** → **Database** → **PostgreSQL**
- Railway automatically sets `DATABASE_URL` for your service

### 3. Set Environment Variables
In your Railway service settings, add:

| Variable | Value |
|----------|-------|
| `ADMIN_PASS` | A strong password for the admin dashboard |
| `HCAPTCHA_SITEKEY` | Your hCaptcha site key ([get one free](https://dashboard.hcaptcha.com)) |
| `HCAPTCHA_SECRET` | Your hCaptcha secret key |
| `NODE_ENV` | `production` |

> `DATABASE_URL` and `PORT` are provided by Railway automatically.

### 4. Deploy
Push to `main` — Railway auto-deploys. The Procfile runs migrations and starts the server.

That's it. One push deploys everything.

---

## Features

- **Anonymous posting** — No accounts, no emails, no tracking
- **Moderated feed** — All posts reviewed before going live
- **14-day auto-expiry** — Old posts automatically drop off
- **Tag filtering** — Vehicle / Person / Other categories
- **Search** — Full-text search across titles, descriptions, locations
- **hCaptcha** — Spam protection on the submit form
- **Rate limiting** — 5 submissions per minute per IP (in-memory, not logged)
- **Mobile-first** — Designed for phones, works everywhere

## Security

- Helmet (CSP, HSTS, X-Frame-Options, etc.)
- XSS sanitization on all inputs
- HTTPS redirect in production
- No PII collection or storage
- No sessions or cookies
- Rate limiting on all routes
- No stack traces in error responses
- `noindex` meta on all pages

---

## Tech Stack

Express 4 · PostgreSQL · Prisma · EJS · Bootstrap 5 · Helmet · hCaptcha

---

## License

Private project.
