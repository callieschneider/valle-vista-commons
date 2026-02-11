# Valle Vista Commons

Privacy-first moderated community bulletin board. No accounts, no tracking, no personal information.

A sectioned neighborhood board with AI-powered tip analysis, mod editorial tools, and a super admin control panel. All tips are reviewed by moderators before going live.

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
# Set SUPER_ADMIN_PASS for the super admin panel

# Run migrations + seed
npm run migrate:dev
npm run seed

# Start
npm run dev
```

Open http://localhost:3000

- **Board:** http://localhost:3000
- **Submit a tip:** http://localhost:3000/submit
- **Admin dashboard:** http://localhost:3000/admin (mod credentials required)
- **Super admin:** http://localhost:3000/super (super admin credentials required)

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
| `SUPER_ADMIN_PASS` | A strong password for the super admin panel |
| `SUPER_ADMIN_USER` | Super admin username (optional, defaults to "super") |
| `OPENROUTER_API_KEY` | OpenRouter API key for AI features (optional) |
| `HCAPTCHA_SITEKEY` | hCaptcha site key ([get one free](https://dashboard.hcaptcha.com)) |
| `HCAPTCHA_SECRET` | hCaptcha secret key |
| `NODE_ENV` | `production` |

> `DATABASE_URL` and `PORT` are provided by Railway automatically.

### 4. Deploy
Push to `main` — Railway auto-deploys. The Procfile runs migrations, seeds, and starts the server.

### 5. Set Up Mods
1. Go to `/super` in your browser
2. Enter your super admin credentials
3. Create moderator accounts
4. Mods can now access `/admin` with their credentials

---

## Features

### Public Board
- **Sectioned layout** — Alerts, Happenings, Lost & Found, Neighbors, Board Notes
- **Anonymous submissions** — No accounts, no emails, no tracking
- **Moderated content** — All tips reviewed before going live
- **Auto-expiry** — Alerts: 7 days, other sections: 14 days
- **Client-side search** — Filter posts across all sections instantly
- **Mobile-first** — Designed for phones, works everywhere

### Admin Dashboard (Mods)
- **Review queue** — AI-analyzed pending tips with urgency, PII detection, and recommendations
- **Editorial tools** — Edit, rewrite with AI, reassign sections, pin, mark urgent, expire
- **Board Notes** — Mod-authored posts that go live immediately
- **Mod notes** — Internal notes on posts (not visible to public)

### Super Admin Panel
- **Mod management** — Create, disable, enable, delete moderator accounts
- **LLM configuration** — Choose AI models for analysis and rewrite (8 curated options)
- **LLM connection test** — Verify OpenRouter is working
- **Site settings** — Board name, tagline, about text

### AI Features (OpenRouter)
- **Auto-analysis** — Tips analyzed in background: urgency, PII, section suggestion, sentiment, recommendation
- **One-click rewrite** — Apply AI's suggested rewrite
- **Custom rewrite** — Give AI instructions and get a tailored rewrite
- **Graceful degradation** — All AI features disabled if no API key is set

## Security

- Helmet (CSP, HSTS, X-Frame-Options, etc.)
- XSS sanitization on all inputs
- HTTPS redirect in production
- No PII collection or storage
- No sessions or cookies
- Honeypot + hCaptcha spam protection
- Rate limiting on all routes
- No stack traces in error responses
- `noindex` meta on all pages
- Two-tier auth: super admin (env vars) + mods (DB)

---

## Tech Stack

Express 4 · PostgreSQL · Prisma · EJS · Bootstrap 5 · Helmet · hCaptcha · OpenRouter

No new dependencies for AI features — uses built-in `fetch()` and `crypto`.

---

## License

Private project.
