import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import { decodeEvaluationInventory } from "../test-support/evaluation-inventory.ts";

const pluginRoot = fileURLToPath(
  new URL("../../../plugins/srd-play/", import.meta.url),
);
const LOCAL_PLUGIN_CONNECTION_TEST_TIMEOUT_MS = 90_000;
const LOCAL_PLUGIN_WORKFLOW_DEADLINE_MS = 60_000;
const PROCESS_TERMINATION_GRACE_MS = 100;
const PROC_STAT_START_TIME_INDEX_AFTER_COMMAND = 19;

const LocalMcpConfigSchema = Schema.Struct({
  mcpServers: Schema.Struct({
    "srd-play": Schema.Struct({
      command: Schema.String,
      args: Schema.Array(Schema.String),
      cwd: Schema.String,
    }),
  }),
});

const ForwardTestResultsSchema = Schema.Struct({
  kind: Schema.Literal("independentStaticForwardTest"),
  evaluator: Schema.String,
  installedChatGptEvidence: Schema.Literal(false),
  cases: Schema.Array(
    Schema.Struct({
      id: Schema.String,
      activation: Schema.Literal("activate", "doNotActivate"),
      toolIntents: Schema.Array(Schema.String),
      result: Schema.String,
    }),
  ),
  findingsApplied: Schema.Array(Schema.String),
  externalEvidenceStillRequired: Schema.Struct({
    issue: Schema.Literal(328),
    scope: Schema.String,
  }),
});

describe("local SRD Play plugin evaluation seams", () => {
  test("retains the required MCP and installed-Skill evaluation inventory", () => {
    const inventory = decodeEvaluationInventory(
      resolve(pluginRoot, "evals/evaluation-inventory.json"),
    );

    expect(new Set(inventory.mcpToolSelection.map(({ kind }) => kind))).toEqual(
      new Set(["direct", "indirect", "followUp", "unsupported"]),
    );
    expect(new Set(inventory.skillActivation.map(({ kind }) => kind))).toEqual(
      new Set(["direct", "indirect", "followUp", "negative", "boundary"]),
    );
    assertFollowUpsReferenceEarlierCases(inventory.mcpToolSelection);
    assertFollowUpsReferenceEarlierCases(inventory.skillActivation);
    expect(inventory.evidenceOwners.installedChatGpt).toMatchObject({
      kind: "requiredExternalEvidence",
      issue: 328,
    });

    const forwardTest = decodeJsonFile(
      ForwardTestResultsSchema,
      resolve(pluginRoot, "evals/forward-test-results.json"),
    );
    const expectedActivationById = new Map(
      inventory.skillActivation.map(({ id, expectedActivation }) => [
        id,
        expectedActivation,
      ]),
    );
    expect(forwardTest.installedChatGptEvidence).toBe(false);
    expect(forwardTest.externalEvidenceStillRequired.issue).toBe(328);
    expect(forwardTest.cases.map(({ id }) => id).sort()).toEqual(
      inventory.skillActivation.map(({ id }) => id).sort(),
    );
    for (const result of forwardTest.cases) {
      expect(result.activation, result.id).toBe(
        expectedActivationById.get(result.id),
      );
    }
  });

  test(
    "starts the configured stdio command and connects to the real MCP protocol",
    async () => {
      const config = decodeJsonFile(
        LocalMcpConfigSchema,
        resolve(pluginRoot, ".mcp.json"),
      ).mcpServers["srd-play"];
      const transport = new StdioClientTransport({
        command: config.command,
        args: [...config.args],
        cwd: resolve(pluginRoot, config.cwd),
        stderr: "pipe",
      });
      const client = new Client({
        name: "srd-play-local-plugin-evaluation",
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
  await delay(PROCESS_TERMINATION_GRACE_MS);
  const retainedProcess = spawnedProcesses.find(
    (identity) =>
      processIdentity(identity.pid)?.startTime === identity.startTime,
  );
  if (retainedProcess !== undefined) {
    throw new Error(
      `Local MCP process ${retainedProcess.pid} remained after teardown.`,
    );
  }
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

function decodeJsonFile<S extends Schema.Schema.AnyNoContext>(
  schema: S,
  path: string,
): Schema.Schema.Type<S> {
  return Schema.decodeUnknownSync(schema)(
    JSON.parse(readFileSync(path, "utf8")),
  );
}

function assertFollowUpsReferenceEarlierCases(
  cases: readonly {
    readonly id: string;
    readonly after?: string;
  }[],
): void {
  const priorIds = new Set<string>();
  for (const evaluationCase of cases) {
    if (evaluationCase.after !== undefined) {
      expect(priorIds.has(evaluationCase.after), evaluationCase.id).toBe(true);
    }
    priorIds.add(evaluationCase.id);
  }
}

function playSessionIdFrom(value: unknown): string {
  const decoded = Schema.decodeUnknownSync(
    Schema.Struct({ playSessionId: Schema.String }),
  )(value);
  return decoded.playSessionId;
}
