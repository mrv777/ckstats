const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanOldStats() {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  try {
    // Delete old pool stats
    const deletedPoolStats = await prisma.poolStats.deleteMany({
      where: {
        timestamp: {
          lt: oneWeekAgo
        }
      }
    });
    console.log(`Deleted ${deletedPoolStats.count} old pool stats`);

    // Delete old user stats
    const deletedUserStats = await prisma.userStats.deleteMany({
      where: {
        timestamp: {
          lt: oneWeekAgo
        }
      }
    });
    console.log(`Deleted ${deletedUserStats.count} old user stats`);

    // Delete old worker stats
    const deletedWorkerStats = await prisma.workerStats.deleteMany({
      where: {
        timestamp: {
          lt: oneWeekAgo
        }
      }
    });
    console.log(`Deleted ${deletedWorkerStats.count} old worker stats`);

    console.log('Old stats cleanup completed successfully');
  } catch (error) {
    console.error('Error cleaning old stats:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanOldStats();