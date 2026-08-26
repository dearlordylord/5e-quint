import { afterEach, describe, expect, test } from "vitest";

const deployedEndpoint = process.env.DND_MCP_SAVED_SESSION_URL;

afterEach(() => {
  if (deployedEndpoint === undefined) {
    delete process.env.DND_MCP_SAVED_SESSION_URL;
  } else {
    process.env.DND_MCP_SAVED_SESSION_URL = deployedEndpoint;
  }
});

describe("saved-session authorization smoke", () => {
  test("completes the production OAuth and authenticated MCP workflow locally", async () => {
    delete process.env.DND_MCP_SAVED_SESSION_URL;

    await expect(import("./smoke.ts")).resolves.toBeDefined();
  }, 120_000);
});
