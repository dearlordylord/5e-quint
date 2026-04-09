import { execFileSync } from "node:child_process";

import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { Effect } from "effect";

import { makeDevMcpClient, runDevScript } from "./dev-client.ts";
import { extractTextResult } from "./tool-result.ts";

function findOtherHarnessWrappers(): ReadonlyArray<number> {
  const output = execFileSync("ps", ["-eo", "pid=,args="], {
    encoding: "utf8",
  });
  return output
    .trim()
    .split("\n")
    .flatMap((line) => {
      const match = line.match(/^\s*(\d+)\s+(.*)$/);
      if (match == null) return [];
      const pid = Number(match[1]);
      const args = match[2] ?? "";
      if (!args.includes("pnpm --filter @dnd/mcp exec tsx src/harness.ts"))
        return [];
      if (pid === process.ppid) return [];
      return [pid];
    });
}

function logHarnessWrapperStatus(phase: "before" | "after") {
  const otherWrappers = findOtherHarnessWrappers();
  if (otherWrappers.length === 0) return;
  console.warn(
    `[harness] ${phase} run: found stale wrapper process(es): ${otherWrappers.join(", ")}. ` +
      "Check with `ps aux | grep '[p]npm --filter @dnd/mcp exec tsx src/harness.ts'` and clean with " +
      "`pkill -f 'pnpm --filter @dnd/mcp exec tsx src/harness.ts'` before trusting manual MCP inspection.",
  );
}

const main = Effect.gen(function* () {
  logHarnessWrapperStatus("before");
  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      console.log("transport closed");
      logHarnessWrapperStatus("after");
    }),
  );
  const { client, transport } = yield* makeDevMcpClient;
  console.log(`connected to MCP pid=${transport.pid}`);

  const initialState = extractTextResult(
    yield* Effect.tryPromise(() =>
      client.callTool(
        { name: "get_state", arguments: {} },
        CallToolResultSchema,
      ),
    ),
  );
  console.log("initial get_state:", JSON.stringify(initialState, null, 2));

  const initialActions = extractTextResult(
    yield* Effect.tryPromise(() =>
      client.callTool(
        { name: "get_available_actions", arguments: {} },
        CallToolResultSchema,
      ),
    ),
  );
  console.log(
    "initial get_available_actions:",
    JSON.stringify(initialActions, null, 2),
  );

  const enterCombat = extractTextResult(
    yield* Effect.tryPromise(() =>
      client.callTool(
        { name: "execute_action", arguments: { type: "ENTER_COMBAT" } },
        CallToolResultSchema,
      ),
    ),
  );
  console.log("execute ENTER_COMBAT:", JSON.stringify(enterCombat, null, 2));

  const startTurn = extractTextResult(
    yield* Effect.tryPromise(() =>
      client.callTool(
        { name: "execute_action", arguments: { type: "START_TURN" } },
        CallToolResultSchema,
      ),
    ),
  );
  console.log("execute START_TURN:", JSON.stringify(startTurn, null, 2));

  const secondWind = extractTextResult(
    yield* Effect.tryPromise(() =>
      client.callTool(
        { name: "execute_action", arguments: { type: "USE_SECOND_WIND" } },
        CallToolResultSchema,
      ),
    ),
  );
  console.log("execute USE_SECOND_WIND:", JSON.stringify(secondWind, null, 2));

  const finalState = extractTextResult(
    yield* Effect.tryPromise(() =>
      client.callTool(
        { name: "get_state", arguments: {} },
        CallToolResultSchema,
      ),
    ),
  );
  console.log("final get_state:", JSON.stringify(finalState, null, 2));
}).pipe(Effect.scoped);

runDevScript(main);
