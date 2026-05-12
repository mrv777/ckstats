import NodeCache from 'node-cache';

import { CKPoolAPI, CKPoolError, CKPoolErrorCode } from './ckpool';
import { getDb } from './db';
import { PoolStats } from './entities/PoolStats';
import { User } from './entities/User';
import { UserStats } from './entities/UserStats';
import { Worker } from './entities/Worker';
import { convertHashrate } from '../utils/helpers';

const HISTORICAL_DATA_POINTS = 5760;

// Initialize cache with a default 1-minute TTL
const cache = new NodeCache({ stdTTL: 60 });

export type PoolStatsInput = Omit<PoolStats, 'id' | 'timestamp'>;

/**
 * Persist a new pool stats record to the database.
 *
 * @param stats - pool stats fields excluding generated id/timestamp
 * @returns saved PoolStats entity
 */
export async function savePoolStats(stats: PoolStatsInput): Promise<PoolStats> {
  const db = await getDb();
  const repository = db.getRepository(PoolStats);
  const poolStats = repository.create(stats);
  return repository.save(poolStats);
}

/**
 * Read the latest pool stats row from the database, using cache when available.
 *
 * @returns latest PoolStats or null if none exists
 */
export async function getLatestPoolStats(): Promise<PoolStats | null> {
  const cacheKey = 'pool:latest';

  // Try cache first (cached null is a valid cached value)
  const cached = cache.get<PoolStats | null>(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const db = await getDb();
  const repository = db.getRepository(PoolStats);

  const result = await repository
    .createQueryBuilder('stats')
    .orderBy('stats.timestamp', 'DESC')
    .limit(1)
    .getOne(); // returns PoolStats | null

  // Cache for 60 seconds
  cache.set(cacheKey, result, 60);
  return result;
}

/**
 * Fetch a recent history of pool stats records, limited to a fixed window.
 *
 * @returns array of PoolStats rows ordered by newest first
 */
export async function getHistoricalPoolStats(): Promise<PoolStats[]> {
  const cacheKey = 'pool:historical';

  // Try cache first
  const cached = cache.get<PoolStats[]>(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  const db = await getDb();
  const repository = db.getRepository(PoolStats);

  const result = await repository
    .createQueryBuilder('stat')
    .orderBy('stat.timestamp', 'DESC')
    .limit(HISTORICAL_DATA_POINTS)
    .getMany();

  // Cache for 60 seconds
  cache.set(cacheKey, result, 60);
  return result;
}

/**
 * Fetch a user record with its workers and the latest user stats row.
 *
 * @param address - Bitcoin address of the user
 * @returns user entity with workers and latest stats, or null if missing
 */
export async function getUserWithWorkersAndStats(address: string) {
  const db = await getDb();
  const userRepo = db.getRepository(User);
  const statsRepo = db.getRepository(UserStats);

  // 1. User + sorted workers (small & fast)
  const user = await userRepo
    .createQueryBuilder('user')
    .where('user.address = :address', { address })
    .leftJoinAndSelect('user.workers', 'worker')
    .addOrderBy('worker.hashrate5m', 'DESC')
    .getOne();

  if (!user) return null;

  // 2. Only the latest stat
  const latestStat = await statsRepo
    .createQueryBuilder('stat')
    .where('stat.userAddress = :address', { address: user.address })
    .orderBy('stat.timestamp', 'DESC')
    .limit(1)
    .getOne();

  return {
    ...user,
    stats: latestStat ? [latestStat] : [],
  };
}

/**
 * Fetch historical stats rows for a specific user.
 *
 * @param address - Bitcoin address to query
 * @returns list of UserStats rows ordered newest first
 */
export async function getUserHistoricalStats(address: string) {
  const db = await getDb();
  const repository = db.getRepository(UserStats);

  return repository
    .createQueryBuilder('stat')
    .where('stat.userAddress = :address', { address })
    .orderBy('stat.timestamp', 'DESC')
    .limit(HISTORICAL_DATA_POINTS)
    .getMany();
}

/**
 * Retrieve a worker and all its stats for a given user.
 *
 * @param userAddress - owner address of the worker
 * @param workerName - worker name to look up
 * @returns worker entity with sorted stats, or undefined if not found
 */
export async function getWorkerWithStats(
  userAddress: string,
  workerName: string
) {
  const db = await getDb();
  const repository = db.getRepository(Worker);

  const worker = await repository.findOne({
    where: {
      userAddress,
      name: workerName.trim(),
    },
    relations: {
      stats: true,
    },
    relationLoadStrategy: 'query',
  });

  if (worker) {
    // Sort stats by timestamp after loading
    worker.stats.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  return worker;
}

/**
 * Get top public users by best historical difficulty.
 *
 * @param limit - number of users to return (default: 10)
 * @returns array of objects: { address, workerCount, difficulty, hashrate1hr,
 *          hashrate1d, hashrate7d, bestShare }
 */
export async function getTopUserDifficulties(limit: number = 10) {
  const cacheKey = `topUserDifficulties:${limit}`;

  // Try to get from cache
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const db = await getDb();

  // Use a LATERAL join: for each public user select their latest UserStats row,
  // then order those latest rows by bestEver and limit in the DB.
  const rows = await db.query(
    `
    SELECT s."userAddress", s."workerCount", s."bestEver", s."hashrate1hr", s."hashrate1d", s."hashrate7d", s."bestShare"
    FROM "User" u
    JOIN LATERAL (
      SELECT *
      FROM "UserStats" us
      WHERE us."userAddress" = u."address"
      ORDER BY us."timestamp" DESC
      LIMIT 1
    ) s ON true
    WHERE u."isPublic" = $1
    ORDER BY (s."bestEver")::numeric DESC
    LIMIT $2
    `,
    [true, limit]
  );

  const result = rows.map((r: any) => ({
    address: r.userAddress,
    workerCount: r.workerCount,
    difficulty: r.bestEver.toString(),
    hashrate1hr: r.hashrate1hr.toString(),
    hashrate1d: r.hashrate1d.toString(),
    hashrate7d: r.hashrate7d.toString(),
    bestShare: r.bestShare.toString(),
  }));

  // Store in cache for 5 minutes
  cache.set(cacheKey, result, 5 * 60);
  return result;
}

/**
 * Get top user hashrates.
 *
 * For each public and active user, selects their latest `UserStats` row
 * (via a LATERAL subquery) and returns the top `limit` users ordered by
 * `hashrate1hr` (numeric) in descending order. Query work is performed in
 * the database so only the final `limit` rows are returned to the app.
 *
 * @param limit - number of users to return (default: 10)
 * @returns array of objects: { address, workerCount, hashrate1hr, hashrate1d,
 *          hashrate7d, bestShare, bestEver }
 */
export async function getTopUserHashrates(limit: number = 10) {
  const cacheKey = `topUserHashrates:${limit}`;

  // Try to get from cache
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const db = await getDb();

  // Use a LATERAL join: for each public+active user select their latest UserStats row,
  // then order those latest rows by hashrate1hr and limit in the DB.
  const rows = await db.query(
    `
    SELECT s."userAddress", s."workerCount", s."hashrate1hr", s."hashrate1d", s."hashrate7d", s."bestShare", s."bestEver"
    FROM "User" u
    JOIN LATERAL (
      SELECT *
      FROM "UserStats" us
      WHERE us."userAddress" = u."address"
      ORDER BY us."timestamp" DESC
      LIMIT 1
    ) s ON true
    WHERE u."isPublic" = $1 AND u."isActive" = $2
    ORDER BY (s."hashrate1hr")::numeric DESC
    LIMIT $3
    `,
    [true, true, limit]
  );

  const result = rows.map((r: any) => ({
    address: r.userAddress,
    workerCount: r.workerCount,
    hashrate1hr: r.hashrate1hr.toString(),
    hashrate1d: r.hashrate1d.toString(),
    hashrate7d: r.hashrate7d.toString(),
    bestShare: r.bestShare.toString(),
    bestEver: r.bestEver.toString(),
  }));

  // Store in cache for 5 minutes
  cache.set(cacheKey, result, 5 * 60);
  return result;
}

/**
 * Reactivate a user by setting isActive to true.
 *
 * @param address - Bitcoin address of the user to reactivate
 */
export async function resetUserActive(address: string): Promise<void> {
  const db = await getDb();
  const userRepository = db.getRepository(User);
  await userRepository.update(address, { isActive: true });
}

/**
 * Fetch fresh data for a single user from CKPool and persist it to the DB.
 *
 * @param address - Bitcoin address of the user to update
 */
export async function updateSingleUser(address: string): Promise<void> {
  console.log('Attempting to update user stats for:', address);

  try {
    const ckPoolApi = new CKPoolAPI();
    // ckPoolApi.users handles the character validation and file/http logic internally
    const userData = (await ckPoolApi.user(address)) as any;

    console.log('Response:', userData);

    const db = await getDb();
    await db.transaction(async (manager) => {
      // Update or create user
      const userRepository = manager.getRepository(User);
      const user = await userRepository.findOne({ where: { address } });
      if (user) {
        user.authorised = userData.authorised;
        user.isActive = true;
        await userRepository.save(user);
      } else {
        await userRepository.insert({
          address,
          authorised: userData.authorised,
          isActive: true,
          updatedAt: new Date().toISOString(),
        });
      }

      // Create a new UserStats entry
      const userStatsRepository = manager.getRepository(UserStats);
      const userStats = userStatsRepository.create({
        userAddress: address,
        hashrate1m: convertHashrate(userData.hashrate1m).toString(),
        hashrate5m: convertHashrate(userData.hashrate5m).toString(),
        hashrate1hr: convertHashrate(userData.hashrate1hr).toString(),
        hashrate1d: convertHashrate(userData.hashrate1d).toString(),
        hashrate7d: convertHashrate(userData.hashrate7d).toString(),
        lastShare: BigInt(userData.lastshare).toString(),
        workerCount: userData.workers,
        shares: BigInt(userData.shares).toString(),
        bestShare: parseFloat(userData.bestshare),
        bestEver: BigInt(userData.bestever).toString(),
      });
      await userStatsRepository.save(userStats);

      // Update or create workers
      const workerRepository = manager.getRepository(Worker);
      for (const workerData of userData.worker) {
        const workerName = workerData.workername.split('.')[1];
        const worker = await workerRepository.findOne({
          where: {
            userAddress: address,
            name: workerName,
          },
        });
        if (worker) {
          worker.hashrate1m = convertHashrate(workerData.hashrate1m).toString();
          worker.hashrate5m = convertHashrate(workerData.hashrate5m).toString();
          worker.hashrate1hr = convertHashrate(
            workerData.hashrate1hr
          ).toString();
          worker.hashrate1d = convertHashrate(workerData.hashrate1d).toString();
          worker.hashrate7d = convertHashrate(workerData.hashrate7d).toString();
          worker.lastUpdate = new Date(workerData.lastshare * 1000);
          worker.shares = workerData.shares;
          worker.bestShare = parseFloat(workerData.bestshare);
          worker.bestEver = BigInt(workerData.bestever).toString();
          await workerRepository.save(worker);
        } else {
          await workerRepository.insert({
            userAddress: address,
            name: workerName,
            hashrate1m: convertHashrate(workerData.hashrate1m).toString(),
            hashrate5m: convertHashrate(workerData.hashrate5m).toString(),
            hashrate1hr: convertHashrate(workerData.hashrate1hr).toString(),
            hashrate1d: convertHashrate(workerData.hashrate1d).toString(),
            hashrate7d: convertHashrate(workerData.hashrate7d).toString(),
            lastUpdate: new Date(workerData.lastshare * 1000),
            shares: workerData.shares,
            bestShare: parseFloat(workerData.bestshare),
            bestEver: BigInt(workerData.bestever).toString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    });

    console.log(`Updated user and workers for: ${address}`);
  } catch (error) {
    if (
      error instanceof CKPoolError &&
      error.code === CKPoolErrorCode.NOT_FOUND
    ) {
      const db = await getDb();
      const userRepository = db.getRepository(User);
      await userRepository.update({ address }, { isActive: false });
    }
    console.error(`Error updating user ${address}:`, error);
    throw error;
  }
}

/**
 * Toggle the public/private visibility flag for a user.
 *
 * @param address - Bitcoin address of the user to update
 * @returns object containing the new visibility state
 */
export async function toggleUserStatsPrivacy(
  address: string
): Promise<{ isPublic: boolean }> {
  const db = await getDb();
  const userRepository = db.getRepository(User);
  const user = await userRepository.findOne({ where: { address } });

  if (!user) {
    throw new Error('User not found');
  }

  const newIsPublic = !user.isPublic;

  await userRepository.update(address, { isPublic: newIsPublic });

  return { isPublic: newIsPublic };
}