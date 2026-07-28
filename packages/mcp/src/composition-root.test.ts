import { afterEach, describe, expect, test, vi } from "vitest";

import { createMcpCompositionRoot } from "./composition-root.ts";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("MCP composition root Admin Mirror configuration", () => {
  test("enables publication only when both endpoint and session id are valid", () => {
    vi.stubEnv("DND_ADMIN_MIRROR_URL", "http://mirror.local/base");
    vi.stubEnv("DND_ADMIN_MIRROR_SESSION_ID", "composition-session");

    expect(createMcpCompositionRoot().adminMirrorPublication).toMatchObject({
      tag: "enabled",
      mirrorSessionId: "composition-session",
    });
  });

  test.each([
    {
      endpoint: undefined,
      sessionId: "composition-session",
      label: "endpoint",
    },
    {
      endpoint: "http://mirror.local",
      sessionId: undefined,
      label: "session id",
    },
  ])(
    "disables publication when $label is absent",
    ({ endpoint, sessionId }) => {
      vi.stubEnv("DND_ADMIN_MIRROR_URL", endpoint);
      vi.stubEnv("DND_ADMIN_MIRROR_SESSION_ID", sessionId);

      expect(createMcpCompositionRoot().adminMirrorPublication.tag).toBe(
        "disabled",
      );
    },
  );

  test("disables publication when environment values cannot be parsed", () => {
    vi.stubEnv("DND_ADMIN_MIRROR_URL", "not a URL");
    vi.stubEnv("DND_ADMIN_MIRROR_SESSION_ID", "composition-session");

    expect(createMcpCompositionRoot().adminMirrorPublication.tag).toBe(
      "disabled",
    );
  });
});
