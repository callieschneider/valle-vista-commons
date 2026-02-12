# Valle Vista Commons — Code Patterns & Conventions

> **This document captures recurring patterns, conventions, and design decisions used throughout the codebase.**

Last updated: 2026-02-12

---

## Icon System

### Standard: Feather Icons (Inline SVG)

The project uses **Feather Icons** style inline SVGs — simple, clean, stroke-based icons with consistent styling.

**Base structure:**
```html
<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
  <!-- icon paths here -->
</svg>
```

**Styling notes:**
- All icons use `viewBox="0 0 24 24"` for consistency
- `stroke-linecap="round"` and `stroke-linejoin="round"` for smooth edges
- CSS controls `width`, `height`, `stroke`, and `fill` via currentColor inheritance
- No hardcoded colors in SVG — respects theme colors

**Common icons in use:**

| Icon | Usage | SVG Path |
|------|-------|----------|
| **Arrow Left** | Back navigation | `<line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline>` |
| **Plus** | FAB (submit action) | `<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>` |
| **Check** | Success state | `<polyline points="20 6 9 17 4 12"></polyline>` |
| **Lock** | Privacy note | `<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>` |
| **More Vertical** | Theme menu trigger | `<circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>` |
| **Map Pin** | Location/geocode actions | `<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle>` |

**Usage example:**
```html
<button class="icon-btn" aria-label="Find location">
  <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
</button>
```

**Why inline SVG?**
- No external dependencies or icon fonts
- Theme-aware (inherits currentColor)
- Accessible (works without JS)
- Small bundle size (only icons we use)
- Easy to customize per instance

---

## Map Integration

### Leaflet + OpenStreetMap

**Library:** Leaflet 1.9.4 + leaflet-rotate 0.2.8 (CDN: unpkg.com)  
**Tiles:** OpenStreetMap (free, no API key)  
**Geocoding:** Nominatim (reverse and forward)

**Default Center:** Valle Vista Commons  
`[45.487792, -122.445500]`

**Map Bounds (restricts panning):**
- Southwest: `[45.484798, -122.448344]`
- Northeast: `[45.490063, -122.442604]`

**Rotation:** 90° counter-clockwise (bearing: -90)  
Fits the horizontal neighborhood shape better.

**Zoom limits:**
- Min: 14
- Max: 19
- Default: 16

**Map Picker Module:** `/public/js/map-picker.js`

```javascript
import { initMapPicker } from '/js/map-picker.js';

const mapInstance = initMapPicker({
  containerId: 'mapContainer',
  latInput: document.getElementById('latitude'),
  lngInput: document.getElementById('longitude'),
  nameInput: document.getElementById('locationName'),
  initialLat: 45.487792,  // optional
  initialLng: -122.445500, // optional
  onPinSet: (lat, lng) => { /* callback */ },
  onPinRemove: () => { /* callback */ }
});

// Geocode address and center map
await mapInstance.geocodeAndCenter('123 Main St');
```

**Rotation options:**
```javascript
const map = L.map(containerId, {
  rotate: true,           // Enable rotation plugin
  bearing: -90,           // 90° counter-clockwise
  touchRotate: false,     // Disable touch rotation gestures
  shiftKeyRotate: false,  // Disable keyboard rotation
  // ... other options
});
```

**Rate limiting:** Nominatim API has a 1 request/second policy. The map-picker module automatically debounces reverse geocoding by 1 second.

---

## Rich Text Editing

### Tiptap (TipTap Editor)

Used for post descriptions (submit form, admin edit, board notes composer).

**Features enabled:**
- Bold, Italic, Strikethrough
- Headings (H1-H4)
- Bullet lists, ordered lists
- Links (with URL prompt)
- Images (upload + drag-and-drop)
- Videos (upload + drag-and-drop)
- Blockquotes (admin/board notes only)

**Sanitization:** All HTML output is sanitized via `xss-filters` before storage.

**File uploads:** Handled by `/admin/upload` route (admin-only). Public submit form uses same editor but with restricted toolbar.

---

## Authentication & Authorization

### Two-Tier System

1. **Super Admin** (env vars only)
   - Username: `SUPER_ADMIN_USER` (default: "super")
   - Password: `SUPER_ADMIN_PASS` (required)
   - Access: `/super` and `/admin` routes
   - Middleware: `requireSuperAdmin()`

2. **Moderators** (database `Mod` table)
   - Username + hashed password (bcrypt)
   - Access: `/admin` routes only
   - Middleware: `requireMod()`
   - Super admin credentials also grant mod access

**Session:** Express session with in-memory store (ephemeral, no persistence).

**Pattern:**
```javascript
const { requireMod } = require('../lib/auth');
router.get('/admin/dashboard', requireMod, (req, res) => { /* ... */ });
```

---

## Database

### Prisma ORM + PostgreSQL

**Shared client singleton:** `lib/db.js`

```javascript
const prisma = require('../lib/db');
const post = await prisma.post.findUnique({ where: { id } });
```

**NEVER create a new `PrismaClient()` instance** — always import the shared singleton.

**Migrations:**
- Dev: `npm run migrate:dev -- --name description`
- Prod: `npx prisma migrate deploy` (runs in Procfile on Railway)

**Seeding:** `prisma/seed.js` creates default `SiteSettings` row if missing.

---

## AI Integration

### OpenRouter (Optional)

**Model:** `openai/gpt-4o-mini`  
**Endpoint:** `https://openrouter.ai/api/v1/chat/completions`

**Features:**
- Auto-analysis on submit (background job, fire-and-forget)
- Custom rewrite with instructions (blocking, mod waits)
- Quick rewrite (generic cleanup)

