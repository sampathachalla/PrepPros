-- CreateEnum
CREATE TYPE "LinkShareMethod" AS ENUM ('share', 'paste');

-- AlterTable
ALTER TABLE "social_posts" ADD COLUMN     "supabase_synced_at" TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "shared_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "social_post_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "via" "LinkShareMethod" NOT NULL DEFAULT 'paste',
    "share_count" INTEGER NOT NULL DEFAULT 1,
    "first_shared_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_shared_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supabase_synced_at" TIMESTAMPTZ,

    CONSTRAINT "shared_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shared_links_supabase_synced_at_idx" ON "shared_links"("supabase_synced_at");

-- CreateIndex
CREATE UNIQUE INDEX "shared_links_user_id_social_post_id_key" ON "shared_links"("user_id", "social_post_id");

-- CreateIndex
CREATE INDEX "social_posts_supabase_synced_at_idx" ON "social_posts"("supabase_synced_at");

-- AddForeignKey
ALTER TABLE "shared_links" ADD CONSTRAINT "shared_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_links" ADD CONSTRAINT "shared_links_social_post_id_fkey" FOREIGN KEY ("social_post_id") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

