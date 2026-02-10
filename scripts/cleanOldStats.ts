import 'dotenv/config';
import { getDb } from '../lib/db';
import { PoolStats } from '../lib/entities/PoolStats';
import { User } from '../lib/entities/User';
import { UserStats } from '../lib/entities/UserStats';
import { Worker } from '../lib/entities/Worker';
import { WorkerStats } from '../lib/entities/WorkerStats';
import { In, LessThan } from 'typeorm';


/**
 * Cleans up old statistical records from the database to prevent indefinite growth.
 *
 * @param {DataSource | Connection} db - The TypeORM database connection.
 */
async function cleanOldStats(db) {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  try {
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
  }
}

/**
 * Remove dead workers and their related stats.
 *
 * @param {DataSource | Connection} db - The TypeORM database connection.
 */

async function cleanDeadWorkers(db) {
  try {
    // Find active users
    const activeUsers = await db.getRepository(User).find({
      where: { isActive: true },
      relations: ['workers'],
    });

    let deletedWorkersCount = 0;
    let deletedStatsCount = 0;
    const INACTIVE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
    const threshold = new Date(Date.now() - INACTIVE_THRESHOLD_MS);

    for (const user of activeUsers) {
      const deadWorkers = user.workers.filter(worker =>
        worker.lastUpdate < threshold
      );

      if (deadWorkers.length > 0) {
        // Delete associated WorkerStats first (to avoid foreign key issues)
        const deadWorkerIds = deadWorkers.map(w => w.id);
        const statsResult = await db.getRepository(WorkerStats).delete({
          worker: { id: In(deadWorkerIds) },
        });
        deletedStatsCount += statsResult.affected || 0;

        // Then delete the workers
        const workersResult = await db.getRepository(Worker).delete({
          id: In(deadWorkerIds),
        });
        deletedWorkersCount += workersResult.affected || 0;
      }
    }

    console.log(`Deleted ${deletedWorkersCount} dead workers and ${deletedStatsCount} associated stats for active users`);
    console.log('Dead workers cleanup completed successfully');
  } catch (error) {
    console.error('Error cleaning dead workers: ', error);
  }
}

/**
 * Run all the clean up actions.
 */

async function main() {
  const db = await getDb();

  try {
    await cleanOldStats(db)
    await cleanDeadWorkers(db)
  } finally {
    await db.destroy();
  }
}

main()

