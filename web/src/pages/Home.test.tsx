import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SESSION_PREFERENCES } from "@ss/shared";
import { Home, type BookshelfItem } from "./Home.js";

const items: BookshelfItem[] = [
  makeItem("a", "可继续的小说", "novel", "active", "available_local", "第 8 段", "第 6 段", "这里像伏笔。"),
  makeItem("b", "缺少正文", "novel", "active", "local_only_missing", "第 12 段", null),
  makeItem("d", "分段不一致", "novel", "active", "segmentation_mismatch", "第 9 段", null),
  makeItem("e", "读完的小说", "novel", "completed", "available_local", "第 30 段", "第 30 段")
];

function renderHome(overrides: Partial<Parameters<typeof Home>[0]> = {}) {
  return render(
    <Home
      bookshelf={items}
      onNew={vi.fn()}
      onOpen={vi.fn()}
      onReimport={vi.fn()}
      onManage={vi.fn()}
      skin="blue"
      onSkinChange={vi.fn()}
      {...overrides}
    />
  );
}

describe("Home novel bookshelf", () => {
  it("renders the novel shelf", () => {
    renderHome();

    expect(screen.getByRole("heading", { name: "书架" })).toBeInTheDocument();
    expect(screen.getByText("4 本小说")).toBeInTheDocument();
    expect(screen.getByText("可继续的小说")).toBeInTheDocument();
    expect(screen.getByText("读完的小说")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "打开《可继续的小说》的封面页" })).toBeInTheDocument();
    expect(screen.queryByText(/这里像伏笔/)).not.toBeInTheDocument();
  });

  it("only shows navigation entries backed by real views", () => {
    const { container } = renderHome();

    expect(screen.getAllByRole("button", { name: "我的书房" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "阅读记录" }).length).toBeGreaterThan(0);
    expect(container.querySelectorAll("svg.library-rail-icon")).toHaveLength(2);
    expect(container).not.toHaveTextContent("▣");
    expect(container).not.toHaveTextContent("◷");
    expect(screen.queryByRole("button", { name: "书摘笔记" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "书单收藏" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "回收站" })).not.toBeInTheDocument();
  });

  it("supports novel status filters", () => {
    renderHome();

    fireEvent.click(screen.getByRole("button", { name: "已完成" }));
    expect(screen.getByText("读完的小说")).toBeInTheDocument();
    expect(screen.queryByText("可继续的小说")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "正文缺失" }));
    expect(screen.getByText("缺少正文")).toBeInTheDocument();
    expect(screen.queryByText("分段不一致")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "阅读中" }));
    expect(screen.getByText("可继续的小说")).toBeInTheDocument();
    expect(screen.getByText("分段不一致")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "全部" }));
    expect(screen.getByText("读完的小说")).toBeInTheDocument();
    expect(screen.getByText("可继续的小说")).toBeInTheDocument();
  });

  it("opens every novel through its cover page", () => {
    const onOpen = vi.fn();
    renderHome({ onOpen });

    fireEvent.click(screen.getByRole("button", { name: "打开《可继续的小说》的封面页" }));
    expect(onOpen).toHaveBeenCalledWith(items[0]);

    fireEvent.click(screen.getByRole("button", { name: "打开《缺少正文》的封面页" }));
    expect(onOpen).toHaveBeenLastCalledWith(items[1]);
  });

  it("renders and opens a 24-book shelf without truncating older books", () => {
    const manyBooks = Array.from({ length: 24 }, (_, index) =>
      makeItem(
        `book-${index + 1}`,
        `书架测试第 ${index + 1} 本`,
        "novel",
        index < 18 ? "active" : "completed",
        "available_local",
        `第 ${index + 1} 段`,
        null
      )
    );
    const onOpen = vi.fn();
    renderHome({ bookshelf: manyBooks, onOpen });

    expect(screen.getByText("24 本小说")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /打开《书架测试第 \d+ 本》的封面页/ })).toHaveLength(24);
    fireEvent.click(screen.getByRole("button", { name: "打开《书架测试第 24 本》的封面页" }));
    expect(onOpen).toHaveBeenCalledWith(manyBooks[23]);

    fireEvent.click(screen.getByRole("button", { name: "已完成" }));
    expect(screen.getByText("书架测试第 24 本")).toBeInTheDocument();
    expect(screen.queryByText("书架测试第 1 本")).not.toBeInTheDocument();
  });

  it("keeps cloud books on the shelf while their source is restored", () => {
    const cloudItems: BookshelfItem[] = [
      makeItem("cloud", "云端书", "novel", "active", "available_cloud", "第 2 段", null),
      makeItem("restoring", "恢复中书", "novel", "active", "restoring_from_cloud", "第 3 段", null),
      makeItem("failed", "失败书", "novel", "active", "cloud_restore_failed", "第 4 段", null)
    ];
    renderHome({ bookshelf: cloudItems });

    expect(screen.getByRole("button", { name: "打开《云端书》的封面页" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "打开《恢复中书》的封面页" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "打开《失败书》的封面页" })).toBeInTheDocument();
    expect(screen.queryByText(/R2|objectKey|hash/)).not.toBeInTheDocument();
  });

  it("offers a larger reading space from the compact shelf", () => {
    const onExpand = vi.fn();
    const { container } = renderHome({ onExpand });

    fireEvent.click(screen.getByRole("button", { name: "展开书房" }));
    expect(onExpand).toHaveBeenCalledTimes(1);
    expect(container.querySelector("svg.library-action-icon")).toBeInTheDocument();
    expect(container).not.toHaveTextContent("▱");
  });

  it("shows the empty reading records view before real sessions exist", () => {
    renderHome();

    fireEvent.click(screen.getAllByRole("button", { name: "阅读记录" })[0]!);

    expect(screen.getByRole("heading", { name: "阅读记录", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "还没有阅读记录" })).toBeInTheDocument();
    expect(screen.queryByText(/演示数据/)).not.toBeInTheDocument();
  });

  it("renders real reading records instead of prototype data", () => {
    renderHome({
      readingRecords: [
        {
          id: "record-1",
          sessionId: "a",
          bookTitle: "可继续的小说",
          startedAt: "2026-07-28T21:06:00.000+08:00",
          endedAt: "2026-07-28T21:49:00.000+08:00",
          durationSeconds: 43 * 60,
          startPosition: { kind: "paragraph", index: 2, total: 30, label: "第 2 页" },
          endPosition: { kind: "paragraph", index: 8, total: 30, label: "第 8 页" },
          pagesRead: 7,
          operationId: "record-op-1",
          createdAt: "2026-07-28T21:49:01.000+08:00"
        }
      ]
    });

    fireEvent.click(screen.getAllByRole("button", { name: "阅读记录" })[0]!);

    expect(screen.getByText(/真实数据/)).toBeInTheDocument();
    expect(screen.queryByText(/演示数据/)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "最近阅读" })).toBeInTheDocument();
    expect(screen.getByText(/今日阅读/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "可继续的小说" })).toBeInTheDocument();
    expect(screen.getAllByText(/43 分钟/).length).toBeGreaterThan(0);
    expect(screen.getByText("第 2 页")).toBeInTheDocument();
    expect(screen.getByText("第 8 页")).toBeInTheDocument();
  });

  it("switches the visual skin from the bookshelf", () => {
    const onSkinChange = vi.fn();
    renderHome({ onSkinChange });

    fireEvent.click(screen.getByRole("button", { name: "米白" }));
    expect(onSkinChange).toHaveBeenCalledWith("beige");

    fireEvent.click(screen.getByRole("button", { name: "粉桃" }));
    expect(onSkinChange).toHaveBeenCalledWith("pink");

    fireEvent.click(screen.getByRole("button", { name: "墨绿" }));
    expect(onSkinChange).toHaveBeenCalledWith("green");
  });

  it("shows a retry path while the automatic bookshelf refresh is unavailable", () => {
    const onRefresh = vi.fn();
    renderHome({ bookshelf: [], loadError: true, onRefresh });

    expect(screen.getByText("书架暂时没有读取成功，小说仍在云端。")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重新读取书架" }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});

function makeItem(
  id: string,
  title: string,
  type: "novel",
  status: "active" | "completed",
  sourceAvailability: BookshelfItem["sourceAvailability"],
  userLabel: string,
  assistantLabel: string | null,
  latestComment?: string
): BookshelfItem {
  return {
    session: {
      id,
      title,
      type,
      status,
      userCurrentPosition: {
        kind: "paragraph",
        index: Number(userLabel.match(/\d+/)?.[0] ?? 1),
        label: userLabel
      },
      assistantSyncedPosition: assistantLabel
        ? {
            kind: "paragraph",
            index: Number(assistantLabel.match(/\d+/)?.[0] ?? 1),
            label: assistantLabel
          }
        : null,
      liveReadingEnabled: false,
      sessionPreferences: DEFAULT_SESSION_PREFERENCES,
      sourceManifest: null,
      createdAt: "2026-06-20T00:00:00.000Z",
      updatedAt: "2026-06-23T00:00:00.000Z",
      lastReadAt: "2026-06-23T00:00:00.000Z"
    },
    quotes: [],
    reactions: [],
    bookmarks: [],
    sourceAvailability,
    ...(latestComment ? { latestComment } : {})
  };
}
