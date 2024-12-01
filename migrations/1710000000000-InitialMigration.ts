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
                "sps1m" double precision NOT NULL,
                "sps5m" double precision NOT NULL,
                "sps15m" double precision NOT NULL,
                "sps1h" double precision NOT NULL,
                CONSTRAINT "PK_pool_stats" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "user" (
                "address" character varying NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "authorised" bigint NOT NULL DEFAULT '0',
                "is_active" boolean NOT NULL DEFAULT true,
                "is_public" boolean NOT NULL DEFAULT true,
                CONSTRAINT "PK_user" PRIMARY KEY ("address")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "user_stats" (
                "id" SERIAL NOT NULL,
                "user_address" character varying NOT NULL,
                "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
                "hashrate1m" bigint NOT NULL DEFAULT '0',
                "hashrate5m" bigint NOT NULL DEFAULT '0',
                "hashrate1hr" bigint NOT NULL DEFAULT '0',
                "hashrate1d" bigint NOT NULL DEFAULT '0',
                "hashrate7d" bigint NOT NULL DEFAULT '0',
                "last_share" bigint NOT NULL DEFAULT '0',
                "worker_count" integer NOT NULL DEFAULT 0,
                "shares" bigint NOT NULL DEFAULT '0',
                "best_share" double precision NOT NULL DEFAULT 0,
                "best_ever" bigint NOT NULL DEFAULT '0',
                CONSTRAINT "PK_user_stats" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "worker" (
                "id" SERIAL NOT NULL,
                "name" character varying NOT NULL DEFAULT '',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "hashrate1m" bigint NOT NULL DEFAULT '0',
                "hashrate5m" bigint NOT NULL DEFAULT '0',
                "hashrate1hr" bigint NOT NULL DEFAULT '0',
                "hashrate1d" bigint NOT NULL DEFAULT '0',
                "hashrate7d" bigint NOT NULL DEFAULT '0',
                "last_update" TIMESTAMP NOT NULL DEFAULT now(),
                "shares" bigint NOT NULL DEFAULT '0',
                "best_share" double precision NOT NULL DEFAULT 0,
                "best_ever" bigint NOT NULL DEFAULT '0',
                "user_address" character varying NOT NULL,
                CONSTRAINT "PK_worker" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_worker_user_name" UNIQUE ("user_address", "name")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "worker_stats" (
                "id" SERIAL NOT NULL,
                "worker_id" integer NOT NULL,
                "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
                "hashrate1m" bigint NOT NULL DEFAULT '0',
                "hashrate5m" bigint NOT NULL DEFAULT '0',
                "hashrate1hr" bigint NOT NULL DEFAULT '0',
                "hashrate1d" bigint NOT NULL DEFAULT '0',
                "hashrate7d" bigint NOT NULL DEFAULT '0',
                "shares" bigint NOT NULL DEFAULT '0',
                "best_share" double precision NOT NULL DEFAULT 0,
                "best_ever" bigint NOT NULL DEFAULT '0',
                CONSTRAINT "PK_worker_stats" PRIMARY KEY ("id")
            )
        `);

        // Add foreign key constraints
        await queryRunner.query(`
            ALTER TABLE "user_stats"
            ADD CONSTRAINT "FK_user_stats_user"
            FOREIGN KEY ("user_address")
            REFERENCES "user"("address")
            ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE "worker"
            ADD CONSTRAINT "FK_worker_user"
            FOREIGN KEY ("user_address")
            REFERENCES "user"("address")
            ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE "worker_stats"
            ADD CONSTRAINT "FK_worker_stats_worker"
            FOREIGN KEY ("worker_id")
            REFERENCES "worker"("id")
            ON DELETE CASCADE
        `);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "IDX_pool_stats_timestamp" ON "pool_stats" ("timestamp")`);
        await queryRunner.query(`CREATE INDEX "IDX_user_is_active" ON "user" ("is_active")`);
        await queryRunner.query(`CREATE INDEX "IDX_user_is_public" ON "user" ("is_public")`);
        await queryRunner.query(`CREATE INDEX "IDX_user_stats_timestamp" ON "user_stats" ("timestamp")`);
        await queryRunner.query(`CREATE INDEX "IDX_user_stats_user_address" ON "user_stats" ("user_address")`);
        await queryRunner.query(`CREATE INDEX "IDX_worker_stats_timestamp" ON "worker_stats" ("timestamp")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_worker_stats_timestamp"`);
        await queryRunner.query(`DROP INDEX "IDX_user_stats_user_address"`);
        await queryRunner.query(`DROP INDEX "IDX_user_stats_timestamp"`);
        await queryRunner.query(`DROP INDEX "IDX_user_is_public"`);
        await queryRunner.query(`DROP INDEX "IDX_user_is_active"`);
        await queryRunner.query(`DROP INDEX "IDX_pool_stats_timestamp"`);

        // Drop foreign key constraints
        await queryRunner.query(`ALTER TABLE "worker_stats" DROP CONSTRAINT "FK_worker_stats_worker"`);
        await queryRunner.query(`ALTER TABLE "worker" DROP CONSTRAINT "FK_worker_user"`);
        await queryRunner.query(`ALTER TABLE "user_stats" DROP CONSTRAINT "FK_user_stats_user"`);

        // Drop tables
        await queryRunner.query(`DROP TABLE "worker_stats"`);
        await queryRunner.query(`DROP TABLE "worker"`);
        await queryRunner.query(`DROP TABLE "user_stats"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TABLE "pool_stats"`);
    }
} 