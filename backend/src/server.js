import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

// Environment validation at startup
const REQUIRED_ENV_VARS = ['DATABASE_URL', 'JWT_SECRET'];
for (const varName of REQUIRED_ENV_VARS) {
  if (!process.env[varName]) {
    console.error(`❌ Missing required environment variable: ${varName}`);
    process.exit(1);
  }
}

import { prisma } from './lib/prisma.js';
import app from './app.js';
import { getTodayCards, getMonthCards, getInventoryCards, getFinanceCards, getAlerts } from './modules/executive-dashboard/executive-dashboard.service.js';

const PORT = process.env.PORT || 3000;

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received — shutting down gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed');
    await prisma.$disconnect();
    console.log('Prisma disconnected');
    process.exit(0);
  });
  // Force exit after 10s
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

const server = app.listen(PORT, async () => {
  console.log(`🚀 Mizan POS Backend running on port ${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV}`);
  console.log(`📂 CWD: ${process.cwd()}`);
  console.log(`🗄️  DB: ${process.env.DATABASE_URL ? 'connected' : 'MISSING .env'}`);

  // Pre-warm Prisma connection pool immediately (no delay)
  try {
    await prisma.$connect();
    console.log('⚡ Prisma connected');
  } catch (err) {
    console.warn('⚠️ Prisma connection failed:', err.message);
  }

  // Warm cache immediately after connect
  console.log('🔥 Warming dashboard cache...');
  const results = await Promise.allSettled([
    getTodayCards(),
    getMonthCards(),
    getInventoryCards(),
    getFinanceCards(),
    getAlerts(),
  ]);
  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length === 0) {
    console.log('✅ Dashboard cache warmed');
  } else {
    console.warn(`⚠️ Dashboard cache warmup: ${failed.length}/${results.length} failed`);
    for (const f of failed) {
      console.warn(`  ⚠️ ${f.reason?.message || f.reason}`);
    }
  }
});

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));