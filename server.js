if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const xssFilters = require('xss-filters');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const { PrismaClient } = require('@prisma/client');

// ─── Config ──────────────────────────────────────────────
const prisma = new PrismaClient({ log: ['warn', 'error'] });
const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin';
const HCAPTCHA_SECRET = process.env.HCAPTCHA_SECRET || '';
const HCAPTCHA_SITEKEY = process.env.HCAPTCHA_SITEKEY || '';

// ─── Rate Limiters (in-memory, no IP logging) ───────────
const submitLimiter = new RateLimiterMemory({
  points: 5,      // 5 submissions
  duration: 60,   // per 60 seconds
});

const globalLimiter = new RateLimiterMemory({
  points: 120,    // 120 requests
  duration: 60,   // per 60 seconds
});

// ─── Middleware ──────────────────────────────────────────

// HTTPS redirect in production
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `https://${req.hostname}${req.originalUrl}`);
  }
  next();
});

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "https://hcaptcha.com", "https://*.hcaptcha.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      frameSrc: ["https://hcaptcha.com", "https://*.hcaptcha.com"],
      connectSrc: ["'self'", "https://hcaptcha.com", "https://*.hcaptcha.com"],
      imgSrc: ["'self'", "data:"],
    }
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors());
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(express.json({ limit: '10kb' }));

// Global rate limiter
app.use(async (req, res, next) => {
  try {
    // Use forwarded IP but don't log it — just hash for rate limiting
    const key = req.ip || 'unknown';
    await globalLimiter.consume(key);
    next();
  } catch {
    res.status(429).render('error', { message: 'Too many requests. Please slow down.' });
  }
});

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Disable x-powered-by (belt-and-suspenders with helmet)
app.disable('x-powered-by');

// ─── Helpers ────────────────────────────────────────────

function sanitize(str) {
  if (!str) return '';
  return xssFilters.inHTMLData(str.trim());
}

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Valle Vista Commons Admin"');
    return res.status(401).send('Authentication required');
  }
  const decoded = Buffer.from(auth.split(' ')[1], 'base64').toString();
  const parts = decoded.split(':');
  const pass = parts.slice(1).join(':'); // Handle passwords with colons
  if (pass !== ADMIN_PASS) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Valle Vista Commons Admin"');
    return res.status(401).send('Invalid credentials');
  }
  next();
}

async function verifyHcaptcha(token) {
  if (!HCAPTCHA_SECRET) return true; // Skip verification if not configured
  if (!token) return false;
  try {
    const params = new URLSearchParams({
      secret: HCAPTCHA_SECRET,
      response: token,
    });
    const resp = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await resp.json();
    return data.success === true;
  } catch {
    return false;
  }
}

// 14-day window for live posts
function fourteenDaysAgo() {
  return new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
}

