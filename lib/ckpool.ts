import { readFileSync, existsSync } from 'fs';

const FETCH_TIMEOUT_MS = 10000;

/**
 * Error codes returned by CKPoolAPI operations.
 */
export enum CKPoolErrorCode {
    /** Resource not found (404 or file does not exist) */
    NOT_FOUND = 'NOT_FOUND',
    /** Request timed out */
    TIMEOUT = 'TIMEOUT',
    /** Invalid parameter or path */
    INVALID = 'INVALID',
    /** Unknown or unexpected error */
    UNKNOWN = 'UNKNOWN',
}

/**
 * Custom error class for CKPoolAPI operations.
 * Provides standardized error codes for consistent error handling.
 */
export class CKPoolError extends Error {
    /**
     * @param code - The error code indicating the type of error
     * @param message - Human-readable error message
     * @param cause - Optional original error that triggered this error
     */
    constructor(
        public code: CKPoolErrorCode,
        message: string,
        public cause?: unknown
    ) {
        super(message);
        this.name = 'CKPoolError';
    }
}

/**
 * Client for interacting with the ckpool API.
 * Supports both HTTP and filesystem-based API access.
 */
export class CKPoolAPI {
    private apiUrl: string;
    private isHttp: boolean;

    /**
     * Creates a new CKPoolAPI client.
     * Uses API_URL environment variable or defaults to 'https://solo.ckpool.org'.
     * Supports both HTTP URLs and filesystem paths.
     */
    constructor() {
        this.apiUrl = process.env.API_URL || 'https://solo.ckpool.org';
        this.isHttp =
            this.apiUrl.startsWith('http://') || this.apiUrl.startsWith('https://');
    }

    /**
     * Makes an API request to the ckpool server or filesystem.
     * @param path - The API path (e.g., '/pool/pool.status')
     * @returns The response body as a string
     * @throws {CKPoolError} With code INVALID if path contains invalid characters
     * @throws {CKPoolError} With code NOT_FOUND if resource doesn't exist
     * @throws {CKPoolError} With code TIMEOUT if request times out
     * @throws {CKPoolError} With code UNKNOWN for other errors
     */
    private async api(path: string): Promise<string> {
        // Prevent directory traversal attacks
        if (/[^a-zA-Z0-9]/.test(path)) {
            throw new CKPoolError(
                CKPoolErrorCode.INVALID,
                'Invalid path: only alphanumeric characters allowed'
            );
        }

        if (this.isHttp) {
            try {
                const response = await fetch(`${this.apiUrl}${path}`, {
                    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
                });
                if (!response.ok) {
                    if (response.status === 404) {
                        throw new CKPoolError(
                            CKPoolErrorCode.NOT_FOUND,
                            `Resource not found: ${path}`
                        );
                    }
                    throw new CKPoolError(
                        CKPoolErrorCode.UNKNOWN,
                        `API request failed: ${response.statusText}`
                    );
                }
                return response.text();
            } catch (err) {
                if (err instanceof Error && err.name === 'TimeoutError') {
                    throw new CKPoolError(
                        CKPoolErrorCode.TIMEOUT,
                        'Request timed out',
                        err
                    );
                }
                throw new CKPoolError(
                    CKPoolErrorCode.UNKNOWN,
                    err instanceof Error ? err.message : 'Unknown error',
                    err
                );
            }
        } else {
            const fullPath = `${this.apiUrl}${path}`;
            if (!existsSync(fullPath)) {
                throw new CKPoolError(
                    CKPoolErrorCode.NOT_FOUND,
                    `File not found: ${fullPath}`
                );
            }
            try {
                return readFileSync(fullPath, 'utf-8');
            } catch (err) {
                throw new CKPoolError(
                    CKPoolErrorCode.UNKNOWN,
                    err instanceof Error ? err.message : 'Unknown error',
                    err
                );
            }
        }
    }

    /**
     * Fetches the current pool status.
     * @returns Pool status data as a parsed object
     * @throws {CKPoolError} If the request fails
     */
    async poolStatus(): Promise<unknown> {
        const data = await this.api('/pool/pool.status');
        return JSON.parse(data);
    }

    /**
     * Fetches user data for a specific Bitcoin address.
     * @param address - The Bitcoin address to look up
     * @returns User data as a parsed object
     * @throws {CKPoolError} With code INVALID if address contains invalid characters
     * @throws {CKPoolError} With code NOT_FOUND if user doesn't exist
     * @throws {CKPoolError} With code TIMEOUT if request times out
     * @throws {CKPoolError} With code UNKNOWN for other errors
     */
    async users(address: string): Promise<unknown> {
        const data = await this.api(`/users/${address}`);
        return JSON.parse(data);
    }
}