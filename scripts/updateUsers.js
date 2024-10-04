const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const convertHashrate = (value) => {
  const units = { P: 1e15, T: 1e12, G: 1e9, M: 1e6, K: 1e3 };
  // Updated regex to handle scientific notation
  const match = value.match(/^(\d+(\.\d+)?(?:e[+-]\d+)?)([PTGMK])$/i);
  if (match) {
    const [, num, , unit] = match;
    // Parse the number, which now handles scientific notation
    const parsedNum = parseFloat(num);
    return Math.round(parsedNum * units[unit.toUpperCase()]).toString();
  }
  return value;
};

async function fetchUserDataWithRetry(address, maxRetries = 3, delay = 500) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Fetching data for ${address}...`);
      const response = await fetch(`https://solo.ckpool.org/users/${address}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      if (attempt === maxRetries) {
        console.error(`Failed to fetch data for ${address} after ${maxRetries} attempts.`);
        
        // Set user's isActive status to false
        await prisma.user.update({
          where: { address },
          data: { isActive: false },
        });
        
        throw error;
      }
      console.log(`Attempt ${attempt} failed for ${address}. Retrying...`);
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
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
  const workerName = workerData.workername.split('.')[1];
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

async function updateUserAndWorkers(address) {
  try {
    const userData = await fetchUserDataWithRetry(address);
    await prisma.$transaction(async (prisma) => {
      await updateUser(address, userData, prisma);
      await Promise.all(userData.worker.map(w => updateWorker(address, w, prisma)));
    });
    console.log(`Updated user and workers for: ${address}`);
  } catch (error) {
    console.error(`Error updating user ${address}:`, error);
  }
}

async function updateUsers() {
  try {
    const users = await prisma.user.findMany({ where: { isActive: true } });
    const batchSize = 5; // Adjust this value based on your API's rate limits

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      await Promise.all(batch.map(user => updateUserAndWorkers(user.address)));
    }

    console.log('All users and workers updated successfully');
  } catch (error) {
    console.error('Error updating users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateUsers();
