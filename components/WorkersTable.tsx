'use client';
/* eslint-disable import/order */

import React, { useState } from 'react';
import Link from 'next/link';

import { Worker } from '../lib/entities/Worker';
import {
  formatHashrate,
  formatNumber,
  formatTimeAgo,
  convertHashrate,
} from '../utils/helpers';

interface WorkersTableProps {
  workers: Worker[];
  address?: string;
}

type SortField = keyof Worker;
type SortOrder = 'asc' | 'desc';

const WorkersTable: React.FC<WorkersTableProps> = ({ workers, address }) => {
  const [sortField, setSortField] = useState<SortField>('hashrate5m');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedWorkers = [...workers].sort((a, b) => {
    if (sortField) {
      const numericFields = [
        'hashrate5m',
        'hashrate1hr',
        'hashrate1d',
        'bestEver',
      ];
      if (numericFields.includes(sortField)) {
        const toBigIntSafe = (v: string | number | bigint | undefined | null): bigint => {
          const s = String(v ?? '0').trim();
          // If it's an integer string, use BigInt directly
          if (/^[+-]?\d+$/.test(s)) {
            try {
              return BigInt(s);
            } catch {
              return BigInt(0);
            }
          }
          // If the field is a hashrate (starts with 'hashrate'), use convertHashrate
          if ((sortField as string).startsWith('hashrate')) {
            try {
              return convertHashrate(s);
            } catch {
              return BigInt(0);
            }
          }
          // Fallback: parse as number and round
          const n = Number(s);
          if (Number.isNaN(n)) return BigInt(0);
          return BigInt(Math.round(n));
        };

        const aVal = toBigIntSafe(a[sortField]);
        const bVal = toBigIntSafe(b[sortField]);
        return sortOrder === 'asc' ? Number(aVal - bVal) : Number(bVal - aVal);
      }

      if (a[sortField] < b[sortField]) return sortOrder === 'asc' ? -1 : 1;
      if (a[sortField] > b[sortField]) return sortOrder === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? ' ▲' : ' ▼';
  };

  return (
    <div className="bg-base-200 p-4 rounded-lg mt-8">
      <h2 className="text-xl font-bold mb-4">Workers</h2>
      <div className="overflow-x-auto">
        <table className="table w-full table-sm sm:table-md">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} className="cursor-pointer">
                Name{renderSortIcon('name')}
              </th>
              <th
                onClick={() => handleSort('hashrate5m')}
                className="cursor-pointer"
              >
                Hashrate (5m){renderSortIcon('hashrate5m')}
              </th>
              <th
                onClick={() => handleSort('hashrate1hr')}
                className="cursor-pointer"
              >
                Hashrate (1hr){renderSortIcon('hashrate1hr')}
              </th>
              <th
                onClick={() => handleSort('hashrate1d')}
                className="cursor-pointer"
              >
                Hashrate (1d){renderSortIcon('hashrate1d')}
              </th>
              <th
                onClick={() => handleSort('bestShare')}
                className="cursor-pointer"
              >
                Best Share{renderSortIcon('bestShare')}
              </th>
              <th
                onClick={() => handleSort('bestEver')}
                className="cursor-pointer"
              >
                Best Ever{renderSortIcon('bestEver')}
              </th>
              <th
                onClick={() => handleSort('lastUpdate')}
                className="cursor-pointer"
              >
                Last Update{renderSortIcon('lastUpdate')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedWorkers.map((worker) => (
              <tr key={worker.id}>
                <td>
                  <Link
                    className="link text-primary"
                    href={`/users/${address}/workers/${encodeURIComponent(worker.name)}`}
                  >
                    {worker.name || <span className="italic">Unnamed</span>}
                  </Link>
                </td>
                <td
                  className={`${Number(worker.hashrate5m) < 1 ? 'text-error' : 'text-accent'}`}
                >
                  {formatHashrate(Number(worker.hashrate5m), true)}
                </td>
                <td
                  className={`${Number(worker.hashrate1hr) < 1 ? 'text-error' : ''}`}
                >
                  {formatHashrate(Number(worker.hashrate1hr), true)}
                </td>
                <td
                  className={`${Number(worker.hashrate1d) < 1 ? 'text-error' : ''}`}
                >
                  {formatHashrate(Number(worker.hashrate1d), true)}
                </td>
                <td>{formatNumber(worker.bestShare)}</td>
                <td>{formatNumber(worker.bestEver)}</td>
                <td>{formatTimeAgo(worker.lastUpdate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WorkersTable;
