import { PoolStatsType } from '../lib/api';
import { formatNumber, formatHashrate } from '../utils/helpers';

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
    } else if (key === 'runtime') {
      const days = Math.floor(value / 86400);
      const hours = Math.floor((value % 86400) / 3600);
      const minutes = Math.floor((value % 3600) / 60);
      return `${days}d ${hours}h ${minutes}m`;
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
      return 'Network Difficulty';
    } else if (key === 'bestshare') {
      return 'Best';
    }
    // General case
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase());
  };

  const statGroups = [
    { title: 'Users', keys: ['users', 'workers', 'idle', 'disconnected'] },
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

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">General Info</h2>
            <div className="stats shadow">
              <div className="stat">
                <div className="stat-title">Runtime</div>
                <div className="stat-value text-3xl">
                  {formatValue('runtime', stats.runtime)}
                </div>
              </div>
              <div className="stat">
                <div className="stat-title">Last Update</div>
                <div className="stat-value text-3xl">
                  {formatValue('timestamp', stats.timestamp)}
                </div>
              </div>
            </div>
          </div>
        </div>
        {statGroups.map((group) => (
          <div key={group.title} className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">{group.title}</h2>
              <div className="stats shadow">
                {group.keys.map((key) => (
                  <div key={key} className="stat">
                    <div className="stat-title">{formatKey(key)}</div>
                    <div className="stat-value text-3xl">
                      {formatValue(key, stats[key])}
                    </div>
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
          <div className="stats shadow">
            {hashrateGroup.keys.map((key) => (
              <div key={key} className="stat">
                <div className="stat-title">{formatKey(key)}</div>
                <div className="stat-value text-3xl">
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
