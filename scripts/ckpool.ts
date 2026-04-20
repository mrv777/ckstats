import { readFileSync } from 'node:fs';

const FETCH_TIMEOUT_MS = 10000;

export enum CKPoolErrorCode {
  NOT_FOUND = 'NOT_FOUND',
  TIMEOUT = 'TIMEOUT',
  INVALID = 'INVALID',
  UNKNOWN = 'UNKNOWN',
}

export class CKPoolError extends Error {
  constructor(
    public code: CKPoolErrorCode,
    message: string,
    public cause?: unknown
  ) {
    super(message);
    this.name = 'CKPoolError';
  }
}

export class CKPoolAPI {
  private apiUrl: string;
  private isHttp: boolean;

  constructor() {
    this.apiUrl = process.env.API_URL || 'https://solo.ckpool.org';
    this.isHttp =
      this.apiUrl.startsWith('http://') || this.apiUrl.startsWith('https://');
  }

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

          // Try to get the body; if it fails (e.g. body already used or stream closed), default to empty string
          const errorBody = await response.text().catch(() => '');

          throw new CKPoolError(
            CKPoolErrorCode.UNKNOWN,
            `API request failed: ${status} ${response.statusText || ''} ${errorBody}`.trim()
          );
        }
        return await response.text();
      } catch (err) {
        // Do NOT catch CKPoolError - let it bubble up unchanged
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
        // 'ENOENT' is the standard Node.js code for "File Not Found"
        if (err?.code === 'ENOENT') {
          throw new CKPoolError(
            CKPoolErrorCode.NOT_FOUND,
            `File not found: ${fullPath}`,
            err
          );
        }

        // Some other kind of error
        throw new CKPoolError(
          CKPoolErrorCode.UNKNOWN,
          err instanceof Error ? err.message : 'Unknown error',
          err
        );
      }
    }
  }

  async poolStatus(): Promise<unknown> {
    const data = await this.api('/pool/pool.status');
    // The CKPool API's pool.status endpoint returns line-delimited JSON.
    const jsonLines = data.split('\n').filter(Boolean);
    // Reduce multiple JSON objects into a single object
    return jsonLines.reduce((acc, line) => ({ ...acc, ...JSON.parse(line) }), {});
  }

  async users(address: string): Promise<unknown> {
    // Reduce the risk of directory traversal attacks
    if (/[^a-zA-Z0-9]/.test(address)) {
      throw new CKPoolError(
        CKPoolErrorCode.INVALID,
        'Invalid address: only alphanumeric characters allowed'
      );
    }

    const data = await this.api(`/users/${address}`);
    return JSON.parse(data);
  }
}
