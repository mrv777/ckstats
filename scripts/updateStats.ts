import prisma from '../lib/db';
import { fetchPoolStats, savePoolStats } from '../lib/api';

async function updateStats() {
  try {
    const stats = await fetchPoolStats();
    await savePoolStats(stats);
    console.log('Pool stats updated successfully');
  } catch (error) {
    console.error('Error updating pool stats:', error);
  }
}

// Run the update every 30 seconds
setInterval(updateStats, 30000);

// Run the update immediately on script start
updateStats();
