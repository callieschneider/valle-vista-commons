const crypto = require('crypto');
const prisma = require('./db');

const SUPER_USER = process.env.SUPER_ADMIN_USER || 'super';
const SUPER_PASS = process.env.SUPER_ADMIN_PASS;
const COOKIE_NAME = 'vvc_auth';
const COOKIE_SECRET = process.env.COOKIE_SECRET || crypto.randomBytes(32).toString('hex');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Sign a value with HMAC so we can verify it hasn't been tampered with
function signToken(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', COOKIE_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expected = crypto.createHmac('sha256', COOKIE_SECRET).update(data).digest('base64url');
  if (sig !== expected) return null;
  try {
    return JSON.parse(Buffer.from(data, 'base64url').toString());
  } catch {
    return null;
  }
}

function setAuthCookie(res, payload) {
  const token = signToken(payload);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    path: '/',
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

function getAuthFromCookie(req) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  return verifyToken(token);
}

function parseBasicAuth(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Basic ')) return null;
  const decoded = Buffer.from(auth.split(' ')[1], 'base64').toString();
  const parts = decoded.split(':');
  return { user: parts[0], pass: parts.slice(1).join(':') };
}

// Super admin: checks env vars only
function requireSuperAdmin(req, res, next) {
  if (!SUPER_PASS) return res.status(503).send('Super admin not configured');

  // Check cookie first
  const cookieAuth = getAuthFromCookie(req);
  if (cookieAuth && cookieAuth.isSuperAdmin) return next();

  // Fall back to Basic Auth
  const creds = parseBasicAuth(req);
  if (!creds) return res.redirect('/admin/login');
  if (creds.user !== SUPER_USER || creds.pass !== SUPER_PASS) {
    return res.redirect('/admin/login');
  }
  next();
}

// Mod: checks DB Mod table. Super admin creds also grant access.
async function requireMod(req, res, next) {
  // 1. Check cookie auth first
  const cookieAuth = getAuthFromCookie(req);
  if (cookieAuth) {
    if (cookieAuth.isSuperAdmin) {
      req.isSuperAdmin = true;
      req.authUser = cookieAuth.username;
      req.modId = null;
      return next();
    }
    if (cookieAuth.modId) {
      try {
        const mod = await prisma.mod.findUnique({ where: { id: cookieAuth.modId } });
        if (mod && mod.active) {
          req.mod = mod;
          req.modId = mod.id;
          req.authUser = mod.username;
          return next();
        }
      } catch (err) {
        console.error('Cookie auth error:', err.message);
      }
    }
    // Cookie invalid/expired — fall through to login
  }

  // 2. Fall back to Basic Auth (for API calls, curl, etc.)
  const creds = parseBasicAuth(req);
  if (!creds) return res.redirect('/admin/login');

  // Check super admin first
  if (SUPER_PASS && creds.user === SUPER_USER && creds.pass === SUPER_PASS) {
    req.isSuperAdmin = true;
    req.authUser = SUPER_USER;
    req.modId = null;
    return next();
  }

  // Check Mod table
  try {
    const mod = await prisma.mod.findUnique({ where: { username: creds.user } });
    if (!mod || !mod.active) return res.redirect('/admin/login');
    if (mod.passHash !== hashPassword(creds.pass)) {
      return res.redirect('/admin/login');
    }
    req.mod = mod;
    req.modId = mod.id;
    req.authUser = mod.username;
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    return res.redirect('/admin/login');
  }
}

module.exports = {
  requireMod,
  requireSuperAdmin,
  hashPassword,
  parseBasicAuth,
  setAuthCookie,
  clearAuthCookie,
  getAuthFromCookie,
  COOKIE_NAME,
};
