export const revalidate = 60;

import React from 'react';

import TopUserHashrates from '../../components/TopUserHashrates';

export const metadata = {
  title: 'Top 100 User Hashrates - CKstats',
  description: 'View the top 100 user hashrates on CKPool.',
};

export default function TopHashratesPage() {
  return (
    <div className="container mx-auto p-4">
      <TopUserHashrates limit={100} />
    </div>
  );
}
