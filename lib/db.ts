import 'reflect-metadata';
import { DataSource } from 'typeorm';

import { PoolStats } from './entities/PoolStats';
import { User } from './entities/User';
import { UserStats } from './entities/UserStats';
import { Worker } from './entities/Worker';
import { WorkerStats } from './entities/WorkerStats';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'postgres',
  entities: [PoolStats, User, UserStats, Worker, WorkerStats],
  logging: process.env.NODE_ENV === 'development',
  ssl:
    process.env.DB_SSL === 'true'
      ? {
          rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true',
        }
      : false,
  extra: {
    max: 20,
    min: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  },
});

let connectionPromise: Promise<DataSource> | null = null;

/**
 * Retrieves (or initializes) the shared TypeORM DataSource instance for the
 * PostgreSQL database.
 *
 * **Runtime recovery behavior**:
 * - If the database becomes unavailable after successful initialization
 *   (e.g., restart, network issue, failover),
 *   the underlying `pg` connection pool automatically detects and discards
 *   broken connections when they are used.
 * - New connections are created transparently on the next query (as long as
 *   the database is reachable and
 *   the pool has not reached its `max` limit).
 * - This means the **first query after an outage will typically fail**, but
 *   subsequent queries should succeed automatically once the database recovers.
 *
 * @returns {Promise<DataSource>} A promise that resolves to the initialized
 *                                TypeORM DataSource.
 *                               Rejects if initialization fails (and clears
 *                               the promise for retry on next call).
 */

export async function getDb() {
  // On first call we init.  Note that only one concurrent caller
  // can get into this code block
  if (!connectionPromise) {
    connectionPromise = AppDataSource.initialize()
      .then((connection) => {
        return connection;
      })
      .catch((error) => {
        console.error('Database connection error:', error);
        connectionPromise = null;
        throw error;
      });
  }

  // If someone concurrently calls getDb() before we complete init,
  // then this will suspend them till that init has finished.
  return await connectionPromise;
}
