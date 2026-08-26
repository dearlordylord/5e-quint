import { type IncomingMessage, type ServerResponse } from "node:http";

import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { Either } from "effect";

import type { McpApplicationServices } from "./composition-root.ts";
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
  PUBLIC_MCP_SERVICE_NAME,
  publicMcpMetrics,
  publicMcpOutcome,
  publicMcpToolName,
  type PublicMcpDiagnostic,
  type PublicMcpRequestOutcome,
  type PublicMcpServiceOperations,
} from "./public-service-operations.ts";

export const PUBLIC_MCP_MAX_REQUEST_BYTES = 1_048_576;

export type PublicHttpRequestInput = {
  readonly incoming: IncomingMessage;
  readonly outgoing: ServerResponse;
  readonly hostname: string;
  readonly applicationServices: McpApplicationServices;
  readonly playSessionRepository: PlaySessionRepository;
  readonly oauth?: PublicMcpOAuth;
  readonly operations: PublicMcpServiceOperations;
};

export type PublicHttpRequestObservation = {
  readonly status: number;
  readonly outcome: PublicMcpRequestOutcome;
  readonly toolName?: string;
  readonly diagnostic?: PublicMcpDiagnostic;
};

export async function handlePublicHttpRequest(
  input: PublicHttpRequestInput,
  pathname: string,
  trace: { readonly traceId: string; readonly spanId: string },
): Promise<PublicHttpRequestObservation> {
  const fixedRoute = await handleFixedPublicRoute(input, pathname);
  if (fixedRoute !== undefined) return fixedRoute;
  return handleMcpRoute(input, pathname, trace);
}

export function publicRouteLabel(pathname: string): string {
  if (isPublicPublisherSitePath(pathname)) return "publisher-site";
  if (pathname === "/mcp") return "/mcp";
  if (pathname === "/health") return "/health";
  if (pathname === "/version") return "/version";
  if (pathname === "/metrics") return "/metrics";
  if (pathname.startsWith("/.well-known/")) return "/.well-known/*";
  return "other";
}

async function handleFixedPublicRoute(
  input: PublicHttpRequestInput,
  pathname: string,
): Promise<PublicHttpRequestObservation | undefined> {
  const publisherSite = await handlePublisherSiteRoute(input, pathname);
  if (publisherSite !== undefined) return publisherSite;
  const health = await handleHealthRoute(input, pathname);
  if (health !== undefined) return health;
  const version = await handleVersionRoute(input, pathname);
  if (version !== undefined) return version;
  const challenge = await handleAppsChallengeRoute(input, pathname);
  if (challenge !== undefined) return challenge;
  const metrics = await handleMetricsRoute(input, pathname);
  if (metrics !== undefined) return metrics;
  const oauth = await handleProtectedResourceRoute(input, pathname);
  if (oauth !== undefined) return oauth;
  if (pathname === "/mcp") return undefined;
  await writePublicHttpResponse(
    input.outgoing,
    new Response("Not found", { status: 404 }),
  );
  return { status: 404, outcome: "rejected" };
}

async function handlePublisherSiteRoute(
  input: PublicHttpRequestInput,
  pathname: string,
): Promise<PublicHttpRequestObservation | undefined> {
  const response = publicPublisherSiteResponse(
    pathname,
    input.incoming.method,
    input.operations.publisherName,
  );
  if (response === undefined) return undefined;
  await writePublicHttpResponse(input.outgoing, response);
  return {
    status: response.status,
    outcome: response.status < 400 ? "accepted" : "rejected",
  };
}

async function handleHealthRoute(
  input: PublicHttpRequestInput,
  pathname: string,
): Promise<PublicHttpRequestObservation | undefined> {
  if (pathname !== "/health" || input.incoming.method !== "GET") {
    return undefined;
  }
  await writePublicHttpResponse(
    input.outgoing,
    Response.json({ status: "ok", service: PUBLIC_MCP_SERVICE_NAME }),
  );
  return { status: 200, outcome: "accepted" };
}

async function handleVersionRoute(
  input: PublicHttpRequestInput,
  pathname: string,
): Promise<PublicHttpRequestObservation | undefined> {
  if (pathname !== "/version" || input.incoming.method !== "GET") {
    return undefined;
  }
  await writePublicHttpResponse(
    input.outgoing,
    Response.json({
      service: PUBLIC_MCP_SERVICE_NAME,
      environment: input.operations.environment,
      release: input.operations.release,
      publisher: input.operations.publisherName,
      storageFormatVersion: RECOVERABLE_PLAY_SESSION_FORMAT_VERSION,
    }),
  );
  return { status: 200, outcome: "accepted" };
}

