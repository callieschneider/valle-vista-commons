const express = require('express');
const router = express.Router();
const xssFilters = require('xss-filters');
const prisma = require('../lib/db');
const { requireMod } = require('../lib/auth');
const { rewriteTip, analyzeInBackground } = require('../lib/ai');
const { sanitizeRichText } = require('../lib/sanitize');

// Apply mod auth to all admin routes
router.use(requireMod);

// ─── Helpers ────────────────────────────────────────────

function sanitize(str) {
  if (!str) return '';
  return xssFilters.inHTMLData(str.trim());
}

const MAX_UNDO = 10;
function pushHistory(post) {
  const history = Array.isArray(post.descHistory) ? [...post.descHistory] : [];
  history.push({ title: post.title, desc: post.desc, timestamp: new Date().toISOString() });
  if (history.length > MAX_UNDO) history.shift();
  return history;
}

function computeExpiry(section, eventDate) {
  const now = new Date();
  switch (section) {
    case 'ALERT': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'HAPPENINGS': return eventDate || new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    case 'LOST_FOUND':
    case 'NEIGHBORS': return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    case 'BOARD_NOTES': return null;
    default: return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  }
}

// ─── Dashboard ──────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const pending = await prisma.post.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: { submitter: { select: { id: true } } },
    });

    const live = await prisma.post.findMany({
      where: { status: 'LIVE' },
      orderBy: [{ pinned: 'desc' }, { approvedAt: 'desc' }],
      include: { submitter: { select: { id: true } } },
    });

    const archived = await prisma.post.findMany({
      where: { status: { in: ['REJECTED', 'EXPIRED', 'DELETED'] } },
      orderBy: { createdAt: 'desc' },
      include: { submitter: { select: { id: true } } },
    });

    // Build submitter post counts for display (e.g. "User #14 (7 posts)")
    const submitterIds = [...new Set(
      [...pending, ...live, ...archived]
        .map(p => p.submitterId)
        .filter(Boolean)
    )];
    const submitterCounts = {};
    if (submitterIds.length > 0) {
      const counts = await prisma.post.groupBy({
        by: ['submitterId'],
        where: { submitterId: { in: submitterIds } },
        _count: { id: true },
      });
      counts.forEach(c => { submitterCounts[c.submitterId] = c._count.id; });
    }

    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    const hasApiKey = !!process.env.OPENROUTER_API_KEY;

    res.render('admin', {
      pending,
      live,
      archived,
      settings,
      hasApiKey,
      submitterCounts,
      error: req.query.error || null,
      msg: req.query.msg || null,
    });
  } catch (err) {
    console.error('Admin error:', err.message);
    res.render('admin', { pending: [], live: [], archived: [], settings: null, hasApiKey: false, submitterCounts: {}, error: 'Failed to load dashboard', msg: null });
  }
});

// ─── Approve ────────────────────────────────────────────

router.post('/approve/:id', async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.redirect('/admin?error=not_found');

    const section = req.body.section || post.section;

    await prisma.post.update({
      where: { id: post.id },
      data: {
        status: 'LIVE',
        section,
        approvedAt: new Date(),
        expiresAt: computeExpiry(section, post.eventDate),
      },
    });
  } catch (err) {
    console.error('Approve error:', err.message);
  }
  res.redirect('/admin');
});

// ─── Reject ─────────────────────────────────────────────

router.post('/reject/:id', async (req, res) => {
  try {
    await prisma.post.update({ where: { id: req.params.id }, data: { status: 'REJECTED' } });
  } catch (err) {
    console.error('Reject error:', err.message);
  }
  res.redirect('/admin');
});

// ─── Edit ───────────────────────────────────────────────

router.post('/edit/:id', async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.redirect('/admin?error=not_found');

    const title = sanitize(req.body.title || '').substring(0, 100);
    const desc = sanitizeRichText(req.body.desc || '');
    const location = sanitize(req.body.location || '').substring(0, 100) || null;
    const section = req.body.section || undefined;

    // Parse map coordinates (optional)
    const latitude = req.body.latitude ? parseFloat(req.body.latitude) : null;
    const longitude = req.body.longitude ? parseFloat(req.body.longitude) : null;
    const locationName = req.body.locationName ? sanitize(req.body.locationName).substring(0, 200) : null;

    // Validate coordinates if provided
    if ((latitude !== null || longitude !== null) && 
        (latitude === null || longitude === null || 
         latitude < -90 || latitude > 90 || 
         longitude < -180 || longitude > 180)) {
      return res.redirect('/admin?error=invalid_coordinates');
    }

    await prisma.post.update({
      where: { id: req.params.id },
      data: { title, desc, location, latitude, longitude, locationName, section, editedAt: new Date(), descHistory: pushHistory(post) },
    });
  } catch (err) {
    console.error('Edit error:', err.message);
  }
  res.redirect('/admin');
});

