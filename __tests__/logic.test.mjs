import { describe, it, expect } from "vitest";
import {
  CATEGORIES, CAT_LABEL, fmtDate, canManage, supervisesPosts, tokens, matchesFor, searchableFields,
  shownPhotoId, tilePhotoId, cutoutRefusal,
} from "../src/logic.js";

describe("fmtDate", () => {
  it("empty for falsy, formatted otherwise", () => {
    expect(fmtDate("")).toBe("");
    expect(fmtDate("2026-07-08T12:00:00Z")).toMatch(/Jul/);
  });
});

describe("canManage", () => {
  it("the reporter can manage their post", () => {
    expect(canManage({ reported_by_id: "m1" }, { id: "m1", role: "child" })).toBe(true);
  });
  it("adults can manage any post", () => {
    expect(canManage({ reported_by_id: "x" }, { id: "m2", role: "adult" })).toBe(true);
  });
  it("others cannot", () => {
    expect(canManage({ reported_by_id: "x" }, { id: "m2", role: "child" })).toBe(false);
    expect(canManage({ reported_by_id: "x" }, null)).toBe(false);
  });
});

describe("in a shared space", () => {
  const space = { tenantKind: "shared_space", isAdmin: false };
  const steward = { tenantKind: "shared_space", isAdmin: true };
  it("an adult taking part cannot manage someone else's post, and can still manage their own", () => {
    expect(canManage({ reported_by_id: "x" }, { id: "m2", role: "adult" }, space)).toBe(false);
    expect(canManage({ reported_by_id: "m2" }, { id: "m2", role: "adult" }, space)).toBe(true);
  });
  it("the steward can manage any post", () => {
    expect(canManage({ reported_by_id: "x" }, { id: "m2", role: "adult" }, steward)).toBe(true);
    expect(supervisesPosts({ id: "m2", role: "adult" }, steward)).toBe(true);
  });
  it("a household is the default, where any adult supervises", () => {
    expect(supervisesPosts({ id: "m2", role: "adult" })).toBe(true);
    expect(supervisesPosts({ id: "m2", role: "child" })).toBe(false);
    expect(supervisesPosts({ id: "m2", role: "child" }, { tenantKind: "household", isAdmin: true })).toBe(false);
  });
});

describe("tokens", () => {
  it("keeps meaningful words, drops stopwords and short words", () => {
    const t = tokens({ title: "Lost black wallet", description: "near the park" });
    expect(t.has("black")).toBe(true);
    expect(t.has("wallet")).toBe(true);
    expect(t.has("park")).toBe(true);
    expect(t.has("lost")).toBe(false); // stopword
    expect(t.has("the")).toBe(false);  // stopword
  });
});

describe("matchesFor", () => {
  const posts = [
    { id: "found-wallet", status: "open", kind: "found", category: "wallet", title: "Found black wallet", description: "brown leather" },
    { id: "found-keys", status: "open", kind: "found", category: "keys", title: "Found keys", description: "silver ring" },
    { id: "lost-other", status: "open", kind: "lost", category: "wallet", title: "Lost wallet", description: "" },
    { id: "found-closed", status: "resolved", kind: "found", category: "wallet", title: "wallet", description: "" },
  ];
  it("returns nothing for non-open posts", () => {
    expect(matchesFor({ status: "resolved", kind: "lost", category: "wallet", title: "x", description: "" }, posts)).toEqual([]);
  });
  it("suggests opposite-kind posts sharing category/keywords, best first", () => {
    const post = { status: "open", kind: "lost", category: "wallet", title: "Lost black wallet", description: "" };
    const out = matchesFor(post, posts).map(p => p.id);
    expect(out[0]).toBe("found-wallet"); // shares category + "wallet"/"black"
    expect(out).not.toContain("lost-other");   // same kind
    expect(out).not.toContain("found-closed");  // resolved
  });
});

describe("constants", () => {
  it("labels every category", () => {
    for (const c of CATEGORIES) expect(CAT_LABEL[c]).toBeTruthy();
  });
});

describe("searchableFields", () => {
  it("matches on where a thing was lost and how it was described", () => {
    const fields = searchableFields({
      title: "Wallet", description: "black leather, cards inside",
      location: "by the tennis courts", category: "wallet", reported_by_name: "Sam",
    });
    expect(fields).toContain("by the tennis courts");
    expect(fields).toContain("black leather, cards inside");
  });
});

describe("shownPhotoId", () => {
  it("draws the cutout when the post has one, else the photo as taken", () => {
    expect(shownPhotoId({ photo_file_id: "p1", cutout_file_id: "c1" })).toBe("c1");
    expect(shownPhotoId({ photo_file_id: "p1", cutout_file_id: null })).toBe("p1");
    expect(shownPhotoId({ photo_file_id: "p1" })).toBe("p1");
    expect(shownPhotoId({ photo_file_id: "" })).toBe("");
  });
});

describe("cutoutRefusal", () => {
  it("tells the monthly allowance apart from the per-minute limit", () => {
    expect(cutoutRefusal(429, { limit: 100 })).toBe("This month's 100 photo cutouts are used up. The photo is kept as taken.");
    expect(cutoutRefusal(429, { error: "Too many requests" })).toBe("Too many requests just now. Try again in a minute.");
    expect(cutoutRefusal(429)).toBe("Too many requests just now. Try again in a minute.");
  });
  it("says why for each refusal the hub can give", () => {
    expect(cutoutRefusal(409)).toMatch(/already being removed/);
    expect(cutoutRefusal(402)).toMatch(/active plan/);
    expect(cutoutRefusal(503)).toMatch(/unavailable right now/);
    expect(cutoutRefusal(413)).toMatch(/too large/);
    expect(cutoutRefusal(415)).toMatch(/JPEG, PNG or WebP/);
    expect(cutoutRefusal(507)).toMatch(/no storage left/);
  });
  it("falls back to a plain sentence for anything else", () => {
    expect(cutoutRefusal(500)).toBe("The background could not be removed.");
    expect(cutoutRefusal(undefined)).toBe("The background could not be removed.");
  });
});

describe("tilePhotoId", () => {
  it("draws the small copy of the picture shown, else that picture", () => {
    expect(tilePhotoId({ photo_file_id: "p1", thumb_file_id: "t1", cutout_file_id: "c1", cutout_thumb_file_id: "ct1" })).toBe("ct1");
    expect(tilePhotoId({ photo_file_id: "p1", thumb_file_id: "t1", cutout_file_id: null })).toBe("t1");
    expect(tilePhotoId({ photo_file_id: "p1", thumb_file_id: null })).toBe("p1");
    expect(tilePhotoId({ photo_file_id: "p1" })).toBe("p1");
    expect(tilePhotoId(null)).toBe("");
  });
  it("never shows the photo's small copy for a cutout", () => {
    // A cutout with no small copy of its own is drawn whole.
    expect(tilePhotoId({ photo_file_id: "p1", thumb_file_id: "t1", cutout_file_id: "c1", cutout_thumb_file_id: null })).toBe("c1");
    expect(tilePhotoId({ photo_file_id: "p1", thumb_file_id: "t1", cutout_file_id: "c1" })).toBe("c1");
  });
});
