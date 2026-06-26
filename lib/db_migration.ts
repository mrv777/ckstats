import 'reflect-metadata';
import { DataSource } from 'typeorm';

import { PoolStats } from './entities/PoolStats';
import { User } from './entities/User';
import { UserStats } from './entities/UserStats';
import { Worker } from './entities/Worker';
import { WorkerStats } from './entities/WorkerStats';

const AppDataSource = new DataSource({
  type: 'postgres',
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  host: process.env.DB_HOST?.trim() || 'localhost',
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  port: parseInt(process.env.DB_PORT?.trim() || '5432'),
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  username: process.env.DB_USER?.trim() || 'postgres',
  password: process.env.DB_PASSWORD ?? 'password',
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  database: process.env.DB_NAME?.trim() || 'postgres',
  entities: [PoolStats, User, UserStats, Worker, WorkerStats],
  migrations: ['migrations/*.ts'],
  logging: process.env.NODE_ENV === 'development',
  ssl:
    process.env.DB_SSL === 'true'
      ? {
          rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true',
        }
      : false,
});

let initialized = false;

export async function getDb() {
  if (!initialized) {
    await AppDataSource.initialize();
    initialized = true;
  }
  return AppDataSource;
}

export default AppDataSource;
