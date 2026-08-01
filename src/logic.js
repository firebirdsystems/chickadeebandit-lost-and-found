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

export function canManage(post, currentMember) {
  return !!currentMember && (post.reported_by_id === currentMember.id || isAdult(currentMember));
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
