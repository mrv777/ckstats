import { PoolStatsType } from '../lib/api';

interface PoolStatsTableProps {
  stats: PoolStatsType;
}

export default function PoolStatsTable({ stats }: PoolStatsTableProps) {
  // Helper function to format values
  const formatValue = (key: string, value: any): string => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    if (key === 'timestamp') {
      return new Date(value).toLocaleString();
    }
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return String(value);
  };

  // Helper function to format keys
  const formatKey = (key: string): string => {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  return (
    <div className="overflow-x-auto">
      <table className="table table-zebra w-full">
        <thead>
          <tr>
            <th>Stat</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(stats).map(([key, value]) => (
            <tr key={key}>
              <td>{formatKey(key)}</td>
              <td>{formatValue(key, value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
