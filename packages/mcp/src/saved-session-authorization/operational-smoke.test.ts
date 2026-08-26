import { DatabaseSync } from "node:sqlite";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, test, vi } from "vitest";

import { openSavedSessionAuthorizationSmokeTarget } from "./smoke-target.ts";

const deployedEndpoint = process.env.DND_MCP_SAVED_SESSION_URL;
const authorizationDatabasePath =
  process.env.DND_SAVED_SESSION_AUTHORIZATION_DATABASE_PATH;

afterEach(() => {
  vi.restoreAllMocks();
  restoreEnvironment("DND_MCP_SAVED_SESSION_URL", deployedEndpoint);
  restoreEnvironment(
    "DND_SAVED_SESSION_AUTHORIZATION_DATABASE_PATH",
    authorizationDatabasePath,
  );
});

describe("saved-session operational smoke entrypoints", () => {
  test("completes the guest newcomer journey against a local target", async () => {
    delete process.env.DND_MCP_SAVED_SESSION_URL;
    const target = await openSavedSessionAuthorizationSmokeTarget();
    process.env.DND_MCP_SAVED_SESSION_URL = target.endpoint.toString();

    try {
      await expect(import("./guest-smoke.ts")).resolves.toBeDefined();
    } finally {
      await target.close();
    }
  }, 120_000);

  test("accepts only a deployed HTTPS MCP endpoint", async () => {
    process.env.DND_MCP_SAVED_SESSION_URL = "https://oracle.example/mcp";

    const target = await openSavedSessionAuthorizationSmokeTarget();
    expect(target).toMatchObject({
      tag: "deployed",
      endpoint: new URL("https://oracle.example/mcp"),
      origin: new URL("https://oracle.example"),
    });
    await expect(target.close()).resolves.toBeUndefined();

    process.env.DND_MCP_SAVED_SESSION_URL = "http://oracle.example/mcp";
    await expect(openSavedSessionAuthorizationSmokeTarget()).rejects.toThrow(
      "must be the deployed HTTPS /mcp endpoint",
    );
  });

  test("reports persisted DCR and CIMD registrations", async () => {
    const scratchDirectory = await mkdtemp(
      join(tmpdir(), "dnd-registration-evidence-"),
    );
    const databasePath = join(scratchDirectory, "authorization.sqlite");
    const database = new DatabaseSync(databasePath);
    database.exec(`
      CREATE TABLE oauthClient (clientDiscoveryId TEXT);
      INSERT INTO oauthClient (clientDiscoveryId) VALUES (NULL), ('cimd-client');
    `);
    database.close();
    process.env.DND_SAVED_SESSION_AUTHORIZATION_DATABASE_PATH = databasePath;
    const output = vi.spyOn(process.stdout, "write").mockReturnValue(true);

    try {
      await expect(import("./registration-evidence.ts")).resolves.toBeDefined();
      expect(output).toHaveBeenCalledWith(
        expect.stringContaining('"mechanism": "cimd"'),
      );
      expect(output).toHaveBeenCalledWith(
        expect.stringContaining('"mechanism": "dcr"'),
      );
    } finally {
      await rm(scratchDirectory, { recursive: true });
    }
  });
});

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
