-- Automation support for the `report_item` action.
--
-- `source_event_id` records which app event produced the row. The dispatcher's
-- dedupe guard matches on it (SELECT 1 FROM ... WHERE source_event_id = ?
-- LIMIT 1), so a redelivered event reuses the post already open instead of
-- reporting the same item twice.
--
-- Nullable on purpose: posts made by a person have no source event, and the
-- guard only ever looks for a specific non-null id.
ALTER TABLE app_lost_and_found__posts ADD COLUMN source_event_id TEXT;

CREATE INDEX IF NOT EXISTS app_lost_and_found__idx_posts_source_event_id
  ON app_lost_and_found__posts(source_event_id);
