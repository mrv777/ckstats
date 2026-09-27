import { readFileSync } from 'node:fs';
import * as http2 from 'node:http2';

import pLimit from 'p-limit';

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

type ApiFlavor = 'ckpool' | 'btcpowlab';

type BtcPowLabSummary = {
  generated_at: number;
  connected: boolean;
  active_sessions: number;
  current_hashrate_hs: number | null;
  hashrate_5m_hs: number | null;
  hashrate_1h_hs: number | null;
  hashrate_24h_hs: number | null;
  accepted_shares: number;
  best_share_difficulty: string | null;
  last_share_at: number | null;
  workers: Array<{
    name: string;
    accepted_shares: number;
    hashrate_5m_hs: number | null;
    hashrate_1h_hs: number | null;
    last_share_at: number | null;
  }>;
};

const hashrate = (value: number | null | undefined): string =>
  String(Number.isFinite(value) && Number(value) > 0 ? value : 0);

export const mapBtcPowLabUser = (
  data: BtcPowLabSummary,
  address = '',
) => ({
  authorised: data.connected ? data.generated_at : 0,
  hashrate1m: hashrate(data.current_hashrate_hs),
  hashrate5m: hashrate(data.hashrate_5m_hs),
  hashrate1hr: hashrate(data.hashrate_1h_hs),
  hashrate1d: hashrate(data.hashrate_24h_hs),
  hashrate7d: '0',
  lastshare: data.last_share_at ?? 0,
  workers: data.active_sessions,
  shares: String(data.accepted_shares ?? 0),
  bestshare: data.best_share_difficulty ?? '0',
  bestever: data.best_share_difficulty ?? '0',
  worker: (data.workers ?? []).map((worker) => ({
    workername: address ? `${address}.${worker.name}` : worker.name,
    hashrate1m: hashrate(worker.hashrate_5m_hs),
    hashrate5m: hashrate(worker.hashrate_5m_hs),
    hashrate1hr: hashrate(worker.hashrate_1h_hs),
    hashrate1d: '0',
    hashrate7d: '0',
    lastshare: worker.last_share_at ?? 0,
    shares: String(worker.accepted_shares ?? 0),
    bestshare: '0',
    bestever: '0',
  })),
});

export const mapBtcPowLabPool = (data: any) => {
  const pool = data.pool ?? {};
  const network = data.network ?? {};
  return {
    runtime: '0',
    Users: String(pool.active_miners ?? 0),
    Workers: String(pool.active_workers ?? 0),
    Idle: '0',
    Disconnected: '0',
    hashrate1m: hashrate(Number(pool.hashrate_5m_ths ?? 0) * 1e12),
    hashrate5m: hashrate(Number(pool.hashrate_5m_ths ?? 0) * 1e12),
    hashrate15m: hashrate(Number(pool.hashrate_15m_ths ?? 0) * 1e12),
    hashrate1hr: hashrate(Number(pool.hashrate_1h_ths ?? 0) * 1e12),
    hashrate6hr: '0',
    hashrate1d: '0',
    hashrate7d: '0',
    diff: String(network.difficulty ?? 0),
    accepted: String(pool.accepted_shares ?? 0),
    rejected: String(
      Number(pool.rejected_shares ?? 0) + Number(pool.duplicate_shares ?? 0),
    ),
    bestshare: '0',
    SPS1m: '0',
    SPS5m: '0',
    SPS15m: '0',
    SPS1h: '0',
  };
};

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
  private readonly apiFlavor: ApiFlavor;
  private readonly http2Ready: Promise<void>;

  /**
   * Initialize the CKPool API client from the environment.
   */
  constructor() {
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    this.apiUrl = process.env.API_URL?.trim() || 'https://solo.ckpool.org';
    this.apiFlavor = process.env.API_FLAVOR === 'btcpowlab' ? 'btcpowlab' : 'ckpool';
    this.isHttp =
      this.apiUrl.startsWith('http://') || this.apiUrl.startsWith('https://');

    // Check if the server supports http/2
    if (this.apiFlavor === 'ckpool' && this.apiUrl.startsWith('https://')) {
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
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
      this.isHttp2 = await new Promise<boolean>((resolve) => {
        const client = http2.connect(this.apiUrl);

        const cleanup = (value: boolean) => {
          if (timer) {
            clearTimeout(timer);
          }
          client.close();
          resolve(value);
        };

        client.once('connect', () => cleanup(true));
        client.once('error', () => cleanup(false));

        timer = setTimeout(() => {
          cleanup(false);
        }, 1000);
      });
    } catch {
      if (timer) {
        clearTimeout(timer);
      }
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
          const statusText = (response.statusText ?? '').toLowerCase();

          if (status === 404 || statusText.includes('not found')) {
            throw new CKPoolError(
              CKPoolErrorCode.NOT_FOUND,
              `Resource not found: ${path}`
            );
          }

          const errorBody = await response.text().catch(() => '');

          throw new CKPoolError(
            CKPoolErrorCode.UNKNOWN,
            `API request failed: ${status} ${response.statusText ?? ''} ${errorBody}`.trim()
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
    if (this.apiFlavor === 'btcpowlab') {
      return mapBtcPowLabPool(JSON.parse(await this.api('/public/v1/pool')));
    }
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

    if (this.apiFlavor === 'btcpowlab') {
      const data = JSON.parse(
        await this.api(`/public/v1/miner/${address}/summary`)
      ) as BtcPowLabSummary;
      return mapBtcPowLabUser(data, address);
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
      let clientError: CKPoolError | null = null;

      client.on('error', (err) => {
        clientError = new CKPoolError(
          CKPoolErrorCode.UNKNOWN,
          'HTTP/2 client session error',
          err
        );
        client.destroy();
      });

      try {
        const CONCURRENCY_LIMIT = 50;
        const limit = pLimit(CONCURRENCY_LIMIT);

        const promises = addresses.map((address) =>
          limit(async () => {
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
                }, 5000);

                req.once('response', (headers) => {
                  clearTimeout(timeout);
                  resolve((headers[':status'] as number) ?? 0);
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
          })
        );

        const results = await Promise.all(promises);
        if (clientError) {
          throw clientError;
        }
        return results;
      } finally {
        if (!client.destroyed) {
          client.close();
        }
      }
    } else {
      // Use the API for http/1 and file API access
      const results: Array<{
        address: string;
        userData?: unknown;
        error?: unknown;
      }> = [];
      const CONCURRENCY_LIMIT = 50;

      for (let i = 0; i < addresses.length; i += CONCURRENCY_LIMIT) {
        const chunk = addresses.slice(i, i + CONCURRENCY_LIMIT);
        const chunkPromises = chunk.map(async (address) => {
          try {
            const userData = await this.user(address);
            return { address, userData };
          } catch (error) {
            return { address, error };
          }
        });

        results.push(...(await Promise.all(chunkPromises)));
      }

      return results;
    }
  }
}
