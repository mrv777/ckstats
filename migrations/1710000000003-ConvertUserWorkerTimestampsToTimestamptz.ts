import { MigrationInterface, QueryRunner } from "typeorm";

export class ConvertUserWorkerTimestampsToTimestamptz1710000000003 implements MigrationInterface {
    name = 'ConvertUserWorkerTimestampsToTimestamptz1710000000003'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "User"
            ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ
            USING "createdAt" AT TIME ZONE 'UTC'
        `);

        await queryRunner.query(`
            ALTER TABLE "User"
            ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ
            USING "updatedAt" AT TIME ZONE 'UTC'
        `);

        await queryRunner.query(`
            ALTER TABLE "Worker"
            ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ
            USING "createdAt" AT TIME ZONE 'UTC'
        `);

        await queryRunner.query(`
            ALTER TABLE "Worker"
            ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ
            USING "updatedAt" AT TIME ZONE 'UTC'
        `);

        await queryRunner.query(`
            ALTER TABLE "Worker"
            ALTER COLUMN "lastUpdate" TYPE TIMESTAMPTZ
            USING "lastUpdate" AT TIME ZONE 'UTC'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "Worker"
            ALTER COLUMN "lastUpdate" TYPE TIMESTAMP
        `);

        await queryRunner.query(`
            ALTER TABLE "Worker"
            ALTER COLUMN "updatedAt" TYPE TIMESTAMP
        `);

        await queryRunner.query(`
            ALTER TABLE "Worker"
            ALTER COLUMN "createdAt" TYPE TIMESTAMP
        `);

        await queryRunner.query(`
            ALTER TABLE "User"
            ALTER COLUMN "updatedAt" TYPE TIMESTAMP
        `);

        await queryRunner.query(`
            ALTER TABLE "User"
            ALTER COLUMN "createdAt" TYPE TIMESTAMP
        `);
    }
}
