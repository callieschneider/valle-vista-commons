const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['warn', 'error'],
});

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
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
  }
}));
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: '10kb' }));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// --- Health check ---
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Public feed ---
app.get('/', async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      where: {
        status: 'live',
        createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }
      },
      orderBy: { approvedAt: 'desc' }
    });
    res.render('index', { posts });
  } catch (err) {
    console.error('Feed error:', err.message);
    res.render('index', { posts: [] });
  }
});

// --- Startup ---
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
  });
}

start();

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
