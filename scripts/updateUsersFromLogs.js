const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const path = require('path');

const convertHashrate = (value) => {
  const units = { P: 1e15, T: 1e12, G: 1e9, M: 1e6, K: 1e3 };
  // Updated regex to handle scientific notation
  const match = value.match(/^(\d+(\.\d+)?(?:e[+-]\d+)?)([PTGMK])$/i);
  if (match) {
    const [, num, , unit] = match;
    // Parse the number, which now handles scientific notation
    const parsedNum = parseFloat(num);
    return BigInt(Math.round(parsedNum * units[unit.toUpperCase()]));
  }
  return value;
};

async function readUserData(filename) {
  const filePath = path.join(process.env.LOGS_DIR, `users/${filename}`);
  if (!fs.existsSync(filePath)) {
    console.log(`User data file not found: ${filePath}`);
    return null;
  } else {
    console.log(`Reading user data from file: ${filePath}`);
    const data = await fs.promises.readFile(filePath, 'utf8');
    return JSON.parse(data);
  }
}

async function updateUser(address, userData) {
  await prisma.user.upsert({
    where: { address },
    update: {
      authorised: BigInt(userData.authorised),
    },
    create: {
      address,
      authorised: BigInt(userData.authorised),
    },
  });

  // Create a new UserStats entry
  await prisma.userStats.create({
    data: {
      user: { connect: { address } },
      hashrate1m: convertHashrate(userData.hashrate1m),
      hashrate5m: convertHashrate(userData.hashrate5m),
      hashrate1hr: convertHashrate(userData.hashrate1hr),
      hashrate1d: convertHashrate(userData.hashrate1d),
      hashrate7d: convertHashrate(userData.hashrate7d),
      lastShare: BigInt(userData.lastshare),
      workerCount: userData.workers,
      shares: BigInt(userData.shares),
      bestShare: parseFloat(userData.bestshare),
      bestEver: BigInt(userData.bestever),
    },
  });
}

async function updateWorker(address, workerData) {
  if (!workerData.workername) {
    console.log(`Worker data for address ${address} is missing a valid name. Skipping.`);
    return;
  }

  const workerName = workerData.workername; // Show full worker name

  const worker = await prisma.worker.upsert({
    where: {
      userAddress_name: {
        userAddress: address,
        name: workerName,
      },
    },
    update: {
      hashrate1m: convertHashrate(workerData.hashrate1m),
      hashrate5m: convertHashrate(workerData.hashrate5m),
      hashrate1hr: convertHashrate(workerData.hashrate1hr),
      hashrate1d: convertHashrate(workerData.hashrate1d),
      hashrate7d: convertHashrate(workerData.hashrate7d),
      lastUpdate: new Date(workerData.lastshare * 1000),
      shares: BigInt(workerData.shares),
      bestShare: parseFloat(workerData.bestshare),
      bestEver: BigInt(workerData.bestever),
    },
    create: {
      userAddress: address,
      name: workerName,
      hashrate1m: convertHashrate(workerData.hashrate1m),
      hashrate5m: convertHashrate(workerData.hashrate5m),
      hashrate1hr: convertHashrate(workerData.hashrate1hr),
      hashrate1d: convertHashrate(workerData.hashrate1d),
      hashrate7d: convertHashrate(workerData.hashrate7d),
      lastUpdate: new Date(workerData.lastshare * 1000),
      shares: BigInt(workerData.shares),
      bestShare: parseFloat(workerData.bestshare),
      bestEver: BigInt(workerData.bestever),
    },
  });

  // Create a new WorkerStats entry
  await prisma.workerStats.create({
    data: {
      workerId: worker.id,
      hashrate1m: convertHashrate(workerData.hashrate1m),
      hashrate5m: convertHashrate(workerData.hashrate5m),
      hashrate1hr: convertHashrate(workerData.hashrate1hr),
      hashrate1d: convertHashrate(workerData.hashrate1d),
      hashrate7d: convertHashrate(workerData.hashrate7d),
      shares: BigInt(workerData.shares),
      bestShare: parseFloat(workerData.bestshare),
      bestEver: BigInt(workerData.bestever),
    },
  });
}

async function updateUserAndWorkers(username) {
  try {
    const userData = await readUserData(username);
    if (!userData) {
      console.log(`No user data found for username: ${username}`);
      return;
    }
    await prisma.$transaction(async () => {
      await updateUser(username, userData,);
      await Promise.all(userData.worker.map(w => updateWorker(username, w)));
    });
    console.log(`Updated user and workers for: ${username}`);
  } catch (error) {
    console.error(`Error updating user ${username}:`, error);
  }
}

async function updateUsersFromLogs() {
  try {
    let usersDir = path.join(process.env.LOGS_DIR, 'users');
    const files = fs.readdirSync(usersDir);
    console.log(`Found ${files.length} files in ${usersDir}`);
    if (files.length === 0) {
      console.log('No files found in the users directory.');
      return;
    }

    // Get directories only and save them as userNames
    const users = [];
    for (const file of files) {
      users.push(file);
    }

    console.log(`Found ${users.length} user directories`);

    // Define batch size for processing
    const batchSize = 5;

    // Process users in batches
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      await Promise.all(batch.map(user => updateUserAndWorkers(user)));
    }

    console.log('All users and workers updated successfully');
  } catch (error) {
    console.error('Error updating users:', error);
  } finally {
    await prisma.$disconnect();
    // Force garbage collection if running in Node.js with the --expose-gc flag
    if (global.gc) {
      global.gc();
    }
  }
}

(async () => {
  try {
    await updateUsersFromLogs();
  } catch (error) {
    console.error('Unhandled error:', error);
  } finally {
    // Ensure that Prisma client is disconnected
    await prisma.$disconnect();
    // Ensure that the process exits even if there are any hanging promises
    process.exit(0);
  }
})();
