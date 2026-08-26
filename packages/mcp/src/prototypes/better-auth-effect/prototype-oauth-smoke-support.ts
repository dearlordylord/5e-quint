import { createHash, randomBytes } from "node:crypto";

import { Either, Schema } from "effect";

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

export const SessionResponseSchema = Schema.Struct({
  user: Schema.Struct({ id: Schema.NonEmptyTrimmedString }),
});

export const PublicClientSchema = Schema.Struct({
  client_id: Schema.NonEmptyTrimmedString,
  client_name: Schema.NonEmptyTrimmedString,
});

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
  const consentUrl = new URL(authorization.url, input.origin);
  if (!authorization.redirect || consentUrl.pathname !== "/prototype/consent") {
    throw new Error("Existing browser session did not require consent");
  }
  const consent = await decodeJson(
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
        oauth_query: consentUrl.search.slice(1),
      }),
    }),
  );
  const callbackUrl = new URL(consent.url, input.origin);
  const code = callbackUrl.searchParams.get("code");
  if (!consent.redirect || code === null) {
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
