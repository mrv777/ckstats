import { DataSourceOptions } from 'typeorm';
import { PoolStats } from './lib/entities/PoolStats';
import { User } from './lib/entities/User';
import { UserStats } from './lib/entities/UserStats';
import { Worker } from './lib/entities/Worker';
import { WorkerStats } from './lib/entities/WorkerStats';

const config: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [PoolStats, User, UserStats, Worker, WorkerStats],
  migrations: ['migrations/*.ts'],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
  ssl: {
    rejectUnauthorized: false
  },
};

export default config; 