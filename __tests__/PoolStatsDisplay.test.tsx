import React from 'react';
import { render, screen } from '@testing-library/react';
import PoolStatsDisplay from '../components/PoolStatsDisplay';
import { PoolStatsType } from '../lib/api';

describe('PoolStatsDisplay', () => {
  const mockStats: PoolStatsType = {
    id: 1,
    timestamp: new Date('2023-04-20T12:00:00Z'),
    runtime: 41383800,
    users: 8455,
    workers: 18104,
    idle: 4630,
    disconnected: 1176,
    hashrate1m: '137P',
    hashrate5m: '139P',
    hashrate15m: '140P',
    hashrate1hr: '142P',
    hashrate6hr: '136P',
    hashrate1d: '127P',
    hashrate7d: '140P',
    diff: 72.0,
    accepted: BigInt(63671771500653),
    rejected: BigInt(102415783252),
    bestshare: BigInt(65259142374726),
    SPS1m: 1850,
    SPS5m: 1850,
    SPS15m: 1850,
    SPS1h: 1850,
  };

  it('renders the stats with correct data', () => {
    render(<PoolStatsDisplay stats={mockStats} />);
    
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('8.46K')).toBeInTheDocument();
    expect(screen.getByText('Hashrate 1m')).toBeInTheDocument();
    expect(screen.getByText('137P')).toBeInTheDocument();
    expect(screen.getByText('Accepted')).toBeInTheDocument();
    expect(screen.getByText('63.67B')).toBeInTheDocument();
    expect(screen.getByText('SPS1m')).toBeInTheDocument();
    expect(screen.getByText('1.85K')).toBeInTheDocument();
  });
});