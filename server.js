if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const prisma = require('./lib/db');
const { UPLOAD_DIR } = require('./lib/upload');

// ─── Routes ──────────────────────────────────────────────
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const superRoutes = require('./routes/super');

// ─── Config ──────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;

// ─── Rate Limiters (in-memory, no IP logging) ───────────
const globalLimiter = new RateLimiterMemory({
  points: 120,    // 120 requests
  duration: 60,   // per 60 seconds
});

// ─── Health check (before all middleware) ────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://hcaptcha.com", "https://*.hcaptcha.com", "https://esm.sh", "https://unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com", "https://unpkg.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      frameSrc: ["https://hcaptcha.com", "https://*.hcaptcha.com"],
      connectSrc: ["'self'", "https://hcaptcha.com", "https://*.hcaptcha.com", "https://esm.sh", "https://nominatim.openstreetmap.org"],
      imgSrc: ["'self'", "data:", "https://*.tile.openstreetmap.org", "https://unpkg.com"],
      mediaSrc: ["'self'"],
    }
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors());
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

// Global rate limiter
app.use(async (req, res, next) => {
  try {
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

// Uploaded media (images/videos)
app.use('/uploads', express.static(UPLOAD_DIR));

// Disable x-powered-by
app.disable('x-powered-by');

// ─── Mount Routes ────────────────────────────────────────
app.use('/', publicRoutes);
app.use('/admin', adminRoutes);
app.use('/super', superRoutes);

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
    console.log(`  Board:  http://localhost:${PORT}`);
    console.log(`  Submit: http://localhost:${PORT}/submit`);
    console.log(`  Admin:  http://localhost:${PORT}/admin`);
    console.log(`  Super:  http://localhost:${PORT}/super`);
  });
}

start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
