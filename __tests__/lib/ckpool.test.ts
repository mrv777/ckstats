import {
    CKPoolAPI,
    CKPoolError,
    CKPoolErrorCode,
} from '../../lib/ckpool';

describe('CKPoolAPI', () => {
    let api: CKPoolAPI;

    beforeEach(() => {
        // Reset env to use HTTP mode
        delete process.env.API_URL;
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

        it('detects HTTP mode for http:// URLs', () => {
            process.env.API_URL = 'http://localhost:8080';
            const testApi = new CKPoolAPI();
            // @ts-expect-error - accessing private property for testing
            expect(testApi.isHttp).toBe(true);
            delete process.env.API_URL;
        });

        it('detects HTTP mode for https:// URLs', () => {
            process.env.API_URL = 'https://localhost:8080';
            const testApi = new CKPoolAPI();
            // @ts-expect-error - accessing private property for testing
            expect(testApi.isHttp).toBe(true);
            delete process.env.API_URL;
        });

        it('detects filesystem mode for plain paths', () => {
            process.env.API_URL = '/data/ckpool';
            const testApi = new CKPoolAPI();
            // @ts-expect-error - accessing private property for testing
            expect(testApi.isHttp).toBe(false);
            delete process.env.API_URL;
        });
    });

    describe('poolStatus', () => {
        it('fetches pool status successfully', async () => {
            const mockResponse = {
                pool: { hashrate: '1000000' },
            };
            jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(JSON.stringify(mockResponse)),
            } as unknown as Response);

            const result = await api.poolStatus();
            expect(result).toEqual(mockResponse);
        });

        it('throws NOT_FOUND on 404', async () => {
            jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: false,
                status: 404,
                statusText: 'Not Found',
            } as unknown as Response);

            await expect(api.poolStatus()).rejects.toMatchObject({
                code: CKPoolErrorCode.NOT_FOUND,
            });
        });

        it('throws UNKNOWN on non-404 errors', async () => {
            jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
            } as unknown as Response);

            await expect(api.poolStatus()).rejects.toThrow(CKPoolError);
            await expect(api.poolStatus()).rejects.toMatchObject({
                code: CKPoolErrorCode.UNKNOWN,
            });
        });

        it('throws TIMEOUT on timeout', async () => {
            jest.spyOn(global, 'fetch').mockImplementation(() => {
                const err = new Error('Aborted');
                err.name = 'TimeoutError';
                throw err;
            });

            await expect(api.poolStatus()).rejects.toThrow(CKPoolError);
            await expect(api.poolStatus()).rejects.toMatchObject({
                code: CKPoolErrorCode.TIMEOUT,
            });
        });
    });

    describe('users', () => {
        it('fetches user data successfully', async () => {
            const mockResponse = {
                address: 'bc1q...',
                authorised: true,
            };
            jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: true,
                text: () => Promise.resolve(JSON.stringify(mockResponse)),
            } as unknown as Response);

            const result = await api.users('bc1qtest');
            expect(result).toEqual(mockResponse);
        });

        it('throws INVALID for addresses with invalid characters', async () => {
            await expect(api.users('../etc/passwd')).rejects.toThrow(CKPoolError);
            await expect(api.users('../etc/passwd')).rejects.toMatchObject({
                code: CKPoolErrorCode.INVALID,
            });
        });

        it('throws NOT_FOUND when user does not exist', async () => {
            // Mock 404 response for users endpoint
            jest.spyOn(global, 'fetch').mockResolvedValue({
                ok: false,
                status: 404,
                statusText: 'Not Found',
            } as unknown as Response);

            await expect(api.users('bc1qnonexistent')).rejects.toMatchObject({
                code: CKPoolErrorCode.NOT_FOUND,
            });
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