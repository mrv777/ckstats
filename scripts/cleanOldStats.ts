import 'dotenv/config';
import { getDb } from '../lib/db';
import { PoolStats } from '../lib/entities/PoolStats';
import { UserStats } from '../lib/entities/UserStats';
import { WorkerStats } from '../lib/entities/WorkerStats';
import { LessThan } from 'typeorm';

async function cleanOldStats() {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  try {
    const db = await getDb();

    // Delete old pool stats
    const poolStatsResult = await db.getRepository(PoolStats).delete({
      timestamp: LessThan(oneWeekAgo)
    });
    console.log(`Deleted ${poolStatsResult.affected || 0} old pool stats`);

    // Delete old user stats
    const userStatsResult = await db.getRepository(UserStats).delete({
      timestamp: LessThan(threeDaysAgo)
    });
    console.log(`Deleted ${userStatsResult.affected || 0} old user stats`);

    // Delete old worker stats
    const workerStatsResult = await db.getRepository(WorkerStats).delete({
      timestamp: LessThan(oneDayAgo)
    });
    console.log(`Deleted ${workerStatsResult.affected || 0} old worker stats`);

    console.log('Old stats cleanup completed successfully');
  } catch (error) {
    console.error('Error cleaning old stats:', error);
  } finally {
    const db = await getDb();
    await db.destroy();
  }
}

cleanOldStats().catch(console.error); 