import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

import { Either, Effect, ManagedRuntime, Schema } from "effect";

import {
  createDndMcpHttpServer,
  PUBLIC_MCP_MAX_REQUEST_BYTES,
} from "../../public-http-server.ts";
import { createPublicMcpOAuth } from "../../public-oauth.ts";
import { openSqlitePlaySessionRepository } from "../../recoverable-play-session.ts";
import {
  DEFAULT_PUBLIC_MCP_PUBLISHER_NAME,
  PublicMcpPublisherNameSchema,
} from "../../public-service-operations.ts";
import {
  BetterAuthPrototype,
  type BetterAuthPrototypeService,
  betterAuthPrototypeLayer,
} from "./better-auth-service.ts";

const PrototypeConfigurationSchema = Schema.Struct({
  authDatabasePath: Schema.NonEmptyTrimmedString,
  authSecret: Schema.NonEmptyTrimmedString.pipe(Schema.minLength(32)),
  hostname: Schema.NonEmptyTrimmedString,
  origin: Schema.URL,
  playSessionDatabasePath: Schema.NonEmptyTrimmedString,
  port: Schema.NumberFromString.pipe(Schema.int(), Schema.between(1, 65_535)),
  publisherName: PublicMcpPublisherNameSchema,
  release: Schema.NonEmptyTrimmedString,
});

const configuration = Schema.decodeUnknownEither(PrototypeConfigurationSchema)({
  authDatabasePath: process.env.DND_PROTOTYPE_AUTH_DATABASE_PATH,
  authSecret: process.env.DND_PROTOTYPE_AUTH_SECRET,
  hostname: process.env.DND_MCP_HOST ?? "0.0.0.0",
  origin: process.env.DND_PROTOTYPE_ORIGIN,
  playSessionDatabasePath: process.env.DND_PLAY_SESSION_DATABASE_PATH,
  port: process.env.PORT ?? "8787",
  publisherName:
    process.env.DND_MCP_PUBLISHER_NAME ?? DEFAULT_PUBLIC_MCP_PUBLISHER_NAME,
  release: process.env.DND_MCP_RELEASE ?? "better-auth-prototype",
});
if (Either.isLeft(configuration)) {
  process.stderr.write(`${configuration.left.message}\n`);
  process.exitCode = 1;
} else {
  await startPrototype(configuration.right);
}

async function startPrototype(
  input: typeof PrototypeConfigurationSchema.Type,
): Promise<void> {
  const resource = new URL("/mcp", input.origin);
  const issuer = new URL("/api/auth", input.origin);
  const oauth = createPublicMcpOAuth({
    resource: resource.toString(),
    authorizationServer: issuer.toString(),
    issuer: issuer.toString().replace(/\/$/u, ""),
    jwksUrl: new URL("/api/auth/jwks", input.origin).toString(),
  });
  if (Either.isLeft(oauth)) throw new Error(oauth.left.message);
  const repository = openSqlitePlaySessionRepository(
    input.playSessionDatabasePath,
  );
  if (Either.isLeft(repository)) throw new Error(repository.left.message);
  const internalMcp = createDndMcpHttpServer({
    hostname: "127.0.0.1",
    port: 0,
    playSessionRepository: repository.right,
    oauth: oauth.right,
    operations: {
      environment: "staging",
      release: input.release,
      publisherName: input.publisherName,
    },
  });
  const internalMcpEndpoint = await internalMcp.listen();
  if (Either.isLeft(internalMcpEndpoint)) {
    repository.right.close();
    throw new Error(internalMcpEndpoint.left.message);
  }
  const authRuntime = ManagedRuntime.make(
    betterAuthPrototypeLayer({
      authorizationServerOrigin: input.origin,
      databasePath: input.authDatabasePath,
      resource,
      secret: input.authSecret,
    }),
  );
  const authService = await authRuntime
    .runPromise(BetterAuthPrototype)
    .catch(async (cause) => {
      await internalMcp.close();
      repository.right.close();
      await authRuntime.dispose();
      throw cause;
    });
  const publicServer = createServer((incoming, outgoing) => {
    routeRequest({
      authService,
      incoming,
      internalMcpEndpoint: internalMcpEndpoint.right,
      origin: input.origin,
      outgoing,
    }).catch((cause) => {
      const requestIssue = isPrototypeRequestIssue(cause) ? cause : undefined;
      process.stderr.write(
        `${JSON.stringify({
          event: "better_auth_prototype_request_failed",
          reason: requestIssue?.reason ?? "unexpectedFailure",
        })}\n`,
      );
      if (outgoing.headersSent) {
        outgoing.destroy();
        return;
      }
      outgoing.statusCode =
        requestIssue?.reason === "requestTooLarge" ? 413 : 500;
      outgoing.end(
        outgoing.statusCode === 413
          ? "Request body is too large"
          : "Internal server error",
      );
    });
  });
  await new Promise<void>((resolve, reject) => {
    publicServer.once("error", reject);
    publicServer.listen(input.port, input.hostname, resolve);
  }).catch(async (cause) => {
    await internalMcp.close();
    repository.right.close();
    await authRuntime.dispose();
    throw cause;
  });
  process.stderr.write(
    `${JSON.stringify({
      event: "better_auth_prototype_initialized",
      endpoint: resource.toString(),
      issuer: issuer.toString(),
      release: input.release,
    })}\n`,
  );
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    publicServer.close(() => {
      internalMcp.close().finally(async () => {
        repository.right.close();
        await authRuntime.dispose();
      });
    });
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}

