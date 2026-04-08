import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js"
import { Effect } from "effect"

import { makeDevMcpClient, runDevScript } from "./dev-client.ts"

function extractTextResult(result: { readonly content?: ReadonlyArray<{ readonly text?: string }> } | unknown) {
  if (typeof result !== "object" || result == null || !("content" in result)) return result
  const content = (result as { readonly content?: ReadonlyArray<{ readonly text?: string }> }).content
  const text = content?.[0]?.text
  return typeof text === "string" ? JSON.parse(text) : result
}

const main = Effect.gen(function* () {
  const { client } = yield* makeDevMcpClient

  const available = extractTextResult(
    yield* Effect.tryPromise(() => client.callTool(
      { name: "get_available_actions", arguments: {} },
      CallToolResultSchema,
    )),
  )
  console.log(JSON.stringify({ available }, null, 2))
}).pipe(Effect.scoped)

runDevScript(main)
