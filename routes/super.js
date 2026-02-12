const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const prisma = require('../lib/db');
const { requireSuperAdmin, hashPassword } = require('../lib/auth');
const { chatCompletion } = require('../lib/openrouter');
const { upload, UPLOAD_DIR } = require('../lib/upload');
const { AVAILABLE_MODELS } = require('./admin');

// Apply super admin auth to all routes
router.use(requireSuperAdmin);

// ─── Dashboard → Redirect to consolidated admin ─────────

router.get('/', (req, res) => {
  res.redirect('/admin?tab=moderators');
});

// ─── Mod CRUD ───────────────────────────────────────────

router.post('/mods/create', async (req, res) => {
  try {
    const username = (req.body.username || '').trim().toLowerCase();
    const password = req.body.password || '';

    if (!/^[a-z0-9_]{3,30}$/.test(username)) {
      return res.redirect('/admin?error=invalid_username&tab=moderators');
    }
    if (password.length < 8) {
      return res.redirect('/admin?error=password_short&tab=moderators');
    }

    const existing = await prisma.mod.findUnique({ where: { username } });
    if (existing) return res.redirect('/admin?error=username_taken&tab=moderators');

    await prisma.mod.create({
      data: { username, passHash: hashPassword(password) },
    });

    // Audit log
    try {
      await prisma.auditLog.create({
        data: { action: 'create_mod', modUser: 'super', details: `Created mod "${username}"` },
      });
    } catch (e) { /* non-critical */ }

    res.redirect('/admin?tab=moderators&msg=mod_created');
  } catch (err) {
    console.error('Create mod error:', err.message);
    res.redirect('/admin?error=mod_create_failed&tab=moderators');
  }
});

router.post('/mods/:id/toggle', async (req, res) => {
  try {
    const mod = await prisma.mod.findUnique({ where: { id: req.params.id } });
    if (!mod) return res.redirect('/admin?error=mod_not_found&tab=moderators');
    await prisma.mod.update({ where: { id: mod.id }, data: { active: !mod.active } });

    try {
      await prisma.auditLog.create({
        data: { action: 'toggle_mod', modUser: 'super', targetId: mod.id, details: `${mod.active ? 'Disabled' : 'Enabled'} mod "${mod.username}"` },
      });
    } catch (e) { /* non-critical */ }
  } catch (err) {
    console.error('Toggle mod error:', err.message);
  }
  res.redirect('/admin?tab=moderators');
});

router.post('/mods/:id/delete', async (req, res) => {
  try {
    const mod = await prisma.mod.findUnique({ where: { id: req.params.id } });
    await prisma.mod.delete({ where: { id: req.params.id } });

    try {
      await prisma.auditLog.create({
        data: { action: 'delete_mod', modUser: 'super', targetId: req.params.id, details: mod ? `Deleted mod "${mod.username}"` : 'Deleted mod' },
      });
    } catch (e) { /* non-critical */ }
  } catch (err) {
    console.error('Delete mod error:', err.message);
  }
  res.redirect('/admin?tab=moderators');
});

router.post('/mods/:id/rewrite-settings', async (req, res) => {
  try {
    const rewriteEnabled = req.body.rewriteEnabled === 'on';
    const rewriteLimitPerPost = parseInt(req.body.rewriteLimitPerPost) || 10;
    const rewriteLimitPerHour = parseInt(req.body.rewriteLimitPerHour) || 5;

    await prisma.mod.update({
      where: { id: req.params.id },
      data: {
        rewriteEnabled,
        rewriteLimitPerPost: Math.max(1, Math.min(50, rewriteLimitPerPost)),
        rewriteLimitPerHour: Math.max(1, Math.min(100, rewriteLimitPerHour)),
      },
    });
  } catch (err) {
    console.error('Update rewrite settings error:', err.message);
  }
  res.redirect('/admin?tab=moderators');
});

// ─── LLM Settings ───────────────────────────────────────

router.post('/settings/llm', async (req, res) => {
  try {
    let analysisModel = req.body.analysisModel;
    let rewriteModel = req.body.rewriteModel;
    const rewritePrompt = (req.body.rewritePrompt || '').trim() || null;

    // Custom model override
    const customAnalysis = (req.body.customAnalysisModel || '').trim();
    const customRewrite = (req.body.customRewriteModel || '').trim();

    // If custom model provided and looks valid (contains /), use it
    if (customAnalysis && customAnalysis.includes('/')) {
      analysisModel = customAnalysis;
    }
    if (customRewrite && customRewrite.includes('/')) {
      rewriteModel = customRewrite;
    }

    // Validate: either in curated list or a custom model (contains /)
    const validIds = AVAILABLE_MODELS.map(m => m.id);
    if (!validIds.includes(analysisModel) && !analysisModel.includes('/')) {
      return res.redirect('/admin?error=invalid_model&tab=settings');
    }
    if (!validIds.includes(rewriteModel) && !rewriteModel.includes('/')) {
      return res.redirect('/admin?error=invalid_model&tab=settings');
    }

    await prisma.siteSettings.update({
      where: { id: 'default' },
      data: {
        analysisModel,
        rewriteModel,
        rewritePrompt,
        customAnalysisModel: customAnalysis || null,
        customRewriteModel: customRewrite || null,
      },
    });

    try {
      await prisma.auditLog.create({
        data: { action: 'update_llm', modUser: 'super', details: `Analysis: ${analysisModel}, Rewrite: ${rewriteModel}` },
      });
    } catch (e) { /* non-critical */ }

    res.redirect('/admin?tab=settings&msg=llm_saved');
  } catch (err) {
    console.error('Save LLM settings error:', err.message);
    res.redirect('/admin?error=save_failed&tab=settings');
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
      res.redirect('/admin?tab=settings&msg=llm_ok');
    } else {
      res.redirect('/admin?error=llm_failed&tab=settings');
    }
  } catch (err) {
    console.error('LLM test error:', err.message);
    res.redirect('/admin?error=llm_failed&tab=settings');
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

    try {
      await prisma.auditLog.create({
        data: { action: 'update_site', modUser: 'super', details: `Updated site: "${boardName}"` },
      });
    } catch (e) { /* non-critical */ }

    res.redirect('/admin?tab=settings&msg=site_saved');
  } catch (err) {
    console.error('Site settings error:', err.message);
    res.redirect('/admin?error=site_save_failed&tab=settings');
  }
});

// ─── File Sync (upload with exact filename) ─────────────

router.post('/sync-upload', upload.single('file'), (req, res) => {
  try {
    const filename = req.query.filename;
    if (!filename || !req.file) {
      return res.status(400).json({ error: 'file and ?filename= required' });
    }
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
