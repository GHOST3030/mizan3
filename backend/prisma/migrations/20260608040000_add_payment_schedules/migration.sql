CREATE TABLE "payment_schedules" (
    "id" TEXT NOT NULL,
    "sale_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "paid_amount" INTEGER NOT NULL DEFAULT 0,
    "due_date" TIMESTAMPTZ,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "payment_schedules_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "payment_schedules" ADD CONSTRAINT "payment_schedules_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
