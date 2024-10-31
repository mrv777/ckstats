import { getDb } from '../lib/db';
import { PoolStats } from '../lib/entities/PoolStats';

async function fetchPoolStats() {
  console.log('Fetching pool stats...');
  const apiUrl = process.env.API_URL || 'https://solo.ckpool.org';
  const response = await fetch(`${apiUrl}/pool/pool.status`);
  const data = await response.text();
  const jsonLines = data.split('\n').filter(Boolean);
  const parsedData = jsonLines.reduce((acc, line) => ({ ...acc, ...JSON.parse(line) }), {});
  return parsedData;
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
      runtime: parseInt(stats.runtime),
      users: parseInt(stats.Users),
      workers: parseInt(stats.Workers),
      idle: parseInt(stats.Idle),
      disconnected: parseInt(stats.Disconnected),
      hashrate1m: BigInt(convertHashrate(stats.hashrate1m)),
      hashrate5m: BigInt(convertHashrate(stats.hashrate5m)),
      hashrate15m: BigInt(convertHashrate(stats.hashrate15m)),
      hashrate1hr: BigInt(convertHashrate(stats.hashrate1hr)),
      hashrate6hr: BigInt(convertHashrate(stats.hashrate6hr)),
      hashrate1d: BigInt(convertHashrate(stats.hashrate1d)),
      hashrate7d: BigInt(convertHashrate(stats.hashrate7d)),
      diff: stats.diff,
      accepted: stats.accepted,
      rejected: stats.rejected,
      bestshare: stats.bestshare,
      SPS1m: stats.SPS1m,
      SPS5m: stats.SPS5m,
      SPS15m: stats.SPS15m,
      SPS1h: stats.SPS1h,
      timestamp: new Date(),
    });

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
