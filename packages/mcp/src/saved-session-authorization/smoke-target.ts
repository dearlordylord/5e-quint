import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Either, ManagedRuntime, Schema } from "effect";

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
    const endpoint = Schema.decodeUnknownSync(Schema.URL)(deployedEndpoint);
    if (
      endpoint.protocol !== "https:" ||
      endpoint.pathname !== "/mcp" ||
      endpoint.search !== "" ||
      endpoint.hash !== ""
    ) {
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
  const service = await runtime.runPromise(SavedSessionAuthorization);
  const oauth = createPublicMcpOAuth({
    resource: resource.toString(),
    authorizationServer: new URL("/api/auth", origin).toString(),
    issuer: new URL("/api/auth", origin).toString().replace(/\/$/u, ""),
    jwksUrl: new URL("/api/auth/jwks", origin).toString(),
  });
  if (Either.isLeft(oauth)) throw new Error(oauth.left.message);
  const repository = openSqlitePlaySessionRepository(
    join(scratchDirectory, "mcp-play-sessions.sqlite"),
  );
  if (Either.isLeft(repository)) throw new Error(repository.left.message);
  const server = createDndMcpHttpServer({
    hostname: "127.0.0.1",
    port: 9876,
    playSessionRepository: repository.right,
    oauth: oauth.right,
    savedSessionAuthorization: { origin, service },
  });
  const endpoint = await server.listen();
  if (Either.isLeft(endpoint)) throw new Error(endpoint.left.message);
  return {
    tag: "local",
    endpoint: endpoint.right,
    origin,
    close: async () => {
      await server.close();
      repository.right.close();
      await runtime.dispose();
      await rm(scratchDirectory, { recursive: true });
    },
  };
}
