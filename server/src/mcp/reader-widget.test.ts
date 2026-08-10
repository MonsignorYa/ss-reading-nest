import { describe, expect, it } from "vitest";
import { createReaderWidgetHtml } from "./reader-widget.js";

describe("reader widget assets", () => {
  it("returns a self-contained MCP document for native hosts", () => {
    const html = createReaderWidgetHtml("https://reader.example.com");

    expect(new TextEncoder().encode(html).byteLength).toBeGreaterThan(500_000);
    expect(html).toContain(`<script type="module" crossorigin>`);
    expect(html).toContain(`<style rel="stylesheet" crossorigin>`);
    expect(html).not.toContain("__SS_READING_NEST_ASSET_BASE__");
  });
});
