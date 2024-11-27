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
  ssl: {
    rejectUnauthorized: false,
  },
});

let connectionPromise: Promise<DataSource> | null = null;

export async function getDb() {
  if (!connectionPromise) {
    connectionPromise = AppDataSource.initialize()
      .then((connection) => {
        return connection;
      })
      .catch((error) => {
        connectionPromise = null;
        throw error;
      });
  }
  return connectionPromise;
}

export default AppDataSource;
