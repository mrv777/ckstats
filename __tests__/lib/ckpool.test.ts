import {
    CKPoolAPI,
    CKPoolError,
    CKPoolErrorCode,
} from '../../lib/ckpool';

describe('CKPoolAPI', () => {
    let api: CKPoolAPI;

    beforeEach(() => {
        delete process.env.API_URL;
        delete process.env.API_FLAVOR;
        jest.restoreAllMocks();
        api = new CKPoolAPI();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('constructor', () => {
        it('defaults to https://solo.ckpool.org', () => {
            const testApi = new CKPoolAPI();
            // @ts-expect-error - accessing private property for testing
            expect(testApi.apiUrl).toBe('https://solo.ckpool.org');
        });

        it('uses API_URL environment variable when set', () => {
            process.env.API_URL = 'https://custom.ckpool.org';
            const testApi = new CKPoolAPI();
            // @ts-expect-error - accessing private property for testing
            expect(testApi.apiUrl).toBe('https://custom.ckpool.org');
            delete process.env.API_URL;
        });

        it('detects HTTP mode', () => {
            process.env.API_URL = 'http://localhost:8080';
            const testApi = new CKPoolAPI();
            // @ts-expect-error - accessing private property for testing
            expect(testApi.isHttp).toBe(true);
            delete process.env.API_URL;
        });
    });

    describe('poolStatus', () => {
        it('fetches pool status successfully', async () => {
            const mockData = { pool: { hashrate: '1000000' } };
            jest.spyOn(global, 'fetch').mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve(JSON.stringify(mockData)),
            } as any);

            const result = await api.poolStatus();
            expect(result).toEqual(mockData);
        });

        it('throws NOT_FOUND on 404', async () => {
            jest.spyOn(global, 'fetch').mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                text: () => Promise.resolve(''),
            } as any);

            const err = await api.poolStatus().catch((e: any) => e);

            expect(err).toBeInstanceOf(CKPoolError);
            expect(err.code).toBe(CKPoolErrorCode.NOT_FOUND);
        });

        it('throws UNKNOWN on non-404 errors', async () => {
            jest.spyOn(global, 'fetch').mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                text: () => Promise.resolve(''),
            } as any);

            const err = await api.poolStatus().catch((e: any) => e);

            expect(err).toBeInstanceOf(CKPoolError);
            expect(err.code).toBe(CKPoolErrorCode.UNKNOWN);
        });

        it('throws TIMEOUT on timeout', async () => {
            jest.spyOn(global, 'fetch').mockImplementationOnce(() => {
                const err = new Error('The operation was aborted.');
                err.name = 'TimeoutError';
                throw err;
            });

            const err = await api.poolStatus().catch((e: any) => e);

            expect(err).toBeInstanceOf(CKPoolError);
            expect(err.code).toBe(CKPoolErrorCode.TIMEOUT);
        });
    });

    describe('BTC PoW Lab adapter', () => {
        it('maps the public pool projection to CK Stats fields', async () => {
            process.env.API_URL = 'https://btcpowlab-pool.com';
            process.env.API_FLAVOR = 'btcpowlab';
            api = new CKPoolAPI();
            jest.spyOn(global, 'fetch').mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve(JSON.stringify({
                    network: { difficulty: '42' },
                    pool: {
                        active_miners: 2,
                        active_workers: 3,
                        hashrate_5m_ths: 4,
                        hashrate_15m_ths: 5,
                        hashrate_1h_ths: 6,
                        accepted_shares: 7,
                        duplicate_shares: 1,
                    },
                })),
            } as any);

            await expect(api.poolStatus()).resolves.toMatchObject({
                Users: '2',
                Workers: '3',
                hashrate5m: '4000000000000',
                accepted: '7',
                rejected: '1',
                diff: '42',
            });
        });

        it('maps one address summary and workers', async () => {
            process.env.API_URL = 'https://btcpowlab-pool.com';
            process.env.API_FLAVOR = 'btcpowlab';
            api = new CKPoolAPI();
            jest.spyOn(global, 'fetch').mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve(JSON.stringify({
                    generated_at: 100,
                    connected: true,
                    active_sessions: 1,
                    current_hashrate_hs: 10,
                    hashrate_5m_hs: 11,
                    hashrate_1h_hs: 12,
                    hashrate_24h_hs: 13,
                    accepted_shares: 14,
                    best_share_difficulty: '15',
                    last_share_at: 16,
                    workers: [{
                        name: 'rig',
                        accepted_shares: 17,
                        hashrate_5m_hs: 18,
                        hashrate_1h_hs: 19,
                        last_share_at: 20,
                    }],
                })),
            } as any);

            await expect(api.user('bc1qtest')).resolves.toMatchObject({
                authorised: 100,
                workers: 1,
                shares: '14',
                bestever: '15',
                worker: [
                    {
                        workername: 'bc1qtest.rig',
                        shares: '17',
                        hashrate1hr: '19',
                    },
                ],
            });
        });

        it('preserves input order and individual errors for batched address lookups', async () => {
            process.env.API_URL = 'https://btcpowlab-pool.com';
            process.env.API_FLAVOR = 'btcpowlab';
            api = new CKPoolAPI();
            jest.spyOn(global, 'fetch')
                .mockResolvedValueOnce({
                    ok: true,
                    text: () =>
                        Promise.resolve(
                            JSON.stringify({
                                generated_at: 100,
                                connected: true,
                                active_sessions: 0,
                                accepted_shares: 1,
                                workers: [],
                            })
                        ),
                } as any)
                .mockResolvedValueOnce({
                    ok: false,
                    status: 404,
                    statusText: 'Not Found',
                    text: () => Promise.resolve(''),
                } as any);

            const results = await api.users(['bc1qfirst', 'bc1qmissing']);

            expect(results.map((result) => result.address)).toEqual([
                'bc1qfirst',
                'bc1qmissing',
            ]);
            expect(results[0].userData).toMatchObject({ shares: '1' });
            expect(results[1].error).toBeInstanceOf(CKPoolError);
        });
    });

    describe('users', () => {
        it('fetches user data successfully', async () => {
            const mockData = { address: 'bc1q...', authorised: true };
            jest.spyOn(global, 'fetch').mockResolvedValueOnce({
                ok: true,
                text: () => Promise.resolve(JSON.stringify(mockData)),
            } as any);

            const result = await api.user('bc1qtest');
            expect(result).toEqual(mockData);
        });

        it('throws INVALID for addresses with invalid characters', async () => {
            const err = await api.user('../etc/passwd').catch((e: any) => e);

            expect(err).toBeInstanceOf(CKPoolError);
            expect(err.code).toBe(CKPoolErrorCode.INVALID);
        });

        it('throws NOT_FOUND when user does not exist', async () => {
            jest.spyOn(global, 'fetch').mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                text: () => Promise.resolve(''),
            } as any);

            const err = await api.user('bc1qnonexistent').catch((e: any) => e);

            expect(err).toBeInstanceOf(CKPoolError);
            expect(err.code).toBe(CKPoolErrorCode.NOT_FOUND);
        });
    });

    describe('CKPoolError', () => {
        it('creates error with correct properties', () => {
            const originalError = new Error('Original error');
            const error = new CKPoolError(
                CKPoolErrorCode.NOT_FOUND,
                'Not found',
                originalError
            );

            expect(error.code).toBe(CKPoolErrorCode.NOT_FOUND);
            expect(error.message).toBe('Not found');
            expect(error.cause).toBe(originalError);
            expect(error.name).toBe('CKPoolError');
        });

        it('works without cause', () => {
            const error = new CKPoolError(
                CKPoolErrorCode.UNKNOWN,
                'Unknown error'
            );

            expect(error.code).toBe(CKPoolErrorCode.UNKNOWN);
            expect(error.message).toBe('Unknown error');
            expect(error.cause).toBeUndefined();
        });
    });

    describe('CKPoolErrorCode', () => {
        it('has all expected values', () => {
            expect(CKPoolErrorCode.NOT_FOUND).toBe('NOT_FOUND');
            expect(CKPoolErrorCode.TIMEOUT).toBe('TIMEOUT');
            expect(CKPoolErrorCode.INVALID).toBe('INVALID');
            expect(CKPoolErrorCode.UNKNOWN).toBe('UNKNOWN');
        });
    });
});
