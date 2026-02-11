const crypto = require('crypto');
const prisma = require('./db');

const SUPER_USER = process.env.SUPER_ADMIN_USER || 'super';
const SUPER_PASS = process.env.SUPER_ADMIN_PASS;

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function parseBasicAuth(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Basic ')) return null;
  const decoded = Buffer.from(auth.split(' ')[1], 'base64').toString();
  const parts = decoded.split(':');
  return { user: parts[0], pass: parts.slice(1).join(':') };
}

function sendAuthChallenge(res, realm) {
  res.setHeader('WWW-Authenticate', `Basic realm="${realm}"`);
  return res.status(401).send('Authentication required');
}

// Super admin: checks env vars only
function requireSuperAdmin(req, res, next) {
  if (!SUPER_PASS) return res.status(503).send('Super admin not configured');
  const creds = parseBasicAuth(req);
  if (!creds) return sendAuthChallenge(res, 'Super Admin');
  if (creds.user !== SUPER_USER || creds.pass !== SUPER_PASS) {
    return sendAuthChallenge(res, 'Super Admin');
  }
  next();
}

// Mod: checks DB Mod table. Super admin creds also grant access.
async function requireMod(req, res, next) {
  const creds = parseBasicAuth(req);
  if (!creds) return sendAuthChallenge(res, 'Valle Vista Commons Admin');

  // Check super admin first
  if (SUPER_PASS && creds.user === SUPER_USER && creds.pass === SUPER_PASS) {
    req.isSuperAdmin = true;
    return next();
  }

  // Check Mod table
  try {
    const mod = await prisma.mod.findUnique({ where: { username: creds.user } });
    if (!mod || !mod.active) return sendAuthChallenge(res, 'Valle Vista Commons Admin');
    if (mod.passHash !== hashPassword(creds.pass)) {
      return sendAuthChallenge(res, 'Valle Vista Commons Admin');
    }
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    return sendAuthChallenge(res, 'Valle Vista Commons Admin');
  }
}

module.exports = { requireMod, requireSuperAdmin, hashPassword, parseBasicAuth };
