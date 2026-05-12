import { readFileSync } from 'node:fs';
import * as http2 from 'node:http2';

/**
 * Default fetch timeout in milliseconds for HTTP/1 requests.
 */
const FETCH_TIMEOUT_MS = 10000;

/**
 * Standardized error codes used by CKPool API operations.
 */
export enum CKPoolErrorCode {
  NOT_FOUND = 'NOT_FOUND',
  TIMEOUT = 'TIMEOUT',
  INVALID = 'INVALID',
  UNKNOWN = 'UNKNOWN',
}

/**
 * A structured error type for CKPool API failures.
 */
export class CKPoolError extends Error {
  /**
   * @param code normalized error code
   * @param message human-readable error message
   * @param cause optional underlying error cause
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
 * Client for interacting with CKPool's HTTP API or local log file endpoints.
 *
 * Supports HTTP/2 multiplexed user queries when the remote server advertises
 * HTTP/2 support, and falls back to HTTP/1 or local file access otherwise.
 */
export class CKPoolAPI {
  private apiUrl: string;
  private isHttp: boolean;
  public isHttp2: boolean = false;
  private readonly http2Ready: Promise<void>;

  /**
   * Initialize the CKPool API client from the environment.
   */
  constructor() {
    this.apiUrl = process.env.API_URL || 'https://solo.ckpool.org';
    this.isHttp =
      this.apiUrl.startsWith('http://') || this.apiUrl.startsWith('https://');

    // Check if the server supports http/2
    if (this.apiUrl.startsWith('https://')) {
      this.http2Ready = this.detectHttp2Support();
    } else {
      this.http2Ready = Promise.resolve();
    }
  }

  /**
   * Detect whether the configured API endpoint supports HTTP/2.
   *
   * HTTP/2 detection is performed lazily during construction for HTTPS URLs.
   */
  private async detectHttp2Support(): Promise<void> {
    try {
      this.isHttp2 = await new Promise<boolean>((resolve) => {
        const client = http2.connect(this.apiUrl);
        client.once('connect', () => {
          client.close();
          resolve(true);
        });
        client.once('error', () => {
          client.close();
          resolve(false);
        });
        setTimeout(() => {
          client.close();
          resolve(false);
        }, 1000);
      });
    } catch {
      this.isHttp2 = false;
    }
  }

  /**
   * Fetch a raw text response from the configured API or local file path.
   *
   * @param path API path or local file suffix
   * @returns response body as text
   * @throws CKPoolError on network, timeout, or file access failures
   */
  private async api(path: string): Promise<string> {
    if (this.isHttp) {
      try {
        const response = await fetch(`${this.apiUrl}${path}`, {
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!response.ok) {
          const status = (response as any).status ?? response.status ?? 0;
          const statusText = (response.statusText || '').toLowerCase();

          if (status === 404 || statusText.includes('not found')) {
            throw new CKPoolError(
              CKPoolErrorCode.NOT_FOUND,
              `Resource not found: ${path}`
            );
          }

          const errorBody = await response.text().catch(() => '');

          throw new CKPoolError(
            CKPoolErrorCode.UNKNOWN,
            `API request failed: ${status} ${response.statusText || ''} ${errorBody}`.trim()
          );
        }
        return await response.text();
      } catch (err) {
        if (err instanceof CKPoolError) {
          throw err;
        }

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
      try {
        return readFileSync(fullPath, 'utf-8');
      } catch (err) {
        if (err?.code === 'ENOENT') {
          throw new CKPoolError(
            CKPoolErrorCode.NOT_FOUND,
            `File not found: ${fullPath}`,
            err
          );
        }

        throw new CKPoolError(
          CKPoolErrorCode.UNKNOWN,
          err instanceof Error ? err.message : 'Unknown error',
          err
        );
      }
    }
  }

  /**
   * Retrieve current pool status from CKPool.
   *
   * The response is parsed from a newline-delimited JSON format into a single
   * aggregated object.
   */
  async poolStatus(): Promise<unknown> {
    const data = await this.api('/pool/pool.status');

    const flattened = data.replace(/\r?\n/g, '');
    const arrayified = '[' + flattened.replace(/}\s*{/g, '},{') + ']';

    const objects = JSON.parse(arrayified) as Record<string, any>[];

    return objects.reduce((acc, obj) => ({ ...acc, ...obj }), {});
  }

  /**
   * Retrieve a single user's data from CKPool.
   *
   * @param address user Bitcoin address
   * @returns parsed user data JSON
   */
  async user(address: string): Promise<unknown> {
    if (address.length === 0 || /[^a-zA-Z0-9]/.test(address)) {
      throw new CKPoolError(
        CKPoolErrorCode.INVALID,
        'Invalid address: only alphanumeric characters allowed'
      );
    }

    return JSON.parse(await this.api(`/users/${address}`));
  }
  /**
   * Retrieve multiple user records in parallel.
   *
   * When HTTP/2 is available, this will multiplex requests over a single
   * connection. Otherwise, it falls back to HTTP/1 or file-based lookups.
   *
   * @param addresses array of user Bitcoin addresses
   * @returns array of results containing either `userData` or `error`
   */
  async users(addresses: string[]): Promise<
    Array<{
      address: string;
      userData?: unknown;
      error?: unknown;
    }>
  > {
    await this.http2Ready;

    if (this.isHttp2) {
      const client = http2.connect(this.apiUrl);

      try {
        const promises = addresses.map(async (address) => {
          try {
            const req = client.request({
              ':method': 'GET',
              ':path': `/users/${address}`,
            });
            req.end();

            const status = await new Promise<number>((resolve, reject) => {
              const timeout = setTimeout(() => {
                req.close();
                reject(new Error('Request timeout'));
              }, 3000);

              req.once('response', (headers) => {
                clearTimeout(timeout);
                resolve((headers[':status'] as number) || 0);
              });

              req.once('error', (err) => {
                clearTimeout(timeout);
                reject(err);
              });
            });

            let data = '';
            for await (const chunk of req) {
              data += chunk;
            }

            if (status === 404) {
              throw new CKPoolError(
                CKPoolErrorCode.NOT_FOUND,
                `Resource not found: /users/${address}`
              );
            }

            if (status !== 200) {
              throw new CKPoolError(
                CKPoolErrorCode.UNKNOWN,
                `HTTP error ${status} for /users/${address}`
              );
            }

            const userData = JSON.parse(data);
            return { address, userData };
          } catch (error) {
            return { address, error };
          }
        });

        return await Promise.all(promises);
      } finally {
        client.close();
      }
    } else {
      // Use the API for http/1 and file API access
      const results = await Promise.all(
        addresses.map(async (address) => {
          try {
            const userData = await this.user(address);
            return { address, userData };
          } catch (error) {
            return { address, error };
          }
        })
      );

      return results;
    }
  }
}
