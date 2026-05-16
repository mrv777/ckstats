import {
    CKPoolAPI,
    CKPoolError,
    CKPoolErrorCode,
} from '../../lib/ckpool';

describe('CKPoolAPI', () => {
    let api: CKPoolAPI;

    beforeEach(() => {
        delete process.env.API_URL;
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
            // @ts-expect-error
            expect(testApi.apiUrl).toBe('https://custom.ckpool.org');
            delete process.env.API_URL;
        });

        it('detects HTTP mode', () => {
            process.env.API_URL = 'http://localhost:8080';
            const testApi = new CKPoolAPI();
            // @ts-expect-error
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
