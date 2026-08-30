import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Result, ManagedRuntime, Schema } from "effect";

import { createDndMcpHttpServer } from "../public-http-server.ts";
import { createPublicMcpOAuth } from "../public-oauth.ts";
import {
  AuthorizationServerOriginSchema,
  type AuthorizationServerOrigin,
} from "../public-origin.ts";
import { openSqlitePlaySessionRepository } from "../recoverable-play-session.ts";
import {
  SavedSessionAuthorization,
  savedSessionAuthorizationLayer,
} from "./service.ts";

export type SavedSessionAuthorizationSmokeTarget = {
  readonly tag: "local" | "deployed";
  readonly endpoint: URL;
  readonly origin: AuthorizationServerOrigin;
  readonly close: () => Promise<void>;
};

export async function openSavedSessionAuthorizationSmokeTarget(): Promise<SavedSessionAuthorizationSmokeTarget> {
  const deployedEndpoint = process.env.DND_MCP_SAVED_SESSION_URL;
  if (deployedEndpoint !== undefined) {
    return openDeployedSmokeTarget(deployedEndpoint);
  }
  return openLocalSmokeTarget();
}

function openDeployedSmokeTarget(
  deployedEndpoint: string,
): SavedSessionAuthorizationSmokeTarget {
  const endpoint = Schema.decodeUnknownSync(Schema.URLFromString)(
    deployedEndpoint,
  );
  const isMcpEndpoint =
    endpoint.pathname === "/mcp" &&
    endpoint.search === "" &&
    endpoint.hash === "";
  if (endpoint.protocol !== "https:" || !isMcpEndpoint) {
    throw new Error(
      "DND_MCP_SAVED_SESSION_URL must be the deployed HTTPS /mcp endpoint",
    );
  }
  return {
    tag: "deployed",
    endpoint,
    origin: Schema.decodeUnknownSync(AuthorizationServerOriginSchema)(
      endpoint.origin,
    ),
    close: () => Promise.resolve(),
  };
}

async function openLocalSmokeTarget(): Promise<SavedSessionAuthorizationSmokeTarget> {
  const scratchDirectory = await mkdtemp(
    join(tmpdir(), "dnd-saved-session-authorization-"),
  );
  const origin = Schema.decodeUnknownSync(AuthorizationServerOriginSchema)(
    "http://127.0.0.1:9876",
  );
  const resource = new URL("/mcp", origin);
  const runtime = ManagedRuntime.make(
    savedSessionAuthorizationLayer({
      authorizationServerOrigin: origin,
      databasePath: join(scratchDirectory, "authorization.sqlite"),
      resource,
      secret: "saved-session-smoke-secret-at-least-32-characters",
    }),
  );
  let closeServer: (() => Promise<void>) | undefined;
  let closeRepository: (() => void) | undefined;
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    const failures: unknown[] = [];
    await captureCleanupFailure(failures, closeServer);
    await captureCleanupFailure(failures, closeRepository);
    await captureCleanupFailure(failures, () => runtime.dispose());
    await captureCleanupFailure(failures, () =>
      rm(scratchDirectory, { recursive: true }),
    );
    if (failures.length > 0) {
      throw new AggregateError(
        failures,
        "Saved-session authorization smoke target cleanup failed.",
      );
    }
  };

  try {
    const service = await runtime.runPromise(SavedSessionAuthorization);
    const oauth = createPublicMcpOAuth({
      resource: resource.toString(),
      authorizationServer: new URL("/api/auth", origin).toString(),
      issuer: new URL("/api/auth", origin).toString().replace(/\/$/u, ""),
      jwksUrl: new URL("/api/auth/jwks", origin).toString(),
    });
    if (Result.isFailure(oauth)) throw new Error(oauth.failure.message);
    const repository = openSqlitePlaySessionRepository(
      join(scratchDirectory, "mcp-play-sessions.sqlite"),
    );
    if (Result.isFailure(repository)) {
      throw new Error(repository.failure.message);
    }
    closeRepository = () => repository.success.close();
    const server = createDndMcpHttpServer({
      hostname: "127.0.0.1",
      port: 9876,
      playSessionRepository: repository.success,
      oauth: oauth.success,
      savedSessionAuthorization: { origin, service },
    });
    closeServer = async () => {
      const result = await server.close();
      if (Result.isFailure(result)) throw result.failure;
    };
    const endpoint = await server.listen();
    if (Result.isFailure(endpoint)) throw new Error(endpoint.failure.message);
    return { tag: "local", endpoint: endpoint.success, origin, close };
  } catch (error) {
    try {
      await close();
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        "Saved-session authorization smoke target initialization failed.",
      );
    }
    throw error;
  }
}

async function captureCleanupFailure(
  failures: unknown[],
  cleanup: (() => void | Promise<void>) | undefined,
): Promise<void> {
  if (cleanup === undefined) return;
  try {
    await cleanup();
  } catch (error) {
    failures.push(error);
  }
}
