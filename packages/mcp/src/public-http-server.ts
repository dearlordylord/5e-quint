import { createServer } from "node:http";

import { Either } from "effect";

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
  if (attempt.tag === "failed") throw attempt.cause;
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
