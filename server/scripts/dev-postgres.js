/**
 * Local development PostgreSQL using the embedded-postgres package.
 * This is a convenience for machines without PostgreSQL installed. In
 * production use a managed PostgreSQL URL (Neon/Supabase/Railway) in server/.env.
 */
import fs from 'fs';
import path from 'path';
import EmbeddedPostgres from 'embedded-postgres';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const fallbackUrl = 'postgresql://learnmate:learnmate@127.0.0.1:55432/learnmate?schema=public';
const url = new URL(process.env.DATABASE_URL || fallbackUrl);
const database = decodeURIComponent(url.pathname.replace(/^\//, '')) || 'learnmate';
const port = Number(url.port || 5432);
const user = decodeURIComponent(url.username) || 'learnmate';
const password = decodeURIComponent(url.password) || 'learnmate';
const dataDir = path.resolve(process.cwd(), '.pgdata');

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  port,
  user,
  password,
  persistent: true,
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
});

const initialized = fs.existsSync(path.join(dataDir, 'PG_VERSION'));

try {
  if (!initialized) {
    console.log(`Initialising PostgreSQL data directory at ${dataDir}`);
    await pg.initialise();
  }
  await pg.start();

  try {
    await pg.createDatabase(database);
    console.log(`Created database "${database}"`);
  } catch {
    console.log(`Database "${database}" already exists`);
  }

  console.log(`Embedded PostgreSQL is running on port ${port} (database: ${database})`);
  console.log('Press Ctrl+C to stop.');

  const keepAlive = setInterval(() => {}, 60 * 60 * 1000);
  const shutdown = async () => {
    clearInterval(keepAlive);
    console.log('\nStopping embedded PostgreSQL...');
    await pg.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (error) {
  console.error('Embedded PostgreSQL failed to start:', error);
  process.exit(1);
}
