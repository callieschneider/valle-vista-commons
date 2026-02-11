# Agent Guidelines for Valle Vista Commons

> **This file provides essential guidance for AI agents working on this project.**
> Read this before making any code changes.

---

## 📂 Project Structure

**Git Repository:** This directory is a git repo.

- **Local path:** `/Users/schcw/Documents/Vibes/Valle Vista Commons/`
- **Remote origin:** `https://github.com/callieschneider/valle-vista-commons.git`
- **Default branch:** `main`

```
/Users/schcw/Documents/Vibes/Valle Vista Commons/
├── server.js            ← Express app (all routes + middleware)
├── prisma/
│   ├── schema.prisma    ← Database schema
│   └── migrations/      ← Migration history
├── views/               ← EJS templates
│   ├── index.ejs        ← Public feed
│   ├── submit.ejs       ← Anonymous submit form
│   ├── admin.ejs        ← Admin dashboard
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

---

## 🚨 MANDATORY: Initial Assessment Before ANY Code Changes

Before making ANY code changes, you MUST:

1. **Read** `PROJECT.md` (project overview, tech stack, status)
2. **Read** `server.js` (single-file backend — it's everything)
3. **Read** `prisma/schema.prisma` (database schema)
4. **Check** `CHANGELOG.md` for recent changes

Then respond with:

```
📋 INITIAL ASSESSMENT
Task: [your interpretation]
Files reviewed: [list]
Concerns: [any issues, or "None"]
Questions: [clarifications needed, or "None - ready to proceed"]
Scope: [small/medium/large]
```

**Wait for confirmation** if you have concerns or questions.

---

## ⚠️ When to Stop and Ask

Ask the user before proceeding when:
- Requirements could be interpreted multiple ways
- Change affects database schema or admin auth
- Change could impact privacy guarantees (no PII, no IP logging, no tracking)
- A simpler approach exists

Format:
```
⚠️ CLARIFICATION NEEDED
[observation]
Questions: [numbered list]
Impact: [why this matters]
```

---

## 🚨 Architecture Red Flags — Alert Immediately

If you find any of these, **STOP and alert**:

| Red Flag | Why It's Dangerous |
|----------|-------------------|
| **Collecting PII** (emails, names, IPs in DB) | Core privacy promise — NEVER collect personal info |
| **Logging IP addresses** | Rate limiting uses IPs in-memory only, never persisted |
| **Adding sessions/cookies** | App is stateless by design — no tracking |
| **Bypassing admin auth** | `/admin` routes must always check `requireAdmin` |
| **Direct DB manipulation without sanitization** | All inputs go through `xss-filters` |
| **Storing user-submitted HTML** | XSS vector — always sanitize |
| **`prisma db push --force-reset`** | Deletes entire database |
| **Hardcoded secrets** | Use environment variables |

Format:
```
🚨 ARCHITECTURE CONCERN
Issue: [description]
Location: [file]
Impact: [risk]
Recommendation: [fix]
```

---

## 🔒 Critical Rules (Never Violate)

### 1. Privacy First
**No PII is collected, stored, or logged. Period.**
- No email addresses, names, or accounts
- IP addresses used only for in-memory rate limiting, never persisted
- No cookies, sessions, or tracking scripts
- No analytics (Google Analytics, etc.)

### 2. All Posts Are Moderated
**Every submission goes to `PENDING` status.** Posts only appear on the public feed after an admin approves them. There is no auto-approve path.

### 3. Input Sanitization
**All user input must pass through `xss-filters` before storage.** Use the `sanitize()` helper in `server.js`. Enforce length limits on all fields.

### 4. Admin Auth
**All `/admin` routes must use `requireAdmin` middleware.** The admin password comes from `ADMIN_PASS` env var. HTTP Basic Auth — no sessions needed.

---

## 📋 Required Workflow

### Before Starting Work
1. Read `PROJECT.md`
2. Read `server.js` and relevant views
3. Read `CHANGELOG.md` for recent changes
4. Provide Initial Assessment

### During Work
- Keep it simple — this is a single-file Express app
- All routes live in `server.js`
- Views are EJS templates in `views/`
- Sanitize all inputs
- Test locally before pushing

### After Completing Work (REQUIRED)
1. **Update `CHANGELOG.md`** with what changed
2. **Update `PROJECT.md`** if features or schema changed
3. **Test locally** — `npm run dev` and verify the change works
4. **Verify the build** — the app must start without errors

### Change Log Entry Format
```markdown
## YYYY-MM-DD - [Context/Task Description]

### Summary
Brief description of what was done.

### Files Changed
- `path/to/file`: What changed

### Breaking Changes
- None (or list them)

### Testing
- What was tested
```

---

## 🎯 Key Patterns

### Adding a New Route
1. Add route handler in `server.js`
2. Create/update EJS template in `views/`
3. If admin-only, apply `requireAdmin` middleware
4. Sanitize all inputs with `sanitize()` helper

### Modifying the Database
1. Edit `prisma/schema.prisma`
2. Run `npm run migrate:dev -- --name description_of_change`
3. Run `npx prisma generate`
4. Update `PROJECT.md` with schema changes

### Environment Variables
| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | Postgres connection string (Railway provides) |
| `ADMIN_PASS` | Yes | Password for `/admin` HTTP Basic Auth |
| `HCAPTCHA_SITEKEY` | No | hCaptcha site key (skip captcha if empty) |
| `HCAPTCHA_SECRET` | No | hCaptcha secret key |
| `PORT` | No | Server port (default: 3000, Railway provides) |
| `NODE_ENV` | No | Set to `production` in Railway |

### Deployment
- **Platform:** Railway
- **Repo:** GitHub → Railway auto-deploys on push to `main`
- **Procfile:** `web: npx prisma migrate deploy && node server.js`
- Migrations run automatically on every deploy

---

## 🚫 Never Do These

- ❌ Collect personal information (emails, names, phone numbers)
- ❌ Log IP addresses to disk or database
- ❌ Add sessions, cookies, or tracking
- ❌ Bypass admin auth on `/admin` routes
- ❌ Store unsanitized user input
- ❌ Hardcode secrets
- ❌ Add dependencies without asking
- ❌ Skip `CHANGELOG.md` updates
- ❌ Run `prisma db push --force-reset` (deletes everything)
- ❌ Claim something works without testing

---

## ✅ Verification Checklist

Before finishing work:
- [ ] App starts cleanly (`npm run dev`)
- [ ] Changed routes work as expected
- [ ] No console errors
- [ ] `CHANGELOG.md` updated
- [ ] `PROJECT.md` updated if schema/features changed
- [ ] No secrets in code
- [ ] All inputs sanitized

**Never claim something works unless you ran the check.**

---

## 📚 Documentation

| Document | Purpose | When to Read |
|----------|---------|--------------|
| `PROJECT.md` | Project overview, tech stack, status | **Always read first** |
| `AGENTS.md` | Agent guidelines (this file) | Before any code changes |
| `CHANGELOG.md` | Version history | Check recent changes |
| `PLANNING.md` | Planning protocol for larger features | Before creating any plan |
| `README.md` | Setup & deploy instructions | Reference |

---

**Remember**: When in doubt, **ASK**. Don't assume. The user prefers explicit questions over incorrect implementations.
