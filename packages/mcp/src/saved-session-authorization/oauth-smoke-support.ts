import { createHash, randomBytes } from "node:crypto";
import type { IncomingMessage } from "node:http";

import { Either, Schema } from "effect";
import { createRemoteJWKSet, jwtVerify } from "jose";

import { isAnonymousVaultEmail } from "./vault-identity.ts";

export const AuthorizationServerMetadataSchema = Schema.Struct({
  issuer: Schema.NonEmptyTrimmedString,
  authorization_endpoint: Schema.URL,
  token_endpoint: Schema.URL,
  userinfo_endpoint: Schema.URL,
  jwks_uri: Schema.URL,
  registration_endpoint: Schema.URL,
  client_id_metadata_document_supported: Schema.Boolean,
});

export const RegisteredClientSchema = Schema.Struct({
  client_id: Schema.NonEmptyTrimmedString,
  redirect_uris: Schema.Array(Schema.URL),
  token_endpoint_auth_method: Schema.Literal("none"),
});

export const RedirectResultSchema = Schema.Struct({
  redirect: Schema.Boolean,
  url: Schema.NonEmptyTrimmedString,
});

const TokenResponseSchema = Schema.Struct({
  access_token: Schema.NonEmptyTrimmedString,
  expires_in: Schema.Number,
  id_token: Schema.optional(Schema.NonEmptyTrimmedString),
  refresh_token: Schema.optional(Schema.NonEmptyTrimmedString),
  scope: Schema.NonEmptyTrimmedString,
  token_type: Schema.NonEmptyTrimmedString,
});

export const RefreshTokenResponseSchema = Schema.Struct({
  access_token: Schema.NonEmptyTrimmedString,
  expires_in: Schema.Number,
  refresh_token: Schema.NonEmptyTrimmedString,
  scope: Schema.NonEmptyTrimmedString,
  token_type: Schema.NonEmptyTrimmedString,
});

export const SessionResponseSchema = Schema.Struct({
  user: Schema.Struct({ id: Schema.NonEmptyTrimmedString }),
});

export const PublicClientSchema = Schema.Struct({
  client_id: Schema.NonEmptyTrimmedString,
  client_name: Schema.NonEmptyTrimmedString,
});

export function assertTokenLifetime(
  tokens: { readonly expires_in: number },
  expectedSeconds: number,
): void {
  if (tokens.expires_in !== expectedSeconds)
    throw new Error("OAuth access token has the wrong lifetime");
}

export function assertRemainingTokenLifetime(
  tokens: { readonly expires_in: number },
  maximumSeconds: number,
): void {
  if (tokens.expires_in <= 0 || tokens.expires_in > maximumSeconds) {
    throw new Error("OAuth access token has an invalid remaining lifetime");
  }
}

export async function requestVaultRedirect(input: {
  readonly authorizationEndpoint: URL;
  readonly clientId: string;
  readonly origin: URL;
  readonly redirectUri: URL;
  readonly requestedScopes: string;
  readonly resource: URL;
  readonly state: string;
}): Promise<URL> {
  const authorizeUrl = new URL(input.authorizationEndpoint);
  authorizeUrl.search = new URLSearchParams({
    response_type: "code",
    client_id: input.clientId,
    redirect_uri: input.redirectUri.toString(),
    scope: input.requestedScopes,
    resource: input.resource.toString(),
    code_challenge: createHash("sha256")
      .update(randomBytes(48).toString("base64url"))
      .digest("base64url"),
    code_challenge_method: "S256",
    state: input.state,
  }).toString();
  const authorization = await decodeJson(
    RedirectResultSchema,
    await fetch(authorizeUrl),
  );
  const vaultUrl = new URL(authorization.url, input.origin);
  if (!authorization.redirect || vaultUrl.pathname !== "/saved-session-vault") {
    throw new Error("Authorization did not reach anonymous vault creation");
  }
  return vaultUrl;
}

