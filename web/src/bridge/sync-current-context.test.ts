import { describe, expect, it, vi } from "vitest";
import { syncCurrentContext } from "./sync-current-context.js";

describe("syncCurrentContext", () => {
  it("sends the explicit content after updating model context", async () => {
    const calls: string[] = [];
    const update = vi.fn(async () => {
      calls.push("context");
      return true;
    });
    const send = vi.fn(async () => {
      calls.push("message");
    });

    const mode = await syncCurrentContext({
      context: { title: "Book", currentText: "current paragraph" },
      messagePrompt: "当前段落：current paragraph",
      updateModelContext: update,
      sendMessage: send
    });

    expect(mode).toBe("context");
    expect(calls).toEqual(["context", "message"]);
    expect(send).toHaveBeenCalledWith("当前段落：current paragraph", {
      scrollToBottom: false
    });
  });

  it("puts the current content in the message when model context is unavailable", async () => {
    const send = vi.fn();

    const mode = await syncCurrentContext({
      context: { title: "Book", currentText: "current paragraph" },
      messagePrompt: "请直接回应我的想法。",
      fallbackMessagePrompt: "《Book》第 2 段\n当前段落：current paragraph",
      updateModelContext: vi.fn().mockResolvedValue(false),
      sendMessage: send
    });

    expect(mode).toBe("message-fallback");
    expect(send).toHaveBeenCalledWith("《Book》第 2 段\n当前段落：current paragraph", {
      scrollToBottom: false
    });
  });

  it("does not expose fallback context when model context was updated", async () => {
    const send = vi.fn();

    await syncCurrentContext({
      context: { title: "Book", currentText: "private page context" },
      messagePrompt: "请直接回应我的想法。",
      fallbackMessagePrompt: "兼容资料：private page context",
      updateModelContext: vi.fn().mockResolvedValue(true),
      sendMessage: send
    });

    expect(send).toHaveBeenCalledWith("请直接回应我的想法。", {
      scrollToBottom: false
    });
  });

  it("can ask ChatGPT to reveal the follow-up message", async () => {
    const send = vi.fn();

    await syncCurrentContext({
      context: { title: "Book" },
      messagePrompt: "当前段落",
      updateModelContext: vi.fn().mockResolvedValue(true),
      sendMessage: send,
      scrollToBottom: true
    });

    expect(send).toHaveBeenCalledWith("当前段落", { scrollToBottom: true });
  });
});
