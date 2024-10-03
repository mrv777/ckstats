const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fetchPoolStats() {
  const response = await fetch(process.env.API_URL);
  const data = await response.text();
  const jsonLines = data.split('\n').filter(Boolean);
  const parsedData = jsonLines.reduce((acc, line) => ({ ...acc, ...JSON.parse(line) }), {});
  return parsedData;
}

async function seed() {
  try {
    console.log('Fetching pool stats...');
    const stats = await fetchPoolStats();
    
    console.log('Saving pool stats to database...');
    await prisma.poolStats.create({
      data: {
        runtime: stats.runtime,
        users: stats.Users,
        workers: stats.Workers,
        idle: stats.Idle,
        disconnected: stats.Disconnected,
        hashrate1m: stats.hashrate1m,
        hashrate5m: stats.hashrate5m,
        hashrate15m: stats.hashrate15m,
        hashrate1hr: stats.hashrate1hr,
        hashrate6hr: stats.hashrate6hr,
        hashrate1d: stats.hashrate1d,
        hashrate7d: stats.hashrate7d,
        diff: stats.diff,
        accepted: BigInt(stats.accepted),
        rejected: BigInt(stats.rejected),
        bestshare: BigInt(stats.bestshare),
        SPS1m: stats.SPS1m,
        SPS5m: stats.SPS5m,
        SPS15m: stats.SPS15m,
        SPS1h: stats.SPS1h,
      },
    });

    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seed().catch((error) => {
  console.error('Error in seed function:', error);
  process.exit(1);
});
