const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const prisma = require('../lib/db');
const { requireSuperAdmin, hashPassword } = require('../lib/auth');
const { chatCompletion } = require('../lib/openrouter');
const { upload, UPLOAD_DIR } = require('../lib/upload');

// Apply super admin auth to all routes
router.use(requireSuperAdmin);

// ─── Available LLM Models ───────────────────────────────

const AVAILABLE_MODELS = [
  { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', note: 'Fast, cheap' },
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', note: 'High quality' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', note: 'Fast, cheap' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', note: 'High quality' },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', note: 'Fast, cheap' },
  { id: 'google/gemini-2.5-pro-preview-06-05', name: 'Gemini 2.5 Pro', note: 'High quality' },
  { id: 'mistralai/mistral-small-3.1-24b-instruct', name: 'Mistral Small', note: 'Fast, cheap' },
  { id: 'deepseek/deepseek-chat-v3-0324', name: 'DeepSeek Chat v3', note: 'Very cheap' },
];

// ─── Dashboard ──────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const mods = await prisma.mod.findMany({ orderBy: { createdAt: 'desc' } });
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    const hasApiKey = !!process.env.OPENROUTER_API_KEY;

    res.render('super', {
      mods,
      settings,
      models: AVAILABLE_MODELS,
      hasApiKey,
      error: req.query.error || null,
      msg: req.query.msg || null,
    });
  } catch (err) {
    console.error('Super admin error:', err.message);
    res.render('super', { mods: [], settings: null, models: AVAILABLE_MODELS, hasApiKey: false, error: 'Failed to load panel', msg: null });
  }
});

// ─── Mod CRUD ───────────────────────────────────────────

router.post('/mods/create', async (req, res) => {
  try {
    const username = (req.body.username || '').trim().toLowerCase();
    const password = req.body.password || '';

    // Validate username: alphanumeric + underscore, 3-30 chars
    if (!/^[a-z0-9_]{3,30}$/.test(username)) {
      return res.redirect('/super?error=invalid_username');
    }

    // Validate password: 8+ chars
    if (password.length < 8) {
      return res.redirect('/super?error=password_short');
    }

    // Check uniqueness
    const existing = await prisma.mod.findUnique({ where: { username } });
    if (existing) return res.redirect('/super?error=username_taken');

    await prisma.mod.create({
      data: { username, passHash: hashPassword(password) },
    });

    res.redirect('/super?msg=mod_created');
  } catch (err) {
    console.error('Create mod error:', err.message);
    res.redirect('/super?error=mod_create_failed');
  }
});

router.post('/mods/:id/toggle', async (req, res) => {
  try {
    const mod = await prisma.mod.findUnique({ where: { id: req.params.id } });
    if (!mod) return res.redirect('/super?error=mod_not_found');
    await prisma.mod.update({ where: { id: mod.id }, data: { active: !mod.active } });
  } catch (err) {
    console.error('Toggle mod error:', err.message);
  }
  res.redirect('/super');
});

router.post('/mods/:id/delete', async (req, res) => {
  try {
    await prisma.mod.delete({ where: { id: req.params.id } });
  } catch (err) {
    console.error('Delete mod error:', err.message);
  }
  res.redirect('/super');
});

// ─── LLM Settings ───────────────────────────────────────

router.post('/settings/llm', async (req, res) => {
  try {
    const analysisModel = req.body.analysisModel;
    const rewriteModel = req.body.rewriteModel;

    // Validate models are in allowed list
    const validIds = AVAILABLE_MODELS.map(m => m.id);
    if (!validIds.includes(analysisModel) || !validIds.includes(rewriteModel)) {
      return res.redirect('/super?error=invalid_model');
    }

    await prisma.siteSettings.update({
      where: { id: 'default' },
      data: { analysisModel, rewriteModel },
    });

    res.redirect('/super?msg=llm_saved');
  } catch (err) {
    console.error('LLM settings error:', err.message);
    res.redirect('/super?error=llm_save_failed');
  }
});

router.post('/settings/llm-test', async (req, res) => {
  try {
    const settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
    const result = await chatCompletion({
      model: settings.analysisModel,
      messages: [{ role: 'user', content: 'Respond with exactly: OK' }],
      timeoutMs: 15000,
    });

    if (result) {
      res.redirect('/super?msg=llm_ok');
    } else {
      res.redirect('/super?error=llm_failed');
    }
  } catch (err) {
    console.error('LLM test error:', err.message);
    res.redirect('/super?error=llm_failed');
  }
});

// ─── Site Settings ──────────────────────────────────────

router.post('/settings/site', async (req, res) => {
  try {
    const boardName = (req.body.boardName || '').trim().substring(0, 100) || 'Valle Vista Commons';
    const boardTagline = (req.body.boardTagline || '').trim().substring(0, 200) || 'Your neighborhood board';
    const aboutText = (req.body.aboutText || '').trim().substring(0, 2000);

    await prisma.siteSettings.update({
      where: { id: 'default' },
      data: { boardName, boardTagline, aboutText },
    });

    res.redirect('/super?msg=site_saved');
  } catch (err) {
    console.error('Site settings error:', err.message);
    res.redirect('/super?error=site_save_failed');
  }
});

// ─── File Sync (upload with exact filename) ─────────────
// Super-admin-protected — used to sync local files to Railway volume

router.post('/sync-upload', upload.single('file'), (req, res) => {
  try {
    const filename = req.query.filename;
    if (!filename || !req.file) {
      return res.status(400).json({ error: 'file and ?filename= required' });
    }
    // Sanitize filename — only allow uuid-style names with extension
    if (!/^[a-f0-9\-]+\.\w+$/.test(filename)) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    const dest = path.join(UPLOAD_DIR, filename);
    fs.writeFileSync(dest, req.file.buffer);
    res.json({ ok: true, url: `/uploads/${filename}` });
  } catch (err) {
    console.error('Sync upload error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
