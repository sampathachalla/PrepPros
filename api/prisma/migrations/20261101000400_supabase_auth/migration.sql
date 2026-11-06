-- Supabase Auth now owns passwords and sessions
-- DropForeignKey
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_user_id_fkey";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "password_hash";

-- DropTable
DROP TABLE "refresh_tokens";

