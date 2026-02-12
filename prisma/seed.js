const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.siteSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      boardName: 'Valle Vista Commons',
      boardTagline: 'Your neighborhood board',
      analysisModel: 'anthropic/claude-3.5-haiku',
      rewriteModel: 'anthropic/claude-3.5-haiku',
      aboutText: 'Valle Vista Commons is a privacy-first community board for our neighborhood. No accounts, no tracking, no personal information collected.',
    },
  });
  console.log('Seeded SiteSettings');
}

main().catch(console.error).finally(() => prisma.$disconnect());