async function routeRequest(input: {
  readonly authService: BetterAuthPrototypeService;
  readonly incoming: IncomingMessage;
  readonly internalMcpEndpoint: URL;
  readonly origin: URL;
  readonly outgoing: ServerResponse;
}): Promise<void> {
  const decodedRequest = await webRequest(input.incoming, input.origin);
  if (Either.isLeft(decodedRequest)) throw decodedRequest.left;
  const request = decodedRequest.right;
  const pathname = new URL(request.url).pathname;
  if (pathname === "/prototype/login") {
    await writeResponse(input.outgoing, prototypeLoginPage());
    return;
  }
  if (pathname === "/prototype/consent") {
    await writeResponse(input.outgoing, prototypeConsentPage());
    return;
  }
  if (pathname === "/prototype") {
    await writeResponse(input.outgoing, prototypeStatusPage());
    return;
  }
  if (
    pathname === "/api/auth" ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/.well-known/oauth-authorization-server/api/auth"
  ) {
    await writeResponse(
      input.outgoing,
      await Effect.runPromise(input.authService.handle(request)),
    );
    return;
  }
  const internalUrl = new URL(request.url);
  internalUrl.protocol = input.internalMcpEndpoint.protocol;
  internalUrl.hostname = input.internalMcpEndpoint.hostname;
  internalUrl.port = input.internalMcpEndpoint.port;
  const proxyBody =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : new Uint8Array(await request.arrayBuffer());
  const proxyAbort = new AbortController();
  const abortProxy = () => proxyAbort.abort();
  input.outgoing.once("close", abortProxy);
  try {
    await writeResponse(
      input.outgoing,
      await fetch(
        new Request(internalUrl, {
          method: request.method,
          headers: request.headers,
          signal: proxyAbort.signal,
          ...(proxyBody === undefined ? {} : { body: proxyBody }),
        }),
      ),
    );
  } finally {
    input.outgoing.off("close", abortProxy);
  }
}

async function webRequest(
  incoming: IncomingMessage,
  origin: URL,
): Promise<Either.Either<Request, PrototypeRequestIssue>> {
  const headers = new Headers();
  for (const [name, value] of Object.entries(incoming.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }
  const body = await requestBody(incoming);
  if (Either.isLeft(body)) return Either.left(body.left);
  return Either.right(
    new Request(new URL(incoming.url ?? "/", origin), {
      method: incoming.method ?? "GET",
      headers,
      ...(body.right.byteLength === 0 ? {} : { body: body.right }),
    }),
  );
}

async function requestBody(
  incoming: IncomingMessage,
): Promise<Either.Either<Uint8Array, PrototypeRequestIssue>> {
  if (incoming.method === "GET" || incoming.method === "HEAD") {
    return Either.right(new Uint8Array());
  }
  const chunks: Buffer[] = [];
  let byteLength = 0;
  for await (const chunk of incoming) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    byteLength += buffer.byteLength;
    if (byteLength > PUBLIC_MCP_MAX_REQUEST_BYTES) {
      return Either.left(prototypeRequestIssue("requestTooLarge"));
    }
    chunks.push(buffer);
  }
  return Either.right(Buffer.concat(chunks));
}

