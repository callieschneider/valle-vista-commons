const express = require('express');
const router = express.Router();
const xssFilters = require('xss-filters');
const prisma = require('../lib/db');
const { requireMod, hashPassword, setAuthCookie, clearAuthCookie } = require('../lib/auth');
const { rewriteTip, analyzeInBackground } = require('../lib/ai');
const { sanitizeRichText } = require('../lib/sanitize');

const SUPER_USER = process.env.SUPER_ADMIN_USER || 'super';
const SUPER_PASS = process.env.SUPER_ADMIN_PASS;

// ─── Markdown → HTML converter (for LLM rewrite output) ─
function mdToHtml(text) {
  if (!text) return text;
  // Strip wrapping code fences if LLM returns ```html ... ```
  text = text.replace(/^```(?:html)?\n?/i, '').replace(/\n?```$/i, '').trim();
  // If it already looks like HTML (starts with a tag), return as-is
  if (/^\s*<[a-z][\s\S]*>/i.test(text)) return text;

  const lines = text.split('\n');
  const result = [];
  let inList = null; // 'ul' or 'ol'

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Headings: ## text
    const headingMatch = line.match(/^(#{1,4})\s+(.+)/);
    if (headingMatch) {
      if (inList) { result.push(`</${inList}>`); inList = null; }
      const level = headingMatch[1].length;
      result.push(`<h${level}>${inlineFormat(headingMatch[2])}</h${level}>`);
      continue;
    }

    // Unordered list: - item or * item
    const ulMatch = line.match(/^[\-\*]\s+(.+)/);
    if (ulMatch) {
      if (inList !== 'ul') {
        if (inList) result.push(`</${inList}>`);
        result.push('<ul>');
        inList = 'ul';
      }
      result.push(`<li>${inlineFormat(ulMatch[1])}</li>`);
      continue;
    }

    // Ordered list: 1. item
    const olMatch = line.match(/^\d+\.\s+(.+)/);
    if (olMatch) {
      if (inList !== 'ol') {
        if (inList) result.push(`</${inList}>`);
        result.push('<ol>');
        inList = 'ol';
      }
      result.push(`<li>${inlineFormat(olMatch[1])}</li>`);
      continue;
    }

    // Close any open list
    if (inList) { result.push(`</${inList}>`); inList = null; }

    // Blank line — skip (paragraph break)
    if (!line.trim()) continue;

    // Regular paragraph
    result.push(`<p>${inlineFormat(line)}</p>`);
  }

  if (inList) result.push(`</${inList}>`);
  return result.join('');
}

function inlineFormat(text) {
  // Bold: **text** or __text__
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');
  // Italic: *text* or _text_
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  text = text.replace(/(?<!\w)_(.+?)_(?!\w)/g, '<em>$1</em>');
  // Strikethrough: ~~text~~
  text = text.replace(/~~(.+?)~~/g, '<s>$1</s>');
  return text;
}

// ─── Login / Logout (before auth middleware) ─────────────
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.render('login', { error: 'Username and password are required.' });
  }

  // Check super admin
  if (SUPER_PASS && username === SUPER_USER && password === SUPER_PASS) {
    setAuthCookie(res, { isSuperAdmin: true, username: SUPER_USER });
    return res.redirect('/admin');
  }

  // Check mod table
  try {
    const mod = await prisma.mod.findUnique({ where: { username } });
    if (!mod || !mod.active || mod.passHash !== hashPassword(password)) {
      return res.render('login', { error: 'Invalid username or password.' });
    }
    setAuthCookie(res, { modId: mod.id, username: mod.username });
    return res.redirect('/admin');
  } catch (err) {
    console.error('Login error:', err.message);
    return res.render('login', { error: 'Something went wrong. Try again.' });
  }
});

router.get('/logout', (req, res) => {
  clearAuthCookie(res);
  res.redirect('/admin/login');
});

// Apply mod auth to all admin routes
router.use(requireMod);

