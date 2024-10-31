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

        // Add other table creation queries...
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "pool_stats"`);
        // Add other table drop queries...
    }
} 