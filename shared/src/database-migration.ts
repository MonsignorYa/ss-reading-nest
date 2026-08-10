import {
  DEFAULT_SESSION_PREFERENCES,
  type Bookmark,
  type Quote,
  type Reaction,
  type ReadingDatabase,
  type ReadingPosition,
  type ReadingRecord,
  type ReadingSession,
  type ReadingType,
  type SourceManifest,
  type SessionPreferences,
  type SessionStatus
} from "./models.js";

interface V1Session {
  id: string;
  title: string;
  type: ReadingType;
  status: SessionStatus;
  currentPosition: ReadingPosition;
  createdAt: string;
  updatedAt: string;
  lastReadAt: string;
  completedAt?: string;
}

interface V1Database {
  schemaVersion: 1;
  sessions: V1Session[];
  quotes: Quote[];
  reactions: Reaction[];
  bookmarks: Bookmark[];
}

type V2Session = Omit<ReadingSession, "sessionPreferences" | "sourceManifest">;

interface V2Database {
  schemaVersion: 2;
  sessions: V2Session[];
  quotes: Quote[];
  reactions: Reaction[];
  bookmarks: Bookmark[];
}

interface RepairableV3Database {
  schemaVersion: 3;
  sessions: Array<
    V2Session & {
      sessionPreferences?: Partial<SessionPreferences>;
      sourceManifest?: RepairableSourceManifest | null;
    }
  >;
  quotes: Quote[];
  reactions: Reaction[];
  bookmarks: Bookmark[];
}

interface RepairableV4Database extends Omit<RepairableV3Database, "schemaVersion"> {
  schemaVersion: 4;
}

interface NormalizedV4Database {
  schemaVersion: 4;
  sessions: ReadingSession[];
  quotes: Quote[];
  reactions: Reaction[];
  bookmarks: Bookmark[];
}

interface RepairableV5Database extends Omit<RepairableV4Database, "schemaVersion"> {
  schemaVersion: 5;
  readingRecords?: ReadingRecord[];
}

type RepairableSourceManifest = Omit<SourceManifest, "cloudSync"> & {
  cloudSync?: SourceManifest["cloudSync"];
};

const DISABLED_R2_CLOUD_SYNC: SourceManifest["cloudSync"] = {
  enabled: false,
  provider: "r2"
};

export function migrateReadingDatabase(input: unknown): ReadingDatabase {
  assertDatabaseCollections(input);
  const version = (input as { schemaVersion?: unknown }).schemaVersion;
  if (version === 1) {
    return migrateV4ToV5(
      migrateV3ToV4(migrateV2ToV3(migrateV1ToV2(input as V1Database)))
    );
  }
  if (version === 2) return migrateV4ToV5(migrateV3ToV4(migrateV2ToV3(input as V2Database)));
  if (version === 3) return migrateV4ToV5(migrateV3ToV4(normalizeV3(input as RepairableV3Database)));
  if (version === 4) return migrateV4ToV5(normalizeV4(input as RepairableV4Database));
  if (version === 5) return normalizeV5(input as RepairableV5Database);
  throw new Error("Unsupported schemaVersion");
}

function migrateV1ToV2(database: V1Database): V2Database {
  return {
    schemaVersion: 2,
    sessions: database.sessions.map(({ currentPosition, ...session }) => ({
      ...session,
      userCurrentPosition: currentPosition,
      assistantSyncedPosition: null,
      liveReadingEnabled: false
    })),
    quotes: structuredClone(database.quotes),
    reactions: structuredClone(database.reactions),
    bookmarks: structuredClone(database.bookmarks)
  };
}

function migrateV2ToV3(database: V2Database): RepairableV3Database {
  assertV2Sessions(database.sessions);
  return {
    schemaVersion: 3,
    sessions: database.sessions.map((session) => ({
      ...structuredClone(session),
      sessionPreferences: structuredClone(DEFAULT_SESSION_PREFERENCES),
      sourceManifest: null
    })),
    quotes: structuredClone(database.quotes),
    reactions: structuredClone(database.reactions),
    bookmarks: structuredClone(database.bookmarks)
  };
}

function normalizeV3(database: RepairableV3Database): RepairableV3Database {
  assertV2Sessions(database.sessions);
  return {
    schemaVersion: 3,
    sessions: database.sessions.map((session) => ({
      ...structuredClone(session),
      sessionPreferences: normalizePreferences(session.sessionPreferences),
      sourceManifest: session.sourceManifest
        ? structuredClone(session.sourceManifest)
        : null
    })),
    quotes: structuredClone(database.quotes),
    reactions: structuredClone(database.reactions),
    bookmarks: structuredClone(database.bookmarks)
  };
}

