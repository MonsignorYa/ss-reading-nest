declare global {
  type ReaderScreen = "home" | "cover" | "setup" | "novel";

  interface ReaderWidgetState {
    screen: ReaderScreen;
    sessionId?: string;
    positionIndex?: number;
    scrollTop?: number;
    immersive?: boolean;
    collapsed?: boolean;
  }

  interface Window {
    __SS_READING_NEST_BOOTSTRAP__?: Record<string, unknown>;
    openai?: {
      toolOutput?: unknown;
      toolResponseMetadata?: Record<string, unknown>;
      theme?: "light" | "dark";
      safeArea?: { top?: number; right?: number; bottom?: number; left?: number };
      callTool?: (name: string, args: Record<string, unknown>) => Promise<ToolCallResult>;
      getFileDownloadUrl?: (input: { fileId: string }) => Promise<{ download_url: string }>;
      sendFollowUpMessage?: (input: { prompt: string; scrollToBottom?: boolean }) => Promise<void>;
      requestDisplayMode?: (input: { mode: "inline" | "pip" | "fullscreen" }) => Promise<void>;
      hostContext?: {
        displayMode?: "inline" | "pip" | "fullscreen";
        availableDisplayModes?: Array<"inline" | "pip" | "fullscreen">;
        containerDimensions?: {
          width?: number;
          maxWidth?: number;
          height?: number;
          maxHeight?: number;
        };
        safeAreaInsets?: {
          top: number;
          right: number;
          bottom: number;
          left: number;
        };
      };
      widgetState?: ReaderWidgetState;
      setWidgetState?: (state: ReaderWidgetState) => void;
    };
  }
}

export interface ToolCallResult {
  structuredContent?: Record<string, unknown>;
  content?: Array<{ type: string; text?: string }>;
  _meta?: Record<string, unknown>;
  isError?: boolean;
}

export {};
