# Project Guidelines

## Code Style

- TypeScript with `strictNullChecks: true` but `strict: false` for BigInt compatibility
- Formatting: Prettier (see .prettierrc), ESLint (see .eslintrc.json)
- Reference: [utils/helpers.ts](utils/helpers.ts) for formatting patterns, [lib/api.ts](lib/api.ts) for query structure

## Architecture

- Next.js 14 App Router with server-first rendering and 60-second ISR revalidation
- TypeORM entities: PoolStats, User, UserStats, Worker, WorkerStats
- Cache layers: Node-cache (60-90s) + HTTP ISR (60s) for performance
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