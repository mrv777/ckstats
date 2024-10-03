'use client';

import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LegendType } from 'recharts';
import { UserStats, WorkerStats } from '@prisma/client';

interface UserStatsChartsProps {
  userStats: (UserStats | WorkerStats)[];
}

export default function UserStatsCharts({ userStats }: UserStatsChartsProps) {
  const formatHashrate = (hashrate: string) => {
    const value = parseFloat(hashrate);
    const unit = hashrate.slice(-1);
    return unit === 'P' ? value * 1000 : value;
  };

  const chartData = userStats.map(stat => ({
    timestamp: new Date(stat.timestamp).toLocaleTimeString(),
    workerCount: 'workerCount' in stat ? stat.workerCount : undefined,
    '1m': formatHashrate(stat.hashrate1m),
    '5m': formatHashrate(stat.hashrate5m),
    '1hr': formatHashrate(stat.hashrate1hr),
    '1d': formatHashrate(stat.hashrate1d),
    '7d': formatHashrate(stat.hashrate7d),
  }));

  const [visibleLines, setVisibleLines] = useState({
    '1m': false,
    '5m': true,
    '1hr': true,
    '1d': true,
    '7d': false,
  });

  const handleLegendClick = (dataKey: string) => {
    setVisibleLines(prev => ({ ...prev, [dataKey]: !prev[dataKey] }));
  };

  const legendPayload = [
    { value: '1m', type: 'line', color: visibleLines['1m'] ? '#8884d8' : '#aaaaaa' },
    { value: '5m', type: 'line', color: visibleLines['5m'] ? '#82ca9d' : '#aaaaaa' },
    { value: '1hr', type: 'line', color: visibleLines['1hr'] ? '#ffc658' : '#aaaaaa' },
    { value: '1d', type: 'line', color: visibleLines['1d'] ? '#ff7300' : '#aaaaaa' },
    { value: '7d', type: 'line', color: visibleLines['7d'] ? '#a4de6c' : '#aaaaaa' },
  ];

  return (
    <div className="space-y-8">
      {('workerCount' in userStats[0]) && (
        <div>
          <h2 className="text-xl font-bold mb-4">Worker Count History</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <XAxis dataKey="timestamp" />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="workerCount" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold mb-4">Hashrate History</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <XAxis dataKey="timestamp" />
            <YAxis domain={['auto', 'auto']} />
            <Tooltip />
            <Legend 
              payload={legendPayload.map(item => ({
                ...item,
                type: item.type as LegendType
              }))}
              onClick={(e) => handleLegendClick(e.value)}
            />
            {visibleLines['1m'] && <Line type="monotone" dataKey="1m" stroke="#8884d8" />}
            {visibleLines['5m'] && <Line type="monotone" dataKey="5m" stroke="#82ca9d" />}
            {visibleLines['1hr'] && <Line type="monotone" dataKey="1hr" stroke="#ffc658" />}
            {visibleLines['1d'] && <Line type="monotone" dataKey="1d" stroke="#ff7300" />}
            {visibleLines['7d'] && <Line type="monotone" dataKey="7d" stroke="#a4de6c" />}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}