import { describe, it, expect } from "vitest";
import { CATEGORIES, CAT_LABEL, fmtDate, canManage, tokens, matchesFor, searchableFields } from "../src/logic.js";

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
