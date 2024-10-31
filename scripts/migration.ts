import { getDb } from '../lib/db';

async function runMigrations() {
  const dataSource = await getDb();
  await dataSource.runMigrations();
  await dataSource.destroy();
}

runMigrations().catch(console.error); 