// ─── Available LLM Models (shared with settings tab) ─────
const AVAILABLE_MODELS = [
  { id: 'x-ai/grok-4.1-fast', name: 'Grok 4.1 Fast', note: 'Very fast, great value' },
  { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', note: 'Fast, cheap' },
  { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', note: 'High quality' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', note: 'Fast, cheap' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', note: 'High quality' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', note: 'Fast, cheap' },
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', note: 'High quality' },
  { id: 'deepseek/deepseek-chat-v3-0324', name: 'DeepSeek Chat v3', note: 'Very cheap' },
];

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

// ─── Audit Log Helper ───────────────────────────────────

async function logAction(action, modUser, opts = {}) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        modUser: modUser || 'unknown',
        postId: opts.postId || null,
        targetId: opts.targetId || null,
        details: opts.details || null,
      },
    });
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

// ─── Consolidated Dashboard ─────────────────────────────

router.get('/', async (req, res) => {
  try {
    // ── Data for all mods ──────────────────────────
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

    // Board notes (for separate management tab)
    const boardNotes = live.filter(p => p.modPost);

    // Submitter counts
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

    // Block list data
    const blockedUsers = await prisma.submitter.findMany({
      where: { blocked: true },
      orderBy: { blockedAt: 'desc' },
    });
    // Get post counts for blocked users
    const blockedIds = blockedUsers.map(s => s.id);
    const blockedPostCounts = {};
    if (blockedIds.length > 0) {
      const bCounts = await prisma.post.groupBy({
        by: ['submitterId'],
        where: { submitterId: { in: blockedIds } },
        _count: { id: true },
      });
      bCounts.forEach(c => { blockedPostCounts[c.submitterId] = c._count.id; });
    }

    // All submitters (for block list "add" functionality)
    const allSubmitters = await prisma.submitter.findMany({
      orderBy: { id: 'asc' },
    });
    // Get post counts for all submitters
    const allSubIds = allSubmitters.map(s => s.id);
    const allSubmitterPostCounts = {};
    if (allSubIds.length > 0) {
      const aCounts = await prisma.post.groupBy({
        by: ['submitterId'],
        where: { submitterId: { in: allSubIds } },
        _count: { id: true },
      });
      aCounts.forEach(c => { allSubmitterPostCounts[c.submitterId] = c._count.id; });
    }

    // Audit log (recent 50 entries)
    const recentAudit = await prisma.auditLog.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    // Stats for dashboard
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const postsThisWeek = await prisma.post.count({
      where: { createdAt: { gte: oneWeekAgo } },
    });

    const stats = {
      pendingCount: pending.length,
      liveCount: live.length,
      archivedCount: archived.length,
      postsThisWeek,
      blockedCount: blockedUsers.length,
    };

    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    const hasApiKey = !!process.env.OPENROUTER_API_KEY;
    const hasHashSalt = !!process.env.AUTHOR_HASH_SALT;

    // ── Super admin only data ──────────────────────
    let mods = [];
    let modRewriteStats = {};
    if (req.isSuperAdmin) {
      mods = await prisma.mod.findMany({ orderBy: { createdAt: 'desc' } });
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      for (const mod of mods) {
        const total = await prisma.rewriteLog.count({ where: { modId: mod.id } });
        const lastHour = await prisma.rewriteLog.count({
          where: { modId: mod.id, createdAt: { gte: oneHourAgo } },
        });
        modRewriteStats[mod.id] = { total, lastHour };
      }
    }

    res.render('admin', {
      pending,
      live,
      archived,
      boardNotes,
      blockedUsers,
      allSubmitters,
      allSubmitterPostCounts,
      blockedPostCounts,
      recentAudit,
      stats,
      settings,
      mods,
      modRewriteStats,
      models: AVAILABLE_MODELS,
      hasApiKey,
      hasHashSalt,
      isSuperAdmin: !!req.isSuperAdmin,
      submitterCounts,
      error: req.query.error || null,
      msg: req.query.msg || null,
      activeTab: req.query.tab || null,
    });
  } catch (err) {
    console.error('Admin error:', err.message);
    res.render('admin', {
      pending: [], live: [], archived: [], boardNotes: [],
      blockedUsers: [], allSubmitters: [], allSubmitterPostCounts: {},
      blockedPostCounts: {}, recentAudit: [], stats: { pendingCount: 0, liveCount: 0, archivedCount: 0, postsThisWeek: 0, blockedCount: 0 },
      settings: null, mods: [], modRewriteStats: {}, models: AVAILABLE_MODELS,
      hasApiKey: false, hasHashSalt: false, isSuperAdmin: !!req.isSuperAdmin,
      submitterCounts: {}, error: 'Failed to load dashboard', msg: null, activeTab: null,
    });
  }
});

