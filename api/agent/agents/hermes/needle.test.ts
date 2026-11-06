import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cosineSimilarity, keywordScore, rankDocuments } from './needle.ts';

test('cosineSimilarity is 1 for parallel vectors and 0 for orthogonal or empty ones', () => {
  assert.equal(cosineSimilarity(new Float32Array([1, 2]), new Float32Array([2, 4])), 1);
  assert.equal(cosineSimilarity(new Float32Array([1, 0]), new Float32Array([0, 1])), 0);
  assert.equal(cosineSimilarity(new Float32Array([0, 0]), new Float32Array([1, 1])), 0);
});

test('keywordScore is the share of query words found in the text', () => {
  assert.equal(keywordScore('Chicken Bowl', 'grilled chicken quinoa bowl'), 1);
  assert.equal(keywordScore('chicken tacos', 'grilled chicken quinoa bowl'), 0.5);
  assert.equal(keywordScore('!!', 'anything'), 0);
});

test('rankDocuments falls back to keywords when the Needle model is missing (as outside the image)', async (t) => {
  t.mock.method(console, 'error', () => undefined);
  const ranked = await rankDocuments('overnight oats', [
    { key: 'a', text: 'Chicken bowl' },
    { key: 'b', text: 'Overnight oats with chia' },
  ]);
  assert.deepEqual(
    ranked.map((doc) => doc.key),
    ['b', 'a'],
  );
});
