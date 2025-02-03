import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateTimestampColumns1710000000001 implements MigrationInterface {
    name = 'UpdateTimestampColumns1710000000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Convert existing timestamps to timestamptz
        await queryRunner.query(`
            ALTER TABLE "PoolStats" 
            ALTER COLUMN "timestamp" TYPE TIMESTAMPTZ 
            USING "timestamp" AT TIME ZONE 'UTC'
        `);

        await queryRunner.query(`
            ALTER TABLE "UserStats" 
            ALTER COLUMN "timestamp" TYPE TIMESTAMPTZ 
            USING "timestamp" AT TIME ZONE 'UTC'
        `);

        await queryRunner.query(`
            ALTER TABLE "WorkerStats" 
            ALTER COLUMN "timestamp" TYPE TIMESTAMPTZ 
            USING "timestamp" AT TIME ZONE 'UTC'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "PoolStats" 
            ALTER COLUMN "timestamp" TYPE TIMESTAMP
        `);

        await queryRunner.query(`
            ALTER TABLE "UserStats" 
            ALTER COLUMN "timestamp" TYPE TIMESTAMP
        `);

        await queryRunner.query(`
            ALTER TABLE "WorkerStats" 
            ALTER COLUMN "timestamp" TYPE TIMESTAMP
        `);
    }
} 