// ─── Approve ────────────────────────────────────────────

router.post('/approve/:id', async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.redirect('/admin?error=not_found&tab=queue');

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
    await logAction('approve', req.authUser, { postId: post.id, details: `Approved "${post.title}" to ${section}` });
  } catch (err) {
    console.error('Approve error:', err.message);
  }
  res.redirect('/admin?tab=queue');
});

// ─── Reject ─────────────────────────────────────────────

router.post('/reject/:id', async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    await prisma.post.update({ where: { id: req.params.id }, data: { status: 'REJECTED' } });
    await logAction('reject', req.authUser, { postId: req.params.id, details: post ? `Rejected "${post.title}"` : 'Rejected post' });
  } catch (err) {
    console.error('Reject error:', err.message);
  }
  res.redirect('/admin?tab=queue');
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
    await logAction('edit', req.authUser, { postId: req.params.id, details: `Edited "${title}"` });
  } catch (err) {
    console.error('Edit error:', err.message);
  }
  res.redirect('/admin?tab=board');
});

// ─── AI Rewrite ─────────────────────────────────────────

router.post('/rewrite/:id', async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.redirect('/admin?error=not_found');

    const action = req.body.action;
    const history = pushHistory(post);

    if (action === 'apply') {
      const rewrite = post.aiAnalysis?.rewrite;
      if (!rewrite) return res.redirect('/admin?error=no_rewrite');
      await prisma.post.update({
        where: { id: post.id },
        data: { title: rewrite.title.substring(0, 100), desc: rewrite.desc, editedAt: new Date(), descHistory: history },
      });
    } else if (action === 'quick') {
      const result = await rewriteTip(post, '');
      if (!result) return res.redirect('/admin?error=rewrite_failed');
      await prisma.post.update({
        where: { id: post.id },
        data: { title: result.title.substring(0, 100), desc: result.desc, editedAt: new Date(), descHistory: history },
      });
    } else if (action === 'custom') {
      const instructions = sanitize(req.body.instructions || '');
      const result = await rewriteTip(post, instructions);
      if (!result) return res.redirect('/admin?error=rewrite_failed');
      await prisma.post.update({
        where: { id: post.id },
        data: { title: result.title.substring(0, 100), desc: result.desc, editedAt: new Date(), descHistory: history },
      });
    }
    await logAction('rewrite', req.authUser, { postId: post.id, details: `AI rewrite (${action}) on "${post.title}"` });
  } catch (err) {
    console.error('Rewrite error:', err.message);
    return res.redirect('/admin?tab=board&error=rewrite_failed');
  }
  res.redirect('/admin?tab=board');
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
  res.redirect('/admin?tab=board');
});

// ─── Pin/Unpin ──────────────────────────────────────────

router.post('/pin/:id', async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.redirect('/admin?error=not_found');
    await prisma.post.update({ where: { id: post.id }, data: { pinned: !post.pinned } });
    await logAction('pin', req.authUser, { postId: post.id, details: `${post.pinned ? 'Unpinned' : 'Pinned'} "${post.title}"` });
  } catch (err) {
    console.error('Pin error:', err.message);
  }
  res.redirect('/admin?tab=board');
});

// ─── Urgent Toggle ──────────────────────────────────────

