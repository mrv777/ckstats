import 'dotenv/config';
import 'reflect-metadata';
import * as fs from 'fs';
import { getDb } from '../lib/db';
import { User } from '../lib/entities/User';
import { UserStats } from '../lib/entities/UserStats';
import { Worker } from '../lib/entities/Worker';
import { WorkerStats } from '../lib/entities/WorkerStats';
import { convertHashrate } from '../utils/helpers';

const BATCH_SIZE = 10;
const WRITE_CONCURRENCY = 3;
const FETCH_TIMEOUT_MS = 10_000;

interface WorkerData {
  workername: string;
  hashrate1m: number;
  hashrate5m: number;
  hashrate1hr: number;
  hashrate1d: number;
  hashrate7d: number;
  lastshare: number;
  shares: string;
  bestshare: string;
  bestever: string;
}

interface UserData {
  authorised: number;
  hashrate1m: number;
  hashrate5m: number;
  hashrate1hr: number;
  hashrate1d: number;
  hashrate7d: number;
  lastshare: number;
  workers: number;
  shares: string;
  bestshare: string;
  bestever: string;
  worker: WorkerData[];
}

interface FetchResult {
  address: string;
  userData?: UserData;
  error?: unknown;
}

async function fetchUserData(address: string): Promise<FetchResult> {
  if (/[^a-zA-Z0-9]/.test(address)) {
    return { address, error: new Error('updateUsers(): address contains invalid characters') };
  }

  const apiUrl = `${process.env.API_URL || 'https://solo.ckpool.org'}/users/${address}`;

  try {
    const response = await fetch(apiUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const userData = (await response.json()) as UserData;
    return { address, userData };
  } catch (error: any) {
    if (error.cause?.code === 'ERR_INVALID_URL') {
      try {
        const userData = JSON.parse(fs.readFileSync(apiUrl, 'utf-8')) as UserData;
        return { address, userData };
      } catch (fsErr) {
        return { address, error: fsErr };
      }
    }
    return { address, error };
  }
}

async function markUserInactive(db: any, address: string, context: string): Promise<void> {
  try {
    await db.getRepository(User).update({ address }, { isActive: false });
    console.log(`Marked user ${address} as inactive (${context})`);
  } catch (error) {
    console.error(`Failed to mark user ${address} inactive (${context}):`, error);
  }
}

async function writeUserData(db: any, address: string, userData: UserData): Promise<void> {
  await db.transaction(async (manager: any) => {
    const userRepo = manager.getRepository(User);
    const userStatsRepo = manager.getRepository(UserStats);
    const workerRepo = manager.getRepository(Worker);
    const workerStatsRepo = manager.getRepository(WorkerStats);

    const existingUser = await userRepo.findOne({ where: { address } });
    if (existingUser) {
      existingUser.authorised = userData.authorised.toString();
      existingUser.isActive = true;
      await userRepo.save(existingUser);
    } else {
      await userRepo.insert({
        address,
        authorised: userData.authorised.toString(),
        isActive: true,
        updatedAt: new Date().toISOString(),
      });
    }

    const userStats = userStatsRepo.create({
      userAddress: address,
      hashrate1m: convertHashrate(userData.hashrate1m.toString()).toString(),
      hashrate5m: convertHashrate(userData.hashrate5m.toString()).toString(),
      hashrate1hr: convertHashrate(userData.hashrate1hr.toString()).toString(),
      hashrate1d: convertHashrate(userData.hashrate1d.toString()).toString(),
      hashrate7d: convertHashrate(userData.hashrate7d.toString()).toString(),
      lastShare: BigInt(userData.lastshare).toString(),
      workerCount: userData.workers,
      shares: BigInt(userData.shares).toString(),
      bestShare: parseFloat(userData.bestshare),
      bestEver: BigInt(userData.bestever).toString(),
    });
    await userStatsRepo.save(userStats);

    for (const workerData of userData.worker) {
      const workerName = workerData.workername.includes('.')
        ? workerData.workername.split('.')[1]
        : workerData.workername.includes('_')
          ? workerData.workername.split('_')[1]
          : workerData.workername;

      const existingWorker = await workerRepo.findOne({
        where: { userAddress: address, name: workerName },
      });

      const workerValues = {
        hashrate1m: convertHashrate(workerData.hashrate1m.toString()).toString(),
        hashrate5m: convertHashrate(workerData.hashrate5m.toString()).toString(),
        hashrate1hr: convertHashrate(workerData.hashrate1hr.toString()).toString(),
        hashrate1d: convertHashrate(workerData.hashrate1d.toString()).toString(),
        hashrate7d: convertHashrate(workerData.hashrate7d.toString()).toString(),
        lastUpdate: new Date(workerData.lastshare * 1000),
        shares: BigInt(workerData.shares).toString(),
        bestShare: parseFloat(workerData.bestshare),
        bestEver: BigInt(workerData.bestever).toString(),
      };

      let workerId: number;
      if (existingWorker) {
        Object.assign(existingWorker, workerValues);
        const savedWorker = await workerRepo.save(existingWorker);
        workerId = savedWorker.id;
      } else {
        const newWorker = await workerRepo.save({
          userAddress: address,
          name: workerName,
          updatedAt: new Date().toISOString(),
          ...workerValues,
        });
        workerId = newWorker.id;
      }

      const workerStats = workerStatsRepo.create({
        workerId,
        hashrate1m: workerValues.hashrate1m,
        hashrate5m: workerValues.hashrate5m,
        hashrate1hr: workerValues.hashrate1hr,
        hashrate1d: workerValues.hashrate1d,
        hashrate7d: workerValues.hashrate7d,
        shares: workerValues.shares,
        bestShare: workerValues.bestShare,
        bestEver: workerValues.bestEver,
      });
      await workerStatsRepo.save(workerStats);
    }
  });
}

async function processWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    await Promise.all(chunk.map(worker));
  }
}

async function main() {
  let db;

  try {
    db = await getDb();
    const userRepository = db.getRepository(User);

    const users = await userRepository.find({
      where: { isActive: true },
      order: { address: 'ASC' },
    });

    if (users.length === 0) {
      console.log('No active users found');
      return;
    }

    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      const batchNumber = i / BATCH_SIZE + 1;
      const totalBatches = Math.ceil(users.length / BATCH_SIZE);
      console.log(`Processing batch ${batchNumber} of ${totalBatches}`);

      const fetched = await Promise.all(batch.map((user) => fetchUserData(user.address)));

      const toWrite = fetched.filter((result): result is { address: string; userData: UserData } => !result.error && !!result.userData);
      const fetchFailed = fetched.filter((result) => result.error || !result.userData);

      for (const failed of fetchFailed) {
        await markUserInactive(db, failed.address, 'fetch error');
      }

      await processWithConcurrency(toWrite, WRITE_CONCURRENCY, async (result) => {
        try {
          await writeUserData(db, result.address, result.userData);
        } catch (error) {
          console.error(`Failed processing user ${result.address}:`, error);
          await markUserInactive(db, result.address, 'write error');
        }
      });

      console.log(`Batch ${batchNumber} completed.`);
    }
  } catch (error) {
    console.error('Error in main loop:', error);
    throw error;
  } finally {
    if (db) {
      try {
        await db.destroy();
        console.log('Database connection closed');
      } catch (error) {
        console.error('Error closing database connection:', error);
      }
    }
  }
}

main().catch(console.error);
