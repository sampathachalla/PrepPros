-- CreateEnum
CREATE TYPE "ScrapeJobStatus" AS ENUM ('queued', 'running', 'done', 'failed');

-- AlterTable
ALTER TABLE "bookmarks" ALTER COLUMN "category" DROP NOT NULL,
ADD COLUMN     "awaiting_content" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "social_posts" ADD COLUMN     "supabase_backed_up_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "shared_links" ADD COLUMN     "supabase_backed_up_at" TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "scrape_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "social_post_id" UUID NOT NULL,
    "status" "ScrapeJobStatus" NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "run_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_until" TIMESTAMPTZ,
    "snapshot_id" VARCHAR(64),
    "snapshot_started_at" TIMESTAMPTZ,
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scrape_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scrape_jobs_social_post_id_key" ON "scrape_jobs"("social_post_id");

-- CreateIndex
CREATE INDEX "scrape_jobs_status_run_at_idx" ON "scrape_jobs"("status", "run_at");

-- CreateIndex
CREATE INDEX "social_posts_supabase_backed_up_at_idx" ON "social_posts"("supabase_backed_up_at");

-- CreateIndex
CREATE INDEX "shared_links_supabase_backed_up_at_idx" ON "shared_links"("supabase_backed_up_at");

-- AddForeignKey
ALTER TABLE "scrape_jobs" ADD CONSTRAINT "scrape_jobs_social_post_id_fkey" FOREIGN KEY ("social_post_id") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
