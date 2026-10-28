import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

// Load server/.env so tests use the same local PostgreSQL credentials as dev.
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const base =
  process.env.DATABASE_URL ||
  'postgresql://learnmate:learnmate@127.0.0.1:55432/learnmate?schema=public';

function withDatabase(name) {
  const url = new URL(base);
  url.pathname = `/${name}`;
  return url.toString();
}

export const testDatabaseUrl = withDatabase('learnmate_test');
export const adminDatabaseUrl = withDatabase('postgres');
export const jwtSecret =
  process.env.JWT_SECRET || 'learnmate-test-secret-key-with-32-plus-characters';
