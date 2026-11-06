import { createApp } from './app.js';
import { prisma } from './config/db.js';
import { env } from './config/env.js';
import { startSupabaseBackup, stopSupabaseBackup } from './modules/supabaseBackup/service.js';
import { startScrapeWorker, stopScrapeWorker } from './modules/scrapeQueue/service.js';
import { closeSupabasePool } from './modules/supabaseSync/db.js';
import { startSupabaseSync, stopSupabaseSync } from './modules/supabaseSync/service.js';

/** Bookmarks belong to a user row, so the temporary user has to exist. */
async function prepareTempUser() {
  if (!env.TEMP_USER_ID) return;
  console.warn(`TEMP_USER_ID is set: bookmark requests with no token act as user ${env.TEMP_USER_ID}`);
  await prisma.user.upsert({
    where: { id: env.TEMP_USER_ID },
    create: { id: env.TEMP_USER_ID, email: `temp-${env.TEMP_USER_ID}@preppros.local` },
    update: {},
  });
}

const server = createApp().listen(env.PORT, '0.0.0.0', () => {
  console.log(`PrepPros API listening on port ${env.PORT}`);
  void prepareTempUser()
    .catch((error) => console.error('Could not prepare TEMP_USER_ID', error))
    .then(() => {
      startScrapeWorker();
      startSupabaseBackup();
      return startSupabaseSync();
    });
});

async function shutdown() {
  server.close();
  stopSupabaseSync();
  stopSupabaseBackup();
  await stopScrapeWorker();
  await Promise.all([prisma.$disconnect(), closeSupabasePool()]);
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
