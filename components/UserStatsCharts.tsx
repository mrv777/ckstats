'use client';

import { useMemo, useState } from 'react';

import EChart from './EChart';
import { UserStats } from '../lib/entities/UserStats';
import { WorkerStats } from '../lib/entities/WorkerStats';

function getHashrateUnit(maxHashrate: number): [string, number] {
  if (maxHashrate >= 1e16) return ['PH/s', 1e15];
  if (maxHashrate >= 1e13) return ['TH/s', 1e12];
  if (maxHashrate >= 1e10) return ['GH/s', 1e9];
  if (maxHashrate >= 1e7) return ['MH/s', 1e6];
  if (maxHashrate >= 1e4) return ['kH/s', 1e3];
  return ['H/s', 1];
}

type ViewRange = '1d' | '7d';

interface UserStatsChartsProps {
  userStats1d: (UserStats | WorkerStats)[];
  userStats7d?: (UserStats | WorkerStats)[];
}

export default function UserStatsCharts({
  userStats1d,
  userStats7d,
}: UserStatsChartsProps) {
  const has7d = !!userStats7d && userStats7d.length > 0;
  const [view, setView] = useState<ViewRange>('1d');
  const activeStats =
    view === '1d' || !has7d
      ? userStats1d
      : (userStats7d as (UserStats | WorkerStats)[]);

  const { chartData, hashrateUnit } = useMemo(() => {
    // Reverse the userStats array
    const reversedStats = [...activeStats].reverse();

    let maxHashrate = 0;
    for (const stat of reversedStats) {
      const values = [
        Number(stat.hashrate1m),
        Number(stat.hashrate5m),
        Number(stat.hashrate1hr),
        Number(stat.hashrate1d),
        Number(stat.hashrate7d),
      ];
      for (const value of values) {
        if (value > maxHashrate) maxHashrate = value;
      }
    }

    const [unit, scaleFactor] = getHashrateUnit(maxHashrate);

    const chartData = reversedStats.map((stat) => ({
      timestamp: new Date(stat.timestamp).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      workerCount: 'workerCount' in stat ? stat.workerCount : undefined,
      '1m': Number(stat.hashrate1m) / scaleFactor,
      '5m': Number(stat.hashrate5m) / scaleFactor,
      '1hr': Number(stat.hashrate1hr) / scaleFactor,
      '1d': Number(stat.hashrate1d) / scaleFactor,
      '7d': Number(stat.hashrate7d) / scaleFactor,
    }));

    return { chartData, hashrateUnit: unit };
  }, [activeStats]);

  const workerCountChanged = useMemo(() => {
    if (!activeStats.length || !('workerCount' in activeStats[0])) return false;
    const firstWorkerCount = activeStats[0].workerCount;
    return activeStats.some(
      (stat) => 'workerCount' in stat && stat.workerCount !== firstWorkerCount
    );
  }, [activeStats]);

  const options = useMemo(() => {
     
    const fmt = (v: any, maxFrac = 2) =>
      Number(v).toLocaleString(undefined, { maximumFractionDigits: maxFrac });
    const timestamps = chartData.map((r) => r.timestamp);

    return {
      hashrate: {
        animation: false,
        tooltip: {
          trigger: 'axis',
           
          valueFormatter: (v: any) =>
            `${fmt(Array.isArray(v) ? v[0] : v, 2)} ${hashrateUnit}`,
        },
        legend: {
          data: ['1M', '5M', '1HR', '1D', '7D'],
          bottom: 5,
          selected: {
            '1M': false,
            '5M': true,
            '1HR': true,
            '1D': true,
            '7D': false,
          },
        },
        grid: { left: 60, right: 30, top: 30, bottom: 70 },
        xAxis: { type: 'category', data: timestamps, boundaryGap: false },
        yAxis: [
          {
            type: 'value',
            splitLine: { show: false },
            axisLabel: {
              formatter: (v) => `${fmt(v, 2)} ${hashrateUnit}`,
            },
          },
        ],
        series: [
          {
            name: '1M',
            type: 'line',
            data: chartData.map((r) => r['1m']),
            showSymbol: false,
            smooth: true,
            sampling: 'lttb',
            itemStyle: { color: '#8884d8' },
          },
          {
            name: '5M',
            type: 'line',
            data: chartData.map((r) => r['5m']),
            showSymbol: false,
            smooth: true,
            sampling: 'lttb',
            itemStyle: { color: '#82ca9d' },
          },
          {
            name: '1HR',
            type: 'line',
            data: chartData.map((r) => r['1hr']),
            showSymbol: false,
            smooth: true,
            sampling: 'lttb',
            itemStyle: { color: '#ffc658' },
          },
          {
            name: '1D',
            type: 'line',
            data: chartData.map((r) => r['1d']),
            showSymbol: false,
            smooth: true,
            sampling: 'lttb',
            itemStyle: { color: '#ff7300' },
          },
          {
            name: '7D',
            type: 'line',
            data: chartData.map((r) => r['7d']),
            showSymbol: false,
            smooth: true,
            sampling: 'lttb',
            itemStyle: { color: '#a4de6c' },
          },
        ],
      },
      workerCount: {
        animation: false,
        tooltip: { trigger: 'axis' },
        grid: { left: 50, right: 30, top: 30, bottom: 30 },
        xAxis: { type: 'category', data: timestamps, boundaryGap: false },
        yAxis: [{ type: 'value', minInterval: 1, splitLine: { show: false } }],
        series: [
          {
            name: 'Workers',
            type: 'line',
            data: chartData.map((r) => r.workerCount ?? 0),
            showSymbol: false,
            smooth: true,
            sampling: 'lttb',
            itemStyle: { color: '#8884d8' },
          },
        ],
      },
    };
  }, [chartData, hashrateUnit]);

  return (
    <div className="space-y-8 mt-4">
      {has7d && (
        <div className="flex justify-end items-center">
          <div className="join">
            <button
              type="button"
              className={`btn btn-xs join-item ${view === '1d' ? 'btn-active btn-primary' : ''}`}
              aria-pressed={view === '1d'}
              onClick={() => setView('1d')}
            >
              1d
            </button>
            <button
              type="button"
              className={`btn btn-xs join-item ${view === '7d' ? 'btn-active btn-primary' : ''}`}
              aria-pressed={view === '7d'}
              onClick={() => setView('7d')}
            >
              7d
            </button>
          </div>
        </div>
      )}
      <div>
        <h2 className="text-xl font-bold mb-4">
          Hashrate History ({hashrateUnit})
        </h2>
        <EChart option={options.hashrate} height={300} />
      </div>

      {workerCountChanged && (
        <div>
          <h2 className="text-xl font-bold mb-4">Worker Count History</h2>
          <EChart option={options.workerCount} height={300} />
        </div>
      )}
    </div>
  );
}
