import { describe, expect, it } from "vitest";
import { NOVEL_SEGMENTATION_VERSION } from "@ss/shared";
import {
  createNovelSourceManifest
} from "./source-manifest.js";

describe("source manifests", () => {
  it("normalizes only line endings for novel hashes", async () => {
    const lf = await createNovelSourceManifest({
      sourceId: "source-1",
      sourceKind: "pasted_text",
      title: "测试书",
      sourceText: "第一段。\n\n第二段。"
    });
    const crlf = await createNovelSourceManifest({
      sourceId: "source-1",
      sourceKind: "pasted_text",
      title: "测试书",
      sourceText: "第一段。\r\n\r\n第二段。"
    });
    const changedWhitespace = await createNovelSourceManifest({
      sourceId: "source-1",
      sourceKind: "pasted_text",
      title: "测试书",
      sourceText: " 第一段。\n\n第二段。"
    });

    expect(crlf.contentHash).toBe(lf.contentHash);
    expect(changedWhitespace.contentHash).not.toBe(lf.contentHash);
  });

  it("uses merged reading-unit count and the current segmentation version", async () => {
    const manifest = await createNovelSourceManifest({
      sourceId: "source-1",
      sourceKind: "file_import",
      sourceText: "第一段。\n\n第二段。\n\n第三段。"
    });

    expect(manifest.paragraphCount).toBe(1);
    expect(manifest.segmentationVersion).toBe(NOVEL_SEGMENTATION_VERSION);
    expect(manifest.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

});
