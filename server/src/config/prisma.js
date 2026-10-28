import { PrismaClient } from '@prisma/client';
import config from './env.js';

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__learnmatePrisma ??
  new PrismaClient({
    log: config.isProduction ? ['error'] : ['warn', 'error'],
  });

if (!config.isProduction) {
  globalForPrisma.__learnmatePrisma = prisma;
}

export default prisma;
