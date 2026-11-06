import 'dotenv/config';
import { exportJWK, generateKeyPair } from 'jose';
import { defineConfig } from 'vitest/config';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testSupabaseDbUrl = process.env.TEST_SUPABASE_DB_URL;
if (!testDatabaseUrl || !testSupabaseDbUrl) {
  throw new Error('TEST_DATABASE_URL and TEST_SUPABASE_DB_URL must be set to run the tests (see .env.example)');
}

export default defineConfig(async () => {
  // Tests sign their own Supabase-style access tokens with this key; the API trusts its public half
  const { publicKey, privateKey } = await generateKeyPair('ES256', { extractable: true });
  const kid = 'test-key';
  const publicJwk = { ...(await exportJWK(publicKey)), kid, alg: 'ES256', use: 'sig' };
  const privateJwk = { ...(await exportJWK(privateKey)), kid, alg: 'ES256' };

  return {
    test: {
      include: ['tests/**/*.test.ts'],
      globalSetup: ['tests/globalSetup.ts'],
      // Test files share one database, so run them one at a time
      fileParallelism: false,
      env: {
        NODE_ENV: 'test',
        DATABASE_URL: testDatabaseUrl,
        AGENT_URL: 'http://agent.test',
        HERMES_API_KEY: 'test-hermes-api-key',
        AGENT_TOOLS_KEY: 'test-agent-tools-key-0123456789abcdef',
        BRIGHT_DATA_API_KEY: 'test-bright-data-key',
        YOUTUBE_API_KEY: 'test-youtube-key',
        SUPABASE_URL: 'https://test-project.supabase.co',
        SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
        SUPABASE_DB_URL: testSupabaseDbUrl,
        SUPABASE_JWKS: JSON.stringify({ keys: [publicJwk] }),
        // Blank so a developer's .env can't turn these on for the tests
        TEMP_USER_ID: '',
        SUPABASE_SECRET_KEY: '',
        TEST_SUPABASE_PRIVATE_JWK: JSON.stringify(privateJwk),
      },
    },
  };
});
