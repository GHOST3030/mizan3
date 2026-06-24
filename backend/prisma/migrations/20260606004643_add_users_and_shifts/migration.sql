-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'inventory_manager';

-- AlterTable
ALTER TABLE "shifts" ALTER COLUMN "opened_at" SET DEFAULT CURRENT_TIMESTAMP;