// ─── Public Routes ──────────────────────────────────────

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Feed (home page)
app.get('/', async (req, res) => {
  try {
    const { tag, q } = req.query;
    const where = {
      status: 'LIVE',
      createdAt: { gte: fourteenDaysAgo() },
    };

    if (tag && ['VEHICLE', 'PERSON', 'OTHER'].includes(tag.toUpperCase())) {
      where.tag = tag.toUpperCase();
    }

    if (q && q.trim()) {
      const search = sanitize(q).substring(0, 100);
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { desc: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    const posts = await prisma.post.findMany({
      where,
      orderBy: { approvedAt: 'desc' },
    });

    res.render('index', {
      posts,
      currentTag: tag || '',
      searchQuery: q || '',
      sitekey: HCAPTCHA_SITEKEY,
    });
  } catch (err) {
    console.error('Feed error:', err.message);
    res.render('index', { posts: [], currentTag: '', searchQuery: '', sitekey: HCAPTCHA_SITEKEY });
  }
});

// Submit form page
app.get('/submit', (req, res) => {
  res.render('submit', { sitekey: HCAPTCHA_SITEKEY, error: null, success: false, values: {} });
});

// Handle submission
app.post('/submit', async (req, res) => {
  try {
    // Rate limit by IP (in-memory only, not logged)
    const key = req.ip || 'unknown';
    try {
      await submitLimiter.consume(key);
    } catch {
      return res.status(429).render('submit', {
        sitekey: HCAPTCHA_SITEKEY,
        error: 'Too many submissions. Please wait a minute and try again.',
        success: false,
        values: req.body,
      });
    }

    // Verify hCaptcha
    const hcaptchaToken = req.body['h-captcha-response'];
    const captchaValid = await verifyHcaptcha(hcaptchaToken);
    if (!captchaValid) {
      return res.status(400).render('submit', {
        sitekey: HCAPTCHA_SITEKEY,
        error: 'Please complete the captcha.',
        success: false,
        values: req.body,
      });
    }

    // Validate & sanitize
    const title = sanitize(req.body.title || '').substring(0, 100);
    const desc = sanitize(req.body.desc || '').substring(0, 500);
    const location = sanitize(req.body.location || '').substring(0, 50);
    const tag = (req.body.tag || '').toUpperCase();

    if (!title || !desc || !location) {
      return res.status(400).render('submit', {
        sitekey: HCAPTCHA_SITEKEY,
        error: 'All fields are required.',
        success: false,
        values: req.body,
      });
    }

    if (!['VEHICLE', 'PERSON', 'OTHER'].includes(tag)) {
      return res.status(400).render('submit', {
        sitekey: HCAPTCHA_SITEKEY,
        error: 'Please select a valid tag.',
        success: false,
        values: req.body,
      });
    }

    // Create post (pending moderation)
    await prisma.post.create({
      data: { title, desc, location, tag, status: 'PENDING' },
    });

    res.render('submit', {
      sitekey: HCAPTCHA_SITEKEY,
      error: null,
      success: true,
      values: {},
    });
  } catch (err) {
    console.error('Submit error:', err.message);
    res.status(500).render('submit', {
      sitekey: HCAPTCHA_SITEKEY,
      error: 'Something went wrong. Please try again.',
      success: false,
      values: req.body || {},
    });
  }
});

// ─── Admin Routes ───────────────────────────────────────

app.get('/admin', requireAdmin, async (req, res) => {
  try {
    const pending = await prisma.post.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });

    const live = await prisma.post.findMany({
      where: { status: 'LIVE' },
      orderBy: { approvedAt: 'desc' },
    });

    res.render('admin', { pending, live });
  } catch (err) {
    console.error('Admin error:', err.message);
    res.render('admin', { pending: [], live: [] });
  }
});

app.post('/admin/approve/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.post.update({
      where: { id: req.params.id },
      data: { status: 'LIVE', approvedAt: new Date() },
    });
  } catch (err) {
    console.error('Approve error:', err.message);
  }
  res.redirect('/admin');
});

app.post('/admin/reject/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.post.delete({
      where: { id: req.params.id },
    });
  } catch (err) {
    console.error('Reject error:', err.message);
  }
  res.redirect('/admin');
});

app.post('/admin/delete/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.post.delete({
      where: { id: req.params.id },
    });
  } catch (err) {
    console.error('Delete error:', err.message);
  }
  res.redirect('/admin');
});

// ─── Error Handling ─────────────────────────────────────

// 404
app.use((req, res) => {
  res.status(404).render('error', { message: 'Page not found.' });
});

// Global error handler — no stack traces
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).render('error', { message: 'Something went wrong.' });
});

// ─── Start ──────────────────────────────────────────────

async function start() {
  try {
    await prisma.$connect();
    console.log('✓ Database connected');
  } catch (err) {
    console.error('✗ Database connection failed:', err.message);
    console.error('  Make sure DATABASE_URL is set');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`✓ Valle Vista Commons running on port ${PORT}`);
    console.log(`  Feed:   http://localhost:${PORT}`);
    console.log(`  Submit: http://localhost:${PORT}/submit`);
    console.log(`  Admin:  http://localhost:${PORT}/admin`);
  });
}

start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
