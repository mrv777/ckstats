# CK Stats

This project displays real-time and historical statistics for the CKPool Bitcoin mining pool using data from their API.

## Features

- Real-time pool statistics
- Historical data chart
- Responsive design with themed display

## Technologies Used

- Next.js
- Tailwind CSS
- daisyUI
- Recharts

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
- `pnpm seed`: Load in pool stats

## License

GPL-3.0 license