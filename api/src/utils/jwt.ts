import { createLocalJWKSet, createRemoteJWKSet, jwtVerify, type JSONWebKeySet } from 'jose';
import { z } from 'zod';
import { env } from '../config/env.js';

const issuer = `${env.SUPABASE_URL}/auth/v1`;

/** Supabase's public signing keys (fetched and cached by jose), or the inline set given to tests. */
const signingKeys = env.SUPABASE_JWKS
  ? createLocalJWKSet(JSON.parse(env.SUPABASE_JWKS) as JSONWebKeySet)
  : createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));

/** Returns the Supabase user id from a valid access token; throws if the token is invalid or expired. */
export async function verifyAccessToken(token: string): Promise<string> {
  const { payload } = await jwtVerify(token, signingKeys, {
    issuer,
    audience: 'authenticated',
    algorithms: ['ES256', 'RS256'],
  });
  return z.uuid().parse(payload.sub);
}
