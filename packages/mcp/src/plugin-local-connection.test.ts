import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Schema } from "effect";
import { describe, expect, test } from "vitest";

const pluginRoot = fileURLToPath(
  new URL("../../../plugins/dnd-srd-oracle/", import.meta.url),
);
const repositoryRoot = resolve(pluginRoot, "../..");
const localMcpConfigRoot = resolve(repositoryRoot, "packages/mcp/test-support");
const localMcpConfigPath = resolve(
  localMcpConfigRoot,
  "dnd-srd-oracle-local-mcp.json",
);
const pluginManifestPath = resolve(pluginRoot, ".codex-plugin/plugin.json");
const LOCAL_PLUGIN_CONNECTION_TEST_TIMEOUT_MS = 150_000;
const LOCAL_PLUGIN_WORKFLOW_DEADLINE_MS = 120_000;
const PROCESS_TERMINATION_GRACE_MS = 100;
const PROCESS_TERMINATION_POLL_MS = 50;
const PROCESS_TERMINATION_DEADLINE_MS = 2_000;
const PROC_STAT_START_TIME_INDEX_AFTER_COMMAND = 19;

const LocalMcpConfigSchema = Schema.Struct({
  mcpServers: Schema.Struct({
    "dnd-srd-oracle": Schema.Struct({
      command: Schema.String,
      args: Schema.Array(Schema.String),
      cwd: Schema.String,
    }),
  }),
});

const InstalledPluginManifestSchema = Schema.Struct({
  name: Schema.Literal("dnd-srd-oracle"),
  skills: Schema.String,
  interface: Schema.Struct({
    displayName: Schema.Literal("5.5e SRD Oracle"),
  }),
  mcpServers: Schema.optionalKey(Schema.String),
});

describe("local 5.5e SRD Oracle plugin evaluation seams", () => {
  test("keeps the installed Skill package separate from the source MCP seam", () => {
    const manifest = decodeJsonFile(
      InstalledPluginManifestSchema,
      pluginManifestPath,
    );

    expect(manifest.mcpServers).toBeUndefined();
    expect(existsSync(resolve(pluginRoot, ".mcp.json"))).toBe(false);
    expect(localMcpConfigPath.startsWith(`${pluginRoot}/`)).toBe(false);
    expect(readFileSync(localMcpConfigPath, "utf8")).toContain('"@dnd/mcp"');
  });

  test(
    "starts the configured stdio command and connects to the real MCP protocol",
    async () => {
      const config = decodeJsonFile(LocalMcpConfigSchema, localMcpConfigPath)
        .mcpServers["dnd-srd-oracle"];
      const transport = new StdioClientTransport({
        command: config.command,
        args: [...config.args],
        cwd: resolve(localMcpConfigRoot, config.cwd),
        stderr: "pipe",
      });
      const client = new Client({
        name: "dnd-srd-oracle-local-plugin-evaluation",
        version: "0.1.0",
      });

      try {
        await withDeadline(
          exerciseLocalMcp(client, transport),
          LOCAL_PLUGIN_WORKFLOW_DEADLINE_MS,
        );
      } finally {
        await closeLocalMcpProcessTree(client, transport);
      }
    },
    LOCAL_PLUGIN_CONNECTION_TEST_TIMEOUT_MS,
  );
});

async function exerciseLocalMcp(
  client: Client,
  transport: StdioClientTransport,
): Promise<void> {
  await client.connect(transport);
  const toolNames = (await client.listTools()).tools.map(({ name }) => name);
  expect(toolNames).toContain("create_play_session");
  expect(toolNames).toContain("list_catalog_units");
  expect(toolNames).toContain("inspect_catalog_unit");

  const catalog = await client.callTool({
    name: "list_catalog_units",
    arguments: {},
  });
  expect(catalog.isError).not.toBe(true);
  expect(catalog.structuredContent).toBeDefined();

  const created = await client.callTool({
    name: "create_play_session",
    arguments: {},
  });
  const playSessionId = playSessionIdFrom(created.structuredContent);
  const characters = await client.callTool({
    name: "list_characters",
    arguments: { playSessionId },
  });
  expect(characters.isError).not.toBe(true);
  expect(characters.structuredContent).toMatchObject({
    tag: "playSessionAvailable",
    playSessionId,
    operation: { name: "list_characters" },
  });

  const missingUnit = await client.callTool({
    name: "inspect_catalog_unit",
    arguments: { unitId: "synthetic_missing_unit" },
  });
  expect(missingUnit.isError).toBe(true);
  expect(JSON.stringify(missingUnit.content)).toContain("UNKNOWN_CATALOG_UNIT");
}

