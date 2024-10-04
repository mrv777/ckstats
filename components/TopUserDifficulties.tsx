import React from 'react';
import { getTopUserDifficulties } from '../lib/api';
import { formatNumber } from '../utils/helpers';
// Add this helper function
const formatValue = (value: string): string => {
  return formatNumber(Number(value));
};

export async function TopUserDifficulties() {
  try {
    const difficulties = await getTopUserDifficulties();

    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Top User Difficulties Ever</h2>
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Address</th>
                  <th>Difficulty</th>
                </tr>
              </thead>
              <tbody>
                {difficulties.map((user, index) => (
                  <tr key={user.address}>
                    <td>{index + 1}</td>
                    <td>{user.address.slice(0, 6)}...{user.address.slice(-4)}</td>
                    <td>{formatValue(user.difficulty)}</td>
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
          <h2 className="card-title">Top User Difficulties</h2>
          <p className="text-error">Error loading top user difficulties. Please try again later.</p>
        </div>
      </div>
    );
  }
}

export default TopUserDifficulties;