router.post('/urgent/:id', async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return res.redirect('/admin?error=not_found');
    await prisma.post.update({ where: { id: post.id }, data: { urgent: !post.urgent } });
    await logAction('urgent', req.authUser, { postId: post.id, details: `${post.urgent ? 'Removed urgent' : 'Marked urgent'} "${post.title}"` });
  } catch (err) {
    console.error('Urgent error:', err.message);
  }
  res.redirect('/admin?tab=board');
});

// ─── Expire Now ─────────────────────────────────────────

router.post('/expire/:id', async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    await prisma.post.update({ where: { id: req.params.id }, data: { status: 'EXPIRED' } });
    await logAction('expire', req.authUser, { postId: req.params.id, details: post ? `Expired "${post.title}"` : 'Expired post' });
  } catch (err) {
    console.error('Expire error:', err.message);
  }
  res.redirect('/admin?tab=board');
});

// ─── Delete ─────────────────────────────────────────────

router.post('/delete/:id', async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    await prisma.post.update({ where: { id: req.params.id }, data: { status: 'DELETED' } });
    await logAction('delete', req.authUser, { postId: req.params.id, details: post ? `Deleted "${post.title}"` : 'Deleted post' });
  } catch (err) {
    console.error('Delete error:', err.message);
  }
  res.redirect('/admin?tab=board');
});

// ─── Board Notes Composer ───────────────────────────────

router.post('/notes', async (req, res) => {
  try {
    const title = sanitize(req.body.title || '').substring(0, 100);
    const desc = sanitizeRichText(req.body.desc || '');
    if (!title || !desc) return res.redirect('/admin?error=notes_empty&tab=notes');

    const post = await prisma.post.create({
      data: {
        title, desc, location: null,
        section: 'BOARD_NOTES', status: 'LIVE',
        modPost: true, approvedAt: new Date(),
      },
    });
    await logAction('board_note', req.authUser, { postId: post.id, details: `Published board note "${title}"` });
  } catch (err) {
    console.error('Board note error:', err.message);
  }
  res.redirect('/admin?tab=notes');
});

// ─── Mod Notes ──────────────────────────────────────────

router.post('/modnote/:id', async (req, res) => {
  try {
    const modNote = sanitize(req.body.modNote || '').substring(0, 1000);
    await prisma.post.update({ where: { id: req.params.id }, data: { modNote } });
    await logAction('mod_note', req.authUser, { postId: req.params.id, details: 'Updated mod note' });
  } catch (err) {
    console.error('Mod note error:', err.message);
  }
  res.redirect('/admin?tab=board');
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
      data: { title: prev.title, desc: prev.desc, editedAt: new Date(), descHistory: history },
    });
    await logAction('undo', req.authUser, { postId: post.id, details: `Undid edit on "${post.title}"` });
  } catch (err) {
    console.error('Undo error:', err.message);
  }
  res.redirect('/admin?tab=board');
});

// ─── In-Editor AI Rewrite (API endpoint for Tiptap button) ─

// Shared helper: call LLM for rewrite, convert result to HTML
async function performRewrite(content) {
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  const basePrompt = settings?.rewritePrompt || 'Rewrite this text to be clear, concise, and factual. Fix grammar and spelling. Maintain the original meaning.';
  const prompt = `${basePrompt}\n\nIMPORTANT: Respond with ONLY the rewritten text. Do not add explanations, commentary, or notes about what you changed. Do not wrap your response in code fences.\n\nText to rewrite:\n${content}`;

  const result = await require('../lib/openrouter').chatCompletion({
    model: settings?.rewriteModel || 'anthropic/claude-3.5-haiku',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
  });

  if (!result) return null;
  // Convert markdown → HTML for Tiptap compatibility
  return mdToHtml(result);
}

