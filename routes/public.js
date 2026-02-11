const express = require('express');
const router = express.Router();
const xssFilters = require('xss-filters');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const prisma = require('../lib/db');
const { analyzeInBackground } = require('../lib/ai');

// ─── Config ──────────────────────────────────────────────
const HCAPTCHA_SECRET = process.env.HCAPTCHA_SECRET || '';
const HCAPTCHA_SITEKEY = process.env.HCAPTCHA_SITEKEY || '';

const VALID_SUBMIT_SECTIONS = ['ALERT', 'HAPPENINGS', 'LOST_FOUND', 'NEIGHBORS'];

const submitLimiter = new RateLimiterMemory({
  points: 5,
  duration: 60,
});

// ─── Helpers ────────────────────────────────────────────

function sanitize(str) {
  if (!str) return '';
  return xssFilters.inHTMLData(str.trim());
}

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

async function verifyHcaptcha(token) {
  if (!HCAPTCHA_SECRET) return true;
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

// ─── Section-aware auto-expire ──────────────────────────

async function autoExpire() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Alerts: 7-day expiry
  await prisma.post.updateMany({
    where: { status: 'LIVE', section: 'ALERT', createdAt: { lt: sevenDaysAgo } },
    data: { status: 'EXPIRED' },
  });

  // Happenings: expire after eventDate or 14 days
  await prisma.post.updateMany({
    where: {
      status: 'LIVE',
      section: 'HAPPENINGS',
      OR: [
        { eventDate: { not: null, lt: now } },
        { createdAt: { lt: fourteenDaysAgo } },
      ],
    },
    data: { status: 'EXPIRED' },
  });

  // Lost & Found, Neighbors: 14-day expiry
  await prisma.post.updateMany({
    where: { status: 'LIVE', section: { in: ['LOST_FOUND', 'NEIGHBORS'] }, createdAt: { lt: fourteenDaysAgo } },
    data: { status: 'EXPIRED' },
  });

  // Board Notes: custom expiresAt only, no auto-expiry
  await prisma.post.updateMany({
    where: { status: 'LIVE', section: 'BOARD_NOTES', expiresAt: { not: null, lt: now } },
    data: { status: 'EXPIRED' },
  });
}

// ─── Routes ─────────────────────────────────────────────

// Board (home page)
router.get('/', async (req, res) => {
  try {
    await autoExpire();

    const posts = await prisma.post.findMany({
      where: { status: 'LIVE' },
      orderBy: [{ pinned: 'desc' }, { approvedAt: 'desc' }],
    });

    const board = {
      alerts: posts.filter(p => p.section === 'ALERT'),
      happenings: posts.filter(p => p.section === 'HAPPENINGS'),
      lostFound: posts.filter(p => p.section === 'LOST_FOUND'),
      neighbors: posts.filter(p => p.section === 'NEIGHBORS'),
      boardNotes: posts.filter(p => p.section === 'BOARD_NOTES'),
    };

    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });

    res.render('board', { board, settings, timeAgo, sitekey: HCAPTCHA_SITEKEY });
  } catch (err) {
    console.error('Board error:', err.message);
    res.render('board', {
      board: { alerts: [], happenings: [], lostFound: [], neighbors: [], boardNotes: [] },
      settings: { boardName: 'Valle Vista Commons', boardTagline: 'Your neighborhood board', aboutText: '' },
      timeAgo,
      sitekey: HCAPTCHA_SITEKEY,
    });
  }
});

// Submit form page
router.get('/submit', async (req, res) => {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } }).catch(() => null);
  res.render('submit', {
    sitekey: HCAPTCHA_SITEKEY,
    error: null,
    success: false,
    values: {},
    settings: settings || { boardName: 'Valle Vista Commons' },
  });
});

// Handle submission
router.post('/submit', async (req, res) => {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } }).catch(() => null);
  const renderOpts = { sitekey: HCAPTCHA_SITEKEY, settings: settings || { boardName: 'Valle Vista Commons' } };

  try {
    // Honeypot check
    if (req.body.website) {
      return res.render('submit', { ...renderOpts, error: null, success: true, values: {} });
    }

    // Rate limit
    const key = req.ip || 'unknown';
    try {
      await submitLimiter.consume(key);
    } catch {
      return res.status(429).render('submit', {
        ...renderOpts,
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
        ...renderOpts,
        error: 'Please complete the captcha.',
        success: false,
        values: req.body,
      });
    }

    // Validate & sanitize
    const title = sanitize(req.body.title || '').substring(0, 100);
    const desc = sanitize(req.body.desc || '').substring(0, 500);
    const location = sanitize(req.body.location || '').substring(0, 100) || null;
    const section = (req.body.section || '').toUpperCase();

    if (!title || !desc) {
      return res.status(400).render('submit', {
        ...renderOpts,
        error: 'Title and description are required.',
        success: false,
        values: req.body,
      });
    }

    if (!VALID_SUBMIT_SECTIONS.includes(section)) {
      return res.status(400).render('submit', {
        ...renderOpts,
        error: 'Please select a valid category.',
        success: false,
        values: req.body,
      });
    }

    // Create post (pending moderation)
    const post = await prisma.post.create({
      data: { title, desc, location, section, status: 'PENDING' },
    });

    res.render('submit', { ...renderOpts, error: null, success: true, values: {} });

    // Fire-and-forget: analyze in background after response is sent
    analyzeInBackground(post.id).catch(err => console.error('BG analysis failed:', err.message));
  } catch (err) {
    console.error('Submit error:', err.message);
    res.status(500).render('submit', {
      ...renderOpts,
      error: 'Something went wrong. Please try again.',
      success: false,
      values: req.body || {},
    });
  }
});

module.exports = router;
