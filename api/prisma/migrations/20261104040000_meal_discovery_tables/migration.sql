-- CreateTable
CREATE TABLE "suggested_meals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "reason" TEXT,
    "score" REAL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suggested_meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liked_meals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "recipe_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "liked_meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_media_meals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "social_post_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_media_meals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "suggested_meals_user_id_recipe_id_key" ON "suggested_meals"("user_id", "recipe_id");
CREATE INDEX "suggested_meals_user_id_score_idx" ON "suggested_meals"("user_id", "score" DESC);

CREATE UNIQUE INDEX "liked_meals_user_id_recipe_id_key" ON "liked_meals"("user_id", "recipe_id");
CREATE INDEX "liked_meals_user_id_created_at_idx" ON "liked_meals"("user_id", "created_at" DESC);

CREATE UNIQUE INDEX "social_media_meals_user_id_social_post_id_key" ON "social_media_meals"("user_id", "social_post_id");
CREATE INDEX "social_media_meals_user_id_created_at_idx" ON "social_media_meals"("user_id", "created_at" DESC);
CREATE INDEX "social_media_meals_social_post_id_idx" ON "social_media_meals"("social_post_id");

-- AddForeignKey
ALTER TABLE "suggested_meals" ADD CONSTRAINT "suggested_meals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "suggested_meals" ADD CONSTRAINT "suggested_meals_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "liked_meals" ADD CONSTRAINT "liked_meals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "liked_meals" ADD CONSTRAINT "liked_meals_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "social_media_meals" ADD CONSTRAINT "social_media_meals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "social_media_meals" ADD CONSTRAINT "social_media_meals_social_post_id_fkey" FOREIGN KEY ("social_post_id") REFERENCES "social_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
