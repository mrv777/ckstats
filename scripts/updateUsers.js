const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fetchUserData(address) {
  const response = await fetch(`https://solo.ckpool.org/users/${address}`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
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
      hashrate1m: userData.hashrate1m.toString(),
      hashrate5m: userData.hashrate5m.toString(),
      hashrate1hr: userData.hashrate1hr.toString(),
      hashrate1d: userData.hashrate1d.toString(),
      hashrate7d: userData.hashrate7d.toString(),
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
      hashrate1m: workerData.hashrate1m.toString(),
      hashrate5m: workerData.hashrate5m.toString(),
      hashrate1hr: workerData.hashrate1hr.toString(),
      hashrate1d: workerData.hashrate1d.toString(),
      hashrate7d: workerData.hashrate7d.toString(),
      lastUpdate: new Date(workerData.lastshare * 1000),
      shares: BigInt(workerData.shares),
      bestShare: parseFloat(workerData.bestshare),
      bestEver: BigInt(workerData.bestever),
    },
    create: {
      userAddress: address,
      name: workerName,
      hashrate1m: workerData.hashrate1m.toString(),
      hashrate5m: workerData.hashrate5m.toString(),
      hashrate1hr: workerData.hashrate1hr.toString(),
      hashrate1d: workerData.hashrate1d.toString(),
      hashrate7d: workerData.hashrate7d.toString(),
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
      hashrate1m: workerData.hashrate1m.toString(),
      hashrate5m: workerData.hashrate5m.toString(),
      hashrate1hr: workerData.hashrate1hr.toString(),
      hashrate1d: workerData.hashrate1d.toString(),
      hashrate7d: workerData.hashrate7d.toString(),
      shares: BigInt(workerData.shares),
      bestShare: parseFloat(workerData.bestshare),
      bestEver: BigInt(workerData.bestever),
    },
  });
}

async function updateUserAndWorkers(address, userData) {
  await prisma.$transaction(async (prisma) => {
    await updateUser(address, userData, prisma);
    for (const workerData of userData.worker) {
      await updateWorker(address, workerData, prisma);
    }
  });
}

async function updateUsers() {
  try {
    const users = await prisma.user.findMany();
    const updates = [];

    for (const user of users) {
      console.log(`Fetching data for user: ${user.address}`);
      const userData = await fetchUserData(user.address);
      updates.push(updateUser(user.address, userData));
      updates.push(...userData.worker.map(w => updateWorker(user.address, w)));
    }

    await Promise.all(updates);

    console.log('All users and workers updated successfully');
  } catch (error) {
    console.error('Error updating users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateUsers();
