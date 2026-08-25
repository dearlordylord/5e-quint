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
}): Promise<void> {
  const request = await webRequest(input.incoming, input.hostname);
  if (new URL(request.url).pathname !== "/mcp") {
    await writeResponse(
      input.outgoing,
      new Response("Not found", { status: 404 }),
    );
    return;
  }
  const host = createDndMcpProtocolServer(
    input.applicationServices,
    undefined,
    { playSessionRepository: input.playSessionRepository },
  );
  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
  });
  try {
    await host.server.connect(transport);
    const response = await transport.handleRequest(request);
    await writeResponse(input.outgoing, response);
  } finally {
    await host.server.close();
  }
}

async function webRequest(
  incoming: IncomingMessage,
  hostname: string,
): Promise<Request> {
  const body = await requestBody(incoming);
  const headers = new Headers();
  for (const [name, value] of Object.entries(incoming.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }
  return new Request(
    new URL(incoming.url ?? "/", `http://${hostname}`).toString(),
    {
      headers,
      ...(incoming.method === undefined ? {} : { method: incoming.method }),
      ...(body.byteLength === 0 ? {} : { body }),
    },
  );
}

async function requestBody(incoming: IncomingMessage): Promise<Uint8Array> {
  const chunks: Buffer[] = [];
  for await (const chunk of incoming) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function writeResponse(
  outgoing: ServerResponse,
  response: Response,
): Promise<void> {
  outgoing.writeHead(response.status, Object.fromEntries(response.headers));
  outgoing.end(new Uint8Array(await response.arrayBuffer()));
}
