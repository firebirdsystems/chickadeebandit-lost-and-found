// Pure, testable logic extracted from index.html.
// No DOM, no network — safe to import from Node for unit tests.

import { isAdult } from "./shared.js";
export { isAdult };

export const CATEGORIES = ["pet", "keys", "package", "bike", "wallet", "other"];
export const CAT_LABEL = { pet: "Pet", keys: "Keys", package: "Package", bike: "Bike", wallet: "Wallet", other: "Other" };

export function fmtDate(v) {
  if (!v) return "";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(v));
}

/**
 * Whether a member may write a post someone else reported. Mirrors the hub's
 * rule for the posts table (owner_or_visibility): any adult in a household,
 * and only the steward in a shared space. An adult who merely takes part in a
 * space is refused, so a button offered to them would change nothing.
 */
export function supervisesPosts(member, { tenantKind = "household", isAdmin = false } = {}) {
  return tenantKind === "household" ? isAdult(member) : isAdmin === true;
}

export function canManage(post, currentMember, tenant) {
  return !!currentMember && (post.reported_by_id === currentMember.id || supervisesPosts(currentMember, tenant));
}

const STOP = new Set(["the", "a", "an", "of", "and", "near", "by", "my", "our", "lost", "found", "set", "pair", "some", "at", "in", "on", "to"]);

export function tokens(post) {
  return new Set(`${post.title} ${post.description}`.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w => w.length > 2 && !STOP.has(w)));
}

// Suggest opposite-kind open posts that share a category or keywords.
export function matchesFor(post, posts) {
  if (post.status !== "open") return [];
  const opp = post.kind === "lost" ? "found" : "lost";
  const mine = tokens(post);
  return posts
    .filter(p => p.status === "open" && p.kind === opp)
    .map(p => {
      const theirs = tokens(p);
      let overlap = 0;
      for (const w of mine) if (theirs.has(w)) overlap++;
      const score = (p.category === post.category ? 2 : 0) + overlap;
      return { post: p, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(x => x.post);
}

/**
 * Fields the in-app search matches against (see hub-sdk `searchMatch`).
 * Location and description both count: a lost item is described from
 * memory ("black wallet, near the tennis courts"), rarely by whatever
 * title the person who found it happened to type.
 */
export function searchableFields(item) {
  return [item.title, item.description, item.location, item.category, item.reported_by_name];
}

/** The picture to draw for a post: its cutout when it has one, else the photo as taken. */
export function shownPhotoId(post) {
  return post?.cutout_file_id || post?.photo_file_id || "";
}

/**
 * What to tell someone whose request to remove a photo's background was
 * refused. `status` is the hub's HTTP status and `detail` its reply.
 *
 * A 429 is two different refusals: with a `limit` in the reply it is the
 * household's monthly allowance, without one it is the hub's per-minute limit.
 */
export function cutoutRefusal(status, detail = null) {
  if (status === 429 && typeof detail?.limit === "number") {
    return `This month's ${detail.limit} photo cutouts are used up. The photo is kept as taken.`;
  }
  if (status === 429) return "Too many requests just now. Try again in a minute.";
  if (status === 409) return "The background is already being removed. Try again in a few seconds.";
  if (status === 402) return "Removing photo backgrounds needs an active plan.";
  if (status === 503) return "Removing photo backgrounds is unavailable right now. Try again later.";
  if (status === 413) return "That photo is too large to remove the background from.";
  if (status === 415) return "The background can only be removed from a JPEG, PNG or WebP photo.";
  if (status === 507) return "There is no storage left for a photo with its background removed.";
  return "The background could not be removed.";
}

/**
 * The picture to draw where it is shown small: the small copy of whichever
 * picture is shown, else that picture itself. A cutout's small copy and the
 * photo's are different pictures, so neither stands in for the other.
 */
export function tilePhotoId(row) {
  if (row?.cutout_file_id) return row.cutout_thumb_file_id || row.cutout_file_id;
  return row?.thumb_file_id || row?.photo_file_id || "";
}

/**
 * Whether a failed write may nonetheless have been stored ("retry after a lost
 * response"). No status: the request threw before any answer. A 400: the hub's
 * answer for a write that timed out after it may have been stored, and for a
 * retry that met the first try's row under its pinned id (UNIQUE_CONSTRAINT).
 * A 5xx other than 507: the hub failing on its side, possibly after the write.
 * Anything else (403, 404, 409, 413, 415, 429, 507) is a refusal that stored
 * nothing — the only case in which an upload made for the row may be deleted.
 */
export function outcomeUnknown(e) {
  if (e?.code === "UNIQUE_CONSTRAINT" || /UNIQUE constraint failed/i.test(String(e?.message ?? ""))) return true;
  const status = Number(e?.status) || 0;
  // Up to 400: no answer, a 2xx whose body could not be read as a result, or a 400.
  return status <= 400 || (status >= 500 && status !== 507);
}

/**
 * The line a failed write shows ("Refused, gone, or failed" in the app-template
 * guide): "try again" only when retrying can work, and never the hub's text.
 * `thing` and `action` are the app's own nouns. `found` is the caller's re-read
 * after a write that changed nothing: false = the row is gone, true = it is
 * still there (on a plain `WHERE id = ?` write the row policy narrowed it, the
 * permission line; on a `guarded` write its state moved), null = the re-read
 * itself failed. A `forUser` error keeps the message the app wrote for it.
 */
export function failureLine(e, { action, thing, found, guarded = false } = {}) {
  if (e?.forUser) return e.message;
  if (e?.code === "UNIQUE_CONSTRAINT" || /UNIQUE constraint failed/i.test(String(e?.message ?? ""))) return `That ${thing} already exists.`;
  if (e?.status === 403 || (found === true && !guarded)) return `You don’t have permission to ${action}.`;
  if (e?.status === 507) return "The household’s storage is full — free up space first.";
  if (e?.status === 429) return "Too many tries — wait a minute and try again.";
  if (found === null) return `Couldn’t ${action} — try again.`;
  if (found === false || (found === undefined && e?.status === 404)) return `This ${thing} has been removed.`;
  if (found === true || e?.status === 409) return `This ${thing} was changed by someone else — check it first.`;
  return `Couldn’t ${action} — try again.`;
}

/**
 * The line a failed upload shows. The hub's two refusals of the file itself get
 * a line of their own: 413 too large, 415 a type it does not take. The rest
 * (403, 429, 507, no answer or a 5xx) follows `failureLine`.
 */
export function uploadFailureLine(e, words) {
  if (e?.status === 413) return "That file is too large.";
  if (e?.status === 415) return "That kind of file can’t be uploaded.";
  return failureLine(e, words);
}
