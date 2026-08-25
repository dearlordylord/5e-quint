import { execFileSync } from "node:child_process";
import {
  mkdir,
  readdir,
  readFile,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname } from "node:path";

const required = [
  "COMPOSE_PROJECT_NAME",
  "DND_MCP_DOMAIN",
  "DND_MCP_METRICS_TOKEN",
  "DND_MCP_STATE_DIRECTORY",
  "DND_MCP_RELEASE_DIRECTORY",
  "DND_MCP_FIXED_HOST_MONTHLY_USD",
];
for (const name of required) {
  if (!process.env[name]?.trim()) throw new Error(`${name} is required.`);
}

const releaseDirectory = process.env.DND_MCP_RELEASE_DIRECTORY;
const statePath = `${releaseDirectory}/budget-collector-state.json`;
const measurementPath = `${releaseDirectory}/measurements.json`;
const metrics = await fetch(`https://${process.env.DND_MCP_DOMAIN}/metrics`, {
  headers: { authorization: `Bearer ${process.env.DND_MCP_METRICS_TOKEN}` },
});
if (!metrics.ok)
  throw new Error(`Metrics endpoint returned ${metrics.status}.`);
const processMetrics = await metrics.text();
const stats = parseContainerStats(
  JSON.parse(
    execFileSync(
      "docker",
      [
        "stats",
        "--no-stream",
        "--format",
        "{{json .}}",
        `${process.env.COMPOSE_PROJECT_NAME}-mcp-1`,
      ],
      { encoding: "utf8" },
    ),
  ),
);
const month = new Date().toISOString().slice(0, 7);
const prior = await priorCollectorState(statePath, month);
const observed = {
  containerId: String(stats.ID),
  requests: requiredMetric(processMetrics, "dnd_mcp_requests_observed_total"),
  cpuSeconds: requiredMetric(
    processMetrics,
    "dnd_mcp_process_cpu_seconds_total",
  ),
  networkBytes: bytePairTotal(String(stats.NetIO)),
};
const sameContainer = prior.last?.containerId === observed.containerId;
const measurement = {
  requests:
    prior.requests +
    counterDelta(prior.last?.requests, observed.requests, sameContainer),
  cpuSeconds:
    prior.cpuSeconds +
    counterDelta(prior.last?.cpuSeconds, observed.cpuSeconds, sameContainer),
  peakMemoryBytes: Math.max(
    prior.peakMemoryBytes,
    bytePairFirst(String(stats.MemUsage)),
  ),
  storageBytes: await directoryBytes(process.env.DND_MCP_STATE_DIRECTORY),
  bandwidthBytes:
    prior.bandwidthBytes +
    counterDelta(
      prior.last?.networkBytes,
      observed.networkBytes,
      sameContainer,
    ),
  fixedHostCostUsd: finiteNumber(
    process.env.DND_MCP_FIXED_HOST_MONTHLY_USD,
    "DND_MCP_FIXED_HOST_MONTHLY_USD",
  ),
};
await mkdir(releaseDirectory, { recursive: true });
await atomicJsonWrite(statePath, { month, ...measurement, last: observed });
await atomicJsonWrite(measurementPath, measurement);
process.stdout.write(`${JSON.stringify({ measurementPath, measurement })}\n`);

function requiredMetric(input, name) {
  const samples = input
    .split("\n")
    .filter((line) => line.startsWith(`${name} `));
  if (samples.length !== 1) {
    throw new Error(`Required metric ${name} is missing or duplicated.`);
  }
  return finiteNumber(samples[0].trim().split(/\s+/u).at(-1), name);
}

function parseContainerStats(value) {
  if (
    typeof value !== "object" ||
    value === null ||
    typeof value.ID !== "string" ||
    value.ID.length === 0 ||
    typeof value.NetIO !== "string" ||
    typeof value.MemUsage !== "string"
  ) {
    throw new Error("Docker container statistics are invalid.");
  }
  return value;
}

function counterDelta(previous, current, sameContainer) {
  return sameContainer && typeof previous === "number" && current >= previous
    ? current - previous
    : current;
}

function bytePairFirst(input) {
  return bytes(input.split("/")[0]?.trim());
}

function bytePairTotal(input) {
  return input.split("/").reduce((sum, item) => sum + bytes(item.trim()), 0);
}

function bytes(input) {
  const match = /^(\d+(?:\.\d+)?)\s*(B|kB|MB|GB|TB|KiB|MiB|GiB|TiB)$/u.exec(
    input ?? "",
  );
  if (match === null) throw new Error(`Unsupported byte measurement: ${input}`);
  const factors = {
    B: 1,
    kB: 1_000,
    MB: 1_000_000,
    GB: 1_000_000_000,
    TB: 1_000_000_000_000,
    KiB: 1_024,
    MiB: 1_048_576,
    GiB: 1_073_741_824,
    TiB: 1_099_511_627_776,
  };
  return Number(match[1]) * factors[match[2]];
}

async function directoryBytes(path) {
  const entries = await readdir(path, { withFileTypes: true });
  let total = 0;
  for (const entry of entries) {
    const entryPath = `${path}/${entry.name}`;
    total += entry.isDirectory()
      ? await directoryBytes(entryPath)
      : (await stat(entryPath)).size;
  }
  return total;
}

async function priorCollectorState(path, month) {
  try {
    const decoded = JSON.parse(await readFile(path, "utf8"));
    if (decoded.month === month) return parseCollectorState(decoded);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  return {
    month,
    requests: 0,
    cpuSeconds: 0,
    peakMemoryBytes: 0,
    bandwidthBytes: 0,
  };
}

function parseCollectorState(value) {
  if (
    typeof value !== "object" ||
    value === null ||
    !nonNegative(value.requests) ||
    !nonNegative(value.cpuSeconds) ||
    !nonNegative(value.peakMemoryBytes) ||
    !nonNegative(value.bandwidthBytes) ||
    (value.last !== undefined &&
      (typeof value.last !== "object" ||
        value.last === null ||
        typeof value.last.containerId !== "string" ||
        value.last.containerId.length === 0 ||
        !nonNegative(value.last.requests) ||
        !nonNegative(value.last.cpuSeconds) ||
        !nonNegative(value.last.networkBytes)))
  ) {
    throw new Error("Budget collector state is invalid.");
  }
  return value;
}

function nonNegative(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function finiteNumber(input, name) {
  const value = Number(input);
  if (!Number.isFinite(value) || value < 0)
    throw new Error(`${name} is invalid.`);
  return value;
}

async function atomicJsonWrite(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value)}\n`, { mode: 0o600 });
  await rename(temporaryPath, path);
}
