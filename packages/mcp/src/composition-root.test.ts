import { afterEach, describe, expect, test, vi } from "vitest";

import {
  createMcpApplicationServices,
  createMcpPlaySessionRoot,
} from "./composition-root.ts";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("MCP application services and Play Session roots", () => {
  test("keeps mutable session state out of application services", () => {
    const services = createMcpApplicationServices();
    const first = createMcpPlaySessionRoot(services);
    const second = createMcpPlaySessionRoot(services);

    expect(services).not.toHaveProperty("sessionStore");
    expect(services).not.toHaveProperty("adminMirrorPublication");
    expect(first.sessionStore).not.toBe(second.sessionStore);
    expect(first.random).not.toBe(second.random);
    expect(first.unitLibrary).toBe(services.unitLibrary);
    expect(second.statBlockCatalog).toBe(services.statBlockCatalog);
  });

  test("enables publication only when both endpoint and session id are valid", () => {
    vi.stubEnv("DND_ADMIN_MIRROR_URL", "http://mirror.local/base");
    vi.stubEnv("DND_ADMIN_MIRROR_SESSION_ID", "composition-session");

    expect(createMcpPlaySessionRoot().adminMirrorPublication).toMatchObject({
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

      expect(createMcpPlaySessionRoot().adminMirrorPublication.tag).toBe(
        "disabled",
      );
    },
  );

  test("disables publication when environment values cannot be parsed", () => {
    vi.stubEnv("DND_ADMIN_MIRROR_URL", "not a URL");
    vi.stubEnv("DND_ADMIN_MIRROR_SESSION_ID", "composition-session");

    expect(createMcpPlaySessionRoot().adminMirrorPublication.tag).toBe(
      "disabled",
    );
  });
});
