'use client';

import React, { useState, useMemo } from 'react';

import { UserStats, WorkerStats } from '@prisma/client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LegendType,
} from 'recharts';

// Add this function at the top of the file, outside the component
function getHashrateUnit(maxHashrate: number): [string, number] {
  if (maxHashrate >= 1e17) return ['PH/s', 1e15];
  if (maxHashrate >= 1e14) return ['TH/s', 1e12];
  if (maxHashrate >= 1e11) return ['GH/s', 1e9];
  if (maxHashrate >= 1e8) return ['MH/s', 1e6];
  if (maxHashrate >= 1e5) return ['KH/s', 1e3];
  return ['H/s', 1];
}

interface UserStatsChartsProps {
  userStats: (UserStats | WorkerStats)[];
}

export default function UserStatsCharts({ userStats }: UserStatsChartsProps) {
  const [hashrateUnit, setHashrateUnit] = useState<string>('PH/s');

  const chartData = useMemo(() => {
    const maxHashrate = Math.max(
      ...userStats.flatMap((stat) => [
        Number(stat.hashrate1m),
        Number(stat.hashrate5m),
        Number(stat.hashrate1hr),
        Number(stat.hashrate1d),
        Number(stat.hashrate7d),
      ])
    );

    const [unit, scaleFactor] = getHashrateUnit(maxHashrate);
    setHashrateUnit(unit);

    return userStats.map((stat) => ({
      timestamp: new Date(stat.timestamp).toLocaleString(),
      workerCount: 'workerCount' in stat ? stat.workerCount : undefined,
      '1m': Number(stat.hashrate1m) / scaleFactor,
      '5m': Number(stat.hashrate5m) / scaleFactor,
      '1hr': Number(stat.hashrate1hr) / scaleFactor,
      '1d': Number(stat.hashrate1d) / scaleFactor,
      '7d': Number(stat.hashrate7d) / scaleFactor,
    }));
  }, [userStats]);

  const [visibleLines, setVisibleLines] = useState({
    '1m': false,
    '5m': true,
    '1hr': true,
    '1d': true,
    '7d': false,
  });

  const handleLegendClick = (dataKey: string) => {
    setVisibleLines((prev) => ({ ...prev, [dataKey]: !prev[dataKey] }));
  };

  const hashrateTooltipFormatter = (value: number, name: string) => [
    `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${hashrateUnit}`,
    name,
  ];

  const legendPayload = [
    {
      value: '1m',
      type: 'line',
      color: visibleLines['1m'] ? '#8884d8' : '#aaaaaa',
    },
    {
      value: '5m',
      type: 'line',
      color: visibleLines['5m'] ? '#82ca9d' : '#aaaaaa',
    },
    {
      value: '1hr',
      type: 'line',
      color: visibleLines['1hr'] ? '#ffc658' : '#aaaaaa',
    },
    {
      value: '1d',
      type: 'line',
      color: visibleLines['1d'] ? '#ff7300' : '#aaaaaa',
    },
    {
      value: '7d',
      type: 'line',
      color: visibleLines['7d'] ? '#a4de6c' : '#aaaaaa',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold mb-4">
          Hashrate History ({hashrateUnit})
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <XAxis dataKey="timestamp" minTickGap={50} />
            <YAxis
              allowDataOverflow={true}
              domain={[
                (dataMin: number) => Math.ceil(dataMin * 0.99),
                (dataMax: number) => Math.floor(dataMax * 1.01),
              ]}
            />
            <Tooltip formatter={hashrateTooltipFormatter} />
            <Legend
              payload={legendPayload.map((item) => ({
                ...item,
                type: item.type as LegendType,
              }))}
              onClick={(e) => handleLegendClick(e.value)}
            />
            {visibleLines['1m'] && (
              <Line type="monotone" dataKey="1m" stroke="#8884d8" dot={false} />
            )}
            {visibleLines['5m'] && (
              <Line type="monotone" dataKey="5m" stroke="#82ca9d" dot={false} />
            )}
            {visibleLines['1hr'] && (
              <Line
                type="monotone"
                dataKey="1hr"
                stroke="#ffc658"
                dot={false}
              />
            )}
            {visibleLines['1d'] && (
              <Line type="monotone" dataKey="1d" stroke="#ff7300" dot={false} />
            )}
            {visibleLines['7d'] && (
              <Line type="monotone" dataKey="7d" stroke="#a4de6c" dot={false} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {'workerCount' in userStats[0] && (
        <div>
          <h2 className="text-xl font-bold mb-4">Worker Count History</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <XAxis dataKey="timestamp" minTickGap={50} />
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
                dataKey="workerCount"
                stroke="#8884d8"
                name="Workers"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
