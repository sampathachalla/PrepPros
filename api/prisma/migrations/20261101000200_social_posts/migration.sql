-- pgvector (embedding column) and pg_trgm (caption search index)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('instagram', 'youtube');

-- CreateEnum
CREATE TYPE "SocialContentType" AS ENUM ('reel', 'post', 'video', 'short');

-- CreateEnum
CREATE TYPE "ScrapeStatus" AS ENUM ('pending', 'ready', 'failed');

-- AlterTable
ALTER TABLE "bookmarks" ADD COLUMN     "social_post_id" UUID;

-- CreateTable
CREATE TABLE "social_posts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "platform" "SocialPlatform" NOT NULL,
    "content_type" "SocialContentType" NOT NULL,
    "shortcode" VARCHAR(64) NOT NULL,
    "url" TEXT NOT NULL,
    "external_id" VARCHAR(64),
    "author_username" VARCHAR(100),
    "author_profile_url" TEXT,
    "author_avatar_url" TEXT,
    "author_followers" INTEGER,
    "author_is_verified" BOOLEAN,
    "title" TEXT,
    "caption" TEXT,
    "transcript" TEXT,
    "transcript_language" VARCHAR(16),
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "thumbnail_url" TEXT,
    "video_url" TEXT,
    "duration_seconds" REAL,
    "likes_count" BIGINT,
    "comments_count" INTEGER,
    "views_count" BIGINT,
    "posted_at" TIMESTAMPTZ,
    "status" "ScrapeStatus" NOT NULL DEFAULT 'pending',
    "scrape_error" TEXT,
    "scraped_at" TIMESTAMPTZ,
    "raw" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_post_embeddings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "social_post_id" UUID NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "dimensions" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" vector NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_post_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "social_posts_author_username_idx" ON "social_posts"("author_username");

-- CreateIndex
CREATE INDEX "social_posts_posted_at_idx" ON "social_posts"("posted_at" DESC);

-- CreateIndex
CREATE INDEX "social_posts_hashtags_idx" ON "social_posts" USING GIN ("hashtags");

-- CreateIndex
CREATE INDEX "social_posts_raw_idx" ON "social_posts" USING GIN ("raw" jsonb_path_ops);

-- CreateIndex
CREATE INDEX "social_posts_caption_trgm_idx" ON "social_posts" USING GIN ("caption" gin_trgm_ops);

-- CreateIndex
CREATE UNIQUE INDEX "social_posts_platform_shortcode_key" ON "social_posts"("platform", "shortcode");

-- CreateIndex
CREATE INDEX "social_post_embeddings_model_idx" ON "social_post_embeddings"("model");

-- CreateIndex
CREATE UNIQUE INDEX "social_post_embeddings_social_post_id_model_key" ON "social_post_embeddings"("social_post_id", "model");

-- CreateIndex
CREATE INDEX "bookmarks_social_post_id_idx" ON "bookmarks"("social_post_id");

-- AddForeignKey
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_social_post_id_fkey" FOREIGN KEY ("social_post_id") REFERENCES "social_posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_post_embeddings" ADD CONSTRAINT "social_post_embeddings_social_post_id_fkey" FOREIGN KEY ("social_post_id") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Keep the stored dimension count honest (Prisma cannot model CHECK constraints)
ALTER TABLE "social_post_embeddings" ADD CONSTRAINT "social_post_embeddings_dimensions_check" CHECK (vector_dims("embedding") = "dimensions");
