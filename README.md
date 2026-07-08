# Lost & Found

Post lost or found items — pets, keys, packages, bikes — with a photo and
last-known location. The app surfaces likely matches between open **lost** and
**found** posts (by category + shared keywords) and closes both out once an
item is claimed.

Built for HOAs, neighborhood associations, and shared houses.

---

## Access model

`app_lost_and_found__posts` uses the **`owner_or_visibility`** row policy
(`member_column: reported_by_id`, all posts `visibility: 'everyone'`):

- Everyone in the group can read every post.
- The reporter can always edit / resolve / delete **their own** post.
- Any **adult** (leadership/resident) can help — including closing a matched
  pair, which writes both owners' rows. The "Same item → close both" control is
  gated to adults to mirror the policy (a non-adult can't write another member's
  post).

Photos are stored via the hub file channel and deleted when a post is deleted.

## Quick start

```bash
npm run dev     # preview at http://localhost:3001
npm run build   # produce dist/bundle.json
npm test        # manifest + ai_access validation
```
