import { createHash, randomBytes } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Either, Effect, ManagedRuntime, Schema } from "effect";

import {
  BetterAuthPrototype,
  betterAuthPrototypeLayer,
  SAVED_SESSION_OAUTH_SCOPES,
  SAVED_SESSION_REFRESH_TOKEN_LIFETIME_SECONDS,
} from "./better-auth-service.ts";
import { createPublicMcpOAuth } from "../../public-oauth.ts";
import { verifySavedSessionMcp } from "./saved-session-mcp-smoke.ts";
import {
  authorizeExistingBrowserSession,
  PublicClientSchema,
  responseCookie,
  SessionResponseSchema,
} from "./prototype-oauth-smoke-support.ts";

const requestedScopes = SAVED_SESSION_OAUTH_SCOPES.join(" ");

const AuthorizationServerMetadataSchema = Schema.Struct({
  issuer: Schema.NonEmptyTrimmedString,
  authorization_endpoint: Schema.URL,
  token_endpoint: Schema.URL,
  jwks_uri: Schema.URL,
  registration_endpoint: Schema.URL,
  client_id_metadata_document_supported: Schema.Boolean,
});

const RegisteredClientSchema = Schema.Struct({
  client_id: Schema.NonEmptyTrimmedString,
  redirect_uris: Schema.Array(Schema.URL),
  token_endpoint_auth_method: Schema.Literal("none"),
});

const RedirectResultSchema = Schema.Struct({
  redirect: Schema.Boolean,
  url: Schema.NonEmptyTrimmedString,
});

const TokenResponseSchema = Schema.Struct({
  access_token: Schema.NonEmptyTrimmedString,
  refresh_token: Schema.NonEmptyTrimmedString,
  scope: Schema.NonEmptyTrimmedString,
  token_type: Schema.NonEmptyTrimmedString,
});

const scratchDirectory = await mkdtemp(
  join(tmpdir(), "dnd-better-auth-prototype-"),
);
const origin = new URL("http://127.0.0.1:9876");
const resource = new URL("/mcp", origin);
const issuer = new URL("/api/auth", origin);
const layer = betterAuthPrototypeLayer({
  authorizationServerOrigin: origin,
  databasePath: join(scratchDirectory, "PROTOTYPE-WIPE-ME.sqlite"),
  resource,
  secret: "prototype-only-secret-at-least-32-characters",
});
const authRuntime = ManagedRuntime.make(layer);
const service = await authRuntime.runPromise(BetterAuthPrototype);
const server = createServer((incoming, outgoing) => {
  handleRequest(incoming, outgoing).catch((cause) => {
    outgoing.statusCode = 500;
    outgoing.end(cause instanceof Error ? cause.message : String(cause));
  });
});

