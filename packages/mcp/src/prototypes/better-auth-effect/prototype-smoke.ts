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
} from "./better-auth-service.ts";
import { PLAY_SESSION_OAUTH_SCOPE } from "../../tool-definition-contract.ts";
import { createPublicMcpOAuth } from "../../public-oauth.ts";
import { verifySavedSessionMcp } from "./saved-session-mcp-smoke.ts";

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
        scope: `openid profile email ${PLAY_SESSION_OAUTH_SCOPE}`,
      }),
    }),
  );
  const signupResponse = await fetch(
    new URL("/api/auth/sign-up/email", origin),
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: origin.origin,
      },
      body: JSON.stringify({
        email: "prototype@example.test",
        name: "OAuth Prototype User",
        password: "prototype-password-not-for-production",
      }),
    },
  );
  if (!signupResponse.ok) {
    throw new Error(
      `Sign-up returned HTTP ${signupResponse.status}: ${await signupResponse.text()}`,
    );
  }
  const cookie = responseCookie(signupResponse);
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
    scope: `openid profile email ${PLAY_SESSION_OAUTH_SCOPE}`,
    resource: resource.toString(),
    code_challenge: challenge,
    code_challenge_method: "S256",
    state: "prototype-state",
  }).toString();
  const authorization = await decodeJson(
    RedirectResultSchema,
    await fetch(authorizeUrl, { headers: { cookie } }),
  );
  if (!authorization.redirect) {
    throw new Error("Authorization did not return a redirect");
  }
  const consentUrl = new URL(authorization.url, origin);
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
  const principal = await oauth.right.verifyAccessToken(tokens.access_token);
  if (Either.isLeft(principal)) throw new Error(principal.left.message);
  const savedSessionMcp = await verifySavedSessionMcp({
    accessToken: tokens.access_token,
    databasePath: join(scratchDirectory, "mcp-play-sessions.sqlite"),
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
          consentRequired: true,
          callbackStatePreserved:
            callbackUrl.searchParams.get("state") === "prototype-state",
          accessTokenIssued: tokens.access_token.length > 0,
          accessTokenType: tokens.token_type,
          scopes: tokens.scope.split(/\s+/u).filter(Boolean).sort(),
          existingMcpVerifierAccepted: true,
          principalDerived: principal.right.length > 0,
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

function responseCookie(response: Response): string {
  const cookies = response.headers
    .getSetCookie()
    .map((value) => value.split(";", 1)[0])
    .filter((value): value is string => value !== undefined);
  if (cookies.length === 0)
    throw new Error("Sign-up returned no session cookie");
  return cookies.join("; ");
}
