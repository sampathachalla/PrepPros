-- Promote carousel media out of the raw Bright Data JSON so it is directly queryable.
ALTER TABLE "social_posts"
ADD COLUMN "photos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "videos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX "social_posts_photos_idx" ON "social_posts" USING GIN ("photos");
CREATE INDEX "social_posts_videos_idx" ON "social_posts" USING GIN ("videos");

-- Bookmark text and ingredients are part of full bookmark search.
CREATE INDEX "bookmarks_notes_trgm_idx" ON "bookmarks" USING GIN ("notes" gin_trgm_ops);
CREATE INDEX "bookmarks_ingredients_idx" ON "bookmarks" USING GIN ("ingredients");
