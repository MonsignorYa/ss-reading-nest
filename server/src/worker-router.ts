export type WorkerRoute = "health" | "mcp" | "reader" | "source" | "not-found" | "misconfigured";

export const MCP_IOS_COMPAT_SUFFIX = "ios-v4";
const LEGACY_MCP_IOS_COMPAT_SUFFIXES = ["ios-v2", "ios-v3"] as const;

export function getWorkerRoute(url: URL, token: string | undefined): WorkerRoute {
  if (url.pathname === "/health") return "health";
  if (!token) return "misconfigured";
  if (
    url.pathname === `/source/${token}/upload` ||
    url.pathname === `/source/${token}/restore` ||
    url.pathname === `/source/${token}/state` ||
    url.pathname === `/source/${token}/bootstrap`
  ) {
    return "source";
  }
  if (url.pathname === `/reader/${token}`) return "reader";
  return url.pathname === `/mcp/${token}` ||
    url.pathname === `/mcp/${token}/${MCP_IOS_COMPAT_SUFFIX}` ||
    LEGACY_MCP_IOS_COMPAT_SUFFIXES.some(
      (suffix) => url.pathname === `/mcp/${token}/${suffix}`
    )
    ? "mcp"
    : "not-found";
}
