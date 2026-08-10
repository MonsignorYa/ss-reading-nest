import { describe, expect, it } from "vitest";
import {
  DEFAULT_SESSION_PREFERENCES,
  migrateReadingDatabase
} from "./index.js";

const NOW = "2026-06-22T00:00:00.000Z";
const quote = {
  id: "q1",
  sessionId: "s1",
  content: "旧摘录",
  position: { kind: "paragraph" as const, index: 2, label: "第 2 段" },
  createdAt: NOW
};
const reaction = {
  id: "r1",
  sessionId: "s1",
  content: "旧反应",
  position: { kind: "paragraph" as const, index: 3, label: "第 3 段" },
  speaker: "user" as const,
  createdAt: NOW
};
const bookmark = {
  id: "b1",
  sessionId: "s1",
  position: { kind: "paragraph" as const, index: 4, label: "第 4 段" },
  label: "旧书签",
  createdAt: NOW
};

const disabledCloudSync = {
  enabled: false,
  provider: "r2"
};

describe("migrateReadingDatabase v5", () => {
  it("migrates v1 directly to v5 and preserves all records", () => {
    const migrated = migrateReadingDatabase({
      schemaVersion: 1,
      sessions: [
        {
          id: "s1",
          title: "旧书",
          type: "novel",
          status: "active",
          currentPosition: { kind: "paragraph", index: 12, label: "第 12 段" },
          createdAt: NOW,
          updatedAt: NOW,
          lastReadAt: NOW
        }
      ],
      quotes: [quote],
      reactions: [reaction],
      bookmarks: [bookmark]
    });

    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.sessions[0]).toMatchObject({
      userCurrentPosition: { index: 12 },
      assistantSyncedPosition: null,
      liveReadingEnabled: false,
      sessionPreferences: DEFAULT_SESSION_PREFERENCES,
      sourceManifest: null
    });
    expect(migrated.quotes).toEqual([quote]);
    expect(migrated.reactions).toEqual([reaction]);
    expect(migrated.bookmarks).toEqual([bookmark]);
    expect(migrated.readingRecords).toEqual([]);
  });

  it("migrates v2 to v5 without losing dual positions or status", () => {
    const migrated = migrateReadingDatabase({
      schemaVersion: 2,
      sessions: [
        {
          id: "s1",
          title: "双位置书",
          type: "novel",
          status: "completed",
          userCurrentPosition: { kind: "paragraph", index: 20, label: "第 20 段" },
          assistantSyncedPosition: { kind: "paragraph", index: 18, label: "第 18 段" },
          liveReadingEnabled: true,
          createdAt: NOW,
          updatedAt: NOW,
          lastReadAt: NOW,
          completedAt: NOW
        }
      ],
      quotes: [quote],
      reactions: [reaction],
      bookmarks: [bookmark]
    });

    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.sessions[0]).toMatchObject({
      status: "completed",
      userCurrentPosition: { index: 20 },
      assistantSyncedPosition: { index: 18 },
      liveReadingEnabled: true,
      completedAt: NOW,
      sessionPreferences: DEFAULT_SESSION_PREFERENCES,
      sourceManifest: null
    });
    expect(migrated.quotes).toEqual([quote]);
    expect(migrated.readingRecords).toEqual([]);
  });

  it("repairs a v3 session missing preferences with defaults", () => {
    const migrated = migrateReadingDatabase({
      schemaVersion: 3,
      sessions: [
        {
          id: "s1",
          title: "缺偏好",
          type: "novel",
          status: "active",
          userCurrentPosition: { kind: "paragraph", index: 1, label: "第 1 段" },
          assistantSyncedPosition: null,
          liveReadingEnabled: false,
          createdAt: NOW,
          updatedAt: NOW,
          lastReadAt: NOW
        }
      ],
      quotes: [],
      reactions: [],
      bookmarks: []
    });

    expect(migrated.sessions[0].sessionPreferences).toEqual(DEFAULT_SESSION_PREFERENCES);
    expect(migrated.sessions[0].sourceManifest).toBeNull();
    expect(migrated.quotes).toEqual([]);
  });

  it("migrates v3 source metadata to v5 disabled cloud sync without object keys", () => {
    const sourceManifest = {
      sourceId: "source-1",
      sourceKind: "pasted_text" as const,
      title: "嗑糖书",
      contentHash: "a".repeat(64),
      segmentationVersion: 1,
      paragraphCount: 20,
      lastVerifiedAt: NOW
    };
    const migrated = migrateReadingDatabase({
      schemaVersion: 3,
      sessions: [
        {
          id: "s1",
          title: "嗑糖书",
          type: "novel",
          status: "active",
          userCurrentPosition: { kind: "paragraph", index: 5, label: "第 5 段" },
          assistantSyncedPosition: null,
          liveReadingEnabled: false,
          sessionPreferences: {
            readingCommentMode: "cp_talk",
            commentLength: "normal",
            allowDeepAnalysisByDefault: false,
            liveReadingStyle: "danmaku"
          },
          sourceManifest,
          createdAt: NOW,
          updatedAt: NOW,
          lastReadAt: NOW
        }
      ],
      quotes: [],
      reactions: [],
      bookmarks: []
    });

    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.sessions[0].sessionPreferences).toEqual({
      readingCommentMode: "cp_talk",
      commentLength: "normal",
      allowDeepAnalysisByDefault: false,
      liveReadingStyle: "danmaku"
    });
    expect(migrated.sessions[0].sourceManifest).toEqual({
      ...sourceManifest,
      cloudSync: disabledCloudSync
    });
    expect(migrated.sessions[0].sourceManifest).not.toHaveProperty("cloudSync.objectKey");
    expect(migrated.sessions[0].sourceManifest).not.toHaveProperty(
      "cloudSync.manifestObjectKey"
    );
    expect(migrated.quotes).toEqual([]);
    expect(migrated.readingRecords).toEqual([]);
  });

  it("preserves complete v3 preferences after removing auto-save comments", () => {
    const migrated = migrateReadingDatabase({
      schemaVersion: 3,
      sessions: [
        {
          id: "s1",
          title: "安静阅读",
          type: "novel",
          status: "active",
          userCurrentPosition: { kind: "paragraph", index: 6, label: "第 6 段" },
          assistantSyncedPosition: { kind: "paragraph", index: 4, label: "第 4 段" },
          liveReadingEnabled: false,
          sessionPreferences: {
            readingCommentMode: "reaction_only",
            commentLength: "short",
            allowDeepAnalysisByDefault: false,
            liveReadingStyle: "danmaku"
          },
          sourceManifest: null,
          createdAt: NOW,
          updatedAt: NOW,
          lastReadAt: NOW
        }
      ],
      quotes: [quote],
      reactions: [reaction],
      bookmarks: [bookmark]
    });

    expect(migrated.sessions[0].sessionPreferences).toEqual({
      readingCommentMode: "reaction_only",
      commentLength: "short",
      allowDeepAnalysisByDefault: false,
      liveReadingStyle: "danmaku"
    });
    expect(migrated.sessions[0].sourceManifest).toBeNull();
    expect(migrated.sessions[0].assistantSyncedPosition?.index).toBe(4);
    expect(migrated.quotes).toEqual([quote]);
    expect(migrated.reactions).toEqual([reaction]);
    expect(migrated.bookmarks).toEqual([bookmark]);
    expect(migrated.readingRecords).toEqual([]);
  });


  it("keeps complete v4 cloudSync metadata", () => {
    const migrated = migrateReadingDatabase({
      schemaVersion: 4,
      sessions: [
        {
          id: "s1",
          title: "已云端同步",
          type: "novel",
          status: "active",
          userCurrentPosition: { kind: "paragraph", index: 8, label: "第 8 段" },
          assistantSyncedPosition: { kind: "paragraph", index: 6, label: "第 6 段" },
          liveReadingEnabled: false,
          sessionPreferences: DEFAULT_SESSION_PREFERENCES,
          sourceManifest: {
            sourceId: "source-cloud",
            sourceKind: "pasted_text",
            contentHash: "c".repeat(64),
            segmentationVersion: 1,
            paragraphCount: 12,
            cloudSync: {
              enabled: true,
              provider: "r2",
              objectKey: "private/sources/source-cloud/source.txt",
              manifestObjectKey: "private/sources/source-cloud/manifest.json",
              uploadedAt: NOW,
              sizeBytes: 2048,
              mimeType: "text/plain;charset=utf-8"
            }
          },
          createdAt: NOW,
          updatedAt: NOW,
          lastReadAt: NOW
        }
      ],
      quotes: [],
      reactions: [],
      bookmarks: []
    });

    expect(migrated.sessions[0].sourceManifest?.cloudSync).toMatchObject({
      enabled: true,
      provider: "r2",
      objectKey: "private/sources/source-cloud/source.txt"
    });
    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.readingRecords).toEqual([]);
  });

  it("keeps complete v5 reading records", () => {
    const readingRecord = {
      id: "record-1",
      sessionId: "s1",
      bookTitle: "已云端同步",
      startedAt: "2026-07-28T12:00:00.000Z",
      endedAt: "2026-07-28T12:18:00.000Z",
      durationSeconds: 1080,
      startPosition: { kind: "paragraph" as const, index: 3, label: "第 3 页" },
      endPosition: { kind: "paragraph" as const, index: 8, label: "第 8 页" },
      pagesRead: 6,
      operationId: "record-op-1",
      createdAt: "2026-07-28T12:18:01.000Z"
    };
    const migrated = migrateReadingDatabase({
      schemaVersion: 5,
      sessions: [
        {
          id: "s1",
          title: "已云端同步",
          type: "novel",
          status: "active",
          userCurrentPosition: { kind: "paragraph", index: 8, label: "第 8 段" },
          assistantSyncedPosition: null,
          liveReadingEnabled: false,
          sessionPreferences: DEFAULT_SESSION_PREFERENCES,
          sourceManifest: null,
          createdAt: NOW,
          updatedAt: NOW,
          lastReadAt: NOW
        }
      ],
      quotes: [],
      reactions: [],
      bookmarks: [],
      readingRecords: [readingRecord]
    });

    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.readingRecords).toEqual([readingRecord]);
  });

  it("does not introduce forbidden source or chat fields into serialized state", () => {
    const migrated = migrateReadingDatabase({
      schemaVersion: 3,
      sessions: [
        {
          id: "s1",
          title: "隐私边界",
          type: "novel",
          status: "active",
          userCurrentPosition: { kind: "paragraph", index: 1, label: "第 1 段" },
          assistantSyncedPosition: null,
          liveReadingEnabled: false,
          sourceManifest: {
            sourceId: "source-private",
            sourceKind: "pasted_text",
            contentHash: "d".repeat(64),
            segmentationVersion: 1,
            paragraphCount: 3
          },
          createdAt: NOW,
          updatedAt: NOW,
          lastReadAt: NOW
        }
      ],
      quotes: [],
      reactions: [],
      bookmarks: []
    });
    const serialized = JSON.stringify(migrated);

    for (const forbidden of [
      "小说全文",
      "currentText",
      "selectedText",
      "includedText",
      "skipped range 原文",
      "prompt",
      "完整聊天",
      "deep_analysis 正文"
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("rejects unsupported or malformed data", () => {
    expect(() => migrateReadingDatabase({ schemaVersion: 99 })).toThrow();
    expect(() =>
      migrateReadingDatabase({
        schemaVersion: 3,
        sessions: "not-an-array",
        quotes: [],
        reactions: [],
        bookmarks: []
      })
    ).toThrow();
  });
});
