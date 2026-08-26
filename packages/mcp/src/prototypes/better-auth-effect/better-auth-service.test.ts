import { DatabaseSync } from "node:sqlite";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ManagedRuntime } from "effect";
import { describe, expect, it } from "vitest";

import {
  BetterAuthPrototype,
  betterAuthPrototypeLayer,
} from "./better-auth-service.ts";

describe("credential-free Better Auth database admission", () => {
  it("reopens anonymous-only data and rejects a non-anonymous user", async () => {
    const scratchDirectory = await mkdtemp(
      join(tmpdir(), "dnd-better-auth-admission-"),
    );
    const databasePath = join(scratchDirectory, "auth.sqlite");
    const origin = new URL("http://127.0.0.1:9878");
    const configuration = {
      authorizationServerOrigin: origin,
      databasePath,
      resource: new URL("/mcp", origin),
      secret: "prototype-admission-test-secret-32-characters",
    } as const;

    try {
      const creatingRuntime = ManagedRuntime.make(
        betterAuthPrototypeLayer(configuration),
      );
      const service = await creatingRuntime.runPromise(BetterAuthPrototype);
      const created = await creatingRuntime.runPromise(
        service.handle(
          new Request(new URL("/api/auth/sign-in/anonymous", origin), {
            method: "POST",
            headers: {
              "content-type": "application/json",
              origin: origin.origin,
            },
            body: JSON.stringify({}),
          }),
        ),
      );
      expect(created.status).toBe(200);
      await creatingRuntime.dispose();

      const legacyDatabase = new DatabaseSync(databasePath);
      legacyDatabase
        .prepare(
          `UPDATE "user" SET "email" = 'temp-legacy-vault@anonymous.invalid'`,
        )
        .run();
      legacyDatabase.close();

      const anonymousOnlyRuntime = ManagedRuntime.make(
        betterAuthPrototypeLayer(configuration),
      );
      await expect(
        anonymousOnlyRuntime.runPromise(BetterAuthPrototype),
      ).resolves.toBeDefined();
      await anonymousOnlyRuntime.dispose();

      const database = new DatabaseSync(databasePath);
      const migrated = database.prepare('SELECT "email" FROM "user"').get();
      expect(migrated?.email).toBe(
        "saved-session-vault-legacy-vault@anonymous.invalid",
      );
      database.prepare('UPDATE "user" SET "isAnonymous" = 0').run();
      database.close();

      const rejectingRuntime = ManagedRuntime.make(
        betterAuthPrototypeLayer(configuration),
      );
      await expect(
        rejectingRuntime.runPromise(BetterAuthPrototype),
      ).rejects.toThrow(
        "requires an auth database containing only anonymous users",
      );
      await rejectingRuntime.dispose();
    } finally {
      await rm(scratchDirectory, { recursive: true });
    }
  });
});
