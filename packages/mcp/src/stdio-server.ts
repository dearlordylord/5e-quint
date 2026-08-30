import { Effect } from "effect";

export function dndMcpStdioProgram<Transport>(
  server: { readonly connect: (transport: Transport) => Promise<void> },
  transport: Transport,
) {
  return Effect.tryPromise({
    try: () => server.connect(transport),
    catch: (error) =>
      error instanceof Error
        ? error
        : new Error("MCP transport connection failed.", { cause: error }),
  }).pipe(
    Effect.tapError((error) =>
      Effect.sync(() => {
        console.error("MCP server crashed", error.toString());
      }),
    ),
    Effect.flatMap(() => Effect.never),
  );
}
