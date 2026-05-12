import 'dotenv/config';
import 'reflect-metadata';
import { CKPoolAPI, CKPoolError, CKPoolErrorCode } from '../lib/ckpool';
import { getDb } from '../lib/db';
import { User } from '../lib/entities/User';
import { UserStats } from '../lib/entities/UserStats';
import { Worker } from '../lib/entities/Worker';
import { WorkerStats } from '../lib/entities/WorkerStats';
import { convertHashrate } from '../utils/helpers';

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

interface UsersData {
  address: string;
  userData?: unknown;
  error?: unknown;
}

async function main() {
  let db;
  try {
    db = await getDb();
    const userRepository = db.getRepository(User);
    const ckPoolApi = new CKPoolAPI();

    const users = await userRepository.find({
      where: { isActive: true },
      order: { address: 'ASC' },
    });

    if (users.length === 0) {
      console.log('No active users found');
      return;
    }

    const fetched = await ckPoolApi.users(users.map(u => u.address)) as UsersData[];

    await db.transaction(async (manager) => {
      const userStatsRepo = manager.getRepository(UserStats);
      const workerStatsRepo = manager.getRepository(WorkerStats);

      const userChanges: { address: string; authorised?: string; isActive: boolean }[] = [];
      const userStatsToInsert: any[] = [];
      const workerUpsertValues: any[] = [];

      // Process fetched user data from CKPool
      for (const result of fetched) {
        const address = result.address;
        if (result.error || !result.userData) {
          if (result.error instanceof CKPoolError && result.error.code === CKPoolErrorCode.NOT_FOUND) {
            userChanges.push({ address, isActive: false });
            console.log(`Marked user ${address} as inactive (NOT_FOUND)`);
          } else {
            console.error(`Skipping user ${address} due to fetch error:`, (result.error as Error)?.message || 'Unknown error');
          }
          continue;
        }

        const userData = result.userData as UserData;

        userChanges.push({
          address,
          authorised: userData.authorised.toString(),
          isActive: true,
        });

        userStatsToInsert.push({
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

        // Extract worker data for each user
        for (const workerData of (userData.worker || [])) {
          const workername = workerData.workername;
          const workerName = workername.includes('.')
            ? workername.split('.')[1]
            : workername.includes('_')
              ? workername.split('_')[1]
              : workername;

          const workerValues = {
            userAddress: address,
            name: workerName,
            hashrate1m: convertHashrate(workerData.hashrate1m.toString()).toString(),
            hashrate5m: convertHashrate(workerData.hashrate5m.toString()).toString(),
            hashrate1hr: convertHashrate(workerData.hashrate1hr.toString()).toString(),
            hashrate1d: convertHashrate(workerData.hashrate1d.toString()).toString(),
            hashrate7d: convertHashrate(workerData.hashrate7d.toString()).toString(),
            lastUpdate: new Date(workerData.lastshare * 1000),
            shares: BigInt(workerData.shares).toString(),
            bestShare: parseFloat(workerData.bestshare),
            bestEver: BigInt(workerData.bestever).toString(),
            updatedAt: new Date(),
          };

          workerUpsertValues.push(workerValues);
        }
      }

      let usersUpdated = 0;
      let workersUpserted = 0;
      let userStatsInserted = userStatsToInsert.length;
      let workerStatsInserted = 0;

      // 1. One SQL update for all users
      if (userChanges.length > 0) {
        const valuesStr = userChanges.map(c => {
          const authValue = c.authorised !== undefined
            ? `'${c.authorised}'`
            : 'NULL';
          return `('${c.address}', ${authValue}, ${c.isActive})`;
        }).join(', ');

        const result = await manager.query(`
          UPDATE "User" AS u
          SET
            authorised = COALESCE(v.authorised::bigint, u.authorised),
            "isActive" = v.isActive,
            "updatedAt" = NOW()
          FROM (VALUES ${valuesStr}) AS v (address, authorised, isActive)
          WHERE u.address = v.address;
        `);
        usersUpdated = result[0]?.rowCount ?? userChanges.length;
      }

      // 2. One SQL upsert for all workers + prepare workerStats
      const workerStatsToInsert: any[] = [];
      if (workerUpsertValues.length > 0) {
        const valuesStr = workerUpsertValues.map(v => {
          const safeName = v.name.replace(/'/g, "''");
          return `('${v.userAddress}', '${safeName}', '${v.updatedAt.toISOString()}', 
                  '${v.hashrate1m}', '${v.hashrate5m}', '${v.hashrate1hr}', 
                  '${v.hashrate1d}', '${v.hashrate7d}', '${v.lastUpdate.toISOString()}', 
                  '${v.shares}', ${v.bestShare}, '${v.bestEver}')`;
        }).join(', ');

        const result = await manager.query(`
          INSERT INTO "Worker" ("userAddress", "name", "updatedAt", "hashrate1m", 
                               "hashrate5m", "hashrate1hr", "hashrate1d", "hashrate7d", 
                               "lastUpdate", "shares", "bestShare", "bestEver")
          VALUES ${valuesStr}
          ON CONFLICT ON CONSTRAINT "UQ_Worker_User_Name"
          DO UPDATE SET
            "hashrate1m" = EXCLUDED."hashrate1m",
            "hashrate5m" = EXCLUDED."hashrate5m",
            "hashrate1hr" = EXCLUDED."hashrate1hr",
            "hashrate1d" = EXCLUDED."hashrate1d",
            "hashrate7d" = EXCLUDED."hashrate7d",
            "lastUpdate" = EXCLUDED."lastUpdate",
            "shares" = EXCLUDED."shares",
            "bestShare" = EXCLUDED."bestShare",
            "bestEver" = EXCLUDED."bestEver",
            "updatedAt" = EXCLUDED."updatedAt"
          RETURNING id, "userAddress", name;
        `);

        workersUpserted = result.length;

        // Build workerStats from returned worker ids
        const statsMap = new Map<string, any>();
        for (const w of workerUpsertValues) {
          const key = `${w.userAddress}|${w.name}`;
          statsMap.set(key, {
            hashrate1m: w.hashrate1m,
            hashrate5m: w.hashrate5m,
            hashrate1hr: w.hashrate1hr,
            hashrate1d: w.hashrate1d,
            hashrate7d: w.hashrate7d,
            shares: w.shares,
            bestShare: w.bestShare,
            bestEver: w.bestEver,
          });
        }

        for (const row of result) {
          const key = `${row.userAddress}|${row.name}`;
          const statsData = statsMap.get(key);
          if (statsData) {
            workerStatsToInsert.push({ workerId: Number(row.id), ...statsData });
          }
        }
        workerStatsInserted = workerStatsToInsert.length;
      }

      // 3. One SQL insert for all userStats
      if (userStatsToInsert.length > 0) {
        await userStatsRepo.insert(userStatsToInsert);
      }

      // 4. One SQL insert for all workerStats
      if (workerStatsToInsert.length > 0) {
        await workerStatsRepo.insert(workerStatsToInsert);
      }

      // Print statistics
      console.log(`Updated: ${usersUpdated} users | ${workersUpserted} workers | ${userStatsInserted} userStats | ${workerStatsInserted} workerStats`);
    });

    console.log('All updates committed successfully.');
  } catch (error) {
    console.error('Error in main:', error);
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