import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1710000000000 implements MigrationInterface {
    name = 'InitialMigration1710000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "pool_stats" (
                "id" SERIAL NOT NULL,
                "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
                "runtime" integer NOT NULL,
                "users" integer NOT NULL,
                "workers" integer NOT NULL,
                "idle" integer NOT NULL,
                "disconnected" integer NOT NULL,
                "hashrate1m" bigint NOT NULL DEFAULT '0',
                "hashrate5m" bigint NOT NULL DEFAULT '0',
                "hashrate15m" bigint NOT NULL DEFAULT '0',
                "hashrate1hr" bigint NOT NULL DEFAULT '0',
                "hashrate6hr" bigint NOT NULL DEFAULT '0',
                "hashrate1d" bigint NOT NULL DEFAULT '0',
                "hashrate7d" bigint NOT NULL DEFAULT '0',
                "diff" double precision NOT NULL,
                "accepted" bigint NOT NULL,
                "rejected" bigint NOT NULL,
                "bestshare" bigint NOT NULL,
                "SPS1m" double precision NOT NULL,
                "SPS5m" double precision NOT NULL,
                "SPS15m" double precision NOT NULL,
                "SPS1h" double precision NOT NULL,
                CONSTRAINT "PK_PoolStats" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "user" (
                "address" character varying NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "authorised" bigint NOT NULL DEFAULT '0',
                "isActive" boolean NOT NULL DEFAULT true,
                "isPublic" boolean NOT NULL DEFAULT true,
                CONSTRAINT "PK_User" PRIMARY KEY ("address")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "user_stats" (
                "id" SERIAL NOT NULL,
                "userAddress" character varying NOT NULL,
                "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
                "hashrate1m" bigint NOT NULL DEFAULT '0',
                "hashrate5m" bigint NOT NULL DEFAULT '0',
                "hashrate1hr" bigint NOT NULL DEFAULT '0',
                "hashrate1d" bigint NOT NULL DEFAULT '0',
                "hashrate7d" bigint NOT NULL DEFAULT '0',
                "lastShare" bigint NOT NULL DEFAULT '0',
                "workerCount" integer NOT NULL DEFAULT 0,
                "shares" bigint NOT NULL DEFAULT '0',
                "bestShare" double precision NOT NULL DEFAULT 0,
                "bestEver" bigint NOT NULL DEFAULT '0',
                CONSTRAINT "PK_UserStats" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "worker" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL DEFAULT '',
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "hashrate1m" bigint NOT NULL DEFAULT '0',
                "hashrate5m" bigint NOT NULL DEFAULT '0',
                "hashrate1hr" bigint NOT NULL DEFAULT '0',
                "hashrate1d" bigint NOT NULL DEFAULT '0',
                "hashrate7d" bigint NOT NULL DEFAULT '0',
                "lastUpdate" TIMESTAMP NOT NULL DEFAULT now(),
                "shares" bigint NOT NULL DEFAULT '0',
                "bestShare" double precision NOT NULL DEFAULT 0,
                "bestEver" bigint NOT NULL DEFAULT '0',
                "userAddress" character varying NOT NULL,
                CONSTRAINT "PK_Worker" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_Worker_User_Name" UNIQUE ("userAddress", "name")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "worker_stats" (
                "id" SERIAL NOT NULL,
                "workerId" integer NOT NULL,
                "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
                "hashrate1m" bigint NOT NULL DEFAULT '0',
                "hashrate5m" bigint NOT NULL DEFAULT '0',
                "hashrate1hr" bigint NOT NULL DEFAULT '0',
                "hashrate1d" bigint NOT NULL DEFAULT '0',
                "hashrate7d" bigint NOT NULL DEFAULT '0',
                "shares" bigint NOT NULL DEFAULT '0',
                "bestShare" double precision NOT NULL DEFAULT 0,
                "bestEver" bigint NOT NULL DEFAULT '0',
                CONSTRAINT "PK_WorkerStats" PRIMARY KEY ("id")
            )
        `);

        // Add foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "user_stats"
            ADD CONSTRAINT "FK_UserStats_User"
            FOREIGN KEY ("userAddress")
            REFERENCES "user"("address")
            ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE "worker"
            ADD CONSTRAINT "FK_Worker_User"
            FOREIGN KEY ("userAddress")
            REFERENCES "user"("address")
            ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE "worker_stats"
            ADD CONSTRAINT "FK_WorkerStats_Worker"
            FOREIGN KEY ("workerId")
            REFERENCES "worker"("id")
            ON DELETE CASCADE
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "IDX_PoolStats_Timestamp" ON "pool_stats" ("timestamp")`);
        
        await queryRunner.query(`CREATE INDEX "User_address_key" ON "user" ("address")`);
        await queryRunner.query(`CREATE INDEX "User_isActive_idx" ON "user" ("isActive")`);
        await queryRunner.query(`CREATE INDEX "User_isPublic_idx" ON "user" ("isPublic")`);
        
        await queryRunner.query(`CREATE INDEX "UserStats_timestamp_idx" ON "user_stats" ("timestamp")`);
        await queryRunner.query(`CREATE INDEX "userAddress_timestamp_idx" ON "user_stats" ("userAddress", "timestamp")`);
        await queryRunner.query(`CREATE INDEX "userAddress_bestEver_timestamp_idx" ON "user_stats" ("userAddress", "bestEver", "timestamp")`);
        await queryRunner.query(`CREATE INDEX "userAddress_hashrate1hr_timestamp_idx" ON "user_stats" ("userAddress", "hashrate1hr", "timestamp")`);
        
        await queryRunner.query(`CREATE INDEX "WorkerStats_timestamp_idx" ON "worker_stats" ("timestamp")`);
        await queryRunner.query(`CREATE INDEX "WorkerStats_workerId_idx" ON "worker_stats" ("workerId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX "WorkerStats_workerId_idx"`);
        await queryRunner.query(`DROP INDEX "WorkerStats_timestamp_idx"`);
        
        await queryRunner.query(`DROP INDEX "userAddress_hashrate1hr_timestamp_idx"`);
        await queryRunner.query(`DROP INDEX "userAddress_bestEver_timestamp_idx"`);
        await queryRunner.query(`DROP INDEX "userAddress_timestamp_idx"`);
        await queryRunner.query(`DROP INDEX "UserStats_timestamp_idx"`);
        
        await queryRunner.query(`DROP INDEX "User_isPublic_idx"`);
        await queryRunner.query(`DROP INDEX "User_isActive_idx"`);
        await queryRunner.query(`DROP INDEX "User_address_key"`);
        
        await queryRunner.query(`DROP INDEX "IDX_PoolStats_Timestamp"`);

        // Drop foreign key constraints
        await queryRunner.query(`ALTER TABLE "worker_stats" DROP CONSTRAINT "FK_WorkerStats_Worker"`);
        await queryRunner.query(`ALTER TABLE "worker" DROP CONSTRAINT "FK_Worker_User"`);
        await queryRunner.query(`ALTER TABLE "user_stats" DROP CONSTRAINT "FK_UserStats_User"`);

        // Drop tables
        await queryRunner.query(`DROP TABLE "worker_stats"`);
        await queryRunner.query(`DROP TABLE "worker"`);
        await queryRunner.query(`DROP TABLE "user_stats"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TABLE "pool_stats"`);
    }
} 