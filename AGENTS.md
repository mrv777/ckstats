ckstats is a nodejs web interface for the Bitcoin mining software ckpool.

# Project Guidelines

- This repository is a Next.js 14 App Router application using TypeORM with PostgreSQL.
- Primary work areas:
  - page and layout UI under `app/`
  - API routes under `app/api/`
  - data sync scripts under `scripts/`
  - ORM entities under `lib/entities/`
- Preserve existing conventions:
  - use `serializeData()` for ORM entities before JSON responses to keep BigInt-safe JSON
  - apply `validateBitcoinAddress()` for Bitcoin address validation in API routes
  - reuse utility helpers in `utils/helpers.ts` for formatting and display logic
  - follow `lib/api.ts` cache-aside pattern when updating data access logic
- Use `pnpm` with Node `>=22.22.1` and the scripts defined in `package.json`.
- Run tests for behavior changes and use `__tests__/` as the test source.
- Do not invent new deployment or environment workflows; follow `README.md` for `.env` and setup details.

## Code Style

- TypeScript with `strictNullChecks: true` and `strict: false` for gradual type checking
- JavaScript standard: ES2023
- Formatting: Prettier (see .prettierrc), ESLint (see .eslintrc.json)
- Reference: [utils/helpers.ts](utils/helpers.ts) for formatting patterns, [lib/api.ts](lib/api.ts) for query structure

## Architecture

- Next.js 14 App Router with server-first rendering and 60-second ISR revalidation
- TypeORM entities: PoolStats, User, UserStats, Worker, WorkerStats
- Cache layers: Node-cache + HTTP ISR (60s) for performance
- Batch processing for data synchronization (see [scripts/updateUsers.ts](scripts/updateUsers.ts))

## Build and Test

- Install: `pnpm install`
- Dev: `pnpm dev`
- Build: `pnpm build`
- Test: `pnpm test`
- Migrations: `pnpm migration:run`
- Data seeding: `pnpm seed`

## Conventions

- Always use `serializeData()` for ORM entities before JSON responses (BigInt safety)
- Formatting helpers in [utils/helpers.ts](utils/helpers.ts): `formatHashrate()`, `formatTimeAgo()`, etc.
- Bitcoin address validation: `validateBitcoinAddress()` in API routes
- Cache-aside pattern in [lib/api.ts](lib/api.ts)

See [README.md](README.md) for deployment and environment setup.

## Pending upgrades

- `@typescript-eslint/*` 8.73.0 is ready to install after 2026-11-23 (published 2026-11-16, held by the 7-day `minimumReleaseAge` policy in `pnpm-workspace.yaml`). Bump `^8.72.2` → `^8.73.0` in `package.json`, run `pnpm install`, then re-run `pnpm audit` (2 accepted moderate advisories in transitive `glob`/`minimatch` — check whether the newer typescript-estree resolves `minimatch`).
