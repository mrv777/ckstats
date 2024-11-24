import 'dotenv/config';
import 'reflect-metadata';
import { getDb } from '../lib/db';
import { User } from '../lib/entities/User';
import { UserStats } from '../lib/entities/UserStats';
import { Worker } from '../lib/entities/Worker';
import { convertHashrate } from '../utils/helpers';

// const BATCH_SIZE = 10;
// const INACTIVE_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours

interface WorkerData {
  workername: string;
  hashrate1m: number;
  hashrate5m: number;
  hashrate1hr: number;
  hashrate1d: number;
  hashrate7d: number;
  lastshare: number;
  shares: string;
  bestshare: string;
  bestever: string;
}

interface UserData {
  authorised: number;
  hashrate1m: number;
  hashrate5m: number;
  hashrate1hr: number;
  hashrate1d: number;
  hashrate7d: number;
  lastshare: number;
  workers: number;
  shares: string;
  bestshare: string;
  bestever: string;
  worker: WorkerData[];
}

async function updateUser(address: string): Promise<void> {
  const apiUrl = process.env.API_URL || 'https://solo.ckpool.org';
  
  console.log('Attempting to update user stats for:', address);
  const db = await getDb();

  try {
    const response = await fetch(`${apiUrl}/users/${address}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const userData: UserData = await response.json();
    
    await db.transaction(async (manager) => {
      // Update or create user
      const userRepository = manager.getRepository(User);
      const user = await userRepository.findOne({ where: { address } });
      if (user) {
        user.authorised = userData.authorised.toString();
        user.isActive = true;
        await userRepository.save(user);
      } else {
        await userRepository.insert({
          address,
          authorised: userData.authorised.toString(),
          isActive: true,
        });
      }

      // Create a new UserStats entry
      const userStatsRepository = manager.getRepository(UserStats);
      const userStats = userStatsRepository.create({
        userAddress: address,
        hashrate1m: convertHashrate(userData.hashrate1m.toString()).toString(),
        hashrate5m: convertHashrate(userData.hashrate5m.toString()).toString(),
        hashrate1hr: convertHashrate(userData.hashrate1hr.toString()).toString(),
        hashrate1d: convertHashrate(userData.hashrate1d.toString()).toString(),
        hashrate7d: convertHashrate(userData.hashrate7d.toString()).toString(),
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

        const workerValues = {
          hashrate1m: convertHashrate(workerData.hashrate1m.toString()).toString(),
          hashrate5m: convertHashrate(workerData.hashrate5m.toString()).toString(),
          hashrate1hr: convertHashrate(workerData.hashrate1hr.toString()).toString(),
          hashrate1d: convertHashrate(workerData.hashrate1d.toString()).toString(),
          hashrate7d: convertHashrate(workerData.hashrate7d.toString()).toString(),
          lastUpdate: new Date(workerData.lastshare * 1000),
          shares: BigInt(workerData.shares).toString(),
          bestShare: parseFloat(workerData.bestshare),
          bestEver: BigInt(workerData.bestever).toString(),
        };

        if (worker) {
          Object.assign(worker, workerValues);
          await workerRepository.save(worker);
        } else {
          await workerRepository.insert({
            userAddress: address,
            name: workerName,
            updatedAt: new Date(),
            ...workerValues,
          });
        }
      }
    });

    console.log(`Updated user and workers for: ${address}`);
  } catch (error) {
    const userRepository = db.getRepository(User);
    await userRepository.update({ address }, { isActive: false });
    console.log(`Marked user ${address} as inactive`);
    throw error;
  }
}

// async function updateInactiveUsers(): Promise<void> {
//   const db = await getDb();
//   const userRepository = db.getRepository(User);
//   const userStatsRepository = db.getRepository(UserStats);

//   const inactiveThreshold = new Date(Date.now() - INACTIVE_THRESHOLD);

//   const users = await userStatsRepository
//     .createQueryBuilder('stats')
//     .select('DISTINCT stats.userAddress')
//     .where('stats.timestamp < :threshold', { threshold: inactiveThreshold })
//     .getRawMany();

//   for (const user of users) {
//     await userRepository.update(
//       { address: user.userAddress },
//       { isActive: false }
//     );
//     console.log(`Marked user ${user.userAddress} as inactive`);
//   }
// }

async function main() {
  try {
    const db = await getDb();
    const userRepository = db.getRepository(User);

      const users = await userRepository.find({
        where: { isActive: true },
        order: { address: 'ASC' },
      });

      if (users.length === 0) {
        console.log('No active users found');
      }

      for (const user of users) {
        try {
          await updateUser(user.address);
        } catch (error) {
          console.error(`Failed to update user ${user.address}:`, error);
        }
      }

    // await updateInactiveUsers();

    await db.destroy();
  } catch (error) {
    console.error('Error in main loop:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error); 