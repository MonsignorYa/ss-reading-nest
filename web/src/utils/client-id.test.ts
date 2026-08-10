import { afterEach, describe, expect, it, vi } from "vitest";
import { createClientId } from "./client-id.js";

describe("createClientId", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses a compatible UUID fallback when randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", {
      getRandomValues(bytes: Uint8Array) {
        bytes.forEach((_, index) => {
          bytes[index] = index;
        });
        return bytes;
      }
    });

    expect(createClientId()).toBe("00010203-0405-4607-8809-0a0b0c0d0e0f");
  });

  it("still returns an RFC-shaped id when the crypto API is absent", () => {
    vi.stubGlobal("crypto", undefined);

    expect(createClientId()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });
});
