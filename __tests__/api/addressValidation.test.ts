import { NextRequest } from 'next/server';
import { POST as resetUser } from '../../app/api/resetUser/route';
import { POST as togglePrivacy } from '../../app/api/users/togglePrivacy/route';
import { resetUserActive, toggleUserStatsPrivacy } from '../../lib/api';

jest.mock('../../lib/api', () => ({
  resetUserActive: jest.fn(),
  toggleUserStatsPrivacy: jest.fn(),
}));

const VALID_ADDRESSES = [
  'bc1qfpwl5zfe4ep8zuc4ntn2xe4vcm0srqhpk3lwm6', // bech32
  '1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2', // P2PKH
];

const INVALID_ADDRESSES = [
  'notanaddress',
  'bc1qfpwl5zfe4ep8zuc4ntn2xe4vcm0srqhpk3lwm7', // bad checksum
  '../../etc/passwd',
  "' OR 1=1 --",
  '<script>alert(1)</script>',
  'a'.repeat(5000),
];

const routes = [
  {
    name: 'POST /api/resetUser',
    handler: resetUser,
    path: '/api/resetUser',
    mock: resetUserActive as jest.Mock,
  },
  {
    name: 'POST /api/users/togglePrivacy',
    handler: togglePrivacy,
    path: '/api/users/togglePrivacy',
    mock: toggleUserStatsPrivacy as jest.Mock,
  },
];

function makeRequest(path: string, address?: string): NextRequest {
  const url = new URL(`http://localhost:3334${path}`);
  if (address !== undefined) url.searchParams.set('address', address);
  return new NextRequest(url, { method: 'POST' });
}

describe.each(routes)('$name address validation', ({ handler, path, mock }) => {
  beforeEach(() => {
    mock.mockReset();
    mock.mockResolvedValue({ isPublic: true });
  });

  it('returns 400 when the address is missing', async () => {
    const res = await handler(makeRequest(path));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Address is required');
    expect(mock).not.toHaveBeenCalled();
  });

  it.each(INVALID_ADDRESSES)('returns 400 for invalid address %#', async (address) => {
    const res = await handler(makeRequest(path, address));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Invalid Bitcoin address');
    expect(mock).not.toHaveBeenCalled();
  });

  it.each(VALID_ADDRESSES)('passes valid address %s to the data layer', async (address) => {
    const res = await handler(makeRequest(path, address));
    expect(res.status).toBe(200);
    expect(mock).toHaveBeenCalledWith(address);
  });

  it('returns 500 when the data layer fails for a valid address', async () => {
    mock.mockRejectedValue(new Error('db down'));
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await handler(makeRequest(path, VALID_ADDRESSES[0]));
    expect(res.status).toBe(500);
  });
});
