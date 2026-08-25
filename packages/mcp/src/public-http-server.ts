import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { Either } from "effect";

import {
  createMcpApplicationServices,
  type McpApplicationServices,
} from "./composition-root.ts";
import { createDndMcpProtocolServer } from "./protocol-server.ts";
import type { PlaySessionRepository } from "./recoverable-play-session.ts";
import { RECOVERABLE_PLAY_SESSION_FORMAT_VERSION } from "./play-session-repository.ts";
import type { PublicMcpOAuth } from "./public-oauth.ts";
import type { PlaySessionRequestIdentity } from "./play-session-protocol.ts";
import {
  isPublicPublisherSitePath,
  publicPublisherSiteResponse,
} from "./public-publisher-site.ts";
import {
  authorizedForMetrics,
  DEFAULT_PUBLIC_MCP_PUBLISHER_NAME,
  observePublicMcpRequest,
  PUBLIC_MCP_SERVICE_NAME,
  publicMcpMetrics,
  publicMcpHttpMethod,
  publicMcpOutcome,
  publicMcpToolName,
  publicMcpTraceContext,
  type PublicMcpDiagnostic,
  type PublicMcpRequestOutcome,
  type PublicMcpServiceOperations,
} from "./public-service-operations.ts";

export const PUBLIC_MCP_MAX_REQUEST_BYTES = 1_048_576;

export type DndMcpHttpServer = {
  listen(): Promise<Either.Either<URL, DndMcpHttpServerIssue>>;
  close(): Promise<Either.Either<void, DndMcpHttpServerIssue>>;
};

export type DndMcpHttpServerIssue = {
  readonly tag: "dndMcpHttpServerIssue";
  readonly reason: "listenFailed" | "invalidAddress" | "closeFailed";
  readonly message: string;
};

export function createDndMcpHttpServer(input: {
  readonly playSessionRepository: PlaySessionRepository;
  readonly applicationServices?: McpApplicationServices;
  readonly hostname?: string;
  readonly port?: number;
  readonly oauth?: PublicMcpOAuth;
  readonly operations?: PublicMcpServiceOperations;
}): DndMcpHttpServer {
  const applicationServices =
    input.applicationServices ?? createMcpApplicationServices();
  const hostname = input.hostname ?? "127.0.0.1";
  const port = input.port ?? 0;
  const server = createServer((incoming, outgoing) => {
    handleNodeRequest({
      incoming,
      outgoing,
      hostname,
      applicationServices,
      playSessionRepository: input.playSessionRepository,
      ...(input.oauth === undefined ? {} : { oauth: input.oauth }),
      operations: input.operations ?? {
        environment: "development",
        release: "development",
        publisherName: DEFAULT_PUBLIC_MCP_PUBLISHER_NAME,
      },
    }).catch(() => {
      if (outgoing.headersSent) {
        outgoing.destroy();
        return;
      }
      writeResponse(
        outgoing,
        new Response("Internal server error", { status: 500 }),
      ).catch(() => outgoing.destroy());
    });
  });

  return {
    listen() {
      return new Promise((resolve) => {
        const onError = (cause: Error) =>
          resolve(Either.left(httpServerIssue("listenFailed", cause)));
        server.once("error", onError);
        server.listen(port, hostname, () => {
          server.off("error", onError);
          const address = server.address();
          if (address === null || typeof address === "string") {
            resolve(
              Either.left({
                tag: "dndMcpHttpServerIssue",
                reason: "invalidAddress",
                message: "Public MCP server did not bind a TCP address.",
              }),
            );
            return;
          }
          resolve(
            Either.right(new URL(`http://${hostname}:${address.port}/mcp`)),
          );
        });
      });
    },
    close() {
      return new Promise((resolve) => {
        if (!server.listening) {
          resolve(Either.right(undefined));
          return;
        }
        server.close((error) => {
          resolve(
            error === undefined
              ? Either.right(undefined)
              : Either.left(httpServerIssue("closeFailed", error)),
          );
        });
      });
    },
  };
}

function httpServerIssue(
  reason: DndMcpHttpServerIssue["reason"],
  cause: unknown,
): DndMcpHttpServerIssue {
  return {
    tag: "dndMcpHttpServerIssue",
    reason,
    message: cause instanceof Error ? cause.message : String(cause),
  };
}

