import { getLatestPoolStats, getHistoricalPoolStats } from '../lib/api';
import PoolStatsDisplay from '../components/PoolStatsDisplay';
import PoolStatsChart from '../components/PoolStatsChart';

export default async function Home() {
  try {
    const [latestStats, historicalStats] = await Promise.all([
      getLatestPoolStats(),
      getHistoricalPoolStats()
    ]);

    if (!latestStats) {
      return <main className="container mx-auto p-4">
        <p>No stats available at the moment. Please try again later.</p>
      </main>;
    }

    return (
      <main className="container mx-auto p-4">
        <PoolStatsDisplay stats={latestStats} />
        {historicalStats && historicalStats.length > 0 ? (
          <PoolStatsChart data={historicalStats} />
        ) : (
          <p>Historical data is not available.</p>
        )}
      </main>
    );
  } catch (error) {
    console.error('Error fetching pool stats:', error);
    return <main className="container mx-auto p-4">
      <p>An error occurred while fetching the stats. Please try again later.</p>
    </main>;
  }
}