-- Links users give the app (shared or pasted) and what was read from them.
-- Instagram posts keep their full extracted content; YouTube videos keep the link only.
-- Kept outside the `public` schema so Supabase's REST API never exposes it, with row level security
-- on as a second guard; the PrepPros API writes through a direct database connection.
CREATE SCHEMA IF NOT EXISTS preppros;

CREATE TABLE preppros.social_posts (
    id                 UUID PRIMARY KEY,
    platform           TEXT NOT NULL CHECK (platform IN ('instagram', 'youtube')),
    content_type       TEXT NOT NULL,
    shortcode          VARCHAR(64) NOT NULL,
    url                TEXT NOT NULL,
    status             TEXT NOT NULL,
    scrape_error       TEXT,
    scraped_at         TIMESTAMPTZ,
    -- Extracted content: filled for Instagram, always empty for YouTube
    external_id        VARCHAR(64),
    author_username    VARCHAR(100),
    author_profile_url TEXT,
    author_avatar_url  TEXT,
    author_followers   INTEGER,
    author_is_verified BOOLEAN,
    caption            TEXT,
    hashtags           TEXT[] NOT NULL DEFAULT '{}',
    thumbnail_url      TEXT,
    video_url          TEXT,
    duration_seconds   REAL,
    likes_count        BIGINT,
    comments_count     INTEGER,
    views_count        BIGINT,
    posted_at          TIMESTAMPTZ,
    raw                JSONB,
    created_at         TIMESTAMPTZ NOT NULL,
    updated_at         TIMESTAMPTZ NOT NULL,
    synced_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (platform, shortcode)
);

CREATE INDEX social_posts_hashtags_idx ON preppros.social_posts USING GIN (hashtags);
CREATE INDEX social_posts_author_username_idx ON preppros.social_posts (author_username);

CREATE TABLE preppros.shared_links (
    id              UUID PRIMARY KEY,
    -- Supabase Auth user id
    user_id         UUID NOT NULL,
    social_post_id  UUID NOT NULL REFERENCES preppros.social_posts (id) ON DELETE CASCADE ON UPDATE CASCADE,
    url             TEXT NOT NULL,
    via             TEXT NOT NULL CHECK (via IN ('share', 'paste')),
    share_count     INTEGER NOT NULL,
    first_shared_at TIMESTAMPTZ NOT NULL,
    last_shared_at  TIMESTAMPTZ NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL,
    synced_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, social_post_id)
);

CREATE INDEX shared_links_social_post_id_idx ON preppros.shared_links (social_post_id);

ALTER TABLE preppros.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE preppros.shared_links ENABLE ROW LEVEL SECURITY;
