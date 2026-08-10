import { describe, expect, it } from "vitest";
import { buildSourceManifestObjectKey, buildSourceObjectKey } from "./source-object-keys.js";

describe("source object key helpers", () => {
  it("builds private source object keys", () => {
    expect(buildSourceObjectKey("source-abc")).toBe(
      "private/sources/source-abc/source.txt"
    );
    expect(buildSourceManifestObjectKey("source-abc")).toBe(
      "private/sources/source-abc/manifest.json"
    );
  });

  it("does not leak titles, hashes, original filenames, or source text snippets", () => {
    const key = buildSourceObjectKey("source-opaque");

    expect(key).not.toContain("My Book");
    expect(key).not.toContain("abcdef1234567890");
    expect(key).not.toContain("chapter-1.txt");
    expect(key).not.toContain("第一段正文");
  });

  it("rejects unsafe source ids", () => {
    for (const sourceId of ["", "source/abc", "../source", "source abc", "source\tabc"]) {
      expect(() => buildSourceObjectKey(sourceId)).toThrow();
    }
  });

});
