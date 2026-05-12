import 'dotenv/config';
import 'reflect-metadata';
import { CKPoolAPI, CKPoolError, CKPoolErrorCode } from '../lib/ckpool';
import { getDb } from '../lib/db';
import { User } from '../lib/entities/User';
import { UserStats } from '../lib/entities/UserStats';
import { Worker } from '../lib/entities/Worker';
import { WorkerStats } from '../lib/entities/WorkerStats';
import { convertHashrate } from '../utils/helpers';

/**
 * Raw worker payload returned by CKPool API for a single worker.
 */
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

/**
 * Raw user payload returned by CKPool API for a single address.
 */
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

/**
 * Result of a CKPool fetching all users, including success or error state.
 */
interface UsersData {
  address: string;
  userData?: unknown;
  error?: unknown;
}

/**
 * Build a map of user data from fetched CKPool results.
 * 
 * Transforms API responses into a structured map for batch processing.
 * Handles errors by marking users as inactive (NOT_FOUND) or skipping on other errors.
 * Extracts and normalizes worker data, converting hashrates and formatting worker names.
 * 
 * @param fetched - Array of API fetch results, each containing user data or error information
 * @returns Map with user addresses as keys and objects containing:
 *          - changes: user update data (address, authorised, isActive)
 *          - userStats: user stat record for insertion
 *          - workers: array of worker records for this user
 */
function buildUserDataMap(fetched: UsersData[]): Map<string, {
  changes: { address: string; authorised?: string; isActive: boolean };
  userStats: any;
  workers: any[];
}> {
  const userDataMap = new Map<string, any>();

  for (const result of fetched) {
    const address = result.address;
    if (result.error || !result.userData) {
      if (result.error instanceof CKPoolError && result.error.code === CKPoolErrorCode.NOT_FOUND) {
        userDataMap.set(address, {
          changes: { address, isActive: false },
          userStats: null,
          workers: [],
        });
        console.log(`Marked user ${address} as inactive (NOT_FOUND)`);
      } else {
        console.error(`Skipping user ${address} due to fetch error:`, (result.error as Error)?.message || 'Unknown error');
      }
      continue;
    }

    const userData = result.userData as UserData;
    const workers: any[] = [];

    // Extract worker data for each user
    for (const workerData of (userData.worker || [])) {
      const workername = workerData.workername;
      const workerName = workername.includes('.')
        ? workername.split('.')[1]
        : workername.includes('_')
          ? workername.split('_')[1]
          : workername;

      workers.push({
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
      });
    }

    userDataMap.set(address, {
      changes: {
        address,
        authorised: userData.authorised.toString(),
        isActive: true,
      },
      userStats: {
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
      },
      workers,
    });
  }

  return userDataMap;
}

/**
 * Update users in the database within a batch.
 * 
 * @param manager - TypeORM transaction manager
 * @param userChanges - Array of user updates with address, authorised timestamp, and isActive status
 * @returns Number of users updated
 */
async function updateUsersInBatch(manager: any, userChanges: any[]): Promise<number> {
  if (userChanges.length === 0) return 0;

  const params: any[] = [];
  const valuesStr = userChanges.map((c, index) => {
    const base = index * 3;
    params.push(c.address, c.authorised !== undefined ? c.authorised : null, c.isActive);
    return `($${base + 1}::text, $${base + 2}::bigint, $${base + 3}::boolean)`;
  }).join(', ');

  const result = await manager.query(`
    UPDATE "User" AS u
    SET
      authorised = COALESCE(v.authorised::bigint, u.authorised),
      "isActive" = v.isActive,
      "updatedAt" = NOW()
    FROM (VALUES ${valuesStr}) AS v (address, authorised, isActive)
    WHERE u.address = v.address;
  `, params);

  return result.rowCount ?? userChanges.length;
}

/**
 * Insert user stats records for a batch of users.
 * 
 * @param manager - TypeORM transaction manager
 * @param userStatsToInsert - Array of user stats records to insert
 * @returns Number of user stats records inserted
 */
async function insertUserStatsInBatch(manager: any, userStatsToInsert: any[]): Promise<number> {
  if (userStatsToInsert.length === 0) return 0;

  const userStatsRepo = manager.getRepository(UserStats);
  await userStatsRepo.insert(userStatsToInsert);
  return userStatsToInsert.length;
}

/**
 * Upsert worker records in the database, inserting new workers or updating existing ones.
 * 
 * @param manager - TypeORM transaction manager
 * @param workers - Array of worker records to upsert
 * @returns Array of inserted/updated worker records with id, userAddress, and name
 */
async function upsertWorkersInBatch(manager: any, workers: any[]): Promise<any[]> {
  if (workers.length === 0) return [];

  const params: any[] = [];
  const valuesStr = workers.map((v, index) => {
    const base = index * 12;
    params.push(
      v.userAddress,
      v.name,
      v.updatedAt.toISOString(),
      v.hashrate1m,
      v.hashrate5m,
      v.hashrate1hr,
      v.hashrate1d,
      v.hashrate7d,
      v.lastUpdate.toISOString(),
      v.shares,
      v.bestShare,
      v.bestEver
    );
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}, $${base + 12})`;
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
  `, params);

  return result;
}

/**
 * Build worker stats records from worker database records and original worker data.
 * Maps worker data to their database-generated IDs for stat tracking.
 * 
 * @param workerRecords - Array of worker records returned from database insert
 * @param workerData - Array of original worker data with hashrate and share info
 * @returns Array of worker stats records ready for insertion
 */
