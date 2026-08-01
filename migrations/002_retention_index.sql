-- Retention expires RESOLVED posts a year after they were filed (open posts are
-- exempt via retain_days.exempt_when) and frees their photo bytes through
-- file_id_column. This index covers the runner's age scan plus the id it
-- deletes on, so the daily sweep does not table-scan the board.
CREATE INDEX IF NOT EXISTS app_lost_and_found__posts_retention_idx
  ON app_lost_and_found__posts (created_at, id);
