import { describe, expect, it } from "vitest";
import type { CommentLength, ReadingCommentMode } from "@ss/shared";
import { buildReadingCommentPrompt, normalizeCommentLength } from "./prompt-policy.js";

describe("normalizeCommentLength", () => {
  it.each([
    ["light_chat", "long", "normal"],
    ["reaction_only", "long", "normal"],
    ["cp_talk", "long", "normal"],
    ["plot_guess", "long", "normal"],
    ["deep_analysis", "long", "long"],
    ["diary_summary", "long", "long"]
  ] satisfies Array<[ReadingCommentMode, CommentLength, CommentLength]>)(
    "normalizes %s + %s to %s",
    (mode, requested, expected) => {
      expect(normalizeCommentLength(mode, requested)).toBe(expected);
    }
  );
});

const base = {
  sessionId: "session-1",
  title: "测试小说",
  position: { kind: "paragraph" as const, index: 12, label: "第 12 页" },
  source: "current_only" as const,
  operationId: "comment-op-1"
};

describe("buildReadingCommentPrompt", () => {
  it("builds light chat without the four-part review structure", () => {
    const prompt = buildReadingCommentPrompt({
      ...base,
      mode: "light_chat",
      length: "normal"
    });

    expect(prompt).toMatch(/轻松共读|轻松陪读/);
    expect(prompt).toContain("1-3");
    expect(prompt).toMatch(/吐槽|嗑点/);
    expect(prompt).toContain("不需要完整书评");
    expect(prompt).toContain("不需要逐项总结");
    expect(prompt).not.toMatch(/剧情变化.*人物变化.*伏笔猜测.*当前感受/s);
  });

  it("builds reaction-only danmaku guidance", () => {
    const prompt = buildReadingCommentPrompt({
      ...base,
      mode: "reaction_only",
      length: "short"
    });

    expect(prompt).toContain("弹幕");
    expect(prompt).toContain("1-5 句");
    expect(prompt).toContain("不总结剧情");
    expect(prompt).toContain("不分析结构");
  });

  it("builds relationship-focused cp talk guidance", () => {
    const prompt = buildReadingCommentPrompt({
      ...base,
      mode: "cp_talk",
      length: "normal"
    });

    expect(prompt).toMatch(/关系张力/);
    expect(prompt).toMatch(/暧昧/);
    expect(prompt).toMatch(/占有欲/);
    expect(prompt).toMatch(/互动反差/);
    expect(prompt).toMatch(/好嗑/);
    expect(prompt).toMatch(/少复述剧情/);
  });

  it("builds plot guessing with fact/speculation separation", () => {
    const prompt = buildReadingCommentPrompt({
      ...base,
      mode: "plot_guess",
      length: "normal"
    });

    expect(prompt).toMatch(/伏笔/);
    expect(prompt).toMatch(/隐藏信息/);
    expect(prompt).toMatch(/后续走向/);
    expect(prompt).toMatch(/原文事实.*猜测/s);
    expect(prompt).toMatch(/不详细总结/);
  });

  it("allows the full structure only for deep analysis", () => {
    const prompt = buildReadingCommentPrompt({
      ...base,
      mode: "deep_analysis",
      length: "long"
    });

    expect(prompt).toMatch(/剧情变化/);
    expect(prompt).toMatch(/人物变化/);
    expect(prompt).toMatch(/伏笔猜测/);
    expect(prompt).toMatch(/当前感受/);
    expect(prompt).toContain("直接在聊天区回复即可");
    expect(prompt).toContain("不要调用任何应用写回工具");
  });

  it("keeps diary summary separate from ordinary paragraph chat", () => {
    const prompt = buildReadingCommentPrompt({
      ...base,
      mode: "diary_summary",
      length: "normal"
    });

    expect(prompt).toMatch(/读书日记/);
    expect(prompt).toMatch(/不是普通段落点评/);
  });

  it("includes catch-up range metadata without restoring the old long-review instruction", () => {
    const prompt = buildReadingCommentPrompt({
      ...base,
      source: "catch_up_complete",
      mode: "light_chat",
      length: "normal",
      syncedRange: { start: 3, end: 12 }
    });

    expect(prompt).toContain("补课已确认完成");
    expect(prompt).toContain("第 3-12 页");
    expect(prompt).toContain("直接在聊天区回复即可");
    expect(prompt).not.toMatch(/总结这段区间的剧情变化/);
  });
});
