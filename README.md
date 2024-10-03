# Bitcoin Mining Pool Stats

This project displays real-time and historical statistics for a Bitcoin mining pool using data from the CKPool API.

## Features

- Real-time pool statistics
- Historical data chart
- Responsive design with dark/light mode toggle

## Technologies Used

- Next.js 14.2.7
- React
- TypeScript
- Tailwind CSS
- daisyUI
- Recharts
- Knex.js with SQLite

## Getting Started

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Set up the environment variables in `.env`
4. Run database migrations: `pnpm prisma:migrate`
5. Seed the database: `pnpm seed`
6. Start the development server: `pnpm dev`

## Scripts

- `pnpm dev`: Start the development server
- `pnpm build`: Build the production application
- `pnpm start`: Start the production server
- `pnpm lint`: Run ESLint
- `pnpm migrate`: Run database migrations
- `pnpm seed`: Seed the database with initial data

## License

MIT