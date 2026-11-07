-- CreateEnum
CREATE TYPE "SlotPolicyStatus" AS ENUM ('available', 'reserved');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('draft', 'submitted', 'locked');

-- CreateEnum
CREATE TYPE "DraftSlotStatus" AS ENUM ('empty', 'draft', 'needs_review', 'ready');

-- CreateTable
CREATE TABLE "weekly_plans" (
    "household_id" UUID NOT NULL,
    "week_start" DATE NOT NULL,
    "submission_deadline" TIMESTAMPTZ,
    "published_version" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMPTZ,
    "has_unpublished_changes" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_plans_pkey" PRIMARY KEY ("household_id","week_start")
);

-- CreateTable
CREATE TABLE "meal_slot_policies" (
    "household_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "meal" "MealType" NOT NULL,
    "status" "SlotPolicyStatus" NOT NULL DEFAULT 'available',
    "updated_by_id" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_slot_policies_pkey" PRIMARY KEY ("household_id","date","meal")
);

-- CreateTable
CREATE TABLE "meal_proposals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "household_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "meal" "MealType" NOT NULL,
    "proposer_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_proposal_dishes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "proposal_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "dish_key" VARCHAR(200) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "image_url" TEXT,
    "recipe_id" UUID,
    "bookmark_id" UUID,
    "prep_minutes" INTEGER,
    "cook_minutes" INTEGER,
    "base_servings" INTEGER,
    "ingredients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "steps" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "meal_proposal_dishes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_slot_choices" (
    "household_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "meal" "MealType" NOT NULL,
    "user_id" UUID NOT NULL,
    "proposal_id" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_slot_choices_pkey" PRIMARY KEY ("household_id","date","meal","user_id")
);

-- CreateTable
CREATE TABLE "member_weekly_submissions" (
    "household_id" UUID NOT NULL,
    "week_start" DATE NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'draft',
    "submitted_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_weekly_submissions_pkey" PRIMARY KEY ("household_id","week_start","user_id")
);

-- CreateTable
CREATE TABLE "weekly_menu_draft_slots" (
    "household_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "meal" "MealType" NOT NULL,
    "status" "DraftSlotStatus" NOT NULL DEFAULT 'empty',
    "source_note" VARCHAR(200),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_menu_draft_slots_pkey" PRIMARY KEY ("household_id","date","meal")
);

-- CreateTable
CREATE TABLE "weekly_menu_draft_dishes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "household_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "meal" "MealType" NOT NULL,
    "position" INTEGER NOT NULL,
    "dish_key" VARCHAR(200) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "image_url" TEXT,
    "recipe_id" UUID,
    "bookmark_id" UUID,
    "prep_minutes" INTEGER,
    "cook_minutes" INTEGER,
    "base_servings" INTEGER,
    "ingredients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "steps" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "weekly_menu_draft_dishes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "meal_proposals_household_id_date_idx" ON "meal_proposals"("household_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "meal_proposals_household_id_date_meal_proposer_id_key" ON "meal_proposals"("household_id", "date", "meal", "proposer_id");

-- CreateIndex
CREATE INDEX "meal_proposal_dishes_proposal_id_position_idx" ON "meal_proposal_dishes"("proposal_id", "position");

-- CreateIndex
CREATE INDEX "member_slot_choices_proposal_id_idx" ON "member_slot_choices"("proposal_id");

-- CreateIndex
CREATE INDEX "weekly_menu_draft_dishes_household_id_date_meal_position_idx" ON "weekly_menu_draft_dishes"("household_id", "date", "meal", "position");

-- AddForeignKey
ALTER TABLE "weekly_plans" ADD CONSTRAINT "weekly_plans_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_slot_policies" ADD CONSTRAINT "meal_slot_policies_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_proposals" ADD CONSTRAINT "meal_proposals_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_proposals" ADD CONSTRAINT "meal_proposals_proposer_id_fkey" FOREIGN KEY ("proposer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_proposal_dishes" ADD CONSTRAINT "meal_proposal_dishes_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "meal_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_slot_choices" ADD CONSTRAINT "member_slot_choices_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_slot_choices" ADD CONSTRAINT "member_slot_choices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_slot_choices" ADD CONSTRAINT "member_slot_choices_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "meal_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_weekly_submissions" ADD CONSTRAINT "member_weekly_submissions_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_weekly_submissions" ADD CONSTRAINT "member_weekly_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_menu_draft_slots" ADD CONSTRAINT "weekly_menu_draft_slots_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_menu_draft_dishes" ADD CONSTRAINT "weekly_menu_draft_dishes_household_id_date_meal_fkey" FOREIGN KEY ("household_id", "date", "meal") REFERENCES "weekly_menu_draft_slots"("household_id", "date", "meal") ON DELETE CASCADE ON UPDATE CASCADE;