router.post('/api/rewrite-editor', async (req, res) => {
  try {
    // Super admin bypass (no limits)
    if (req.isSuperAdmin) {
      const content = req.body.content || '';
      const rewritten = await performRewrite(content);
      return res.json({ success: true, rewritten: rewritten || content });
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
    
    // If no postId, this is new content (board notes or submit) - no rate limiting, no logging
    if (!postId) {
      const content = req.body.content || '';
      const rewritten = await performRewrite(content);
      if (!rewritten) return res.status(500).json({ error: 'LLM rewrite failed' });
      return res.json({ success: true, rewritten });
    }

    // If postId provided, enforce limits
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
      where: { modId: mod.id, createdAt: { gte: oneHourAgo } },
    });

    if (recentRewrites >= mod.rewriteLimitPerHour) {
      return res.status(429).json({ error: `Hourly rewrite limit reached (${mod.rewriteLimitPerHour}/hour)` });
    }

    // Perform rewrite
    const content = req.body.content || '';
    const rewritten = await performRewrite(content);
    if (!rewritten) return res.status(500).json({ error: 'LLM rewrite failed' });

    // Log rewrite and increment post counter
    await prisma.$transaction([
      prisma.rewriteLog.create({ data: { postId: post.id, modId: mod.id } }),
      prisma.post.update({ where: { id: post.id }, data: { rewriteCount: { increment: 1 } } }),
    ]);

    res.json({ success: true, rewritten });
  } catch (err) {
    console.error('Editor rewrite error:', err.message);
    res.status(500).json({ error: 'Rewrite failed' });
  }
});

// ─── Archive ────────────────────────────────────────────

router.post('/restore/:id', async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    await prisma.post.update({ where: { id: req.params.id }, data: { status: 'PENDING' } });
    await logAction('restore', req.authUser, { postId: req.params.id, details: post ? `Restored "${post.title}" to pending` : 'Restored post' });
  } catch (err) {
    console.error('Restore error:', err.message);
  }
  res.redirect('/admin?tab=archive');
});

router.post('/purge/:id', async (req, res) => {
  try {
    const post = await prisma.post.findUnique({ where: { id: req.params.id } });
    await prisma.post.delete({ where: { id: req.params.id } });
    await logAction('purge', req.authUser, { postId: req.params.id, details: post ? `Purged "${post.title}"` : 'Purged post' });
  } catch (err) {
    console.error('Purge error:', err.message);
  }
  res.redirect('/admin?tab=archive');
});

// ─── Block List ─────────────────────────────────────────

router.post('/block/:submitterId', async (req, res) => {
  try {
    const submitterId = parseInt(req.params.submitterId);
    if (isNaN(submitterId)) return res.redirect('/admin?error=invalid_id&tab=blocklist');

    const submitter = await prisma.submitter.findUnique({ where: { id: submitterId } });
    if (!submitter) return res.redirect('/admin?error=submitter_not_found&tab=blocklist');

    const blockAction = req.body.blockAction === 'FLAG' ? 'FLAG' : 'REJECT';
    const blockReason = sanitize(req.body.blockReason || '').substring(0, 200);

    await prisma.submitter.update({
      where: { id: submitterId },
      data: {
        blocked: true,
        blockAction,
        blockedAt: new Date(),
        blockedBy: req.authUser,
        blockReason: blockReason || null,
      },
    });

    await logAction('block', req.authUser, { targetId: String(submitterId), details: `Blocked User #${submitterId} (${blockAction})${blockReason ? ': ' + blockReason : ''}` });
  } catch (err) {
    console.error('Block error:', err.message);
  }
  res.redirect('/admin?tab=blocklist&msg=user_blocked');
});

router.post('/unblock/:submitterId', async (req, res) => {
  try {
    const submitterId = parseInt(req.params.submitterId);
    if (isNaN(submitterId)) return res.redirect('/admin?error=invalid_id&tab=blocklist');

    await prisma.submitter.update({
      where: { id: submitterId },
      data: {
        blocked: false,
        blockAction: null,
        blockedAt: null,
        blockedBy: null,
        blockReason: null,
      },
    });

    await logAction('unblock', req.authUser, { targetId: String(submitterId), details: `Unblocked User #${submitterId}` });
  } catch (err) {
    console.error('Unblock error:', err.message);
  }
  res.redirect('/admin?tab=blocklist&msg=user_unblocked');
});

// Export AVAILABLE_MODELS so super.js can use it
module.exports = router;
module.exports.AVAILABLE_MODELS = AVAILABLE_MODELS;
