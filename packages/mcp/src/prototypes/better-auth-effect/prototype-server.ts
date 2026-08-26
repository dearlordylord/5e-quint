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
import {
  prototypeConsentPage,
  prototypeStatusPage,
  prototypeVaultPage,
} from "./prototype-pages.ts";

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
  if (pathname === "/prototype/vault") {
    await writeResponse(input.outgoing, prototypeVaultPage());
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
