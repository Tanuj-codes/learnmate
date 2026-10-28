import app from './app.js';
import config from './config/env.js';
import prisma from './config/prisma.js';

let server;

async function start() {
  try {
    await prisma.$connect();
    server = app.listen(config.PORT, () => {
      console.log(`LearnMate API listening on http://localhost:${config.PORT} (${config.NODE_ENV})`);
      console.log(`Health check: http://localhost:${config.PORT}/api/v1/health`);
    });
  } catch (error) {
    console.error('Failed to start the LearnMate API:', error.message);
    process.exitCode = 1;
    await prisma.$disconnect().catch(() => null);
  }
}

async function shutdown(signal) {
  console.log(`\n${signal} received. Closing connections...`);
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await prisma.$disconnect().catch(() => null);
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start();