async function withDeadline<A>(work: Promise<A>, milliseconds: number) {
  return Promise.race([
    work,
    delay(milliseconds, undefined, { ref: false }).then(() => {
      throw new Error(`Local MCP workflow exceeded ${milliseconds}ms.`);
    }),
  ]);
}

type SpawnedProcessIdentity = {
  readonly pid: number;
  readonly startTime: string;
};

async function closeLocalMcpProcessTree(
  client: Client,
  transport: StdioClientTransport,
): Promise<void> {
  const spawnedProcesses = spawnedProcessTree(transport.pid);
  await client.close().catch(() => undefined);
  await transport.close().catch(() => undefined);
  signalMatchingProcesses(spawnedProcesses, "SIGTERM");
  await delay(PROCESS_TERMINATION_GRACE_MS);
  signalMatchingProcesses(spawnedProcesses, "SIGKILL");
  const retainedProcess = await waitForProcessTreeExit(spawnedProcesses);
  if (retainedProcess !== undefined) {
    throw new Error(
      `Local MCP process ${retainedProcess.pid} remained after teardown.`,
    );
  }
}

async function waitForProcessTreeExit(
  processes: readonly SpawnedProcessIdentity[],
): Promise<SpawnedProcessIdentity | undefined> {
  const deadline = Date.now() + PROCESS_TERMINATION_DEADLINE_MS;
  while (Date.now() < deadline) {
    const retainedProcess = matchingProcess(processes);
    if (retainedProcess === undefined) return undefined;
    await delay(PROCESS_TERMINATION_POLL_MS);
  }
  return matchingProcess(processes);
}

function matchingProcess(
  processes: readonly SpawnedProcessIdentity[],
): SpawnedProcessIdentity | undefined {
  return processes.find(
    (identity) =>
      processIdentity(identity.pid)?.startTime === identity.startTime,
  );
}

function spawnedProcessTree(
  rootPid: number | null,
): readonly SpawnedProcessIdentity[] {
  if (rootPid === null) return [];
  const visited = new Set<number>();
  const visit = (pid: number): readonly SpawnedProcessIdentity[] => {
    if (visited.has(pid)) return [];
    visited.add(pid);
    const identity = processIdentity(pid);
    if (identity === null) return [];
    return [
      identity,
      ...childProcessIds(pid).flatMap((childPid) => visit(childPid)),
    ];
  };
  return visit(rootPid);
}

function childProcessIds(pid: number): readonly number[] {
  try {
    const children = readFileSync(
      `/proc/${pid}/task/${pid}/children`,
      "utf8",
    ).trim();
    return children === "" ? [] : children.split(/\s+/u).map(Number);
  } catch {
    return [];
  }
}

function processIdentity(pid: number): SpawnedProcessIdentity | null {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    const fieldsAfterCommand = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
    const startTime =
      fieldsAfterCommand[PROC_STAT_START_TIME_INDEX_AFTER_COMMAND];
    return startTime === undefined ? null : { pid, startTime };
  } catch {
    return null;
  }
}

function signalMatchingProcesses(
  processes: readonly SpawnedProcessIdentity[],
  signal: NodeJS.Signals,
): void {
  for (const identity of [...processes].reverse()) {
    if (processIdentity(identity.pid)?.startTime !== identity.startTime)
      continue;
    try {
      process.kill(identity.pid, signal);
    } catch {
      // The process exited after its identity was checked.
    }
  }
}

function decodeJsonFile<S extends Schema.ConstraintDecoder<unknown, never>>(
  schema: S,
  path: string,
): S["Type"] {
  return Schema.decodeUnknownSync(schema)(
    JSON.parse(readFileSync(path, "utf8")),
  );
}

function playSessionIdFrom(value: unknown): string {
  const decoded = Schema.decodeUnknownSync(
    Schema.Struct({ playSessionId: Schema.String }),
  )(value);
  return decoded.playSessionId;
}
