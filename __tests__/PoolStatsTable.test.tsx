import React from 'react';
import { render, screen } from '@testing-library/react';
import PoolStatsTable from '../components/PoolStatsTable';
import { PoolStats } from '../lib/api';

describe('PoolStatsTable', () => {
  const mockStats: PoolStats = {
    runtime: 41383800,
    lastupdate: 1727827378,
    Users: 8455,
    Workers: 18104,
    Idle: 4630,
    Disconnected: 1176,
    hashrate1m: '137P',
    hashrate5m: '139P',
    hashrate15m: '140P',
    hashrate1hr: '142P',
    hashrate6hr: '136P',
    hashrate1d: '127P',
    hashrate7d: '140P',
    diff: 72.0,
    accepted: 63671771500653,
    rejected: 102415783252,
    bestshare: 65259142374726,
    SPS1m: 1.85e3,
    SPS5m: 1.85e3,
    SPS15m: 1.85e3,
    SPS1h: 1.85e3,
  };

  it('renders the table with correct data', () => {
    render(<PoolStatsTable stats={mockStats} />);
    
    expect(screen.getByText('Runtime')).toBeInTheDocument();
    expect(screen.getByText('41383800')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('8455')).toBeInTheDocument();
    // Add more assertions for other fields
  });
});