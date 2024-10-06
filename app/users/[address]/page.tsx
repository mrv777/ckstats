export const revalidate = 60;

import Link from 'next/link';
import { notFound } from 'next/navigation';

import UserResetButton from '../../../components/UserResetButton';
import UserStatsCharts from '../../../components/UserStatsCharts';
import {
  getUserWithWorkersAndStats,
  getUserHistoricalStats,
  getLatestPoolStats,
} from '../../../lib/api';
import {
  formatHashrate,
  formatNumber,
  formatTimeAgo,
  calculatePercentageChange,
  getPercentageChangeColor,
  calculateBlockChances,
} from '../../../utils/helpers';

export default async function UserPage({
  params,
}: {
  params: { address: string };
}) {
  const [user, stats, historicalStats] = await Promise.all([
    getUserWithWorkersAndStats(params.address),
    getLatestPoolStats(),
    getUserHistoricalStats(params.address),
  ]);

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

  const renderPercentageChange = (key: string) => {
    if (historicalStats.length < 120) return 'N/A';

    const currentValue = Number(latestStats[key]);
    const pastValue = Number(
      historicalStats[historicalStats.length - 120][key]
    );

    const change = calculatePercentageChange(currentValue, pastValue);
    const color = getPercentageChangeColor(change);

    return (
      <div
        className={`stat-desc tooltip text-left ${color}`}
        data-tip="24 hour % change"
      >
        {change === 'N/A' ? 'N/A' : `${change}%`}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 break-words text-accent">
        {user.address}
      </h1>
      <div className="stats stats-vertical sm:stats-horizontal shadow-lg my-2">
        <div className="stat">
          <div className="stat-title">Worker Count</div>
          <div className="stat-value">{user.workers.length}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Authorised</div>
          <div className="stat-value">
            {new Date(Number(user.authorised) * 1000).toLocaleDateString()}
          </div>
        </div>
        <div className="stat">
          <div className="stat-title">Last Share</div>
          <div className="stat-value">
            {/* We only update every 10 minutes, so show 'Recently' if less than 11 minutes */}
            {formatTimeAgo(Number(latestStats.lastShare) * 1000, 11)}
          </div>
        </div>
      </div>

      <div className="stats stats-vertical sm:stats-horizontal shadow-lg my-2">
        <div className="stat">
          <div className="stat-title">Total Shares</div>
          <div className="stat-value">{formatNumber(latestStats.shares)}</div>
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

      <div className="stats stats-vertical sm:stats-horizontal shadow-lg my-2">
        <div className="stat">
          <div className="stat-title">Hashrate (5m)</div>
          <div className="stat-value">
            {formatHashrate(latestStats.hashrate5m)}
          </div>
          {renderPercentageChange('hashrate5m')}
        </div>
        <div className="stat">
          <div className="stat-title">Hashrate (1hr)</div>
          <div className="stat-value">
            {formatHashrate(latestStats.hashrate1hr)}
          </div>
          {renderPercentageChange('hashrate1hr')}
        </div>
        <div className="stat">
          <div className="stat-title">Hashrate (1d)</div>
          <div className="stat-value">
            {formatHashrate(latestStats.hashrate1d)}
          </div>
          {renderPercentageChange('hashrate1d')}
        </div>
        <div className="stat">
          <div className="stat-title">Hashrate (7d)</div>
          <div className="stat-value">
            {formatHashrate(latestStats.hashrate7d)}
          </div>
          {renderPercentageChange('hashrate7d')}
        </div>
      </div>

      <h2 className="text-xl font-bold mt-4">Odds of Finding a Block</h2>
      <div className="stats stats-vertical sm:stats-horizontal shadow-lg my-2">
        <div className="stat">
          <div className="stat-title">1 Day</div>
          <div className="stat-value">
            {latestStats.hashrate1hr && stats?.diff
              ? calculateBlockChances(
                  latestStats.hashrate1hr,
                  Number(stats.diff)
                )['1d']
              : 'N/A'}
          </div>
        </div>
        <div className="stat">
          <div className="stat-title">1 Week</div>
          <div className="stat-value">
            {latestStats.hashrate1hr && stats?.diff
              ? calculateBlockChances(
                  latestStats.hashrate1hr,
                  Number(stats.diff)
                )['1w']
              : 'N/A'}
          </div>
        </div>
        <div className="stat">
          <div className="stat-title">1 Month</div>
          <div className="stat-value">
            {latestStats.hashrate1hr && stats?.diff
              ? calculateBlockChances(
                  latestStats.hashrate1hr,
                  Number(stats.diff)
                )['1m']
              : 'N/A'}
          </div>
        </div>
        <div className="stat">
          <div className="stat-title">1 Year</div>
          <div className="stat-value">
            {latestStats.hashrate1hr && stats?.diff
              ? calculateBlockChances(
                  latestStats.hashrate1hr,
                  Number(stats.diff)
                )['1y']
              : 'N/A'}
          </div>
        </div>
      </div>

      <UserStatsCharts userStats={historicalStats} />

      <div className="bg-base-200 p-4 rounded-lg mt-8">
        <h2 className="text-xl font-bold mb-4">Workers</h2>
        <div className="overflow-x-auto">
          <table className="table w-full table-sm sm:table-md">
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
                  <td
                    className={`${worker.hashrate5m < 1 ? 'text-error' : 'text-accent'}`}
                  >
                    {formatHashrate(worker.hashrate5m)}
                  </td>
                  <td
                    className={`${worker.hashrate1hr < 1 ? 'text-error' : ''}`}
                  >
                    {formatHashrate(worker.hashrate1hr)}
                  </td>
                  <td
                    className={`${worker.hashrate1d < 1 ? 'text-error' : ''}`}
                  >
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
    </div>
  );
}
