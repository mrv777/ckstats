import Link from 'next/link';

import { PoolStatsType } from '../lib/api';
import {
  formatNumber,
  formatHashrate,
  formatTimeAgo,
  formatDuration,
} from '../utils/helpers';

interface PoolStatsDisplayProps {
  stats: PoolStatsType;
}

export default function PoolStatsDisplay({ stats }: PoolStatsDisplayProps) {
  // Helper function to format values
  const formatValue = (key: string, value: any): string => {
    if (key.startsWith('hashrate')) {
      return formatHashrate(value);
    } else if (key === 'diff') {
      return `${value.toFixed(2)}T`;
    } else if (typeof value === 'bigint' || typeof value === 'number') {
      return formatNumber(value);
    } else if (key === 'timestamp') {
      return new Date(value).toISOString().slice(0, 19) + ' UTC';
    }
    return String(value);
  };

  // Helper function to format keys
  const formatKey = (key: string): string => {
    // Handle hashrate and SPS cases
    if (key.startsWith('hashrate') || key.startsWith('SPS')) {
      return key.replace(/^(hashrate|SPS)/, '').toUpperCase();
    } else if (key === 'diff') {
      return 'Network Diff';
    } else if (key === 'bestshare') {
      return 'Best Diff';
    }
    // General case
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase());
  };

  const statGroups = [
    { title: 'Users', keys: ['users', 'disconnected', 'workers'] },
    {
      title: 'Shares',
      keys: ['accepted', 'rejected', 'bestshare', 'diff'],
    },
    { title: 'Shares Per Second', keys: ['SPS1m', 'SPS5m', 'SPS15m', 'SPS1h'] },
  ];

  const hashrateGroup = {
    title: 'Hashrates',
    keys: [
      'hashrate1m',
      'hashrate5m',
      'hashrate15m',
      'hashrate1hr',
      'hashrate6hr',
      'hashrate1d',
      'hashrate7d',
    ],
  };

  // Updated function to handle bigint
  const calculateAverageTimeToBlock = (
    hashRate: bigint,
    difficulty: number
  ): number => {
    const hashesPerDifficulty = BigInt(Math.pow(2, 32));
    const convertedDifficulty = BigInt(Math.round(difficulty * 1e12)); // Convert T to hashes
    return Number((convertedDifficulty * hashesPerDifficulty) / hashRate);
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">General Info</h2>
            <div className="stats stats-vertical xl:stats-horizontal shadow">
              <div className="stat">
                <div className="stat-title">Runtime</div>
                <div className="stat-value text-2xl">
                  {formatDuration(stats.runtime)}
                </div>
              </div>
              <div className="stat">
                <div className="stat-title">Last Update</div>
                <div className="stat-value text-2xl">
                  {formatTimeAgo(stats.timestamp)}
                </div>
              </div>
              <div className="stat">
                <div className="stat-title">Avg Time to Find a Block</div>
                <div className="stat-value text-2xl">
                  {stats.hashrate1hr && stats.diff
                    ? formatDuration(
                        calculateAverageTimeToBlock(
                          stats.hashrate6hr,
                          Number(stats.diff)
                        )
                      )
                    : 'N/A'}
                </div>
                <div className="stat-desc">
                  <Link
                    href="https://btc.com/stats/pool/Solo%20CK"
                    target="_blank"
                    className="link text-primary"
                  >
                    Found Blocks
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        {statGroups.map((group) => (
          <div key={group.title} className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">{group.title}</h2>
              <div className="stats stats-vertical lg:stats-horizontal shadow">
                {group.keys.map((key) => (
                  <div key={key} className="stat">
                    <div className="stat-title">{formatKey(key)}</div>
                    <div className="stat-value text-2xl">
                      {formatValue(key, stats[key])}
                    </div>
                    {key === 'users' && (
                      <div className="stat-desc">
                        Idle: {formatNumber(stats.idle)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">{hashrateGroup.title}</h2>
          <div className="stats stats-vertical lg:stats-horizontal shadow">
            {hashrateGroup.keys.map((key) => (
              <div key={key} className="stat">
                <div className="stat-title">{formatKey(key)}</div>
                <div className="stat-value text-2xl">
                  {formatValue(key, stats[key])}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
