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
- TypeORM
## Getting Started

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Set up the environment variables in `.env`
4. Run database migrations: `pnpm migration:run`
5. Seed the database: `pnpm seed`
6. Start the development server: `pnpm dev`

## Set up the environment variables in `.env`:
   ```
   API_URL="https://solo.ckpool.org"
   DB_HOST="server"
   DB_PORT="port"
   DB_USER="username"
   DB_PASSWORD="password"
   DB_NAME="database"
   ```
   Replace `username`, `password`, `server`, `port`, `database` with your actual PostgreSQL credentials, server details, and database names.

## Deployment

1. Clone the repository (git clone https://github.com/mrv777/ckstats.git)
2. Install pnpm: `curl -fsSL https://get.pnpm.io/install.sh | bash`
3. Install packages if needed: `sudo apt install postgresql postgresql-contrib nodejs nginx`
2. Go to the directory: `cd ckstats`
3. Install dependencies: `pnpm install`
4. Set up the environment variables in `.env`
  - Example:
  ```
   DATABASE_URL="postgres://postgres:password@localhost:5432/postgres"
   SHADOW_DATABASE_URL="postgres://postgres:password@localhost:5432/postgres"
   API_URL=https://solo.ckpool.org
  ```
7. Build the application: `pnpm build`
8. Start the production server: `pnpm start`
9. Set up cronjobs for regular updates:
   - Open the crontab editor: `crontab -e`
   - Add the following lines (for example, every 1 minute updates with old data cleanup every 12 hours and vacuum every day at 01:05):
     ```
     */1 * * * * cd /path/to/your/project && /usr/local/bin/pnpm seed
     */1 * * * * cd /path/to/your/project && /usr/local/bin/pnpm update-users
     5 */2 * * * cd /path/to/your/project && /usr/local/bin/pnpm cleanup
     5 1 * * * cd /path/to/your/project && /usr/local/bin/pnpm vacuum
     ```
   - Save and exit the editor
   
   These cronjobs will run the `seed` and `update-users` scripts every 10 minutes to populate the database and clean up old statistics every 12 hours.


## Scripts

- `pnpm dev`: Start the development server
- `pnpm build`: Build the production application
- `pnpm start`: Start the production server
- `pnpm lint`: Run ESLint
- `pnpm lint:fix`: Run ESLint and fix issues
- `pnpm seed`: Save/Update pool stats to database
- `pnpm update-stats`: Update pool statistics #Currently not used
- `pnpm update-users`: Update user and worker information
- `pnpm cleanup`: Clean up old statistics
- `pnpm vacuum`: Optimize the SQLite database
- `pnpm test`: Run tests
- `pnpm test:watch`: Run tests in watch mode
- `pnpm migration:run`: Run TypeORM database migrations
- `pnpm migration:run:skip`: Run TypeORM database migrations skipping the initial migration

## License

GPL-3.0 license