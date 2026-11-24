'use client';

import { useMemo, useState } from 'react';

import EChart from './EChart';
import { PoolStats } from '../lib/entities/PoolStats';
import { ISOUnit, findISOUnit } from '../utils/helpers';

interface PoolStatsChartProps {
  data1d: PoolStats[];
  data7d: PoolStats[];
}

type ViewRange = '1d' | '7d';

export default function PoolStatsChart({
  data1d,
  data7d,
}: PoolStatsChartProps) {
  const [view, setView] = useState<ViewRange>('1d');

  const activeData = view === '1d' ? data1d : data7d;

  const { formattedData, hashrateUnit } = useMemo(() => {
    // Calculate the maximum hashrate
    let maxHashrate = 0;
    for (const stat of activeData) {
      const values = [
        Number(stat.hashrate1m),
        Number(stat.hashrate5m),
        Number(stat.hashrate15m),
        Number(stat.hashrate1hr),
        Number(stat.hashrate6hr),
        Number(stat.hashrate1d),
        Number(stat.hashrate7d),
      ];
      for (const value of values) {
        if (value > maxHashrate) maxHashrate = value;
      }
    }

    // Find out the nearest ISO unit
    const unit: ISOUnit = findISOUnit(Number(maxHashrate));
    const divisor: number = unit.threshold;

    // Reverse the data array
    const reversedData = [...activeData].reverse();

    // Format the reversed data for the charts
    const rows = reversedData.map((item) => ({
      ...item,
      timestamp: new Date(item.timestamp).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      hashrate1m: Number(item.hashrate1m) / divisor,
      hashrate5m: Number(item.hashrate5m) / divisor,
      hashrate15m: Number(item.hashrate15m) / divisor,
      hashrate1hr: Number(item.hashrate1hr) / divisor,
      hashrate6hr: Number(item.hashrate6hr) / divisor,
      hashrate1d: Number(item.hashrate1d) / divisor,
      hashrate7d: Number(item.hashrate7d) / divisor,
      SPS1m: item.SPS1m ?? 0,
      SPS5m: item.SPS5m ?? 0,
      SPS15m: item.SPS15m ?? 0,
      SPS1h: item.SPS1h ?? 0,
    }));

    return { formattedData: rows, hashrateUnit: unit };
  }, [activeData]);

  const options = useMemo(() => {
    const fmt = (v: number, maxFrac = 2) =>
      v.toLocaleString(undefined, { maximumFractionDigits: maxFrac });
    const unit = hashrateUnit.iso;
    const timestamps = formattedData.map((r) => r.timestamp);

    return {
      users: {
        animation: false,
        tooltip: { trigger: 'axis' },
        legend: { data: ['Users', 'Workers'], bottom: 5 },
        grid: { left: 50, right: 60, top: 30, bottom: 70 },
        xAxis: { type: 'category', data: timestamps, boundaryGap: false },
        yAxis: [
          { type: 'value', name: 'Users', splitLine: { show: false } },
          { type: 'value', name: 'Workers', splitLine: { show: false } },
        ],
        series: [
          {
            name: 'Users',
            type: 'line',
            data: formattedData.map((r) => Number(r.users)),
            yAxisIndex: 0,
            showSymbol: false,
            smooth: true,
            sampling: 'lttb',
            itemStyle: { color: '#8884d8' },
          },
          {
            name: 'Workers',
            type: 'line',
            data: formattedData.map((r) => Number(r.workers)),
            yAxisIndex: 1,
            showSymbol: false,
            smooth: true,
            sampling: 'lttb',
            itemStyle: { color: '#82ca9d' },
          },
        ],
      },
      hashrate: {
        animation: false,
        tooltip: {
          trigger: 'axis',
           
          valueFormatter: (v: any) =>
            `${fmt(Array.isArray(v) ? Number(v[0]) : Number(v), 1)} ${unit}H/s`,
        },
        legend: {
          data: ['1M', '5M', '15M', '1HR', '6HR', '1D', '7D'],
          bottom: 5,
          selected: {
            '1M': false,
            '5M': true,
            '15M': true,
            '1HR': true,
            '6HR': true,
            '1D': true,
            '7D': true,
          },
        },
        grid: { left: 60, right: 30, top: 30, bottom: 70 },
        xAxis: { type: 'category', data: timestamps, boundaryGap: false },
        yAxis: [
          {
            type: 'value',
            splitLine: { show: false },
            axisLabel: { formatter: (v: number) => `${fmt(Number(v), 1)} ${unit}` },
          },
        ],
        series: [
          {
            name: '1M',
            type: 'line',
            data: formattedData.map((r) => Number(r.hashrate1m)),
            showSymbol: false,
            smooth: true,
            sampling: 'lttb',
            itemStyle: { color: '#8884d8' },
          },
          {
            name: '5M',
            type: 'line',
            data: formattedData.map((r) => Number(r.hashrate5m)),
            showSymbol: false,
            smooth: true,
            sampling: 'lttb',
            itemStyle: { color: '#82ca9d' },
          },
          {
            name: '15M',
            type: 'line',
            data: formattedData.map((r) => Number(r.hashrate15m)),
            showSymbol: false,
            smooth: true,
            sampling: 'lttb',
            itemStyle: { color: '#ffc658' },
          },
          {
            name: '1HR',
            type: 'line',
            data: formattedData.map((r) => Number(r.hashrate1hr)),
            showSymbol: false,
            smooth: true,
            sampling: 'lttb',
            itemStyle: { color: '#ff7300' },
          },
          {
            name: '6HR',
            type: 'line',
            data: formattedData.map((r) => Number(r.hashrate6hr)),
            showSymbol: false,
            smooth: true,
            sampling: 'lttb',
            itemStyle: { color: '#00C49F' },
          },
          {
            name: '1D',
            type: 'line',
            data: formattedData.map((r) => Number(r.hashrate1d)),
            showSymbol: false,
            smooth: true,
            sampling: 'lttb',
            itemStyle: { color: '#0088FE' },
          },
          {
            name: '7D',
            type: 'line',
            data: formattedData.map((r) => Number(r.hashrate7d)),
            showSymbol: false,
            smooth: true,
            sampling: 'lttb',
            itemStyle: { color: '#FF1493' },
          },
        ],
      },
      sps: {
        animation: false,
        tooltip: {
          trigger: 'axis',
           
          valueFormatter: (v: any) => {
            const n = Number(Array.isArray(v) ? v[0] : v);
            return `${n > 10 ? n.toFixed(0) : n.toFixed(1)} SPS`;
          },
        },
        legend: { data: ['1M', '5M', '15M', '1H'], bottom: 5 },
        grid: { left: 60, right: 30, top: 30, bottom: 70 },
        xAxis: { type: 'category', data: timestamps, boundaryGap: false },
        yAxis: [{ type: 'value', splitLine: { show: false } }],
        series: [
          {
            name: '1M',
            type: 'line',
            data: formattedData.map((r) => Number(r.SPS1m)),
            showSymbol: false,
            smooth: true,
            sampling: 'lttb',
            itemStyle: { color: '#8884d8' },
          },
          {
            name: '5M',
            type: 'line',
            data: formattedData.map((r) => Number(r.SPS5m)),
            showSymbol: false,
            smooth: true,
            sampling: 'lttb',
            itemStyle: { color: '#82ca9d' },
          },
          {
            name: '15M',
            type: 'line',
            data: formattedData.map((r) => Number(r.SPS15m)),
            showSymbol: false,
            smooth: true,
            sampling: 'lttb',
            itemStyle: { color: '#ffc658' },
          },
          {
            name: '1H',
            type: 'line',
            data: formattedData.map((r) => Number(r.SPS1h)),
            showSymbol: false,
            smooth: true,
            sampling: 'lttb',
            itemStyle: { color: '#ff7300' },
          },
        ],
      },
    };
  }, [formattedData, hashrateUnit]);

  return (
    <div className="mt-4">
      <div className="flex justify-end items-center mb-2">
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
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-2">Users and Workers</h2>
        <EChart option={options.users} height={320} />
      </div>
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-2">
          Hashrate ({hashrateUnit.iso}H/s)
        </h2>
        <EChart option={options.hashrate} height={320} />
      </div>
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-2">Shares Per Second</h2>
        <EChart option={options.sps} height={320} />
      </div>
    </div>
  );
}