export async function verifyChatGptAuthorization(input: {
  readonly accessTokenLifetimeSeconds: number;
  readonly authorizationEndpoint: URL;
  readonly clientId: string;
  readonly cookie: string;
  readonly issuer: string;
  readonly jwksUrl: URL;
  readonly origin: URL;
  readonly redirectUri: URL;
  readonly requestedScopes: string;
  readonly resource: URL;
  readonly tokenEndpoint: URL;
  readonly userInfoEndpoint: URL;
}): Promise<string> {
  const tokens = await authorizeExistingBrowserSession({
    ...input,
    state: "chatgpt-token-regression-state",
  });
  if (tokens.expires_in !== input.accessTokenLifetimeSeconds)
    throw new Error("ChatGPT access token has the wrong lifetime");
  if (tokens.refresh_token !== undefined || tokens.id_token === undefined)
    throw new Error("ChatGPT token response has unexpected token types");
  const grantedScopes = tokens.scope.split(" ").sort().join(" ");
  if (grantedScopes !== input.requestedScopes.split(" ").sort().join(" "))
    throw new Error(`ChatGPT received unexpected scopes: ${grantedScopes}`);
  const userInfoResponse = await fetch(input.userInfoEndpoint, {
    headers: { authorization: `Bearer ${tokens.access_token}` },
  });
  const userInfoUnknown: unknown = await userInfoResponse.json();
  const userInfo = decodeUnknown(
    Schema.Struct({
      sub: Schema.NonEmptyTrimmedString,
      email: Schema.NonEmptyTrimmedString,
      email_verified: Schema.Literal(false),
    }),
    userInfoUnknown,
  );
  const userInfoRecord = decodeUnknown(
    Schema.Record({ key: Schema.String, value: Schema.Unknown }),
    userInfoUnknown,
  );
  const claims = Object.keys(userInfoRecord).sort().join(" ");
  if (claims !== "email email_verified sub")
    throw new Error(`ChatGPT received unexpected identity claims: ${claims}`);
  if (!isAnonymousVaultEmail(userInfo.email))
    throw new Error("ChatGPT did not receive a synthetic vault email");
  const idToken = await jwtVerify(
    tokens.id_token,
    createRemoteJWKSet(input.jwksUrl),
    { issuer: input.issuer, audience: input.clientId },
  );
  const idTokenClaims = Object.keys(idToken.payload).sort().join(" ");
  if (idTokenClaims !== "acr at_hash aud auth_time exp iat iss sub")
    throw new Error(`Signed ID token has unexpected claims: ${idTokenClaims}`);
  if (idToken.payload.sub !== userInfo.sub)
    throw new Error("Signed ID token does not match the synthetic vault");
  return tokens.access_token;
}

export async function authorizeExistingBrowserSession(input: {
  readonly authorizationEndpoint: URL;
  readonly clientId: string;
  readonly cookie: string;
  readonly origin: URL;
  readonly redirectUri: URL;
  readonly requestedScopes: string;
  readonly resource: URL;
  readonly state: string;
  readonly tokenEndpoint: URL;
}): Promise<typeof TokenResponseSchema.Type> {
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const authorizeUrl = new URL(input.authorizationEndpoint);
  authorizeUrl.search = new URLSearchParams({
    response_type: "code",
    client_id: input.clientId,
    redirect_uri: input.redirectUri.toString(),
    scope: input.requestedScopes,
    resource: input.resource.toString(),
    code_challenge: challenge,
    code_challenge_method: "S256",
    state: input.state,
  }).toString();
  const authorization = await decodeJson(
    RedirectResultSchema,
    await fetch(authorizeUrl, { headers: { cookie: input.cookie } }),
  );
  if (!authorization.redirect)
    throw new Error("Existing browser session was not authorized");
  const authorizationUrl = new URL(authorization.url, input.origin);
  const callbackUrl =
    authorizationUrl.pathname === "/saved-session-consent"
      ? new URL(
          (
            await decodeJson(
              RedirectResultSchema,
              await fetch(new URL("/api/auth/oauth2/consent", input.origin), {
                method: "POST",
                headers: {
                  "content-type": "application/json",
                  cookie: input.cookie,
                  origin: input.origin.origin,
                },
                body: JSON.stringify({
                  accept: true,
                  oauth_query: authorizationUrl.search.slice(1),
                }),
              }),
            )
          ).url,
          input.origin,
        )
      : authorizationUrl;
  const code = callbackUrl.searchParams.get("code");
  if (code === null) {
    throw new Error("Consent did not return an authorization code");
  }
  return decodeJson(
    TokenResponseSchema,
    await fetch(input.tokenEndpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: input.clientId,
        code,
        code_verifier: verifier,
        redirect_uri: input.redirectUri.toString(),
        resource: input.resource.toString(),
      }),
    }),
  );
}

export function responseCookie(response: Response): string {
  const cookies = response.headers
    .getSetCookie()
    .map((value) => value.split(";", 1)[0])
    .filter((value): value is string => value !== undefined);
  if (cookies.length === 0) {
    throw new Error("Vault creation returned no session cookie");
  }
  return cookies.join("; ");
}

export async function requestBody(
  incoming: IncomingMessage,
): Promise<Uint8Array | undefined> {
  if (incoming.method === "GET" || incoming.method === "HEAD") return undefined;
  const chunks: Buffer[] = [];
  for await (const chunk of incoming)
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export async function decodeJson<A, I>(
  schema: Schema.Schema<A, I>,
  response: Response,
): Promise<A> {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }
  return decodeUnknown(schema, await response.json());
}

function decodeUnknown<A, I>(schema: Schema.Schema<A, I>, value: unknown): A {
  const decoded = Schema.decodeUnknownEither(schema)(value);
  if (Either.isLeft(decoded)) throw new Error(decoded.left.message);
  return decoded.right;
}
