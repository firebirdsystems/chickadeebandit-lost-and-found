SELECT
  id,
  kind,
  title,
  category,
  location,
  reported_by_name,
  created_at
FROM app_lost_and_found__posts
WHERE status = 'open'
ORDER BY created_at DESC
LIMIT 500
