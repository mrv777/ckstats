import React from 'react';

import Link from 'next/link';

import { getTopUserDifficulties } from '../lib/api';
import { formatHashrate, formatNumber } from '../utils/helpers';

interface TopUserDifficultiesProps {
  limit?: number;
}

const SMALL_LIMIT = 10;

export default async function TopUserDifficulties({
  limit = SMALL_LIMIT,
}: TopUserDifficultiesProps) {
  try {
    const difficulties = await getTopUserDifficulties(limit);

    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">
            {limit > SMALL_LIMIT ? (
              `Top ${limit} User Difficulties Ever`
            ) : (
              <Link href="/top-difficulties" className="link text-primary">
                Top {limit} User Difficulties Ever
              </Link>
            )}
          </h2>
          <div className="overflow-x-auto">
            <table className="table w-full table-sm sm:table-md">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Address</th>

                  {limit > SMALL_LIMIT ? (
                    <>
                      <th>Active Workers</th>
                      <th>Best Diff</th>
                      <th>Session Diff</th>
                      <th>Hashrate 1hr</th>
                      <th>Hashrate 1d</th>
                      <th>Hashrate 7d</th>
                    </>
                  ) : (
                    <th>Best Diff</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {difficulties.map((user, index) => (
                  <tr key={user.address}>
                    <td>{index + 1}</td>
                    <td>
                      {user.address.slice(0, 6)}...{user.address.slice(-4)}
                    </td>

                    {limit > SMALL_LIMIT ? (
                      <>
                        <td>{user.workerCount}</td>
                        <td className="text-accent">
                          {formatNumber(Number(user.difficulty))}
                        </td>
                        <td>{formatNumber(Number(user.bestShare))}</td>
                        <td>{formatHashrate(user.hashrate1hr)}</td>
                        <td>{formatHashrate(user.hashrate1d)}</td>
                        <td>{formatHashrate(user.hashrate7d)}</td>
                      </>
                    ) : (
                      <td className="text-accent">
                        {formatNumber(Number(user.difficulty))}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error fetching top user difficulties:', error);
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Top {limit} User Difficulties</h2>
          <p className="text-error">
            Error loading top user difficulties. Please try again later.
          </p>
        </div>
      </div>
    );
  }
}
