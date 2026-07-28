import { Effect } from "effect";

export function dndMcpStdioProgram<Transport>(
  server: { readonly connect: (transport: Transport) => Promise<void> },
  transport: Transport,
): Effect.Effect<void> {
  return Effect.promise(() => server.connect(transport)).pipe(
    Effect.flatMap(() => Effect.never),
    Effect.catchAllCause((cause) =>
      Effect.sync(() => {
        console.error("MCP server crashed", cause.toString());
      }),
    ),
  );
}
