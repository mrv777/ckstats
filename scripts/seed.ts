import 'dotenv/config';
import { getDb } from '../lib/db';
import { PoolStats } from '../lib/entities/PoolStats';
import { CKPoolAPI } from '../lib/ckpool';
import { convertHashrate } from '../utils/helpers';

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
  console.log('Fetching pool stats...');
  const ckPoolApi = new CKPoolAPI();
  // poolStatus handles the communication and parsing internally
  const stats = (await ckPoolApi.poolStatus()) as Partial<PoolStatsData>;
  return stats;
}

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
      hashrate1m: convertHashrate(stats.hashrate1m ?? '0'),
      hashrate5m: convertHashrate(stats.hashrate5m ?? '0'),
      hashrate15m: convertHashrate(stats.hashrate15m ?? '0'),
      hashrate1hr: convertHashrate(stats.hashrate1hr ?? '0'),
      hashrate6hr: convertHashrate(stats.hashrate6hr ?? '0'),
      hashrate1d: convertHashrate(stats.hashrate1d ?? '0'),
      hashrate7d: convertHashrate(stats.hashrate7d ?? '0'),
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