async function writeResponse(
  outgoing: ServerResponse,
  response: Response,
): Promise<void> {
  outgoing.statusCode = response.status;
  for (const cookie of response.headers.getSetCookie()) {
    outgoing.appendHeader("set-cookie", cookie);
  }
  response.headers.forEach((value, name) => {
    if (name !== "set-cookie") outgoing.setHeader(name, value);
  });
  if (response.body === null) {
    outgoing.end();
    return;
  }
  const reader = response.body.getReader();
  try {
    while (!outgoing.destroyed) {
      const next = await reader.read();
      if (next.done) break;
      if (!outgoing.write(Buffer.from(next.value))) {
        await waitForDrainOrClose(outgoing);
      }
    }
  } finally {
    reader.releaseLock();
  }
  outgoing.end();
}

async function waitForDrainOrClose(outgoing: ServerResponse): Promise<void> {
  await new Promise<void>((resolve) => {
    const finished = () => {
      outgoing.off("drain", finished);
      outgoing.off("close", finished);
      resolve();
    };
    outgoing.once("drain", finished);
    outgoing.once("close", finished);
  });
}

type PrototypeRequestIssue = {
  readonly tag: "prototypeRequestIssue";
  readonly reason: "requestTooLarge";
};

function prototypeRequestIssue(
  reason: PrototypeRequestIssue["reason"],
): PrototypeRequestIssue {
  return { tag: "prototypeRequestIssue", reason };
}

function isPrototypeRequestIssue(
  value: unknown,
): value is PrototypeRequestIssue {
  return (
    typeof value === "object" &&
    value !== null &&
    "tag" in value &&
    value.tag === "prototypeRequestIssue"
  );
}

function prototypeLoginPage(): Response {
  return htmlResponse(`<!doctype html>
<meta charset="utf-8">
<title>5.5e SRD Oracle prototype sign in</title>
<main>
  <h1>Prototype sign in</h1>
  <p>This temporary account is needed only to test saving. Guest play stays anonymous.</p>
  <p>Use disposable credentials and do not reuse a real password.</p>
  <form id="login">
    <label>Email <input name="email" type="email" required></label>
    <label>Password <input name="password" type="password" minlength="8" required></label>
    <button name="action" value="sign-in">Sign in</button>
    <button name="action" value="sign-up">Create prototype account</button>
  </form>
  <pre id="message"></pre>
</main>
<script>
const form = document.querySelector("#login");
const message = document.querySelector("#message");
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const action = event.submitter.value;
  const response = await fetch(action === "sign-up" ? "/api/auth/sign-up/email" : "/api/auth/sign-in/email", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: data.get("email"),
      password: data.get("password"),
      name: "5.5e SRD Oracle player",
      oauth_query: location.search.slice(1),
    }),
  });
  const result = await response.json();
  if (!response.ok) { message.textContent = result.message ?? JSON.stringify(result); return; }
  if (result.url) location.href = result.url;
  else location.reload();
});
</script>`);
}

function prototypeConsentPage(): Response {
  return htmlResponse(`<!doctype html>
<meta charset="utf-8">
<title>Allow saved sessions</title>
<main>
  <h1>Save this play session?</h1>
  <p>The requesting client wants permission to save, list, resume, and delete your account-owned Play Sessions.</p>
  <p id="scope"></p>
  <button id="accept">Allow saved sessions</button>
  <button id="deny">Keep guest-only</button>
  <pre id="message"></pre>
</main>
<script>
const params = new URLSearchParams(location.search);
document.querySelector("#scope").textContent = "Requested scopes: " + (params.get("scope") ?? "");
async function decide(accept) {
  const response = await fetch("/api/auth/oauth2/consent", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ accept, oauth_query: location.search.slice(1) }),
  });
  const result = await response.json();
  if (!response.ok) { document.querySelector("#message").textContent = result.message ?? JSON.stringify(result); return; }
  location.href = result.url;
}
document.querySelector("#accept").addEventListener("click", () => decide(true));
document.querySelector("#deny").addEventListener("click", () => decide(false));
</script>`);
}

function prototypeStatusPage(): Response {
  return htmlResponse(`<!doctype html>
<meta charset="utf-8">
<title>Better Auth prototype</title>
<h1>Better Auth prototype</h1>
<p>Guest MCP: <code>/mcp</code></p>
<p>Authorization issuer: <code>/api/auth</code></p>
<p>This is throwaway staging evidence, not the production login experience.</p>`);
}

function htmlResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "content-security-policy":
        "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    },
  });
}
