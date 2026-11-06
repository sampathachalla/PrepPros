-- Existing Instagram records already contain these arrays in raw JSONB. Promote them too.
UPDATE "social_posts"
SET "photos" = ARRAY(
  SELECT jsonb_array_elements_text("raw"->'photos')
)
WHERE "platform" = 'instagram'
  AND "raw" IS NOT NULL
  AND jsonb_typeof("raw"->'photos') = 'array'
  AND cardinality("photos") = 0;

UPDATE "social_posts"
SET "videos" = ARRAY(
  SELECT jsonb_array_elements_text("raw"->'videos')
)
WHERE "platform" = 'instagram'
  AND "raw" IS NOT NULL
  AND jsonb_typeof("raw"->'videos') = 'array'
  AND cardinality("videos") = 0;
