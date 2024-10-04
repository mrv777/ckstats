import { PrismaClient, PoolStats, User, Worker, UserStats } from '@prisma/client';

const prisma = new PrismaClient();

export type PoolStatsInput = Omit<PoolStats, 'id' | 'timestamp'>;

export type PoolStatsType = {
  id: number;
  timestamp: Date;
  runtime: number;
  users: number;
  workers: number;
  idle: number;
  disconnected: number;
  hashrate1m: bigint;
  hashrate5m: bigint;
  hashrate15m: bigint;
  hashrate1hr: bigint;
  hashrate6hr: bigint;
  hashrate1d: bigint;
  hashrate7d: bigint;
  diff: number;
  accepted: bigint;
  rejected: bigint;
  bestshare: bigint;
  SPS1m: number;
  SPS5m: number;
  SPS15m: number;
  SPS1h: number;
};

export async function fetchPoolStats(): Promise<PoolStatsInput> {
  const response = await fetch(process.env.API_URL as string);
  const data = await response.text();
  const jsonLines = data.split('\n').filter(Boolean);
  const parsedData = jsonLines.reduce(
    (acc, line) => ({ ...acc, ...JSON.parse(line) }),
    {}
  );
  return parsedData as PoolStatsInput;
}

export async function savePoolStats(stats: PoolStatsInput): Promise<PoolStats> {
  return prisma.poolStats.create({
    data: stats,
  });
}

export async function getLatestPoolStats(): Promise<PoolStats | null> {
  return prisma.poolStats.findFirst({
    orderBy: { timestamp: 'desc' },
  });
}

export async function getHistoricalPoolStats(
  limit: number = 100
): Promise<PoolStats[]> {
  return prisma.poolStats.findMany({
    orderBy: { timestamp: 'asc' },
    take: limit,
  });
}

export async function getUserWithWorkersAndStats(address: string): Promise<(User & { workers: Worker[], stats: UserStats[] }) | null> {
  return prisma.user.findUnique({
    where: { address },
    include: {
      workers: {
        orderBy: { lastUpdate: 'desc' }
      },
      stats: {
        orderBy: { timestamp: 'desc' },
        take: 1,
      }
    }
  });
}

export async function getUserHistoricalStats(address: string): Promise<UserStats[]> {
  return prisma.userStats.findMany({
    where: { userAddress: address },
    orderBy: { timestamp: 'asc' },
    take: 288,
  });
}

export async function getWorkerWithStats(userAddress: string, workerName: string) {
  return prisma.worker.findUnique({
    where: {
      userAddress_name: {
        userAddress,
        name: workerName,
      },
    },
    include: {
      stats: {
        orderBy: {
          timestamp: 'asc',
        },
        take: 288, // Last 24 hours if updated every 5 minutes
      },
    },
  });
}

export async function getTopUserDifficulties(): Promise<{ address: string; difficulty: string }[]> {
  const topUsers = await prisma.userStats.findMany({
    select: {
      userAddress: true,
      bestShare: true,
    },
    orderBy: {
      bestShare: 'desc',
    },
    take: 10,
    distinct: ['userAddress'],
  });

  return topUsers.map(user => ({
    address: user.userAddress,
    difficulty: user.bestShare.toString(),
  }));
}

export async function getTopUserHashrates(): Promise<{ address: string; hashrate: string }[]> {
  const topUsers = await prisma.userStats.findMany({
    select: {
      userAddress: true,
      hashrate1hr: true,
    },
    orderBy: {
      hashrate1hr: 'desc',
    },
    take: 10,
    distinct: ['userAddress'],
  });

  return topUsers.map(user => ({
    address: user.userAddress,
    hashrate: user.hashrate1hr.toString(),
  }));
}