function migrateV3ToV4(database: RepairableV3Database): NormalizedV4Database {
  return normalizeV4({
    ...database,
    schemaVersion: 4
  });
}

function normalizeV4(database: RepairableV4Database): NormalizedV4Database {
  assertV2Sessions(database.sessions);
  const sessions: ReadingSession[] = database.sessions.map((session) => ({
    ...structuredClone(session),
    sessionPreferences: normalizePreferences(session.sessionPreferences),
    sourceManifest: normalizeSourceManifest(session.sourceManifest)
  }));
  return {
    schemaVersion: 4,
    sessions,
    quotes: structuredClone(database.quotes),
    reactions: structuredClone(database.reactions),
    bookmarks: structuredClone(database.bookmarks)
  };
}

function migrateV4ToV5(database: RepairableV4Database | NormalizedV4Database): ReadingDatabase {
  return normalizeV5({
    ...database,
    schemaVersion: 5,
    readingRecords: []
  });
}

function normalizeV5(database: RepairableV5Database): ReadingDatabase {
  const normalizedV4 = normalizeV4({
    ...database,
    schemaVersion: 4
  });
  return {
    ...normalizedV4,
    schemaVersion: 5,
    readingRecords: normalizeReadingRecords(database.readingRecords)
  };
}

function assertDatabaseCollections(input: unknown): asserts input is
  | V1Database
  | V2Database
  | RepairableV3Database
  | RepairableV4Database
  | RepairableV5Database {
  if (!input || typeof input !== "object") throw new Error("Unsupported data shape");
  const value = input as Record<string, unknown>;
  if (
    !Array.isArray(value.sessions) ||
    !Array.isArray(value.quotes) ||
    !Array.isArray(value.reactions) ||
    !Array.isArray(value.bookmarks)
  ) {
    throw new Error("Unsupported data shape");
  }
}

function normalizeSourceManifest(
  sourceManifest: RepairableSourceManifest | null | undefined
): SourceManifest | null {
  if (!sourceManifest) return null;
  return {
    ...structuredClone(sourceManifest),
    cloudSync: sourceManifest.cloudSync
      ? structuredClone(sourceManifest.cloudSync)
      : structuredClone(DISABLED_R2_CLOUD_SYNC)
  };
}

function assertV2Sessions(sessions: V2Session[]) {
  for (const session of sessions) {
    if (
      !session.userCurrentPosition ||
      !("assistantSyncedPosition" in session) ||
      typeof session.liveReadingEnabled !== "boolean"
    ) {
      throw new Error("Unsupported session shape");
    }
  }
}

function normalizePreferences(input: Partial<SessionPreferences> | undefined): SessionPreferences {
  if (
    !input ||
    ![
      "light_chat",
      "reaction_only",
      "cp_talk",
      "plot_guess",
      "deep_analysis",
      "diary_summary"
    ].includes(input.readingCommentMode ?? "") ||
    !["short", "normal", "long"].includes(input.commentLength ?? "") ||
    input.allowDeepAnalysisByDefault !== false ||
    input.liveReadingStyle !== "danmaku"
  ) {
    return structuredClone(DEFAULT_SESSION_PREFERENCES);
  }
  return {
    readingCommentMode: input.readingCommentMode as SessionPreferences["readingCommentMode"],
    commentLength: input.commentLength as SessionPreferences["commentLength"],
    allowDeepAnalysisByDefault: false,
    liveReadingStyle: "danmaku"
  };
}

function normalizeReadingRecords(records: ReadingRecord[] | undefined): ReadingRecord[] {
  if (!Array.isArray(records)) return [];
  return records.map((record) => ({
    id: record.id,
    sessionId: record.sessionId,
    bookTitle: record.bookTitle,
    startedAt: record.startedAt,
    endedAt: record.endedAt,
    durationSeconds: Math.max(1, Math.trunc(record.durationSeconds)),
    startPosition: structuredClone(record.startPosition),
    endPosition: structuredClone(record.endPosition),
    pagesRead: Math.max(1, Math.trunc(record.pagesRead)),
    ...(record.operationId ? { operationId: record.operationId } : {}),
    createdAt: record.createdAt
  }));
}
