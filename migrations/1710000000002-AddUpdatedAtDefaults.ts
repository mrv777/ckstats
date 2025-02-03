import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUpdatedAtDefaults1710000000002 implements MigrationInterface {
    name = 'AddUpdatedAtDefaults1710000000002'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add default value to updatedAt columns
        await queryRunner.query(`
            ALTER TABLE "User" 
            ALTER COLUMN "updatedAt" SET DEFAULT now()
        `);

        await queryRunner.query(`
            ALTER TABLE "Worker" 
            ALTER COLUMN "updatedAt" SET DEFAULT now()
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "User" 
            ALTER COLUMN "updatedAt" DROP DEFAULT
        `);

        await queryRunner.query(`
            ALTER TABLE "Worker" 
            ALTER COLUMN "updatedAt" DROP DEFAULT
        `);
    }
} 