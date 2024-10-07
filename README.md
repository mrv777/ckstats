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

## Set up the environment variables in `.env`:
   ```
   DATABASE_URL="postgresql://username:password@server:port/your_database_name"
   SHADOW_DATABASE_URL="postgresql://username:password@server:port/your_shadow_database_name"
   API_URL="https://solo.ckpool.org"
   ```
   Replace `username`, `password`, `server`, `port`, `your_database_name`, and `your_shadow_database_name` with your actual PostgreSQL credentials, server details, and database names.

   ### About the Shadow Database
   The shadow database is used by Prisma for database migrations in environments where creating tables or modifying the schema of the main database is not possible during development. It's a temporary database that mimics your main database structure.

   ### If you don't want to use two databases:
   If you're working in a development environment or have full control over your database, you can use the same database for both `DATABASE_URL` and `SHADOW_DATABASE_URL`. In this case, your `.env` file would look like this:

   ```
   DATABASE_URL="postgresql://username:password@server:port/your_database_name"
   SHADOW_DATABASE_URL="postgresql://username:password@server:port/your_database_name"
   API_URL="https://solo.ckpool.org"
   ```

   This configuration uses the same database for both the main application and Prisma migrations.

## Deployment

1. Clone the repository (if not already done)
2. Install dependencies: `pnpm install`
3. Set up the environment variables in `.env`
4. Run database migrations: `pnpm prisma:migrate`
5. Generate Prisma client: `pnpm prisma:generate`
6. Build the application: `pnpm build`
7. Start the production server: `pnpm start`
8. Set up cronjobs for regular updates:
   - Open the crontab editor: `crontab -e`
   - Add the following lines:
     ```
     */10 * * * * cd /path/to/your/project && /usr/local/bin/pnpm seed
     */10 * * * * cd /path/to/your/project && /usr/local/bin/pnpm update-users
     ```
   - Save and exit the editor
   
   These cronjobs will run the `seed` and `update-users` scripts every 10 minutes to populate the database.


## Scripts

- `pnpm dev`: Start the development server
- `pnpm build`: Build the production application
- `pnpm start`: Start the production server
- `pnpm lint`: Run ESLint
- `pnpm lint:fix`: Run ESLint and fix issues
- `pnpm prisma:generate`: Generate Prisma client
- `pnpm prisma:migrate`: Run database migrations
- `pnpm seed`: Save/Update pool stats to database
- `pnpm update-stats`: Update pool statistics #Currently not used
- `pnpm update-users`: Update user and worker information
- `pnpm cleanup`: Clean up old statistics
- `pnpm vacuum`: Optimize the SQLite database
- `pnpm test`: Run tests
- `pnpm test:watch`: Run tests in watch mode

## License

GPL-3.0 license