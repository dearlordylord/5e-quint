import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js"

function extractTextResult(result: Awaited<ReturnType<Client["callTool"]>>) {
  if (typeof result !== "object" || result == null || !("content" in result)) return result
  const content = (result as { readonly content?: ReadonlyArray<{ readonly text?: string }> }).content
  const text = content?.[0]?.text
  return typeof text === "string" ? JSON.parse(text) : result
}

async function main() {
  const transport = new StdioClientTransport({
    command: "pnpm",
    args: ["dev"],
    cwd: "/workspace/typescript/dnd/packages/mcp",
    stderr: "inherit",
  })

  const client = new Client({
    name: "local-mcp-harness",
    version: "0.1.0",
  })

  try {
    await client.connect(transport)
    console.log(`connected to MCP pid=${transport.pid}`)

    const initialState = extractTextResult(
      await client.callTool(
        { name: "get_state", arguments: {} },
        CallToolResultSchema,
      ),
    )
    console.log("initial get_state:", JSON.stringify(initialState, null, 2))

    const initialActions = extractTextResult(
      await client.callTool(
        { name: "get_available_actions", arguments: {} },
        CallToolResultSchema,
      ),
    )
    console.log("initial get_available_actions:", JSON.stringify(initialActions, null, 2))

    const enterCombat = extractTextResult(
      await client.callTool(
        { name: "execute_action", arguments: { type: "ENTER_COMBAT" } },
        CallToolResultSchema,
      ),
    )
    console.log("execute ENTER_COMBAT:", JSON.stringify(enterCombat, null, 2))

    const startTurn = extractTextResult(
      await client.callTool(
        { name: "execute_action", arguments: { type: "START_TURN" } },
        CallToolResultSchema,
      ),
    )
    console.log("execute START_TURN:", JSON.stringify(startTurn, null, 2))

    const secondWind = extractTextResult(
      await client.callTool(
        { name: "execute_action", arguments: { type: "USE_SECOND_WIND" } },
        CallToolResultSchema,
      ),
    )
    console.log("execute USE_SECOND_WIND:", JSON.stringify(secondWind, null, 2))

    const finalState = extractTextResult(
      await client.callTool(
        { name: "get_state", arguments: {} },
        CallToolResultSchema,
      ),
    )
    console.log("final get_state:", JSON.stringify(finalState, null, 2))
  } finally {
    await transport.close()
    console.log("transport closed")
  }
}

void main()
