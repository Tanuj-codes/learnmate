import { defineConfig } from 'vitest/config';
import { jwtSecret, testDatabaseUrl } from './test/databaseUrl.js';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: './test/globalSetup.js',
    setupFiles: ['./test/setup.js'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl,
      JWT_SECRET: jwtSecret,
      BCRYPT_ROUNDS: '10',
      CLIENT_ORIGIN: 'http://localhost:5173',
    },
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    fileParallelism: false,
    testTimeout: 90000,
    hookTimeout: 120000,
  },
});
