import type { SessionBundle } from "@ss/shared";

export function sanitizeBookshelfBundle(bundle: SessionBundle) {
  const sourceManifest = bundle.session.sourceManifest;
  if (!sourceManifest) {
    return { ...bundle, cacheState: "unknown" as const };
  }
  const {
    objectKey: _objectKey,
    manifestObjectKey: _manifestObjectKey,
    ...safeCloudSync
  } = sourceManifest.cloudSync;
  return {
    ...bundle,
    session: {
      ...bundle.session,
      sourceManifest: {
        ...sourceManifest,
        cloudSync: safeCloudSync
      }
    },
    cacheState: "unknown" as const
  };
}
