import UserPage from '../../app/users/[address]/page';
import WorkerPage from '../../app/users/[address]/workers/[[...name]]/page';
import {
  getUserWithWorkersAndStats,
  getUserStatsHistory,
  getLatestPoolStats,
  getNetworkDifficulty,
  getWorkerWithStats,
} from '../../lib/api';

class NotFoundError extends Error {}

jest.mock('next/navigation', () => ({
  notFound: jest.fn(() => {
    throw new NotFoundError('NEXT_NOT_FOUND');
  }),
}));

jest.mock('../../lib/api', () => ({
  getUserWithWorkersAndStats: jest.fn().mockResolvedValue(null),
  getUserStatsHistory: jest.fn().mockResolvedValue([]),
  getLatestPoolStats: jest.fn().mockResolvedValue(null),
  getNetworkDifficulty: jest.fn().mockResolvedValue(null),
  getWorkerWithStats: jest.fn().mockResolvedValue(undefined),
}));

// The page modules import React components; they are not rendered here.
jest.mock('../../components/PrivacyToggle', () => ({ __esModule: true, default: () => null }));
jest.mock('../../components/UserResetButton', () => ({ __esModule: true, default: () => null }));
jest.mock('../../components/UserStatsCharts', () => ({ __esModule: true, default: () => null }));
jest.mock('../../components/WorkersTable', () => ({ __esModule: true, default: () => null }));

const VALID = 'bc1qfpwl5zfe4ep8zuc4ntn2xe4vcm0srqhpk3lwm6';
const INVALID = ['notanaddress', '../../etc/passwd', "' OR 1=1 --", 'a'.repeat(5000)];

const dbMocks = [
  getUserWithWorkersAndStats,
  getUserStatsHistory,
  getLatestPoolStats,
  getNetworkDifficulty,
  getWorkerWithStats,
] as jest.Mock[];

beforeEach(() => dbMocks.forEach((m) => m.mockClear()));

describe('/users/[address] page', () => {
  it.each(INVALID)('returns not-found without touching the database for %#', async (address) => {
    await expect(UserPage({ params: Promise.resolve({ address }) })).rejects.toThrow(NotFoundError);
    dbMocks.forEach((m) => expect(m).not.toHaveBeenCalled());
  });

  it('looks up a valid address (and then 404s because the user is missing)', async () => {
    await expect(UserPage({ params: Promise.resolve({ address: VALID }) })).rejects.toThrow(NotFoundError);
    expect(getUserWithWorkersAndStats).toHaveBeenCalledWith(VALID);
    expect(getUserStatsHistory).toHaveBeenCalledWith(VALID, '1d');
  });
});

describe('/users/[address]/workers page', () => {
  it.each(INVALID)('returns not-found without touching the database for %#', async (address) => {
    await expect(
      WorkerPage({ params: Promise.resolve({ address, name: ['rig1'] }) })
    ).rejects.toThrow(NotFoundError);
    dbMocks.forEach((m) => expect(m).not.toHaveBeenCalled());
  });

  it('returns not-found instead of throwing a URIError on malformed percent-encoding', async () => {
    await expect(
      WorkerPage({ params: Promise.resolve({ address: VALID, name: ['%E0%A4%A'] }) })
    ).rejects.toThrow(NotFoundError);
    expect(getWorkerWithStats).not.toHaveBeenCalled();
  });

  it('returns not-found without touching the database for a worker name over 1024 characters', async () => {
    await expect(
      WorkerPage({ params: Promise.resolve({ address: VALID, name: ['a'.repeat(1025)] }) })
    ).rejects.toThrow(NotFoundError);
    expect(getWorkerWithStats).not.toHaveBeenCalled();
  });

  it.each([
    ['rig%2F1', 'slash'],
    ['%2Frig', 'leading slash'],
    ['rig%00x', 'NUL byte'],
  ])(
    'returns not-found without touching the database for worker name %s (%s)',
    async (name) => {
      await expect(
        WorkerPage({ params: Promise.resolve({ address: VALID, name: [name] }) })
      ).rejects.toThrow(NotFoundError);
      expect(getWorkerWithStats).not.toHaveBeenCalled();
    }
  );

  it('accepts a worker name of exactly 1024 characters', async () => {
    const name = 'a'.repeat(1024);
    await expect(
      WorkerPage({ params: Promise.resolve({ address: VALID, name: [name] }) })
    ).rejects.toThrow(NotFoundError);
    expect(getWorkerWithStats).toHaveBeenCalledWith(VALID, name);
  });

  it('looks up a valid address and decoded worker name', async () => {
    await expect(
      WorkerPage({ params: Promise.resolve({ address: VALID, name: ['rig%201'] }) })
    ).rejects.toThrow(NotFoundError);
    expect(getWorkerWithStats).toHaveBeenCalledWith(VALID, 'rig 1');
  });
});