try {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(9876, "127.0.0.1", resolve);
  });
  const metadata = await decodeJson(
    AuthorizationServerMetadataSchema,
    await fetch(
      new URL(".well-known/oauth-authorization-server", `${issuer}/`),
    ),
  );
  const jwksResponse = await fetch(metadata.jwks_uri);
  if (!jwksResponse.ok) {
    throw new Error(`JWKS returned HTTP ${jwksResponse.status}`);
  }
  const registered = await decodeJson(
    RegisteredClientSchema,
    await fetch(metadata.registration_endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_name: "5.5e SRD Oracle local OAuth prototype",
        application_type: "native",
        redirect_uris: [new URL("/prototype/callback", origin).toString()],
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        scope: requestedScopes,
      }),
    }),
  );
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const redirectUri = registered.redirect_uris[0];
  if (redirectUri === undefined)
    throw new Error("DCR returned no redirect URI");
  const authorizeUrl = new URL(metadata.authorization_endpoint);
  authorizeUrl.search = new URLSearchParams({
    response_type: "code",
    client_id: registered.client_id,
    redirect_uri: redirectUri.toString(),
    scope: requestedScopes,
    resource: resource.toString(),
    code_challenge: challenge,
    code_challenge_method: "S256",
    state: "prototype-state",
  }).toString();
  const login = await decodeJson(
    RedirectResultSchema,
    await fetch(authorizeUrl),
  );
  if (!login.redirect) {
    throw new Error("Authorization did not return a redirect");
  }
  const loginUrl = new URL(login.url, origin);
  if (loginUrl.pathname !== "/prototype/vault") {
    throw new Error(`Expected vault redirect, received ${loginUrl.pathname}`);
  }
  const publicClient = await decodeJson(
    PublicClientSchema,
    await fetch(new URL("/api/auth/oauth2/public-client-prelogin", origin), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: origin.origin,
      },
      body: JSON.stringify({
        client_id: registered.client_id,
        oauth_query: loginUrl.search.slice(1),
      }),
    }),
  );
  if (publicClient.client_id !== registered.client_id) {
    throw new Error("Signed client metadata resolved a different client");
  }
  const vaultResponse = await fetch(
    new URL("/api/auth/sign-in/anonymous", origin),
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: origin.origin,
      },
      body: JSON.stringify({ oauth_query: loginUrl.search.slice(1) }),
    },
  );
  const vault = await decodeJson(RedirectResultSchema, vaultResponse);
  const cookie = responseCookie(vaultResponse);
  if (!vault.redirect) {
    throw new Error("Vault creation did not continue authorization");
  }
  const consentUrl = new URL(vault.url, origin);
  if (consentUrl.pathname !== "/prototype/consent") {
    throw new Error(
      `Expected consent redirect, received ${consentUrl.pathname}`,
    );
  }
  const consent = await decodeJson(
    RedirectResultSchema,
    await fetch(new URL("/api/auth/oauth2/consent", origin), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
        origin: origin.origin,
      },
      body: JSON.stringify({
        accept: true,
        oauth_query: consentUrl.search.slice(1),
      }),
    }),
  );
  if (!consent.redirect) throw new Error("Consent did not return a redirect");
  const callbackUrl = new URL(consent.url, origin);
  const authorizationCode = callbackUrl.searchParams.get("code");
  if (authorizationCode === null) {
    throw new Error("Consent redirect did not contain an authorization code");
  }
  const tokens = await decodeJson(
    TokenResponseSchema,
    await fetch(metadata.token_endpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: registered.client_id,
        code: authorizationCode,
        code_verifier: verifier,
        redirect_uri: redirectUri.toString(),
        resource: resource.toString(),
      }),
    }),
  );
  const oauth = createPublicMcpOAuth({
    resource: resource.toString(),
    authorizationServer: issuer.toString(),
    issuer: metadata.issuer,
    jwksUrl: metadata.jwks_uri.toString(),
  });
  if (Either.isLeft(oauth)) throw new Error(oauth.left.message);
  const refreshedTokens = await decodeJson(
    TokenResponseSchema,
    await fetch(metadata.token_endpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: registered.client_id,
        refresh_token: tokens.refresh_token,
        resource: resource.toString(),
      }),
    }),
  );
  if (refreshedTokens.refresh_token === tokens.refresh_token) {
    throw new Error("Refresh-token exchange did not rotate the refresh token");
  }
  const replayedRefresh = await decodeJson(
    TokenResponseSchema,
    await fetch(metadata.token_endpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: registered.client_id,
        refresh_token: tokens.refresh_token,
        resource: resource.toString(),
      }),
    }),
  );
  if (
    replayedRefresh.access_token !== refreshedTokens.access_token ||
    replayedRefresh.refresh_token !== refreshedTokens.refresh_token
  ) {
    throw new Error("Refresh retry did not replay the rotated token response");
  }
  const principal = await oauth.right.verifyAccessToken(
    refreshedTokens.access_token,
  );
  if (Either.isLeft(principal)) throw new Error(principal.left.message);
  const restoredBrowserSession = await decodeJson(
    SessionResponseSchema,
    await fetch(new URL("/api/auth/get-session", origin), {
      headers: { cookie },
    }),
  );
  const secondVaultResponse = await fetch(
    new URL("/api/auth/sign-in/anonymous", origin),
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: origin.origin,
      },
      body: JSON.stringify({}),
    },
  );
  if (!secondVaultResponse.ok) {
    throw new Error(
      `Second vault returned HTTP ${secondVaultResponse.status}: ${await secondVaultResponse.text()}`,
    );
  }
  const secondCookie = responseCookie(secondVaultResponse);
  const secondBrowserSession = await decodeJson(
    SessionResponseSchema,
    await fetch(new URL("/api/auth/get-session", origin), {
      headers: { cookie: secondCookie },
    }),
  );
  if (restoredBrowserSession.user.id === secondBrowserSession.user.id) {
    throw new Error("Independent browser sessions shared an anonymous user");
  }
  const isolatedTokens = await authorizeExistingBrowserSession({
    authorizationEndpoint: metadata.authorization_endpoint,
    clientId: registered.client_id,
    cookie: secondCookie,
    origin,
    redirectUri,
    requestedScopes,
    resource,
    state: "isolated-prototype-state",
    tokenEndpoint: metadata.token_endpoint,
  });
  const isolatedPrincipal = await oauth.right.verifyAccessToken(
    isolatedTokens.access_token,
  );
  if (Either.isLeft(isolatedPrincipal)) {
    throw new Error(isolatedPrincipal.left.message);
  }
  if (isolatedPrincipal.right === principal.right) {
    throw new Error("Independent browser sessions derived the same principal");
  }
  const deletionResponse = await fetch(
    new URL("/api/auth/delete-anonymous-user", origin),
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie,
        origin: origin.origin,
      },
      body: JSON.stringify({}),
    },
  );
  const deletionBody = await deletionResponse.text();
  if (
    deletionResponse.status !== 400 ||
    !deletionBody.includes("Deleting anonymous users is disabled")
  ) {
    throw new Error(
      `Anonymous-user deletion endpoint is unexpectedly enabled: HTTP ${deletionResponse.status} ${deletionBody}`,
    );
  }
  const savedSessionMcp = await verifySavedSessionMcp({
    accessToken: refreshedTokens.access_token,
    databasePath: join(scratchDirectory, "mcp-play-sessions.sqlite"),
    isolatedAccessToken: isolatedTokens.access_token,
    oauth: oauth.right,
  });
  process.stdout.write(
    `${JSON.stringify(
      {
        tag: "betterAuthPrototypeObserved",
        issuer: metadata.issuer,
        authorizationEndpoint: metadata.authorization_endpoint.toString(),
        tokenEndpoint: metadata.token_endpoint.toString(),
        jwksAvailable: true,
        cimdAdvertised: metadata.client_id_metadata_document_supported,
        dcr: {
          publicClientCreated: true,
          clientIdPresent: registered.client_id.length > 0,
          redirectUris: registered.redirect_uris.map((url) => url.toString()),
          tokenEndpointAuthentication: registered.token_endpoint_auth_method,
        },
        authorizationCodePkce: {
          credentialFreeVaultCreated: true,
          registeredClientIdentityDisplayed:
            publicClient.client_name.length > 0,
          consentRequired: true,
          callbackStatePreserved:
            callbackUrl.searchParams.get("state") === "prototype-state",
          accessTokenIssued: tokens.access_token.length > 0,
          accessTokenType: tokens.token_type,
          scopes: tokens.scope.split(/\s+/u).filter(Boolean).sort(),
          refreshTokenIssued: tokens.refresh_token.length > 0,
          refreshTokenRotated: true,
          refreshRetryReplayedRotatedResponse: true,
          refreshTokenLifetimeSeconds:
            SAVED_SESSION_REFRESH_TOKEN_LIFETIME_SECONDS,
          existingMcpVerifierAccepted: true,
          principalDerived: principal.right.length > 0,
          browserSessionRestored: restoredBrowserSession.user.id.length > 0,
          independentBrowserSessionsIsolated: true,
          anonymousUserDeletionDisabled: true,
        },
        savedSessionMcp,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await authRuntime.dispose();
  await rm(scratchDirectory, { recursive: true });
}

async function handleRequest(
  incoming: IncomingMessage,
  outgoing: ServerResponse,
): Promise<void> {
  const body = await requestBody(incoming);
  const headers = new Headers();
  for (const [name, value] of Object.entries(incoming.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }
  const response = await Effect.runPromise(
    service.handle(
      new Request(new URL(incoming.url ?? "/", origin), {
        method: incoming.method ?? "GET",
        headers,
        ...(body === undefined ? {} : { body }),
      }),
    ),
  );
  outgoing.statusCode = response.status;
  response.headers.forEach((value, name) => outgoing.setHeader(name, value));
  outgoing.end(Buffer.from(await response.arrayBuffer()));
}

async function requestBody(
  incoming: IncomingMessage,
): Promise<Uint8Array | undefined> {
  if (incoming.method === "GET" || incoming.method === "HEAD") return undefined;
  const chunks: Buffer[] = [];
  for await (const chunk of incoming) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function decodeJson<A, I>(
  schema: Schema.Schema<A, I>,
  response: Response,
): Promise<A> {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  const decoded = Schema.decodeUnknownEither(schema)(await response.json());
  if (Either.isLeft(decoded)) throw new Error(decoded.left.message);
  return decoded.right;
}
