import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SESSION_PREFERENCES } from "@ss/shared";
import { BookManagementSheet } from "./BookManagementSheet.js";

const bundle = {
  session: {
    id: "book-a",
    title: "管理测试书",
    type: "novel" as const,
    status: "active" as const,
    userCurrentPosition: { kind: "paragraph" as const, index: 6, label: "第 6 段" },
    assistantSyncedPosition: null,
    liveReadingEnabled: false,
    sessionPreferences: DEFAULT_SESSION_PREFERENCES,
    sourceManifest: null,
    createdAt: "2026-06-22T00:00:00.000Z",
    updatedAt: "2026-06-23T00:00:00.000Z",
    lastReadAt: "2026-06-23T00:00:00.000Z"
  },
  quotes: [{ id: "q", sessionId: "book-a", content: "摘录内容", position: { kind: "paragraph" as const, index: 2, label: "第 2 段" }, createdAt: "2026-06-23T00:00:00.000Z" }],
  reactions: [{ id: "r", sessionId: "book-a", content: "用户反应", position: { kind: "paragraph" as const, index: 3, label: "第 3 段" }, speaker: "user" as const, createdAt: "2026-06-23T00:00:00.000Z" }],
  bookmarks: [{ id: "b", sessionId: "book-a", position: { kind: "paragraph" as const, index: 4, label: "第 4 段" }, label: "书签标签", createdAt: "2026-06-23T00:00:00.000Z" }]
};

describe("BookManagementSheet", () => {
  it("supports rename, status toggle, and lightweight record tabs", () => {
    const onRename = vi.fn();
    const onStatus = vi.fn();
    render(
      <BookManagementSheet
        bundle={bundle}
        onRename={onRename}
        onStatus={onStatus}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText("新的书名"), { target: { value: "新书名" } });
    fireEvent.click(screen.getByRole("button", { name: "保存新书名" }));
    expect(onRename).toHaveBeenCalledWith("新书名");
    fireEvent.click(screen.getByRole("button", { name: "标记为已完成" }));
    expect(onStatus).toHaveBeenCalledWith("completed");

    fireEvent.click(screen.getByRole("button", { name: "摘录" }));
    expect(screen.getByText("摘录内容")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "用户反应" }));
    expect(screen.getAllByText("用户反应")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "书签" }));
    expect(screen.getByText("书签标签")).toBeInTheDocument();
  });

  it("requires two delete confirmations", () => {
    const onDelete = vi.fn();
    render(
      <BookManagementSheet bundle={bundle} onRename={vi.fn()} onStatus={vi.fn()} onDelete={onDelete} onClose={vi.fn()} />
    );

    fireEvent.click(screen.getByRole("button", { name: "删除这本书" }));
    expect(screen.getByText("删除这本书的云端阅读记录")).toBeInTheDocument();
    expect(screen.getByText(/会从书架移除这本书/)).toBeInTheDocument();
    const cloudCheckbox = screen.getByRole("checkbox", { name: "同时删除云端正文副本" });
    const localCheckbox = screen.getByRole("checkbox", { name: "同时删除本设备正文缓存" });
    expect(cloudCheckbox).not.toBeChecked();
    expect(localCheckbox).not.toBeChecked();
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "继续删除" }));
    expect(screen.getByText("请再次确认，这个操作无法撤销。")).toBeInTheDocument();
    fireEvent.click(cloudCheckbox);
    fireEvent.click(localCheckbox);
    fireEvent.click(screen.getByRole("button", { name: "确认删除这本书" }));
    expect(onDelete).toHaveBeenCalledWith({
      deleteCloudSource: true,
      deleteLocalCache: true
    });
  });
});
