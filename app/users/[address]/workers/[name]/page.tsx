import { getWorkerWithStats } from '../../../../../lib/api';
import { formatNumber } from '../../../../../utils/formatNumber';
import { notFound } from 'next/navigation';
import UserStatsCharts from '../../../../../components/UserStatsCharts';
import Link from 'next/link';

export default async function WorkerPage({ params }: { params: { address: string; name: string } }) {
  const worker = await getWorkerWithStats(params.address, params.name);

  if (!worker) {
    notFound();
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        Worker: {worker.name}
        <Link href={`/users/${params.address}`} className="text-sm ml-4 btn btn-ghost">
          Back to User
        </Link>
      </h1>
      
      <div className="stats shadow">
        <div className="stat">
          <div className="stat-title">Hashrate (1m)</div>
          <div className="stat-value">{worker.hashrate1m}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Hashrate (1hr)</div>
          <div className="stat-value">{worker.hashrate1hr}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Hashrate (1d)</div>
          <div className="stat-value">{worker.hashrate1d}</div>
        </div>
      </div>

      <div className="stats shadow mt-4">
        <div className="stat">
          <div className="stat-title">Shares</div>
          <div className="stat-value">{formatNumber(worker.shares)}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Best Share</div>
          <div className="stat-value">{formatNumber(worker.bestShare)}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Best Ever</div>
          <div className="stat-value">{formatNumber(worker.bestEver)}</div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Worker Statistics</h2>
        <UserStatsCharts userStats={worker.stats} />
      </div>
    </div>
  );
}