import 'dotenv/config';
import 'reflect-metadata';
import * as fs from 'fs';
import { getDb } from '../lib/db';
import { User } from '../lib/entities/User';
import { UserStats } from '../lib/entities/UserStats';
import { Worker } from '../lib/entities/Worker';
import { WorkerStats } from '../lib/entities/WorkerStats';
import { convertHashrate } from '../utils/helpers';

const BATCH_SIZE = 10;
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
  let userData: UserData;

  // Perform a last minute check to prevent directory traversal vulnerabilities
  if (/[^a-zA-Z0-9]/.test(address)) {
    throw new Error('updateSingleUser(): address contains invalid characters');
  }

  const apiUrl = (process.env.API_URL || 'https://solo.ckpool.org') + `/users/${address}`;

  console.log('Attempting to update user stats for:', address);
  const db = await getDb();

  try {
    try {
      const response = await fetch(apiUrl);

       if (!response.ok) {
         throw new Error(`HTTP error! status: ${response.status}`);
       }

      userData = await response.json() as UserData;
    } catch (error: any) {
      if (error.cause?.code == 'ERR_INVALID_URL') {
        userData = JSON.parse(fs.readFileSync(apiUrl, 'utf-8')) as UserData;
      } else throw error;
    }
    
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
          updatedAt: new Date().toISOString()
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
      const workerStatsRepository = manager.getRepository(WorkerStats);
      
      for (const workerData of userData.worker) {
        const workerName = workerData.workername.includes('.')
          ? workerData.workername.split('.')[1]
          : workerData.workername.includes('_')
            ? workerData.workername.split('_')[1]
            : workerData.workername;
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

        let workerId: number;
        if (worker) {
          Object.assign(worker, workerValues);
          const savedWorker = await workerRepository.save(worker);
          workerId = savedWorker.id;
        } else {
          const newWorker = await workerRepository.save({
            userAddress: address,
            name: workerName,
            updatedAt: new Date().toISOString(),
            ...workerValues,
          });
          workerId = newWorker.id;
        }

        // Create a new WorkerStats entry
        const workerStats = workerStatsRepository.create({
          workerId,
          hashrate1m: workerValues.hashrate1m,
          hashrate5m: workerValues.hashrate5m,
          hashrate1hr: workerValues.hashrate1hr,
          hashrate1d: workerValues.hashrate1d,
          hashrate7d: workerValues.hashrate7d,
          shares: workerValues.shares,
          bestShare: workerValues.bestShare,
          bestEver: workerValues.bestEver
        });
        await workerStatsRepository.save(workerStats);
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
  let db;
  
  try {
    db = await getDb();
    const userRepository = db.getRepository(User);

    const users = await userRepository.find({
      where: { isActive: true },
      order: { address: 'ASC' },
    });

    if (users.length === 0) {
      console.log('No active users found');
    }

    // Process users in batches
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${i / BATCH_SIZE + 1} of ${Math.ceil(users.length / BATCH_SIZE)}`);
      
      await Promise.all(
        batch.map(async (user) => {
          try {
            await updateUser(user.address);
          } catch (error) {
            console.error(`Failed to update user ${user.address}:`, error);
          }
        })
      );
    }

    // await updateInactiveUsers();
  } catch (error) {
    console.error('Error in main loop:', error);
    throw error;
  } finally {
    // Ensure database connection is always closed if it was established
    if (db) {
      try {
        await db.destroy();
        console.log('Database connection closed');
      } catch (error) {
        console.error('Error closing database connection:', error);
      }
    }
  }
}

// Run the script
main().catch(console.error); 
