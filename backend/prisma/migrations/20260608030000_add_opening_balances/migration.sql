ALTER TABLE "customers" ADD COLUMN "opening_balance" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "customers" ADD COLUMN "opening_balance_date" TIMESTAMPTZ;

ALTER TABLE "suppliers" ADD COLUMN "opening_balance" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "suppliers" ADD COLUMN "opening_balance_date" TIMESTAMPTZ;
