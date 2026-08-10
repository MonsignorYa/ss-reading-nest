import { useState } from "react";
import {
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  FileText,
  MessageCircle,
  PencilLine,
  RotateCcw,
  Save,
  ShieldAlert,
  Trash2,
  X
} from "lucide-react";
import type {
  SessionBundle,
  SessionStatus
} from "@ss/shared";

type RecordTab = "bookmarks" | "quotes" | "reactions";

export function BookManagementSheet(props: {
  bundle: SessionBundle;
  onRename: (title: string) => void;
  onStatus: (status: SessionStatus) => void;
  onDelete: (options: { deleteCloudSource: boolean; deleteLocalCache: boolean }) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(props.bundle.session.title);
  const [tab, setTab] = useState<RecordTab>("bookmarks");
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [deleteCloudSource, setDeleteCloudSource] = useState(false);
  const [deleteLocalCache, setDeleteLocalCache] = useState(false);

  return (
    <div className="sheet-backdrop" role="presentation" onClick={props.onClose}>
      <section
        className="bottom-sheet management-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`管理《${props.bundle.session.title}》`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-grip" />
        <header className="sheet-header">
          <div>
            <span className="sheet-kicker">书籍设置</span>
            <h2>管理这本书</h2>
            <p title={props.bundle.session.title}>{props.bundle.session.title}</p>
          </div>
          <button
            type="button"
            className="icon-button sheet-close"
            aria-label="关闭书籍管理"
            onClick={props.onClose}
          >
            <X aria-hidden="true" strokeWidth={1.8} />
          </button>
        </header>

        <section className="management-section">
          <header className="management-section-heading">
            <PencilLine aria-hidden="true" strokeWidth={1.8} />
            <div>
              <h3>书名与状态</h3>
              <p>整理书架里显示的名称和阅读状态。</p>
            </div>
          </header>
          <label>
            新的书名
            <input
              aria-label="新的书名"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <button
            className="sheet-action"
            disabled={!title.trim() || title.trim() === props.bundle.session.title}
            onClick={() => props.onRename(title.trim())}
          >
            <Save aria-hidden="true" strokeWidth={1.8} />
            保存新书名
          </button>
          <button
            className="sheet-action"
            onClick={() =>
              props.onStatus(
                props.bundle.session.status === "active" ? "completed" : "active"
              )
            }
          >
            {props.bundle.session.status === "active" ? (
              <CheckCircle2 aria-hidden="true" strokeWidth={1.8} />
            ) : (
              <RotateCcw aria-hidden="true" strokeWidth={1.8} />
            )}
            {props.bundle.session.status === "active" ? "标记为已完成" : "恢复为阅读中"}
          </button>
        </section>

        <section className="management-section">
          <header className="management-section-heading">
            <Bookmark aria-hidden="true" strokeWidth={1.8} />
            <div>
              <h3>阅读痕迹</h3>
              <p>书签、摘录和阅读时留下的反应都在这里。</p>
            </div>
          </header>
          <div className="record-tabs" role="tablist" aria-label="阅读记录">
            <button
              aria-pressed={tab === "bookmarks"}
              onClick={() => setTab("bookmarks")}
            >
              <Bookmark aria-hidden="true" strokeWidth={1.8} />
              书签
            </button>
            <button
              aria-pressed={tab === "quotes"}
              onClick={() => setTab("quotes")}
            >
              <FileText aria-hidden="true" strokeWidth={1.8} />
              摘录
            </button>
            <button
              aria-pressed={tab === "reactions"}
              onClick={() => setTab("reactions")}
            >
              <MessageCircle aria-hidden="true" strokeWidth={1.8} />
              用户反应
            </button>
          </div>
          <div className="record-list">
            {tab === "bookmarks"
              ? recordItems(
                  props.bundle.bookmarks,
                  (item) => item.label || item.position?.label || "旧书签"
                )
              : null}
            {tab === "quotes"
              ? recordItems(props.bundle.quotes, (item) => item.content)
              : null}
            {tab === "reactions"
              ? recordItems(props.bundle.reactions, (item) => item.content)
              : null}
          </div>
        </section>

        <section className="management-section danger-zone">
          <header className="management-section-heading">
            <ShieldAlert aria-hidden="true" strokeWidth={1.8} />
            <div>
              <h3>删除这本书</h3>
              <p>删除范围由你决定，开始前会再次确认。</p>
            </div>
          </header>
          {deleteStep === 0 ? (
            <button className="danger-button" onClick={() => setDeleteStep(1)}>
              <Trash2 aria-hidden="true" strokeWidth={1.8} />
              删除这本书
            </button>
          ) : null}
          {deleteStep >= 1 ? (
            <div className="delete-confirmation">
              <label className="remember-row">
                <input type="checkbox" checked disabled />
                删除这本书的云端阅读记录
              </label>
              <p>会从书架移除这本书，并删除进度、偏好、书签、摘录和反应。</p>
              <label className="remember-row">
                <input
                  type="checkbox"
                  checked={deleteCloudSource}
                  onChange={(event) => setDeleteCloudSource(event.target.checked)}
                />
                同时删除云端正文副本
              </label>
              <p>会删除私人云端中保存的小说正文，其他设备将无法从云端恢复。</p>
              <label className="remember-row">
                <input
                  type="checkbox"
                  checked={deleteLocalCache}
                  onChange={(event) => setDeleteLocalCache(event.target.checked)}
                />
                同时删除本设备正文缓存
              </label>
              <p>只清除当前设备上的本地缓存，不影响云端。</p>
              {deleteStep === 1 ? (
                <div className="delete-actions">
                  <button className="sheet-action" onClick={() => setDeleteStep(0)}>
                    <ChevronLeft aria-hidden="true" strokeWidth={1.8} />
                    返回
                  </button>
                  <button className="danger-button" onClick={() => setDeleteStep(2)}>
                    继续删除
                  </button>
                </div>
              ) : (
                <>
                  <p className="final-warning">请再次确认，这个操作无法撤销。</p>
                  <div className="delete-actions">
                    <button className="sheet-action" onClick={() => setDeleteStep(1)}>
                      <ChevronLeft aria-hidden="true" strokeWidth={1.8} />
                      返回修改
                    </button>
                    <button
                      className="danger-button"
                      onClick={() => props.onDelete({ deleteCloudSource, deleteLocalCache })}
                    >
                      <Trash2 aria-hidden="true" strokeWidth={1.8} />
                      确认删除这本书
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </section>

      </section>
    </div>
  );
}

function recordItems<T extends { id: string; position?: { label?: string } }>(
  items: T[],
  content: (item: T) => string
) {
  if (items.length === 0) return <p className="record-empty">这里还没有记录。</p>;
  return items.map((item) => (
    <article key={item.id} className="record-item">
      <span>{item.position?.label ?? "旧记录（位置未记录）"}</span>
      <p>{content(item)}</p>
    </article>
  ));
}
