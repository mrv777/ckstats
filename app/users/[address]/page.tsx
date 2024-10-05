export const revalidate = 60;

import Link from 'next/link';
import { notFound } from 'next/navigation';

import UserResetButton from '../../../components/UserResetButton';
import UserStatsCharts from '../../../components/UserStatsCharts';
import {
  getUserWithWorkersAndStats,
  getUserHistoricalStats,
} from '../../../lib/api';
import {
  formatHashrate,
  formatNumber,
  formatTimeAgo,
} from '../../../utils/helpers';

export default async function UserPage({
  params,
}: {
  params: { address: string };
}) {
  const user = await getUserWithWorkersAndStats(params.address);
  const historicalStats = await getUserHistoricalStats(params.address);

  if (!user) {
    notFound();
  }

  if (user.isActive === false) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4 break-words text-accent">
          {user.address}
        </h1>
        <div
          className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded"
          role="alert"
        >
          <p className="font-bold">User is not active</p>
          <UserResetButton address={user.address} />
        </div>
      </div>
    );
  }

  if (user.stats.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4 break-words text-accent">
          {user.address}
        </h1>
        <div
          className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded"
          role="alert"
        >
          <p className="font-bold">No Stats Available Yet</p>
          <p>User is queued to start updating stats soon.</p>
        </div>
      </div>
    );
  }

  const latestStats = user.stats[0]; // Assuming stats are ordered by timestamp desc

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 break-words text-accent">
        {user.address}
      </h1>
      <div className="stats stats-vertical sm:stats-horizontal shadow">
        <div className="stat">
          <div className="stat-title">Worker Count</div>
          <div className="stat-value">{user.workers.length}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Total Shares</div>
          <div className="stat-value">{formatNumber(latestStats.shares)}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Authorised</div>
          <div className="stat-value">
            {new Date(Number(user.authorised) * 1000).toLocaleDateString()}
          </div>
        </div>
      </div>

      <div className="stats stats-vertical sm:stats-horizontal shadow mt-4">
        <div className="stat">
          <div className="stat-title">Hashrate (5m)</div>
          <div className="stat-value">
            {formatHashrate(latestStats.hashrate5m)}
          </div>
        </div>
        <div className="stat">
          <div className="stat-title">Hashrate (1hr)</div>
          <div className="stat-value">
            {formatHashrate(latestStats.hashrate1hr)}
          </div>
        </div>
        <div className="stat">
          <div className="stat-title">Hashrate (1d)</div>
          <div className="stat-value">
            {formatHashrate(latestStats.hashrate1d)}
          </div>
        </div>
      </div>

      <div className="stats stats-vertical sm:stats-horizontal shadow mt-4">
        <div className="stat">
          <div className="stat-title">Last Share</div>
          <div className="stat-value">
            {formatTimeAgo(Number(latestStats.lastShare) * 1000)}
          </div>
        </div>
        <div className="stat">
          <div className="stat-title">Best Share</div>
          <div className="stat-value">
            {formatNumber(latestStats.bestShare)}
          </div>
        </div>
        <div className="stat">
          <div className="stat-title">Best Ever</div>
          <div className="stat-value">{formatNumber(latestStats.bestEver)}</div>
        </div>
      </div>

      <UserStatsCharts userStats={historicalStats} />

      <h2 className="text-xl font-bold mt-8 mb-4">Workers</h2>
      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Name</th>
              <th>Hashrate (5m)</th>
              <th>Hashrate (1hr)</th>
              <th>Hashrate (1d)</th>
              <th>Best Share</th>
              <th>Best Ever</th>
              <th>Last Update</th>
            </tr>
          </thead>
          <tbody>
            {user.workers.map((worker) => (
              <tr key={worker.id}>
                <td>
                  <Link
                    className="link text-primary"
                    href={`/users/${params.address}/workers/${worker.name}`}
                  >
                    {worker.name}
                  </Link>
                </td>
                <td className={`${worker.hashrate5m < 1 ? 'text-error' : ''}`}>
                  {formatHashrate(worker.hashrate5m)}
                </td>
                <td className={`${worker.hashrate1hr < 1 ? 'text-error' : ''}`}>
                  {formatHashrate(worker.hashrate1hr)}
                </td>
                <td className={`${worker.hashrate1d < 1 ? 'text-error' : ''}`}>
                  {formatHashrate(worker.hashrate1d)}
                </td>
                <td>{formatNumber(worker.bestShare)}</td>
                <td>{formatNumber(worker.bestEver)}</td>
                <td>{formatTimeAgo(worker.lastUpdate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
