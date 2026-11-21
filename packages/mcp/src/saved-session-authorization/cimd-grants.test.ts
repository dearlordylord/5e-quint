import { DatabaseSync } from "node:sqlite";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ManagedRuntime, Schema } from "effect";
import { expect, test, vi } from "vitest";

import { AuthorizationServerOriginSchema } from "../public-origin.ts";
import * as metadataTransport from "./client-metadata-fetch.ts";
import {
  SavedSessionAuthorization,
  savedSessionAuthorizationLayer,
} from "./service.ts";

const JWT_BEARER_GRANT = "urn:ietf:params:oauth:grant-type:jwt-bearer";
const CLIENT_ID = "https://metadata.example/client.json";
const REDIRECT_URI = "https://client.example/callback";

test.each(["none", "private_key_jwt"] as const)(
  "CIMD accepts supported grants with %s authentication without enabling the extra grant",
  async (authMethod) => {
    const directory = await mkdtemp(join(tmpdir(), "dnd-cimd-grants-"));
    const databasePath = join(directory, "auth.sqlite");
    const origin = Schema.decodeUnknownSync(AuthorizationServerOriginSchema)(
      "http://127.0.0.1:9878",
    );
    const metadata = {
      client_id: CLIENT_ID,
      client_name: "Synthetic multi-capability MCP client",
      redirect_uris: [REDIRECT_URI],
      token_endpoint_auth_method: authMethod,
      ...(authMethod === "private_key_jwt"
        ? {
            jwks_uri: "https://metadata.example/jwks.json",
            token_endpoint_auth_signing_alg: "RS256",
          }
        : {}),
      grant_types: ["authorization_code", "refresh_token", JWT_BEARER_GRANT],
      response_types: ["code"],
    };
    const fetchMetadata = vi
      .spyOn(metadataTransport, "fetchClientMetadataResource")
      .mockImplementation(async () => Response.json(metadata));
    const runtime = ManagedRuntime.make(
      savedSessionAuthorizationLayer({
        authorizationServerOrigin: origin,
        databasePath,
        resource: new URL("/mcp", origin),
        secret: "test".repeat(8),
      }),
    );
    try {
      const service = await runtime.runPromise(SavedSessionAuthorization);
      const authorizeUrl = new URL("/api/auth/oauth2/authorize", origin);
      authorizeUrl.search = new URLSearchParams({
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        response_type: "code",
        scope: "play-sessions",
        code_challenge: "a".repeat(43),
        code_challenge_method: "S256",
        state: "synthetic-cimd-grants",
      }).toString();
      const authorized = await runtime.runPromise(
        service.handle(new Request(authorizeUrl)),
      );
      expect(await authorized.clone().text()).not.toContain(
        "unsupported grant_type",
      );
      expect(authorized.status).toBe(302);
      expect(
        new URL(authorized.headers.get("location") ?? "", origin).pathname,
      ).toBe("/saved-session-vault");
      expect(fetchMetadata).toHaveBeenCalled();

      const rejected = await runtime.runPromise(
        service.handle(
          new Request(new URL("/api/auth/oauth2/token", origin), {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type: JWT_BEARER_GRANT,
              client_id: CLIENT_ID,
              assertion: "synthetic-not-a-token",
            }),
          }),
        ),
      );
      expect(rejected.status).toBe(400);
      await expect(rejected.json()).resolves.toMatchObject({
        error: "unsupported_grant_type",
      });
      const registration = await runtime.runPromise(
        service.handle(
          new Request(new URL("/api/auth/oauth2/register", origin), {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              client_name: metadata.client_name,
              redirect_uris: metadata.redirect_uris,
              token_endpoint_auth_method: "none",
              grant_types: metadata.grant_types,
              response_types: metadata.response_types,
            }),
          }),
        ),
      );
      expect(registration.status).toBe(400);
      await expect(registration.json()).resolves.toMatchObject({
        error: "invalid_client_metadata",
      });

      const unsupportedClientId = "https://metadata.example/unsupported.json";
      fetchMetadata.mockImplementation(async () =>
        Response.json({
          ...metadata,
          client_id: unsupportedClientId,
          grant_types: [JWT_BEARER_GRANT],
          response_types: [],
        }),
      );
      authorizeUrl.searchParams.set("client_id", unsupportedClientId);
      const unsupported = await runtime.runPromise(
        service.handle(new Request(authorizeUrl)),
      );
      expect(unsupported.status).toBe(400);
      await expect(unsupported.json()).resolves.toMatchObject({
        error: "invalid_client_metadata",
        error_description: expect.stringContaining(
          "no mutually supported grant_type",
        ),
      });
      const database = new DatabaseSync(databasePath);
      try {
        expect(
          database
            .prepare('SELECT COUNT(*) AS count FROM "oauthAccessToken"')
            .get()?.count,
        ).toBe(0);
      } finally {
        database.close();
      }
    } finally {
      await runtime.dispose();
      fetchMetadata.mockRestore();
      await rm(directory, { recursive: true });
    }
  },
);
