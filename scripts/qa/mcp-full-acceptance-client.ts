import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import {
  verifyAgentConversationScenarios,
  verifyGreenVertical,
  verifyToolContract,
  verifyWidthVertical,
} from "../../packages/mcp/test-support/mcp-acceptance-scenarios.ts";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function main() {
  verifyAgentConversationScenarios();

  const preexistingDndMcpPids = dndMcpServerPids();
  assert.deepEqual(
    preexistingDndMcpPids,
    [],
    `Preexisting DND MCP server processes: ${preexistingDndMcpPids.join(", ")}`,
  );

  const transport = new StdioClientTransport({
    command: "pnpm",
    args: ["--filter", "@dnd/mcp", "dev"],
    cwd: REPO_ROOT,
    stderr: "inherit",
  });
  const client = new Client({
    name: "dnd-full-acceptance-client",
    version: "0.1.0",
  });

  try {
    await client.connect(transport);
    await verifyToolContract(client);
    await verifyGreenVertical(client);
    await verifyWidthVertical(client);
  } finally {
    await closeTransportBestEffort(transport);
    killDndMcpServerPids(preexistingDndMcpPids);
  }

  assert.deepEqual(dndMcpServerPids(), []);
}

async function closeTransportBestEffort(transport: StdioClientTransport) {
  await Promise.race([
    transport.close(),
    new Promise<void>((resolve) => setTimeout(resolve, 1_000)),
  ]);
}

function dndMcpServerPids() {
  const output = execFileSync("ps", ["-eo", "pid=,ppid=,command="], {
    encoding: "utf8",
  });
  const processes = output
    .split("\n")
    .map((line) => line.trim())
    .map((line) => {
      const [pidText, ppidText, ...commandParts] = line.split(/\s+/);
      return {
        pid: Number(pidText),
        ppid: Number(ppidText),
        command: commandParts.join(" "),
      };
    })
    .filter(
      (entry) =>
        Number.isInteger(entry.pid) &&
        entry.pid > 0 &&
        entry.pid !== process.pid,
    );
  const roots = new Set(
    processes
      .filter((entry) => dndMcpServerRootCommand(entry.command))
      .map((entry) => entry.pid),
  );
  const pids = new Set(roots);
  let changed = true;
  while (changed) {
    changed = false;
    for (const entry of processes) {
      if (pids.has(entry.ppid) && !pids.has(entry.pid)) {
        pids.add(entry.pid);
        changed = true;
      }
    }
  }
  return [...pids];
}

function dndMcpServerRootCommand(command: string) {
  return /\bpnpm\b/.test(command) && /--filter\s+@dnd\/mcp\s+dev/.test(command);
}

function killDndMcpServerPids(preexistingPids: readonly number[]) {
  const preexisting = new Set(preexistingPids);
  const pids = dndMcpServerPids().filter((pid) => !preexisting.has(pid));
  if (pids.length === 0) return;
  for (const pid of pids) {
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // Already exited.
    }
  }
  const remaining = dndMcpServerPids().filter((pid) => !preexisting.has(pid));
  for (const pid of remaining) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // Already exited.
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
