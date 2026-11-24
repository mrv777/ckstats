import NodeCache from 'node-cache';

import { CKPoolAPI, CKPoolError, CKPoolErrorCode } from './ckpool';
import { getDb } from './db';
import { PoolStats } from './entities/PoolStats';
import { User } from './entities/User';
import { UserStats } from './entities/UserStats';
import { Worker } from './entities/Worker';
import { convertHashrate } from '../utils/helpers';

const POOL_HISTORY_1D_LIMIT = 1440;
const DAY_MS = 24 * 60 * 60 * 1000;
const BUCKET_15_MIN_SECONDS = 15 * 60;

interface BucketColumn {
  column: string;
  cast: 'bigint' | 'int' | 'float';
}

const POOL_BUCKET_COLUMNS: BucketColumn[] = [
  { column: 'users', cast: 'int' },
  { column: 'workers', cast: 'int' },
  { column: 'hashrate1m', cast: 'bigint' },
  { column: 'hashrate5m', cast: 'bigint' },
  { column: 'hashrate15m', cast: 'bigint' },
  { column: 'hashrate1hr', cast: 'bigint' },
  { column: 'hashrate6hr', cast: 'bigint' },
  { column: 'hashrate1d', cast: 'bigint' },
  { column: 'hashrate7d', cast: 'bigint' },
  { column: 'SPS1m', cast: 'float' },
  { column: 'SPS5m', cast: 'float' },
  { column: 'SPS15m', cast: 'float' },
  { column: 'SPS1h', cast: 'float' },
];

const USER_BUCKET_COLUMNS: BucketColumn[] = [
  { column: 'workerCount', cast: 'int' },
  { column: 'hashrate1m', cast: 'bigint' },
  { column: 'hashrate5m', cast: 'bigint' },
  { column: 'hashrate1hr', cast: 'bigint' },
  { column: 'hashrate1d', cast: 'bigint' },
  { column: 'hashrate7d', cast: 'bigint' },
];

const POOL_HISTORY_1D_SELECT = [
  'stat.timestamp',
  'stat.users',
  'stat.workers',
  'stat.hashrate1m',
  'stat.hashrate5m',
  'stat.hashrate15m',
  'stat.hashrate1hr',
  'stat.hashrate6hr',
  'stat.hashrate1d',
  'stat.hashrate7d',
  'stat.SPS1m',
  'stat.SPS5m',
  'stat.SPS15m',
  'stat.SPS1h',
];

const USER_HISTORY_1D_SELECT = [
  'stat.timestamp',
  'stat.hashrate1m',
  'stat.hashrate5m',
  'stat.hashrate1hr',
  'stat.hashrate1d',
  'stat.hashrate7d',
  'stat.workerCount',
];

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

