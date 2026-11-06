-- Account facts copied from Supabase Auth, so they can be queried with the rest of the user
ALTER TABLE "users"
  ADD COLUMN "auth_provider" VARCHAR(30) NOT NULL DEFAULT 'email',
  ADD COLUMN "email_confirmed_at" TIMESTAMPTZ,
  ADD COLUMN "last_login_at" TIMESTAMPTZ;
