-- CreateEnum
CREATE TYPE "HouseholdRole" AS ENUM ('admin', 'member');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('breakfast', 'lunch', 'dinner', 'snacks');

-- CreateEnum
CREATE TYPE "MealDayStatus" AS ENUM ('draft', 'open', 'fixed');

-- CreateEnum
CREATE TYPE "PlannedDishStatus" AS ENUM ('approved', 'pending', 'declined');

-- CreateEnum
CREATE TYPE "PrepStatus" AS ENUM ('todo', 'in_progress', 'done');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar_color" VARCHAR(9),
ADD COLUMN     "display_name" VARCHAR(40);

-- CreateTable
CREATE TABLE "households" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(60) NOT NULL,
    "invite_code" VARCHAR(12) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "households_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "household_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "household_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "HouseholdRole" NOT NULL DEFAULT 'member',
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "household_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_days" (
    "household_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "status" "MealDayStatus" NOT NULL DEFAULT 'draft',
    "voting_ends_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_days_pkey" PRIMARY KEY ("household_id","date")
);

-- CreateTable
CREATE TABLE "planned_dishes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "household_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "meal" "MealType" NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "notes" TEXT,
    "image_url" TEXT,
    "recipe_id" UUID,
    "bookmark_id" UUID,
    "prep_minutes" INTEGER,
    "cook_minutes" INTEGER,
    "base_servings" INTEGER,
    "ingredients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "steps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_suggestion" BOOLEAN NOT NULL DEFAULT false,
    "status" "PlannedDishStatus" NOT NULL DEFAULT 'approved',
    "added_by_id" UUID,
    "prep_status" "PrepStatus" NOT NULL DEFAULT 'todo',
    "prep_assignee_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "planned_dishes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_responses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "household_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "meal" "MealType" NOT NULL,
    "user_id" UUID NOT NULL,
    "dish_id" UUID NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopping_checks" (
    "household_id" UUID NOT NULL,
    "week_start" DATE NOT NULL,
    "item_key" VARCHAR(200) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shopping_checks_pkey" PRIMARY KEY ("household_id","week_start","item_key")
);

-- CreateIndex
CREATE UNIQUE INDEX "households_invite_code_key" ON "households"("invite_code");

-- CreateIndex
CREATE UNIQUE INDEX "household_members_user_id_key" ON "household_members"("user_id");

-- CreateIndex
CREATE INDEX "household_members_household_id_idx" ON "household_members"("household_id");

-- CreateIndex
CREATE INDEX "meal_days_status_voting_ends_at_idx" ON "meal_days"("status", "voting_ends_at");

-- CreateIndex
CREATE INDEX "planned_dishes_household_id_date_idx" ON "planned_dishes"("household_id", "date");

-- CreateIndex
CREATE INDEX "meal_responses_dish_id_idx" ON "meal_responses"("dish_id");

-- CreateIndex
CREATE UNIQUE INDEX "meal_responses_household_id_date_meal_user_id_key" ON "meal_responses"("household_id", "date", "meal", "user_id");

-- AddForeignKey
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_days" ADD CONSTRAINT "meal_days_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_dishes" ADD CONSTRAINT "planned_dishes_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_dishes" ADD CONSTRAINT "planned_dishes_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_dishes" ADD CONSTRAINT "planned_dishes_bookmark_id_fkey" FOREIGN KEY ("bookmark_id") REFERENCES "bookmarks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_dishes" ADD CONSTRAINT "planned_dishes_added_by_id_fkey" FOREIGN KEY ("added_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "planned_dishes" ADD CONSTRAINT "planned_dishes_prep_assignee_id_fkey" FOREIGN KEY ("prep_assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_responses" ADD CONSTRAINT "meal_responses_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_responses" ADD CONSTRAINT "meal_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_responses" ADD CONSTRAINT "meal_responses_dish_id_fkey" FOREIGN KEY ("dish_id") REFERENCES "planned_dishes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopping_checks" ADD CONSTRAINT "shopping_checks_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

