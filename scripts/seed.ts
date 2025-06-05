import 'dotenv/config';
import * as fs from 'fs';
import { getDb } from '../lib/db';
import { PoolStats } from '../lib/entities/PoolStats';

// Define an interface for the pool stats
interface PoolStatsData {
  runtime: string;
  Users: string;
  Workers: string;
  Idle: string;
  Disconnected: string;
  hashrate1m: string;
  hashrate5m: string;
  hashrate15m: string;
  hashrate1hr: string;
  hashrate6hr: string;
  hashrate1d: string;
  hashrate7d: string;
  diff: string;
  accepted: string;
  rejected: string;
  bestshare: string;
  SPS1m: string;
  SPS5m: string;
  SPS15m: string;
  SPS1h: string;
}

// Using partial to allow for fields that may or may not be present but are not required
async function fetchPoolStats(): Promise<Partial<PoolStatsData>> {
  let data: string;

  console.log('Fetching pool stats...');
  const apiUrl = (process.env.API_URL || 'https://solo.ckpool.org') + '/pool/pool.status';

  try {
    const response = await fetch(apiUrl);
    data = await response.text();
  } catch (error: any) {
    if(error.cause?.code == "ERR_INVALID_URL") {
      data = fs.readFileSync(apiUrl, 'utf-8');
    } else throw(error);
  }

  const jsonLines = data.split('\n').filter(Boolean);
  const parsedData = jsonLines.reduce((acc, line) => ({ ...acc, ...JSON.parse(line) }), {});
  return parsedData as PoolStatsData;
}

// Function to convert hashrate with units to string
const convertHashrate = (value: string): string => {
  const units = { P: 1e15, T: 1e12, G: 1e9, M: 1e6, K: 1e3 };
  const match = value.match(/^(\d+(\.\d+)?)([PTGMK])$/);
  if (match) {
    const [, num, , unit] = match;
    return Math.round(parseFloat(num) * units[unit]).toString();
  }
  return value;
};

async function seed() {
  try {
    console.log('Fetching pool stats...');
    const stats = await fetchPoolStats();
    
    console.log('Saving pool stats to database...');
    
    const db = await getDb();
    const poolStatsRepository = db.getRepository(PoolStats);

    const poolStats = poolStatsRepository.create({
      runtime: parseInt(stats.runtime ?? '0'),
      users: parseInt(stats.Users ?? '0'),
      workers: parseInt(stats.Workers ?? '0'),
      idle: parseInt(stats.Idle ?? '0'),
      disconnected: stats.Disconnected ? parseInt(stats.Disconnected) : 0,
      hashrate1m: BigInt(convertHashrate(stats.hashrate1m ?? '0')),
      hashrate5m: BigInt(convertHashrate(stats.hashrate5m ?? '0')),
      hashrate15m: BigInt(convertHashrate(stats.hashrate15m ?? '0')),
      hashrate1hr: BigInt(convertHashrate(stats.hashrate1hr ?? '0')),
      hashrate6hr: BigInt(convertHashrate(stats.hashrate6hr ?? '0')),
      hashrate1d: BigInt(convertHashrate(stats.hashrate1d ?? '0')),
      hashrate7d: BigInt(convertHashrate(stats.hashrate7d ?? '0')),
      diff: stats.diff,
      accepted: stats.accepted,
      rejected: stats.rejected,
      bestshare: stats.bestshare,
      SPS1m: stats.SPS1m,
      SPS5m: stats.SPS5m,
      SPS15m: stats.SPS15m,
      SPS1h: stats.SPS1h,
      timestamp: new Date(),
    } as Partial<PoolStats>);

    await poolStatsRepository.save(poolStats);
    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    const db = await getDb();
    await db.destroy();
  }
}

(async () => {
  try {
    await seed();
    console.log('Seeding completed successfully.');
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
})();