function buildWorkerStatsMap(workerRecords: any[], workerData: any[]): any[] {
  const statsMap = new Map<string, any>();
  for (const w of workerData) {
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

  const workerStatsToInsert: any[] = [];
  for (const row of workerRecords) {
    const key = `${row.userAddress}|${row.name}`;
    const statsData = statsMap.get(key);
    if (statsData) {
      workerStatsToInsert.push({ workerId: Number(row.id), ...statsData });
    }
  }

  return workerStatsToInsert;
}

/**
 * Insert worker stats records for a batch of workers.
 * 
 * @param manager - TypeORM transaction manager
 * @param workerStatsToInsert - Array of worker stats records to insert
 * @returns Number of worker stats records inserted
 */
async function insertWorkerStatsInBatch(manager: any, workerStatsToInsert: any[]): Promise<number> {
  if (workerStatsToInsert.length === 0) return 0;

  const workerStatsRepo = manager.getRepository(WorkerStats);
  await workerStatsRepo.insert(workerStatsToInsert);
  return workerStatsToInsert.length;
}

/**
 * Process a single batch of users and their associated data within a transaction.
 * Executes user updates, stats inserts, worker upserts, and worker stats inserts.
 * 
 * @param manager - TypeORM transaction manager
 * @param batchAddresses - Array of user addresses to process in this batch
 * @param userDataMap - Map of user addresses to their complete data structure
 * @returns Object with counts of updated/inserted records: users, workers, userStats, workerStats
 */
async function processSingleBatch(
  manager: any,
  batchAddresses: string[],
  userDataMap: Map<string, any>
): Promise<{ users: number; workers: number; userStats: number; workerStats: number }> {
  const userChanges: any[] = [];
  const userStatsToInsert: any[] = [];
  const allWorkers: any[] = [];

  // Prepare data for this batch
  for (const addr of batchAddresses) {
    const entry = userDataMap.get(addr)!;
    userChanges.push(entry.changes);
    if (entry.userStats) {
      userStatsToInsert.push(entry.userStats);
    }
    allWorkers.push(...entry.workers);
  }

  // Execute operations
  const usersUpdated = await updateUsersInBatch(manager, userChanges);
  const userStatsInserted = await insertUserStatsInBatch(manager, userStatsToInsert);

  const workerRecords = await upsertWorkersInBatch(manager, allWorkers);
  const workerStats = buildWorkerStatsMap(workerRecords, allWorkers);
  const workerStatsInserted = await insertWorkerStatsInBatch(manager, workerStats);

  return {
    users: usersUpdated,
    workers: workerRecords.length,
    userStats: userStatsInserted,
    workerStats: workerStatsInserted,
  };
}

/**
 * Process all user batches sequentially, each in its own transaction.
 * Catches and logs errors per batch, allowing subsequent batches to continue.
 * 
 * @param db - Database connection instance
 * @param userDataMap - Map of user addresses to their complete data structure
 * @returns Object containing total counts and array of failed batch details
 */
async function processBatches(
  db: any,
  userDataMap: Map<string, any>
): Promise<{
  totals: { users: number; workers: number; userStats: number; workerStats: number };
  failedBatches: Array<{ batchStart: number; batchEnd: number; error: string }>;
}> {
  const BATCH_SIZE = 1000;
  const userAddresses = Array.from(userDataMap.keys());
  const failedBatches: Array<{ batchStart: number; batchEnd: number; error: string }> = [];
  const totals = { users: 0, workers: 0, userStats: 0, workerStats: 0 };

  for (let batchStart = 0; batchStart < userAddresses.length; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, userAddresses.length);
    const batchAddresses = userAddresses.slice(batchStart, batchEnd);

    console.log(`Processing batch: users ${batchStart + 1}-${batchEnd}...`);

    try {
      const result = await db.transaction(async (manager: any) => {
        return processSingleBatch(manager, batchAddresses, userDataMap);
      });

      totals.users += result.users;
      totals.workers += result.workers;
      totals.userStats += result.userStats;
      totals.workerStats += result.workerStats;

      console.log(`  Batch complete: ${result.users} users | ${result.workers} workers | ${result.userStats} userStats | ${result.workerStats} workerStats`);
    } catch (batchError) {
      const errorMsg = batchError instanceof Error ? batchError.message : String(batchError);
      console.error(`  ❌ Batch failed (users ${batchStart + 1}-${batchEnd}): ${errorMsg}`);
      failedBatches.push({
        batchStart: batchStart + 1,
        batchEnd,
        error: errorMsg,
      });
    }
  }

  return { totals, failedBatches };
}

/**
 * Load active users, fetch fresh CKPool data, and batch update stats in the database.
 * 
 * Process flow:
 * 1. Load all active users from database
 * 2. Fetch current stats from CKPool API
 * 3. Build complete data structure from API results
 * 4. Process users in batches of 1,000 (each batch is its own transaction)
 *    - Update user records (authorised timestamp, isActive status)
 *    - Insert user stats (hashrates, shares, etc.)
 *    - Upsert worker records
 *    - Insert worker stats
 * 5. Log results and any failed batches
 * 
 * Failed batches are caught and logged; processing continues with remaining batches.
 */
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

    // Build data structure from fetched results
    const userDataMap = buildUserDataMap(fetched);

    // Process all batches
    const { totals, failedBatches } = await processBatches(db, userDataMap);

    // Log results
    console.log(`\nAll batches processed:`);
    console.log(`Total: ${totals.users} users | ${totals.workers} workers | ${totals.userStats} userStats | ${totals.workerStats} workerStats`);

    if (failedBatches.length > 0) {
      console.warn(`\n⚠️  ${failedBatches.length} batch(es) failed:`);
      for (const failed of failedBatches) {
        console.warn(`  - Users ${failed.batchStart}-${failed.batchEnd}: ${failed.error}`);
      }
    }
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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
