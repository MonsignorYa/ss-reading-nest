import {
  ArrowLeft,
  List,
  Maximize2,
  Minimize2,
  PanelTopClose,
  PictureInPicture2
} from "lucide-react";

export function ReaderHeader(props: {
  title: string;
  progress: string;
  fullscreenLabel?: string;
  onBack: () => void;
  onFullscreen: () => void;
  canDock?: boolean;
  onDock?: () => void;
  canCollapse?: boolean;
  onCollapse?: () => void;
  onOpenNavigation?: () => void;
}) {
  const fullscreenLabel = props.fullscreenLabel ?? "全屏阅读";
  const isFullscreen = fullscreenLabel === "退出全屏";

  return (
    <header className="reader-header">
      <button
        type="button"
        className="icon-button"
        onClick={props.onBack}
        aria-label="返回上一页"
        title="返回上一页"
      >
        <ArrowLeft className="reader-header-icon" aria-hidden="true" strokeWidth={1.8} />
      </button>
      <div className="reader-heading">
        <strong>{props.title}</strong>
        <span>{props.progress}</span>
      </div>
      <div className="header-buttons">
        {props.canDock && props.onDock ? (
          <button
            type="button"
            className="reader-header-action reader-dock-button"
            onClick={props.onDock}
            aria-label="悬浮阅读"
            title="悬浮阅读"
          >
            <PictureInPicture2 className="reader-header-action-icon" aria-hidden="true" strokeWidth={1.8} />
            <span>悬浮阅读</span>
          </button>
        ) : null}
        {props.canCollapse && props.onCollapse ? (
          <button
            type="button"
            className="reader-header-action reader-collapse-button"
            onClick={props.onCollapse}
            aria-label="收起"
            title="收起"
          >
            <PanelTopClose className="reader-header-action-icon" aria-hidden="true" strokeWidth={1.8} />
            <span>收起</span>
          </button>
        ) : null}
        {props.onOpenNavigation ? (
          <button
            type="button"
            className="reader-header-action reader-toc-button"
            onClick={props.onOpenNavigation}
            aria-label="目录"
            title="目录"
          >
            <List className="reader-header-action-icon" aria-hidden="true" strokeWidth={1.8} />
            <span>目录</span>
          </button>
        ) : null}
        <button
          type="button"
          className="reader-header-action reader-display-button"
          onClick={props.onFullscreen}
          aria-label={fullscreenLabel}
          title={fullscreenLabel}
        >
          {isFullscreen ? (
            <Minimize2 className="reader-header-action-icon" aria-hidden="true" strokeWidth={1.8} />
          ) : (
            <Maximize2 className="reader-header-action-icon" aria-hidden="true" strokeWidth={1.8} />
          )}
          <span>{fullscreenLabel}</span>
        </button>
      </div>
    </header>
  );
}
