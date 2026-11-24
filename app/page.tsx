export const revalidate = 60;

import PoolStatsChart from '../components/PoolStatsChart';
import PoolStatsDisplay from '../components/PoolStatsDisplay';
import TopUserDifficulties from '../components/TopUserDifficulties';
import TopUserHashrates from '../components/TopUserHashrates';
import { getLatestPoolStats, getPoolStatsHistory } from '../lib/api';
import { serializeData } from '../utils/helpers';

export default async function Home() {
  try {
    const [latestStatsORM, pool1dORM, pool7dORM] = await Promise.all([
      getLatestPoolStats(),
      getPoolStatsHistory('1d'),
      getPoolStatsHistory('7d'),
    ]);

    if (!latestStatsORM) {
      return (
        <main className="container mx-auto p-4">
          <p>No stats available at the moment. Please try again later.</p>
        </main>
      );
    }

    const latestStats = serializeData(latestStatsORM);
    const pool1d = serializeData(pool1dORM);
    const pool7d = serializeData(pool7dORM);

    return (
      <main className="container mx-auto p-4">
        <PoolStatsDisplay stats={latestStats} historicalStats={pool1d} />
        {pool1d && pool1d.length > 0 ? (
          <PoolStatsChart data1d={pool1d} data7d={pool7d} />
        ) : (
          <p>Historical data is not available.</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
          <TopUserDifficulties />
          <TopUserHashrates />
        </div>
      </main>
    );
  } catch (error) {
    console.error('Error fetching pool stats:', error);
    return (
      <main className="container mx-auto p-4">
        <p>
          An error occurred while fetching the stats. Please try again later.
        </p>
      </main>
    );
  }
}
