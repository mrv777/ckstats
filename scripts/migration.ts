import 'dotenv/config';
import { getDb } from '../lib/db_migration';

async function runMigrations() {
  console.log('Running migrations...');
  try {
    const dataSource = await getDb();
    
    const skipInitial = process.argv.includes('--skip-initial');
    
    if (skipInitial) {
      const initialMigrationName = 'InitialMigration1710000000000';
      // Check if the migration is already recorded
      const existingMigrations = await dataSource.query(
        'SELECT * FROM migrations WHERE name = $1',
        [initialMigrationName]
      );
      if (existingMigrations.length === 0) {
        // Insert the initial migration using timestamp as bigint (milliseconds since epoch)
        await dataSource.query(
          'INSERT INTO migrations (timestamp, name) VALUES ($1, $2)',
          ['1710000000000', initialMigrationName]
        );
        console.log(`Skipped migration: ${initialMigrationName}`);
      } else {
        console.log(`Migration ${initialMigrationName} is already marked as executed.`);
      }
    }
    
    // Run pending migrations
    const migrations = await dataSource.runMigrations({
      transaction: 'each'
    });
    
    if (migrations.length === 0) {
      console.log('\nNo pending migrations to run');
    } else {
      console.log('\nNewly applied migrations:');
      migrations.forEach(migration => {
        console.log(`- ${migration.name}`);
      });
    }
    
    console.log('Migration process completed');
    await dataSource.destroy();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations().catch(console.error); 