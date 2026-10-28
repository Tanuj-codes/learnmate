import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { adminDatabaseUrl, testDatabaseUrl } from './databaseUrl.js';

const { Client } = pg;

export default async function globalSetup() {
  const client = new Client({ connectionString: adminDatabaseUrl });
  await client.connect();
  try {
    const existing = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      'learnmate_test',
    ]);
    if (existing.rowCount === 0) {
      await client.query('CREATE DATABASE "learnmate_test"');
    }
  } finally {
    await client.end();
  }

  const prismaCli = fileURLToPath(
    new URL('../../node_modules/prisma/build/index.js', import.meta.url)
  );
  execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: 'inherit',
  });
}