async function handleNodeRequest(input: {
  readonly incoming: IncomingMessage;
  readonly outgoing: ServerResponse;
  readonly hostname: string;
  readonly applicationServices: McpApplicationServices;
  readonly playSessionRepository: PlaySessionRepository;
  readonly oauth?: PublicMcpOAuth;
  readonly operations: PublicMcpServiceOperations;
}): Promise<void> {
  const startedAt = performance.now();
  const trace = publicMcpTraceContext();
  const pathname = new URL(
    input.incoming.url ?? "/",
    `http://${input.hostname}`,
  ).pathname;
  let status = 500;
  let outcome: PublicMcpRequestOutcome = "failed";
  let toolName: string | undefined;
  let diagnostic: PublicMcpDiagnostic | undefined;
  const finish = () =>
    observePublicMcpRequest({
      environment: input.operations.environment,
      release: input.operations.release,
      traceId: trace.traceId,
      spanId: trace.spanId,
      method: publicMcpHttpMethod(input.incoming.method),
      route: publicRouteLabel(pathname),
      status,
      outcome,
      durationMilliseconds: Math.round(performance.now() - startedAt),
      ...(toolName === undefined ? {} : { toolName }),
      ...(diagnostic === undefined ? {} : { diagnostic }),
    });
  try {
    const publisherSiteResponse = publicPublisherSiteResponse(
      pathname,
      input.incoming.method,
      input.operations.publisherName,
    );
    if (publisherSiteResponse !== undefined) {
      status = publisherSiteResponse.status;
      outcome = status < 400 ? "accepted" : "rejected";
      await writeResponse(input.outgoing, publisherSiteResponse);
      return;
    }
    if (pathname === "/health" && input.incoming.method === "GET") {
      status = 200;
      outcome = "accepted";
      await writeResponse(
        input.outgoing,
        Response.json({ status: "ok", service: PUBLIC_MCP_SERVICE_NAME }),
      );
      return;
    }
    if (pathname === "/version" && input.incoming.method === "GET") {
      status = 200;
      outcome = "accepted";
      await writeResponse(
        input.outgoing,
        Response.json({
          service: PUBLIC_MCP_SERVICE_NAME,
          environment: input.operations.environment,
          release: input.operations.release,
          publisher: input.operations.publisherName,
          storageFormatVersion: RECOVERABLE_PLAY_SESSION_FORMAT_VERSION,
        }),
      );
      return;
    }
    if (
      pathname === "/.well-known/openai-apps-challenge" &&
      input.incoming.method === "GET" &&
      input.operations.openAiAppsChallenge !== undefined
    ) {
      status = 200;
      outcome = "accepted";
      await writeResponse(
        input.outgoing,
        new Response(input.operations.openAiAppsChallenge, {
          headers: { "content-type": "text/plain; charset=utf-8" },
        }),
      );
      return;
    }
    if (pathname === "/metrics" && input.incoming.method === "GET") {
      const authorized = authorizedForMetrics(
        input.incoming.headers.authorization ?? null,
        input.operations.metricsBearerToken,
      );
      status = authorized ? 200 : 404;
      outcome = authorized ? "accepted" : "rejected";
      await writeResponse(
        input.outgoing,
        authorized
          ? new Response(publicMcpMetrics(), {
              headers: { "content-type": "text/plain; version=0.0.4" },
            })
          : new Response("Not found", { status: 404 }),
      );
      return;
    }
    if (
      pathname === "/.well-known/oauth-protected-resource" &&
      input.incoming.method === "GET" &&
      input.oauth !== undefined
    ) {
      await writeResponse(
        input.outgoing,
        Response.json(input.oauth.protectedResourceMetadata),
      );
      status = 200;
      outcome = "accepted";
      return;
    }
    if (pathname !== "/mcp") {
      await writeResponse(
        input.outgoing,
        new Response("Not found", { status: 404 }),
      );
      status = 404;
      outcome = "rejected";
      return;
    }
    const request = await webRequest(input.incoming, input.hostname);
    if (Either.isLeft(request)) {
      await writeResponse(
        input.outgoing,
        new Response("Request body is too large", { status: 413 }),
      );
      status = 413;
      outcome = "rejected";
      return;
    }
    toolName = await publicMcpToolName(request.right);
    const identity = await requestIdentity(request.right, input.oauth);
    if (Either.isLeft(identity)) {
      await writeResponse(
        input.outgoing,
        new Response("Unauthorized", {
          status: 401,
          headers: { "WWW-Authenticate": identity.left.challenge },
        }),
      );
      status = 401;
      outcome = "rejected";
      return;
    }
    const host = createDndMcpProtocolServer(
      input.applicationServices,
      undefined,
      {
        playSessionRepository: input.playSessionRepository,
        requestIdentity: identity.right,
      },
    );
    const transport = new WebStandardStreamableHTTPServerTransport({
      enableJsonResponse: true,
    });
    try {
      await host.server.connect(transport);
      const response = await transport.handleRequest(request.right);
      response.headers.set(
        "traceparent",
        `00-${trace.traceId}-${trace.spanId}-01`,
      );
      status = response.status;
      const observedOutcome = await publicMcpOutcome(response);
      outcome = observedOutcome.outcome;
      diagnostic = observedOutcome.diagnostic;
      await writeResponse(input.outgoing, response);
    } finally {
      await host.server.close();
    }
  } finally {
    finish();
  }
}

