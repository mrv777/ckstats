import React from 'react';
import { getTopUserHashrates } from '../lib/api';
import { formatHashrate } from '../utils/helpers';

export async function TopUserHashrates() {
  try {
    const hashrates = await getTopUserHashrates();

    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Top User Hashrates</h2>
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Address</th>
                  <th>Hashrate</th>
                </tr>
              </thead>
              <tbody>
                {hashrates.map((user, index) => (
                  <tr key={user.address}>
                    <td>{index + 1}</td>
                    <td>{user.address.slice(0, 6)}...{user.address.slice(-4)}</td>
                    <td>{formatHashrate(user.hashrate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error fetching top user hashrates:', error);
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Top User Hashrates</h2>
          <p className="text-error">Error loading top user hashrates. Please try again later.</p>
        </div>
      </div>
    );
  }
}

export default TopUserHashrates;