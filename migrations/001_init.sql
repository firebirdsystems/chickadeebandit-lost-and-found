-- Lost & Found — community board of lost and found item posts.
-- Posts are public to the whole group (visibility 'everyone'); the owner
-- (reporter) can always edit/close their own post, and any adult can help
-- close out a matched pair. Enforced by the `posts` owner_or_visibility policy
-- in manifest.json. `status`, `type`/`category`, and `visibility` are all on the
-- encryption skip-list so they can be filtered in SQL.
CREATE TABLE IF NOT EXISTS app_lost_and_found__posts (
  id               TEXT PRIMARY KEY,
  kind             TEXT NOT NULL DEFAULT 'lost',   -- 'lost' | 'found'
  title            TEXT NOT NULL,
  category         TEXT NOT NULL DEFAULT 'other',  -- 'pet' | 'keys' | 'package' | 'bike' | 'wallet' | 'other'
  description      TEXT DEFAULT '',
  location         TEXT DEFAULT '',
  photo_file_id    TEXT DEFAULT '',
  visibility       TEXT NOT NULL DEFAULT 'everyone',
  status           TEXT NOT NULL DEFAULT 'open',    -- 'open' | 'resolved'
  matched_post_id  TEXT DEFAULT '',
  reported_by_id   TEXT NOT NULL,
  reported_by_name TEXT NOT NULL,
  created_at       TEXT NOT NULL,
  resolved_at      TEXT
);

CREATE INDEX IF NOT EXISTS app_lost_and_found__posts_status_idx
  ON app_lost_and_found__posts (status, kind, created_at);
CREATE INDEX IF NOT EXISTS app_lost_and_found__posts_category_idx
  ON app_lost_and_found__posts (category, status);