// ─── AI Rewrite ─────────────────────────────────────────

router.post('/rewrite/:id', async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.redirect('/admin?error=not_found');

    const action = req.body.action;
    const history = pushHistory(post);

    if (action === 'apply') {
      // Apply the AI analysis rewrite
      const rewrite = post.aiAnalysis?.rewrite;
      if (!rewrite) return res.redirect('/admin?error=no_rewrite');

      await prisma.post.update({
        where: { id: post.id },
        data: {
          title: rewrite.title.substring(0, 100),
          desc: rewrite.desc,
          editedAt: new Date(),
          descHistory: history,
        },
      });
    } else if (action === 'quick') {
      // Quick rewrite — no custom instructions, just clean it up
      const result = await rewriteTip(post, '');
      if (!result) return res.redirect('/admin?error=rewrite_failed');

      await prisma.post.update({
        where: { id: post.id },
        data: {
          title: result.title.substring(0, 100),
          desc: result.desc,
          editedAt: new Date(),
          descHistory: history,
        },
      });
    } else if (action === 'custom') {
      // Custom rewrite — intentionally blocking (mod waits for result)
      const instructions = sanitize(req.body.instructions || '');
      const result = await rewriteTip(post, instructions);
      if (!result) return res.redirect('/admin?error=rewrite_failed');

      await prisma.post.update({
        where: { id: post.id },
        data: {
          title: result.title.substring(0, 100),
          desc: result.desc,
          editedAt: new Date(),
          descHistory: history,
        },
      });
    }
  } catch (err) {
    console.error('Rewrite error:', err.message);
    return res.redirect('/admin?error=rewrite_failed');
  }
  res.redirect('/admin');
});

// ─── Reanalyze ──────────────────────────────────────────

router.post('/reanalyze/:id', async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (post) {
      analyzeInBackground(post.id).catch(err => console.error('Reanalyze failed:', err.message));
    }
  } catch (err) {
    console.error('Reanalyze error:', err.message);
  }
  res.redirect('/admin');
});

// ─── Pin/Unpin ──────────────────────────────────────────

router.post('/pin/:id', async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.redirect('/admin?error=not_found');
    await prisma.post.update({ where: { id: post.id }, data: { pinned: !post.pinned } });
  } catch (err) {
    console.error('Pin error:', err.message);
  }
  res.redirect('/admin');
});

// ─── Urgent Toggle ──────────────────────────────────────

router.post('/urgent/:id', async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.redirect('/admin?error=not_found');
    await prisma.post.update({ where: { id: post.id }, data: { urgent: !post.urgent } });
  } catch (err) {
    console.error('Urgent error:', err.message);
  }
  res.redirect('/admin');
});

// ─── Expire Now ─────────────────────────────────────────

router.post('/expire/:id', async (req, res) => {
  try {
    await prisma.post.update({ where: { id: req.params.id }, data: { status: 'EXPIRED' } });
  } catch (err) {
    console.error('Expire error:', err.message);
  }
  res.redirect('/admin');
});

// ─── Delete ─────────────────────────────────────────────

router.post('/delete/:id', async (req, res) => {
  try {
    await prisma.post.update({ where: { id: req.params.id }, data: { status: 'DELETED' } });
  } catch (err) {
    console.error('Delete error:', err.message);
  }
  res.redirect('/admin');
});

// ─── Board Notes Composer ───────────────────────────────

router.post('/notes', async (req, res) => {
  try {
    const title = sanitize(req.body.title || '').substring(0, 100);
    const desc = sanitizeRichText(req.body.desc || '');

    if (!title || !desc) return res.redirect('/admin?error=notes_empty');

    await prisma.post.create({
      data: {
        title,
        desc,
        location: null,
        section: 'BOARD_NOTES',
        status: 'LIVE',
        modPost: true,
        approvedAt: new Date(),
      },
    });
  } catch (err) {
    console.error('Board note error:', err.message);
  }
  res.redirect('/admin');
});

// ─── Mod Notes ──────────────────────────────────────────

