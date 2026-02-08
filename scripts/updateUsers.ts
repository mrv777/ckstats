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

// Batch-oriented processing: fetch remote data for a batch of users concurrently
// then perform all DB writes for that batch inside a single transaction.

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

      // 1) Fetch remote data for the entire batch concurrently (limited by batch size)
      const fetchPromises = batch.map(async (user) => {
        const address = user.address;

        // Perform a last minute check to prevent directory traversal vulnerabilities
        if (/[^a-zA-Z0-9]/.test(address)) {
          return { address, error: new Error('updateUsers(): address contains invalid characters') };
        }

        const apiUrl = (process.env.API_URL || 'https://solo.ckpool.org') + `/users/${address}`;
        try {
          const response = await fetch(apiUrl);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const userData = (await response.json()) as UserData;
          return { address, userData } as { address: string; userData?: UserData; error?: any };
        } catch (error: any) {
          if (error.cause?.code == 'ERR_INVALID_URL') {
            try {
              const userData = JSON.parse(fs.readFileSync(apiUrl, 'utf-8')) as UserData;
              return { address, userData };
            } catch (fsErr) {
              return { address, error: fsErr };
            }
          }
          return { address, error };
        }
      });

      const fetched = await Promise.all(fetchPromises);

      // 2) Perform all DB writes for this batch inside a single transaction
      try {
        await db.transaction(async (manager) => {
          const userRepo = manager.getRepository(User);
          const userStatsRepo = manager.getRepository(UserStats);
          const workerRepo = manager.getRepository(Worker);
          const workerStatsRepo = manager.getRepository(WorkerStats);

          for (const result of fetched) {
            const address = result.address;
            if (result.error || !result.userData) {
              // Mark user inactive when fetch failed
              try {
                await userRepo.update({ address }, { isActive: false });
                console.log(`Marked user ${address} as inactive (fetch error)`);
              } catch (updateErr) {
                console.error(`Failed to mark user ${address} inactive:`, updateErr);
              }
              continue;
            }

            const userData = result.userData;

            try {
              // Update or create user
              const existingUser = await userRepo.findOne({ where: { address } });
              if (existingUser) {
                existingUser.authorised = userData.authorised.toString();
                existingUser.isActive = true;
                await userRepo.save(existingUser);
              } else {
                await userRepo.insert({
                  address,
                  authorised: userData.authorised.toString(),
                  isActive: true,
                  updatedAt: new Date().toISOString(),
                });
              }

              // Create a new UserStats entry
              const userStats = userStatsRepo.create({
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
                bestEver: BigInt(userData.bestever).toString(),
              });
              await userStatsRepo.save(userStats);

              // Update or create workers
              for (const workerData of userData.worker) {
                const workerName = workerData.workername.includes('.')
                  ? workerData.workername.split('.')[1]
                  : workerData.workername.includes('_')
                    ? workerData.workername.split('_')[1]
                    : workerData.workername;

                const existingWorker = await workerRepo.findOne({
                  where: { userAddress: address, name: workerName },
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
                if (existingWorker) {
                  Object.assign(existingWorker, workerValues);
                  const savedWorker = await workerRepo.save(existingWorker);
                  workerId = savedWorker.id;
                } else {
                  const newWorker = await workerRepo.save({
                    userAddress: address,
                    name: workerName,
                    updatedAt: new Date().toISOString(),
                    ...workerValues,
                  });
                  workerId = newWorker.id;
                }

                // Create a new WorkerStats entry
                const workerStats = workerStatsRepo.create({
                  workerId,
                  hashrate1m: workerValues.hashrate1m,
                  hashrate5m: workerValues.hashrate5m,
                  hashrate1hr: workerValues.hashrate1hr,
                  hashrate1d: workerValues.hashrate1d,
                  hashrate7d: workerValues.hashrate7d,
                  shares: workerValues.shares,
                  bestShare: workerValues.bestShare,
                  bestEver: workerValues.bestEver,
                });
                await workerStatsRepo.save(workerStats);
              }
            } catch (userWriteErr) {
              console.error(`Failed processing user ${address} in batch transaction:`, userWriteErr);
              try {
                await userRepo.update({ address }, { isActive: false });
              } catch (updateErr) {
                console.error(`Failed to mark user ${address} inactive after write error:`, updateErr);
              }
              // continue processing other users in the batch
            }
          }
        });
        console.log(`Batch ${i / BATCH_SIZE + 1} committed successfully.`);
      } catch (txErr) {
        console.error(`Batch ${i / BATCH_SIZE + 1} transaction failed:`, txErr);
      }
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

