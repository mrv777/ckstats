import { getLatestPoolStats, getHistoricalPoolStats } from '../lib/api';
import PoolStatsDisplay from '../components/PoolStatsDisplay';
import PoolStatsChart from '../components/PoolStatsChart';

export default async function Home() {
  const latestStats = await getLatestPoolStats();
  const historicalStats = await getHistoricalPoolStats();

  return (
    <main className="container mx-auto p-4">
      {latestStats ? (
        <>
          <PoolStatsDisplay stats={latestStats} />
          <PoolStatsChart data={historicalStats} />
        </>
      ) : (
        <p>Loading stats...</p>
      )}
    </main>
  );
}