router.post('/modnote/:id', async (req, res) => {
  try {
    const modNote = sanitize(req.body.modNote || '').substring(0, 1000);
    await prisma.post.update({ where: { id: req.params.id }, data: { modNote } });
  } catch (err) {
    console.error('Mod note error:', err.message);
  }
  res.redirect('/admin');
});

// ─── Undo ───────────────────────────────────────────────

router.post('/undo/:id', async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.redirect('/admin?error=not_found');

    const history = Array.isArray(post.descHistory) ? [...post.descHistory] : [];
    if (history.length === 0) return res.redirect('/admin?error=no_undo');

    const prev = history.pop();
    await prisma.post.update({
      where: { id: post.id },
      data: {
        title: prev.title,
        desc: prev.desc,
        editedAt: new Date(),
        descHistory: history,
      },
    });
  } catch (err) {
    console.error('Undo error:', err.message);
  }
  res.redirect('/admin');
});

// ─── In-Editor AI Rewrite (API endpoint for Tiptap button) ─

router.post('/api/rewrite-editor', async (req, res) => {
  try {
    // Super admin bypass (no limits)
    if (req.isSuperAdmin) {
      const content = req.body.content || '';
      const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
      const prompt = settings?.rewritePrompt || 'Rewrite this text to be clear, concise, and factual. Fix grammar and spelling. Maintain the original meaning.';
      
      const result = await require('../lib/openrouter').chatCompletion({
        model: settings?.rewriteModel || 'anthropic/claude-3.5-haiku',
        messages: [
          { role: 'user', content: `${prompt}\n\nText to rewrite:\n${content}` }
        ],
        temperature: 0.3,
      });
      
      return res.json({ success: true, rewritten: result || content });
    }

    // Regular mod: check limits
    if (!req.mod) {
      return res.status(403).json({ error: 'Not authenticated as mod' });
    }

    const mod = req.mod;
    if (!mod.rewriteEnabled) {
      return res.status(403).json({ error: 'AI Rewrite disabled for your account' });
    }

    const postId = req.body.postId;
    if (!postId) {
      return res.status(400).json({ error: 'postId required' });
    }

    // Check per-post limit
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (post.rewriteCount >= mod.rewriteLimitPerPost) {
      return res.status(429).json({ error: `Post rewrite limit reached (${mod.rewriteLimitPerPost} per post)` });
    }

    // Check per-hour limit
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentRewrites = await prisma.rewriteLog.count({
      where: {
        modId: mod.id,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (recentRewrites >= mod.rewriteLimitPerHour) {
      return res.status(429).json({ error: `Hourly rewrite limit reached (${mod.rewriteLimitPerHour}/hour)` });
    }

    // Perform rewrite
    const content = req.body.content || '';
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    const prompt = settings?.rewritePrompt || 'Rewrite this text to be clear, concise, and factual. Fix grammar and spelling. Maintain the original meaning.';
    
    const result = await require('../lib/openrouter').chatCompletion({
      model: settings?.rewriteModel || 'anthropic/claude-3.5-haiku',
      messages: [
        { role: 'user', content: `${prompt}\n\nText to rewrite:\n${content}` }
      ],
      temperature: 0.3,
    });

    if (!result) {
      return res.status(500).json({ error: 'LLM rewrite failed' });
    }

    // Log rewrite and increment post counter
    await prisma.$transaction([
      prisma.rewriteLog.create({
        data: {
          postId: post.id,
          modId: mod.id,
        },
      }),
      prisma.post.update({
        where: { id: post.id },
        data: { rewriteCount: { increment: 1 } },
      }),
    ]);

    res.json({ success: true, rewritten: result });
  } catch (err) {
    console.error('Editor rewrite error:', err.message);
    res.status(500).json({ error: 'Rewrite failed' });
  }
});

// ─── Archive ────────────────────────────────────────────

// Restore rejected post back to pending queue
router.post('/restore/:id', async (req, res) => {
  try {
    await prisma.post.update({ where: { id: req.params.id }, data: { status: 'PENDING' } });
  } catch (err) {
    console.error('Restore error:', err.message);
  }
  res.redirect('/admin');
});

// Permanently delete from archive
router.post('/purge/:id', async (req, res) => {
  try {
    await prisma.post.delete({ where: { id: req.params.id } });
  } catch (err) {
    console.error('Purge error:', err.message);
  }
  res.redirect('/admin');
});

module.exports = router;
