import { createServer } from "node:http";

import { Either, Match } from "effect";

import {
  createMcpApplicationServices,
  type McpApplicationServices,
} from "./composition-root.ts";
import type { PlaySessionRepository } from "./recoverable-play-session.ts";
import type { PublicMcpOAuth } from "./public-oauth.ts";
import {
  handlePublicHttpRequest,
  publicRouteLabel,
  type PublicHttpRequestInput,
  type PublicHttpRequestObservation,
  writePublicHttpResponse,
} from "./public-http-routes.ts";
import {
  DEFAULT_PUBLIC_MCP_PUBLISHER_NAME,
  observePublicMcpRequest,
  publicMcpHttpMethod,
  publicMcpTraceContext,
  type PublicMcpServiceOperations,
} from "./public-service-operations.ts";
import {
  handleSavedSessionAuthorizationRequest,
  isSavedSessionAuthorizationPath,
  type SavedSessionAuthorizationHttp,
} from "./saved-session-authorization/http.ts";

export type DndMcpHttpServer = {
  listen(): Promise<Either.Either<URL, DndMcpHttpServerIssue>>;
  close(): Promise<Either.Either<void, DndMcpHttpServerIssue>>;
};

export type DndMcpHttpServerIssue = {
  readonly tag: "dndMcpHttpServerIssue";
  readonly reason: "listenFailed" | "invalidAddress" | "closeFailed";
  readonly message: string;
};

export { PUBLIC_MCP_MAX_REQUEST_BYTES } from "./public-http-routes.ts";

type PublicHttpRequestAttempt =
  | {
      readonly tag: "completed";
      readonly observation: PublicHttpRequestObservation;
    }
  | {
      readonly tag: "failed";
      readonly observation: {
        readonly status: 500;
        readonly outcome: "failed";
      };
      readonly cause: unknown;
    };

export function createDndMcpHttpServer(input: {
  readonly playSessionRepository: PlaySessionRepository;
  readonly applicationServices?: McpApplicationServices;
  readonly hostname?: string;
  readonly port?: number;
  readonly oauth?: PublicMcpOAuth;
  readonly operations?: PublicMcpServiceOperations;
  readonly savedSessionAuthorization?: SavedSessionAuthorizationHttp;
}): DndMcpHttpServer {
  const applicationServices =
    input.applicationServices ?? createMcpApplicationServices();
  const hostname = input.hostname ?? "127.0.0.1";
  const port = input.port ?? 0;
  const operations = input.operations ?? {
    environment: "development" as const,
    release: "development",
    publisherName: DEFAULT_PUBLIC_MCP_PUBLISHER_NAME,
  };
  const server = createServer((incoming, outgoing) => {
    const pathname = new URL(incoming.url ?? "/", `http://${hostname}`)
      .pathname;
    if (
      input.savedSessionAuthorization !== undefined &&
      isSavedSessionAuthorizationPath(pathname)
    ) {
      handleSavedSessionAuthorizationNodeRequest({
        authorization: input.savedSessionAuthorization,
        incoming,
        operations,
        outgoing,
        pathname,
      }).catch(() => outgoing.destroy());
      return;
    }
    handleNodeRequest({
      incoming,
      outgoing,
      hostname,
      applicationServices,
      playSessionRepository: input.playSessionRepository,
      ...(input.oauth === undefined ? {} : { oauth: input.oauth }),
      operations,
    }).catch(() => {
      if (outgoing.headersSent) {
        outgoing.destroy();
        return;
      }
      writePublicHttpResponse(
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

async function handleSavedSessionAuthorizationNodeRequest(input: {
  readonly authorization: SavedSessionAuthorizationHttp;
  readonly incoming: Parameters<
    typeof handleSavedSessionAuthorizationRequest
  >[0]["incoming"];
  readonly operations: PublicMcpServiceOperations;
  readonly outgoing: Parameters<
    typeof handleSavedSessionAuthorizationRequest
  >[0]["outgoing"];
  readonly pathname: string;
}): Promise<void> {
  const startedAt = performance.now();
  const trace = publicMcpTraceContext();
  const observation = await savedSessionAuthorizationRequestAttempt(input);
  observePublicMcpRequest({
    environment: input.operations.environment,
    release: input.operations.release,
    traceId: trace.traceId,
    spanId: trace.spanId,
    method: publicMcpHttpMethod(input.incoming.method),
    route: publicRouteLabel(input.pathname),
    durationMilliseconds: Math.round(performance.now() - startedAt),
    ...observation,
  });
}

async function savedSessionAuthorizationRequestAttempt(input: {
  readonly authorization: SavedSessionAuthorizationHttp;
  readonly incoming: Parameters<
    typeof handleSavedSessionAuthorizationRequest
  >[0]["incoming"];
  readonly outgoing: Parameters<
    typeof handleSavedSessionAuthorizationRequest
  >[0]["outgoing"];
  readonly pathname: string;
}): Promise<{
  readonly status: number;
  readonly outcome: "accepted" | "rejected" | "failed";
}> {
  try {
    const result = await handleSavedSessionAuthorizationRequest(input);
    if (Either.isLeft(result)) {
      const status = result.left.reason === "requestTooLarge" ? 413 : 500;
      const outcome =
        result.left.reason === "requestTooLarge" ? "rejected" : "failed";
      if (input.outgoing.headersSent) {
        input.outgoing.destroy();
      } else {
        await writePublicHttpResponse(
          input.outgoing,
          new Response(
            result.left.reason === "requestTooLarge"
              ? "Request body is too large"
              : "Internal server error",
            { status },
          ),
        );
      }
      return { status, outcome };
    }
    const status = input.outgoing.statusCode;
    return { status, outcome: status < 400 ? "accepted" : "rejected" };
  } catch {
    if (input.outgoing.headersSent) {
      input.outgoing.destroy();
    } else {
      await writePublicHttpResponse(
        input.outgoing,
        new Response("Internal server error", { status: 500 }),
      );
    }
    return { status: 500, outcome: "failed" };
  }
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

async function handleNodeRequest(input: PublicHttpRequestInput): Promise<void> {
  const startedAt = performance.now();
  const trace = publicMcpTraceContext();
  const pathname = new URL(
    input.incoming.url ?? "/",
    `http://${input.hostname}`,
  ).pathname;
  const attempt = await publicHttpRequestAttempt(input, pathname, trace);
  observePublicMcpRequest({
    environment: input.operations.environment,
    release: input.operations.release,
    traceId: trace.traceId,
    spanId: trace.spanId,
    method: publicMcpHttpMethod(input.incoming.method),
    route: publicRouteLabel(pathname),
    durationMilliseconds: Math.round(performance.now() - startedAt),
    ...attempt.observation,
  });
  return Match.value(attempt).pipe(
    Match.when({ tag: "completed" }, () => undefined),
    Match.when({ tag: "failed" }, ({ cause }) => {
      throw cause;
    }),
    Match.exhaustive,
  );
}

async function publicHttpRequestAttempt(
  input: PublicHttpRequestInput,
  pathname: string,
  trace: { readonly traceId: string; readonly spanId: string },
): Promise<PublicHttpRequestAttempt> {
  try {
    return {
      tag: "completed",
      observation: await handlePublicHttpRequest(input, pathname, trace),
    };
  } catch (cause) {
    return {
      tag: "failed",
      observation: { status: 500, outcome: "failed" },
      cause,
    };
  }
}
