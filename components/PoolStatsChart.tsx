'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { PoolStatsType } from '../lib/api';

interface PoolStatsChartProps {
  data: PoolStatsType[];
}

export default function PoolStatsChart({ data }: PoolStatsChartProps) {
  // Format the data for the charts
  const formattedData = data.map((item) => ({
    ...item,
    timestamp: new Date(item.timestamp).toLocaleTimeString(), // Only extract time
    hashrate1m: ((Number(item.hashrate1m))/1000000000000000),
    hashrate5m: ((Number(item.hashrate5m))/1000000000000000),
    hashrate15m: ((Number(item.hashrate15m))/1000000000000000),
    hashrate1hr: ((Number(item.hashrate1hr))/1000000000000000),
    hashrate6hr: ((Number(item.hashrate6hr))/1000000000000000),
    hashrate1d: ((Number(item.hashrate1d))/1000000000000000),
    hashrate7d: ((Number(item.hashrate7d))/1000000000000000),
    SPS1m: item.SPS1m ?? 0,
    SPS5m: item.SPS5m ?? 0,
    SPS15m: item.SPS15m ?? 0,
    SPS1h: item.SPS1h ?? 0,
  }));

  const renderUsersChart = () => (
    <div className="h-80 w-full mb-8">
      <h2 className="text-xl font-bold mb-2">Users</h2>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={formattedData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <XAxis dataKey="timestamp" />
          <YAxis
            allowDataOverflow={true}
            domain={[
              (dataMin: number) => Math.ceil(dataMin * 0.99),
              (dataMax: number) => Math.floor(dataMax * 1.01),
            ]}
          />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="users"
            stroke="#8884d8"
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  const renderHashrateChart = () => (
    <div className="h-80 w-full mb-8">
      <h2 className="text-xl font-bold mb-2">Hashrate</h2>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={formattedData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <XAxis dataKey="timestamp" />
          <YAxis
            allowDataOverflow={true}
            domain={[
              (dataMin: number) => Math.ceil(dataMin * 0.99),
              (dataMax: number) => Math.floor(dataMax * 1.01),
            ]}
          />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="hashrate1m"
            name="1M"
            stroke="#8884d8"
          />
          <Line
            type="monotone"
            dataKey="hashrate5m"
            name="5M"
            stroke="#82ca9d"
          />
          <Line
            type="monotone"
            dataKey="hashrate15m"
            name="15M"
            stroke="#ffc658"
          />
          <Line
            type="monotone"
            dataKey="hashrate1hr"
            name="1HR"
            stroke="#ff7300"
          />
          <Line
            type="monotone"
            dataKey="hashrate6hr"
            name="6HR"
            stroke="#00C49F"
          />
          <Line
            type="monotone"
            dataKey="hashrate1d"
            name="1D"
            stroke="#FFBB28"
          />
          <Line
            type="monotone"
            dataKey="hashrate7d"
            name="7D"
            stroke="#FF8042"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  const renderSPSChart = () => (
    <div className="h-80 w-full mb-8">
      <h2 className="text-xl font-bold mb-2">Shares Per Second</h2>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={formattedData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <XAxis dataKey="timestamp" />
          <YAxis
            allowDataOverflow={true}
            domain={[
              (dataMin: number) => Math.ceil(dataMin * 0.99),
              (dataMax: number) => Math.floor(dataMax * 1.01),
            ]}
          />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="SPS1m" name="1M" stroke="#8884d8" />
          <Line type="monotone" dataKey="SPS5m" name="5M" stroke="#82ca9d" />
          <Line type="monotone" dataKey="SPS15m" name="15M" stroke="#ffc658" />
          <Line type="monotone" dataKey="SPS1h" name="1H" stroke="#ff7300" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div>
      {renderUsersChart()}
      {renderHashrateChart()}
      {renderSPSChart()}
    </div>
  );
}
