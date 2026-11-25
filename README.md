# CK Stats

This project displays real-time and historical statistics for the CKPool Bitcoin mining pool using data from its API.

## Features

- Real-time pool statistics
- Historical data chart
- Responsive design with themed display
- User and worker information

## Technologies Used

- Node.js 22.22.1 (as ships with Ubuntu 26.04.1)
- Next.js
- Tailwind CSS
- daisyUI
- Apache ECharts 
- TypeORM

## Deployment

1. Clone the repository (git clone https://github.com/mrv777/ckstats.git)
2. Install pnpm: `curl -fsSL https://get.pnpm.io/install.sh | bash`
3. Install packages if needed: `sudo apt install postgresql postgresql-contrib nodejs npm`
4. Go to the directory: `cd ckstats`
5. Set up the environment variables in `.env`
  - Example:
   ```
   API_URL="https://solo.ckpool.org"
   DB_HOST="server"
   DB_PORT="port"
   DB_USER="username"
   DB_PASSWORD="password"
   DB_NAME="database"
   ```
   Replace `username`, `password`, `server`, `port`, `database` with your actual PostgreSQL credentials, server details, and database names.
   You can also set the DB_SSL to true if you want to use SSL and set the DB_SSL_REJECT_UNAUTHORIZED to true if you want to reject untrusted SSL certificates (like self-signed certificates).

   If PostgreSQL is running locally, you can set `DB_HOST` to `/var/run/postgresql/` (which connects via a Unix socket).  The username and password are then ignored (authentication is done based on the Unix user connection to the socket).
   If ckpool is running locally you can set `API_URL` to the logs directory.  For example `/var/log/ckpool/`.

6. If you are upgrading from an existing version: `pnpm store prune`
7. Install dependencies: `pnpm install`
8. Run database migrations: `pnpm migration:run`
9. Seed the database and test the connection: `pnpm seed`
10. Build the application: `pnpm build`
11. Start the production server: `pnpm start`
12. Set up cronjobs for regular updates:
   - Open the crontab editor: `crontab -e`
   - Add lines to run the scripts.  Example:
     ```
     */1 * * * * cd /path/to/your/project && nice /usr/local/bin/pnpm seed
     */1 * * * * cd /path/to/your/project && nice /usr/local/bin/pnpm update-users
     5 */2 * * * cd /path/to/your/project && nice /usr/local/bin/pnpm cleanup
     ```
   - Save and exit the editor
   
   These cronjobs will run the `seed` and `update-users` scripts every 1 minute to populate the database, and clean up old statistics every 2 hours.


### Running as a systemd service

An example  unit is provided in [ckstats.service.example](ckstats.service.example). Copy it to `/etc/systemd/system/ckstats.service`, then edit `User`, `Group`, `WorkingDirectory`, the `ExecStart` path to `pnpm`, the `ReadWritePaths` path and the unit names in `After=`/`Requires=` to match your system. Then run:

```
sudo systemctl daemon-reload
sudo systemctl enable --now ckstats
systemd-analyze security ckstats.service
```

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
- `pnpm test`: Run tests
- `pnpm test:watch`: Run tests in watch mode
- `pnpm migration:run`: Run TypeORM database migrations
- `pnpm migration:run:skip`: Run TypeORM database migrations skipping the initial migration

## License

GPL-3.0 license
