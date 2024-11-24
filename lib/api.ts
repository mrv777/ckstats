import { getDb } from './db';
import { PoolStats } from './entities/PoolStats';
import { User } from './entities/User';
import { UserStats } from './entities/UserStats';
import { Worker } from './entities/Worker';
import { convertHashrate } from '../utils/helpers';

const HISTORICAL_DATA_POINTS = 2880;

export type PoolStatsInput = Omit<PoolStats, 'id' | 'timestamp'>;

export async function savePoolStats(stats: PoolStatsInput): Promise<PoolStats> {
  const db = await getDb();
  const repository = db.getRepository(PoolStats);
  const poolStats = repository.create(stats);
  return repository.save(poolStats);
}

export async function getLatestPoolStats(): Promise<PoolStats | null> {
  const db = await getDb();
  const repository = db.getRepository(PoolStats);
  return repository.findOne({
    where: {},
    order: { timestamp: 'DESC' },
  });
}

export async function getHistoricalPoolStats(): Promise<PoolStats[]> {
  const db = await getDb();
  const repository = db.getRepository(PoolStats);
  return repository.find({
    order: { timestamp: 'DESC' },
    take: HISTORICAL_DATA_POINTS,
  });
}

export async function getUserWithWorkersAndStats(address: string) {
  const db = await getDb();
  const userRepository = db.getRepository(User);

  const user = await userRepository.findOne({
    where: { address },
    relations: {
      workers: true,
      stats: true,
    },
    order: {
      workers: {
        hashrate5m: 'DESC',
      },
      stats: {
        timestamp: 'DESC',
      },
    },
  });

  if (!user) return null;

  return {
    ...user,
    stats: user.stats.slice(0, 1),
  };
}

export async function getUserHistoricalStats(address: string) {
  const db = await getDb();
  const repository = db.getRepository(UserStats);
  return repository.find({
    where: { userAddress: address },
    order: { timestamp: 'DESC' },
    take: HISTORICAL_DATA_POINTS,
  });
}

export async function getWorkerWithStats(
  userAddress: string,
  workerName: string
) {
  const db = await getDb();
  const repository = db.getRepository(Worker);

  return repository.findOne({
    where: {
      userAddress,
      name: workerName.trim(),
    },
    relations: {
      stats: true,
    },
    order: {
      stats: {
        timestamp: 'DESC',
      },
    },
  });
}

export async function getTopUserDifficulties(limit: number = 10) {
  const db = await getDb();
  const repository = db.getRepository(UserStats);

  const topUsers = await repository
    .createQueryBuilder('userStats')
    .innerJoin('userStats.user', 'user')
    .select([
      'userStats.id',
      'userStats.userAddress',
      'userStats.workerCount',
      'userStats.bestEver',
      'userStats.bestShare',
      'userStats.hashrate1hr',
      'userStats.hashrate1d',
      'userStats.hashrate7d',
      'userStats.timestamp'
    ])
    .where('user.isPublic = :isPublic', { isPublic: true })
    .distinctOn(['userStats.userAddress'])
    .orderBy('userStats.userAddress', 'ASC')
    .addOrderBy('userStats.timestamp', 'DESC')
    .getMany();

  const sortedUsers = topUsers
    .sort((a, b) => Number(b.bestEver) - Number(a.bestEver))
    .slice(0, limit);

  return sortedUsers.map((stats) => ({
    address: stats.userAddress,
    workerCount: stats.workerCount,
    difficulty: stats.bestEver.toString(),
    hashrate1hr: stats.hashrate1hr.toString(),
    hashrate1d: stats.hashrate1d.toString(),
    hashrate7d: stats.hashrate7d.toString(),
    bestShare: stats.bestShare.toString(),
  }));
}

export async function getTopUserHashrates(limit: number = 10) {
  const db = await getDb();
  const repository = db.getRepository(UserStats);

  // First get the latest stats for each user
  const topUsers = await repository
    .createQueryBuilder('userStats')
    .innerJoinAndSelect('userStats.user', 'user')
    .select([
      'userStats.id',
      'userStats.userAddress',
      'userStats.workerCount',
      'userStats.hashrate1hr',
      'userStats.hashrate1d',
      'userStats.hashrate7d',
      'userStats.bestShare',
      'userStats.bestEver',
      'userStats.timestamp'
    ])
    .where('user.isPublic = :isPublic', { isPublic: true })
    .andWhere('user.isActive = :isActive', { isActive: true })
    .distinctOn(['userStats.userAddress'])
    .orderBy('userStats.userAddress', 'ASC')
    .addOrderBy('userStats.timestamp', 'DESC')
    .getMany();

  // Then sort by hashrate and take the top N
  const sortedUsers = topUsers
    .sort((a, b) => Number(b.hashrate1hr) - Number(a.hashrate1hr))
    .slice(0, limit);

  return sortedUsers.map((stats) => ({
    address: stats.userAddress,
    workerCount: stats.workerCount,
    hashrate1hr: stats.hashrate1hr.toString(),
    hashrate1d: stats.hashrate1d.toString(),
    hashrate7d: stats.hashrate7d.toString(),
    bestShare: stats.bestShare.toString(),
    bestEver: stats.bestEver.toString(),
  }));
}

export async function resetUserActive(address: string): Promise<void> {
  const db = await getDb();
  const userRepository = db.getRepository(User);
  await userRepository.update(address, { isActive: true });
}

export async function updateSingleUser(address: string): Promise<void> {
  const apiUrl = process.env.API_URL || 'https://solo.ckpool.org';
  if (!apiUrl) {
    throw new Error('API_URL is not defined in environment variables');
  }

  console.log('Attempting to update user stats for:', address);

  try {
    const response = await fetch(`${apiUrl}/users/${address}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const userData = await response.json();

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
        bestEver: BigInt(userData.bestever).toString()
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
          worker.hashrate1hr = convertHashrate(workerData.hashrate1hr).toString();
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
          });
        }
      }
    });

    console.log(`Updated user and workers for: ${address}`);
  } catch (error) {
    console.error(`Error updating user ${address}:`, error);
    throw error;
  }
}

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
