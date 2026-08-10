import { describe, expect, it } from "vitest";
import { createMcpProbeResponse, normalizeMcpRequest } from "./request-compat.js";

describe("MCP request compatibility", () => {
  it("accepts HEAD probes without entering the streaming transport", async () => {
    const response = createMcpProbeResponse(
      new Request("https://example.test/mcp/private/ios-v2", { method: "HEAD" })
    );
    expect(response?.status).toBe(200);
    expect(response?.headers.get("allow")).toContain("HEAD");
    expect(await response?.text()).toBe("");
  });

  it("adds both MCP response media types to narrow POST requests", async () => {
    const request = normalizeMcpRequest(
      new Request("https://example.test/mcp/private/ios-v2", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json"
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize" })
      })
    );
    expect(request.headers.get("accept")).toBe("application/json, text/event-stream");
    expect(await request.json()).toMatchObject({ method: "initialize" });
  });

  it("leaves conforming requests unchanged", () => {
    const request = new Request("https://example.test/mcp/private", {
      method: "POST",
      headers: { accept: "application/json, text/event-stream" }
    });
    expect(normalizeMcpRequest(request)).toBe(request);
  });
});