function publicRouteLabel(pathname: string): string {
  if (isPublicPublisherSitePath(pathname)) return "publisher-site";
  if (pathname === "/mcp") return "/mcp";
  if (pathname === "/health") return "/health";
  if (pathname === "/version") return "/version";
  if (pathname === "/metrics") return "/metrics";
  if (pathname.startsWith("/.well-known/")) return "/.well-known/*";
  return "other";
}

async function webRequest(
  incoming: IncomingMessage,
  hostname: string,
): Promise<Either.Either<Request, { readonly tag: "requestTooLarge" }>> {
  const body = await requestBody(incoming);
  if (Either.isLeft(body)) return Either.left(body.left);
  const headers = new Headers();
  for (const [name, value] of Object.entries(incoming.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }
  return Either.right(
    new Request(new URL(incoming.url ?? "/", `http://${hostname}`).toString(), {
      headers,
      ...(incoming.method === undefined ? {} : { method: incoming.method }),
      ...(body.right.byteLength === 0 ? {} : { body: body.right }),
    }),
  );
}

async function requestBody(
  incoming: IncomingMessage,
): Promise<Either.Either<Uint8Array, { readonly tag: "requestTooLarge" }>> {
  const chunks: Buffer[] = [];
  let byteLength = 0;
  for await (const chunk of incoming) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    byteLength += buffer.byteLength;
    if (byteLength > PUBLIC_MCP_MAX_REQUEST_BYTES) {
      return Either.left({ tag: "requestTooLarge" });
    }
    chunks.push(buffer);
  }
  return Either.right(Buffer.concat(chunks));
}

async function requestIdentity(
  request: Request,
  oauth: PublicMcpOAuth | undefined,
): Promise<
  Either.Either<PlaySessionRequestIdentity, { readonly challenge: string }>
> {
  const authorization = request.headers.get("authorization");
  if (authorization === null) {
    return Either.right({
      tag: "anonymous",
      savedPlaySessions:
        oauth === undefined
          ? { tag: "unavailable" }
          : {
              tag: "oauth",
              resourceMetadataUrl: oauth.resourceMetadataUrl.toString(),
            },
    });
  }
  const match = /^Bearer ([^\s]+)$/u.exec(authorization);
  if (oauth === undefined || match?.[1] === undefined) {
    return Either.left({ challenge: oauthChallenge(oauth, "invalid_token") });
  }
  const verified = await oauth.verifyAccessToken(match[1]);
  return Either.isRight(verified)
    ? Either.right({ tag: "authenticated", principalId: verified.right })
    : Either.left({ challenge: oauthChallenge(oauth, "invalid_token") });
}

function oauthChallenge(
  oauth: PublicMcpOAuth | undefined,
  error: "invalid_token",
): string {
  const parameters = [
    ...(oauth === undefined
      ? []
      : [`resource_metadata="${oauth.resourceMetadataUrl.toString()}"`]),
    `error="${error}"`,
    'error_description="The OAuth access token is invalid"',
  ];
  return `Bearer ${parameters.join(", ")}`;
}

async function writeResponse(
  outgoing: ServerResponse,
  response: Response,
): Promise<void> {
  outgoing.writeHead(response.status, Object.fromEntries(response.headers));
  outgoing.end(new Uint8Array(await response.arrayBuffer()));
}
