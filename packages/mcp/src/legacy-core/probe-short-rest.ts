import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { Effect } from "effect";

import { makeDevMcpClient, runDevScript } from "../dev-client.ts";
import { extractTextResult } from "../tool-result.ts";

const main = Effect.gen(function* () {
  const { client } = yield* makeDevMcpClient;

  const available = extractTextResult(
    yield* Effect.tryPromise(() =>
      client.callTool(
        { name: "get_available_actions", arguments: {} },
        CallToolResultSchema,
      ),
    ),
  );
  console.log(JSON.stringify({ available }, null, 2));
}).pipe(Effect.scoped);

runDevScript(main);
