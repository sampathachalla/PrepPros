import { randomUUID } from 'node:crypto';
import { importJWK, SignJWT } from 'jose';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import type { UserRole } from '../src/generated/prisma/client.js';
import { resetAuthRateLimits } from '../src/modules/auth/routes.js';
import { resetBookmarkRateLimits } from '../src/modules/bookmarks/routes.js';
import { resetChatRateLimits } from '../src/modules/chat/routes.js';
import { resetHouseholdRateLimits } from '../src/modules/household/routes.js';
import { resetChatTickets } from '../src/modules/chat/tickets.js';
import { getSupabasePool } from '../src/modules/supabaseSync/db.js';

export const api = () => request(createApp());

export async function resetDatabase() {
  resetAuthRateLimits();
  resetBookmarkRateLimits();
  resetHouseholdRateLimits();
  resetChatRateLimits();
  resetChatTickets();
  await prisma.$executeRawUnsafe(
    'TRUNCATE households, scrape_jobs, shared_links, social_post_embeddings, social_posts, bookmarks, recipe_steps, recipe_ingredients, recipes, research_sessions, users CASCADE',
  );
  await supabaseDb().query('TRUNCATE preppros.shared_links, preppros.social_posts');
}

/** The Supabase stand-in database used by the tests. */
export const supabaseDb = () => getSupabasePool()!;

const privateJwk = JSON.parse(process.env.TEST_SUPABASE_PRIVATE_JWK!);
const signingKey = importJWK(privateJwk, 'ES256');

/** An access token shaped like Supabase's, signed with the tests' key. */
export async function signAccessToken(userId: string, expiresIn = '1h') {
  return new SignJWT({ role: 'authenticated' })
    .setProtectedHeader({ alg: 'ES256', kid: privateJwk.kid })
    .setIssuer(`${process.env.SUPABASE_URL}/auth/v1`)
    .setAudience('authenticated')
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(await signingKey);
}

/** Creates a profile (as if signed up through Supabase) and returns its id and an `Authorization` header. */
export async function createUser(data: { email?: string; username?: string; role?: UserRole } = {}) {
  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      email: data.email ?? `${randomUUID()}@test.dev`,
      username: data.username,
      role: data.role,
      preferences: { create: {} },
    },
  });
  return { id: user.id, auth: `Bearer ${await signAccessToken(user.id)}` };
}

export function createCatalogRecipe(title = 'Catalog Chicken Bowl') {
  return prisma.recipe.create({
    data: {
      title,
      category: 'high_protein',
      prepTimeMinutes: 15,
      cookTimeMinutes: 20,
      servings: 4,
      difficulty: 'Easy',
      imageUrl: 'https://example.com/bowl.jpg',
      ingredients: {
        create: [
          { position: 0, name: 'Chicken breast', amount: '600g' },
          { position: 1, name: 'Quinoa' },
        ],
      },
      steps: { create: [{ stepNumber: 1, instruction: 'Cook everything.' }] },
    },
  });
}

/** A household with an admin and a member, joined the way the app does it. */
export async function createHousehold(name = 'The Achallas') {
  const admin = await createUser({ username: 'priya' });
  const member = await createUser({ username: 'ravi' });
  const created = await api().post('/household').set('Authorization', admin.auth).send({ name });
  await api().post('/household/join').set('Authorization', member.auth).send({ code: created.body.household.inviteCode });
  return { admin, member, inviteCode: created.body.household.inviteCode as string };
}

export { prisma };
