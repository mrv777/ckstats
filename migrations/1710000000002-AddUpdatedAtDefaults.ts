import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUpdatedAtDefaults1710000000002 implements MigrationInterface {
    name = 'AddUpdatedAtDefaults1710000000002'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add default value to updatedAt columns
        await queryRunner.query(`
            ALTER TABLE "user" 
            ALTER COLUMN "updatedAt" SET DEFAULT now()
        `);

        await queryRunner.query(`
            ALTER TABLE "worker" 
            ALTER COLUMN "updatedAt" SET DEFAULT now()
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "user" 
            ALTER COLUMN "updatedAt" DROP DEFAULT
        `);

        await queryRunner.query(`
            ALTER TABLE "worker" 
            ALTER COLUMN "updatedAt" DROP DEFAULT
        `);
    }
} 