**Graceful degradation:** If `OPENROUTER_API_KEY` is not set, all AI features are disabled. UI shows "AI unavailable" instead of errors.

**Timeout:** 30 seconds (enforced via `AbortController` in `lib/openrouter.js`).

**Privacy:** Post content is sent to OpenRouter only if API key is configured. Tip submitters are informed that content may be processed by AI for moderation.

---

## Styling & Theming

### Custom CSS Design System

**File:** `public/css/style.css`

**Color Schemes (5 total):**
- Forest (default)
- Terracotta
- Slate
- Sage
- Indigo

**Modes:**
- Light (default)
- Dark

**Theme state:** Stored in localStorage (`vvc-theme`, `vvc-scheme`). Applied via `data-theme` and `data-scheme` attributes on `<html>`.

**Custom properties:** All colors defined as CSS variables (`--primary-600`, `--surface-bg`, `--text-primary`, etc.).

**No CSS framework:** Not using Bootstrap for layout/components. Bootstrap is imported but only for JS utilities (collapse, modal if needed). All design is custom.

---

## Privacy Guarantees

### Core Principles

1. **No PII collection** — No emails, names, phone numbers, or user accounts
2. **No IP logging** — IPs used only for in-memory rate limiting, never persisted
3. **No tracking** — No cookies, sessions (beyond auth), or analytics scripts
4. **No third-party resources** (except CDN for Leaflet, fonts, hCaptcha)

**Submitter tracking:** Posts store a hashed `submitterId` to detect repeat submitters (for mod context), but no way to reverse it to an identity. Hash is salted per install via env var.

**Location data:** Map pins are manually dropped by users (no geolocation API). Stored coordinates and reverse-geocoded addresses are intentionally vague.

---

## Rate Limiting

### In-Memory (No Persistence)

**Library:** `express-rate-limit` (middleware)

**Submit form:** 5 requests per 15 minutes per IP.

**Implementation:**
```javascript
const rateLimit = require('express-rate-limit');
const submitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many submissions. Try again in 15 minutes.'
});
router.post('/submit', submitLimiter, async (req, res) => { /* ... */ });
```

**No database storage** — rate limit state is lost on server restart.

---

## Deployment

### Railway (Production)

**Procfile:**
```
web: npx prisma migrate deploy && node prisma/seed.js && node server.js
```

**Auto-deploy:** Pushes to `main` branch trigger Railway build + deploy.

**Environment:** All secrets in Railway env vars (not committed to repo).

**Database:** Railway provides `DATABASE_URL` automatically.

---

## File Upload

### Admin-Only

**Route:** `POST /admin/upload` (requires `requireMod` or `requireSuperAdmin`)

**Supported:** Images (jpg, png, gif, webp) and videos (mp4, webm, mov).

**Storage:** Railway ephemeral filesystem. Files are lost on redeploy. For production persistence, integrate cloud storage (S3, Cloudinary, etc.).

**Size limits:** Set in `server.js` via `express.json({ limit: '50mb' })`.

---

## Error Handling

### Pattern: Query Params for Feedback

Admin and super routes use `?error=xxx&msg=yyy` query params to show alerts after form submissions.

**Example:**
```javascript
return res.redirect('/admin?msg=approved');
```

**Display:** EJS templates check for `error` and `msg` variables and render alert banners.

**Error codes:**
- `not_found` → "Post not found."
- `no_rewrite` → "No AI rewrite available."
- `rewrite_failed` → "AI rewrite failed. Check API key."
- (custom messages passed as-is)

---

## Module System

### ES Modules (Client-Side Only)

**Client JS:** Uses ES modules (`import`/`export`).

```javascript
// public/js/map-picker.js
export function initMapPicker(options) { /* ... */ }

// public/js/submit-map.js
import { initMapPicker } from '/js/map-picker.js';
```

**Server JS:** Uses CommonJS (`require`/`module.exports`).

```javascript
// server.js
const express = require('express');
```

**Why split?** Node.js project uses CommonJS (no `"type": "module"` in package.json), but modern browsers support ES modules natively.

---

## Testing Strategy

**Current state:** No automated tests.

**Manual QA:**
- Test submit flow (all categories, with/without location, with/without map pin)
- Test admin moderation (approve, reject, edit, rewrite, undo)
- Test AI features (if API key configured)
- Test theming (all schemes + light/dark modes)
- Test on mobile (Safari iOS, Chrome Android)

**Future:** Consider Playwright for E2E tests on critical paths (submit, approve, board display).

---

## Known Patterns to Follow

### 1. Always Sanitize User Input
```javascript
const xss = require('xss-filters');
const sanitize = (str) => xss.inHTMLData(str || '').trim();
const title = sanitize(req.body.title);
```

### 2. Use Shared PrismaClient
```javascript
const prisma = require('../lib/db'); // ✅ Correct
// const { PrismaClient } = require('@prisma/client'); // ❌ Never do this
```

### 3. Graceful AI Failures
```javascript
try {
  const analysis = await analyzeTip(post);
} catch (err) {
  console.error('AI analysis failed:', err);
  // Continue without analysis — don't block the submission
}
```

### 4. Auth Middleware on All Protected Routes
```javascript
router.get('/admin', requireMod, (req, res) => { /* ... */ });
router.get('/super', requireSuperAdmin, (req, res) => { /* ... */ });
```

### 5. Fire-and-Forget Background Jobs (No Blocking)
```javascript
// ✅ Correct: Don't await
analyzeInBackground(post.id);
res.redirect('/submit?success=1');

// ❌ Wrong: Blocks response
await analyzeInBackground(post.id);
res.redirect('/submit?success=1');
```

---

**End of PATTERNS.md**
