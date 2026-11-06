import { createNeedle } from 'cactus-needle';
import { config } from './config.ts';

type NeedleSession = Awaited<ReturnType<typeof createNeedle>>;

export type SearchDocument = { key: string; text: string };

let session: Promise<NeedleSession> | null = null;
/** Embeddings by document key and text, so an edited recipe is embedded again. */
const embeddingCache = new Map<string, Float32Array>();
const MAX_CACHED_EMBEDDINGS = 5_000;

function getSession() {
  session ??= createNeedle({ modelPath: config.needleModelPath, stateless: true }).catch((error: unknown) => {
    session = null;
    throw error;
  });
  return session;
}

async function embed(needle: NeedleSession, cacheKey: string, text: string) {
  const cached = embeddingCache.get(cacheKey);
  if (cached) return cached;

  const vector = await needle.embed(text);
  if (embeddingCache.size >= MAX_CACHED_EMBEDDINGS) embeddingCache.clear();
  embeddingCache.set(cacheKey, vector);
  return vector;
}

export function cosineSimilarity(a: Float32Array, b: Float32Array) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA && normB ? dot / Math.sqrt(normA * normB) : 0;
}

/** Share of the query's words found in the text; used when Needle can't be loaded. */
export function keywordScore(query: string, text: string) {
  const words = query.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  if (words.length === 0) return 0;
  const haystack = text.toLowerCase();
  return words.filter((word) => haystack.includes(word)).length / words.length;
}

/** How much exact word matches add to embedding similarity, so "breakfast" finds the breakfast recipes. */
const KEYWORD_WEIGHT = 0.3;

/**
 * Orders documents by how well they match the query, best first. Uses Needle 3 text embeddings,
 * which run locally in this container, plus a keyword boost; keywords alone if the model is unavailable.
 */
export async function rankDocuments(query: string, documents: SearchDocument[]) {
  let scores = documents.map((doc) => keywordScore(query, doc.text));
  try {
    const needle = await getSession();
    const queryVector = await needle.embed(query);
    const blended: number[] = [];
    for (const [index, doc] of documents.entries()) {
      const vector = await embed(needle, `${doc.key}\n${doc.text}`, doc.text);
      blended.push(cosineSimilarity(queryVector, vector) + KEYWORD_WEIGHT * scores[index]);
    }
    scores = blended;
  } catch (error) {
    console.error('Needle 3 is unavailable; ranking recipes by keywords instead:', error);
  }

  return documents
    .map((doc, index) => ({ key: doc.key, score: scores[index] }))
    .sort((a, b) => b.score - a.score);
}

/** Loads the model before the first search so the first chat reply isn't slowed by it. */
export function warmUp() {
  getSession().catch((error: unknown) => console.error('Could not load Needle 3:', error));
}
