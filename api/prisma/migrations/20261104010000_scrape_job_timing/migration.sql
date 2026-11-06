-- AlterTable
ALTER TABLE "scrape_jobs" ADD COLUMN     "enqueued_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "finished_at" TIMESTAMPTZ;

-- Jobs that already finished keep their real timing: created_at was when they joined the queue
UPDATE "scrape_jobs" SET "enqueued_at" = "created_at";
UPDATE "scrape_jobs" SET "finished_at" = "updated_at" WHERE "status" = 'done';
