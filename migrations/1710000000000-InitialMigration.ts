import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1710000000000 implements MigrationInterface {
    name = 'InitialMigration1710000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "PoolStats" (
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
            CREATE TABLE "User" (
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
            CREATE TABLE "UserStats" (
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
            CREATE TABLE "Worker" (
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
            CREATE TABLE "WorkerStats" (
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
            ALTER TABLE "UserStats"
            ADD CONSTRAINT "FK_UserStats_User"
            FOREIGN KEY ("userAddress")
            REFERENCES "User"("address")
            ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE "Worker"
            ADD CONSTRAINT "FK_Worker_User"
            FOREIGN KEY ("userAddress")
            REFERENCES "User"("address")
            ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE "WorkerStats"
            ADD CONSTRAINT "FK_WorkerStats_Worker"
            FOREIGN KEY ("workerId")
            REFERENCES "Worker"("id")
            ON DELETE CASCADE
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "IDX_PoolStats_Timestamp" ON "PoolStats" ("timestamp")`);
        
        await queryRunner.query(`CREATE INDEX "User_address_key" ON "User" ("address")`);
        await queryRunner.query(`CREATE INDEX "User_isActive_idx" ON "User" ("isActive")`);
        await queryRunner.query(`CREATE INDEX "User_isPublic_idx" ON "User" ("isPublic")`);
        
        await queryRunner.query(`CREATE INDEX "UserStats_timestamp_idx" ON "UserStats" ("timestamp")`);
        await queryRunner.query(`CREATE INDEX "userAddress_timestamp_idx" ON "UserStats" ("userAddress", "timestamp")`);
        await queryRunner.query(`CREATE INDEX "userAddress_bestEver_timestamp_idx" ON "UserStats" ("userAddress", "bestEver", "timestamp")`);
        await queryRunner.query(`CREATE INDEX "userAddress_hashrate1hr_timestamp_idx" ON "UserStats" ("userAddress", "hashrate1hr", "timestamp")`);
        
        await queryRunner.query(`CREATE INDEX "WorkerStats_timestamp_idx" ON "WorkerStats" ("timestamp")`);
        await queryRunner.query(`CREATE INDEX "WorkerStats_workerId_idx" ON "WorkerStats" ("workerId")`);
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
        await queryRunner.query(`ALTER TABLE "WorkerStats" DROP CONSTRAINT "FK_WorkerStats_Worker"`);
        await queryRunner.query(`ALTER TABLE "Worker" DROP CONSTRAINT "FK_Worker_User"`);
        await queryRunner.query(`ALTER TABLE "UserStats" DROP CONSTRAINT "FK_UserStats_User"`);

        // Drop tables
        await queryRunner.query(`DROP TABLE "WorkerStats"`);
        await queryRunner.query(`DROP TABLE "Worker"`);
        await queryRunner.query(`DROP TABLE "UserStats"`);
        await queryRunner.query(`DROP TABLE "User"`);
        await queryRunner.query(`DROP TABLE "PoolStats"`);
    }
} 