async function handleAppsChallengeRoute(
  input: PublicHttpRequestInput,
  pathname: string,
): Promise<PublicHttpRequestObservation | undefined> {
  const challenge = input.operations.openAiAppsChallenge;
  if (
    pathname !== "/.well-known/openai-apps-challenge" ||
    input.incoming.method !== "GET" ||
    challenge === undefined
  ) {
    return undefined;
  }
  await writePublicHttpResponse(
    input.outgoing,
    new Response(challenge, {
      headers: { "content-type": "text/plain; charset=utf-8" },
    }),
  );
  return { status: 200, outcome: "accepted" };
}

async function handleMetricsRoute(
  input: PublicHttpRequestInput,
  pathname: string,
): Promise<PublicHttpRequestObservation | undefined> {
  if (pathname !== "/metrics" || input.incoming.method !== "GET") {
    return undefined;
  }
  const authorized = authorizedForMetrics(
    input.incoming.headers.authorization ?? null,
    input.operations.metricsBearerToken,
  );
  await writePublicHttpResponse(
    input.outgoing,
    authorized
      ? new Response(publicMcpMetrics(), {
          headers: { "content-type": "text/plain; version=0.0.4" },
        })
      : new Response("Not found", { status: 404 }),
  );
  return {
    status: authorized ? 200 : 404,
    outcome: authorized ? "accepted" : "rejected",
  };
}

async function handleProtectedResourceRoute(
  input: PublicHttpRequestInput,
  pathname: string,
): Promise<PublicHttpRequestObservation | undefined> {
  if (
    pathname !== "/.well-known/oauth-protected-resource" ||
    input.incoming.method !== "GET" ||
    input.oauth === undefined
  ) {
    return undefined;
  }
  await writePublicHttpResponse(
    input.outgoing,
    Response.json(input.oauth.protectedResourceMetadata),
  );
  return { status: 200, outcome: "accepted" };
}

async function handleMcpRoute(
  input: PublicHttpRequestInput,
  pathname: string,
  trace: { readonly traceId: string; readonly spanId: string },
): Promise<PublicHttpRequestObservation> {
  if (pathname !== "/mcp") {
    await writePublicHttpResponse(
      input.outgoing,
      new Response("Not found", { status: 404 }),
    );
    return { status: 404, outcome: "rejected" };
  }
  const request = await webRequest(input.incoming, input.hostname);
  if (Either.isLeft(request)) {
    await writePublicHttpResponse(
      input.outgoing,
      new Response("Request body is too large", { status: 413 }),
    );
    return { status: 413, outcome: "rejected" };
  }
  const toolName = await publicMcpToolName(request.right);
  const identity = await requestIdentity(request.right, input.oauth);
  if (Either.isLeft(identity)) {
    await writePublicHttpResponse(
      input.outgoing,
      new Response("Unauthorized", {
        status: 401,
        headers: { "WWW-Authenticate": identity.left.challenge },
      }),
    );
    return { status: 401, outcome: "rejected" };
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
    const observedOutcome = await publicMcpOutcome(response);
    await writePublicHttpResponse(input.outgoing, response);
    return {
      status: response.status,
      outcome: observedOutcome.outcome,
      ...(toolName === undefined ? {} : { toolName }),
      ...(observedOutcome.diagnostic === undefined
        ? {}
        : { diagnostic: observedOutcome.diagnostic }),
    };
  } finally {
    await host.server.close();
  }
}

async function webRequest(
  incoming: IncomingMessage,
  hostname: string,
): Promise<Either.Either<Request, { readonly tag: "requestTooLarge" }>> {
  const body = await requestBody(incoming);
  if (Either.isLeft(body)) return Either.left(body.left);
  const headers = requestHeaders(incoming);
  return Either.right(
    new Request(new URL(incoming.url ?? "/", `http://${hostname}`).toString(), {
      headers,
      ...(incoming.method === undefined ? {} : { method: incoming.method }),
      ...(body.right.byteLength === 0 ? {} : { body: body.right }),
    }),
  );
}

function requestHeaders(incoming: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(incoming.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }
  return headers;
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

export async function writePublicHttpResponse(
  outgoing: ServerResponse,
  response: Response,
): Promise<void> {
  outgoing.writeHead(response.status, Object.fromEntries(response.headers));
  outgoing.end(new Uint8Array(await response.arrayBuffer()));
}