export async function getNetworkDifficulty(): Promise<number | null> {
  const cacheKey = 'network:difficulty';
  const cached = cache.get<number | null>(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const response = await fetch('https://mempool.space/api/blocks', {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch network difficulty: ${response.status}`);
    }

    const blocks = (await response.json()) as Array<{
      difficulty?: number;
    }>;

    const difficulty = blocks?.[0]?.difficulty;
    if (
      typeof difficulty !== 'number' ||
      !Number.isFinite(difficulty) ||
      difficulty <= 0
    ) {
      throw new Error('Invalid difficulty from network API');
    }

    cache.set(cacheKey, difficulty, 3600);
    return difficulty;
  } catch (error) {
    console.error('Error fetching network difficulty:', error);
    cache.set(cacheKey, null, 60);
    return null;
  }
}

/**
 * Downsample a stats table into fixed-width time buckets, averaging each column.
 *
 * @param table - name of the table to query
 * @param columns - columns to aggregate with their SQL cast
 * @param since - earliest timestamp to include
 * @param bucketSeconds - bucket width in seconds
 * @param whereFragment - extra SQL appended after `WHERE "timestamp" >= $1`
 * @param whereParams - parameters for `whereFragment` (indexed from $3 onward)
 * @returns array of bucket rows ordered by newest first
 */
async function getBucketedHistory<T>(
  table: string,
  columns: BucketColumn[],
  since: Date,
  bucketSeconds: number,
  whereFragment: string,
  whereParams: unknown[]
): Promise<T[]> {
  const db = await getDb();
  const columnSql = columns
    .map(({ column, cast }) => {
      const aggregate =
        cast === 'float' ? `AVG("${column}")` : `AVG("${column}")::${cast}`;
      return `${aggregate} AS "${column}"`;
    })
    .join(', ');
  const sql = `
    SELECT MIN("timestamp") AS "timestamp", ${columnSql}
    FROM "${table}"
    WHERE "timestamp" >= $1 ${whereFragment}
    GROUP BY (EXTRACT(EPOCH FROM "timestamp")::bigint / $2)
    ORDER BY MIN("timestamp") DESC
  `;
  return (await db.query(sql, [since, bucketSeconds, ...whereParams])) as T[];
}

/**
 * Fetch pool stats history for the given range, cached for 60 seconds.
 *
 * - `1d`: the last 24 hours at 1-minute resolution (~1440 rows).
 * - `7d`: the last 7 days downsampled into 15-minute buckets (~672 rows).
 *
 * @param range - the time range to fetch
 * @returns array of PoolStats-shaped rows ordered by newest first
 */
export async function getPoolStatsHistory(
  range: '1d' | '7d'
): Promise<PoolStats[]> {
  const cacheKey = `pool:historical:${range}`;

  // Try cache first
  const cached = cache.get<PoolStats[]>(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  let result: PoolStats[];
  if (range === '1d') {
    const db = await getDb();
    const repository = db.getRepository(PoolStats);

    result = await repository
      .createQueryBuilder('stat')
      .select(POOL_HISTORY_1D_SELECT)
      .where('stat.timestamp >= :since', { since: new Date(Date.now() - DAY_MS) })
      .orderBy('stat.timestamp', 'DESC')
      .limit(POOL_HISTORY_1D_LIMIT)
      .getMany();
  } else {
    result = await getBucketedHistory<PoolStats>(
      'PoolStats',
      POOL_BUCKET_COLUMNS,
      new Date(Date.now() - 7 * DAY_MS),
      BUCKET_15_MIN_SECONDS,
      '',
      []
    );
  }

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
export async function getUserWithWorkersAndStats(address: string | undefined) {
  if (!address) return null;
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
 * Fetch user stats history for the given range, cached for 60 seconds.
 *
 * - `1d`: the last 24 hours at 1-minute resolution (~1440 rows).
 * - `7d`: the last 7 days downsampled into 15-minute buckets (limited by the
 *   UserStats retention of ~3 days).
 *
 * @param address - Bitcoin address of the user
 * @param range - the time range to fetch
 * @returns array of UserStats-shaped rows ordered by newest first
 */
export async function getUserStatsHistory(
  address: string | undefined,
  range: '1d' | '7d'
): Promise<UserStats[]> {
  if (!address) return [];
  const cacheKey = `user:historical:${address}:${range}`;

  // Try cache first
  const cached = cache.get<UserStats[]>(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  let result: UserStats[];
  if (range === '1d') {
    const db = await getDb();
    const repository = db.getRepository(UserStats);

    result = await repository
      .createQueryBuilder('stat')
      .select(USER_HISTORY_1D_SELECT)
      .where('stat.userAddress = :address AND stat.timestamp >= :since', {
        address,
        since: new Date(Date.now() - DAY_MS),
      })
      .orderBy('stat.timestamp', 'DESC')
      .limit(POOL_HISTORY_1D_LIMIT)
      .getMany();
  } else {
    result = await getBucketedHistory<UserStats>(
      'UserStats',
      USER_BUCKET_COLUMNS,
      new Date(Date.now() - 7 * DAY_MS),
      BUCKET_15_MIN_SECONDS,
      'AND "userAddress" = $3',
      [address]
    );
  }

  // Cache for 60 seconds
  cache.set(cacheKey, result, 60);
  return result;
}

/**
 * Retrieve a worker and all its stats for a given user.
 *
 * @param userAddress - owner address of the worker
 * @param workerName - worker name to look up
 * @returns worker entity with sorted stats, or undefined if not found
 */
export async function getWorkerWithStats(
  userAddress: string | undefined,
  workerName: string | undefined
) {
  if (!userAddress) return undefined;
  const db = await getDb();
  const repository = db.getRepository(Worker);

  const worker = await repository.findOne({
    where: {
      userAddress,
      name: workerName ? workerName.trim() : '',
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
        const workername = workerData.workername;
        const workerName = workername.includes('.')
          ? workername.split('.')[1]
          : workername.includes('_')
            ? workername.split('_')[1]
            : workername;
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
