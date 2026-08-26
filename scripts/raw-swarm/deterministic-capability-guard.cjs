const { basename, delimiter, resolve } = require("node:path");
const { existsSync } = require("node:fs");
const Module = require("node:module");
const { syncBuiltinESMExports } = Module;

const {
  CODING_AGENT_EXECUTABLES,
  DETERMINISTIC_NETWORK_GLOBALS,
  NETWORK_CLI_EXECUTABLES,
} = require("./lane-classification.cjs");

if (process.env.RAW_SWARM_EXECUTION_LANE !== "deterministic") {
  return;
}

const guardMarker = Symbol.for("dnd.raw-swarm.deterministic-capability-guard");
if (globalThis[guardMarker] === true) return;
globalThis[guardMarker] = true;

const BLOCKED_EXECUTABLES = new Set([
  ...CODING_AGENT_EXECUTABLES,
  ...NETWORK_CLI_EXECUTABLES,
]);
const DETERMINISTIC_GUARD_PATH = resolve(__filename);
const DETERMINISTIC_NODE_OPTIONS = `--require=${DETERMINISTIC_GUARD_PATH}`;
const DETERMINISTIC_EXEC_ARGV = [DETERMINISTIC_NODE_OPTIONS];

function blockedCapability(kind, value) {
  return new Error(
    `Deterministic Raw Swarm lane blocked ${kind}: ${String(value)}`,
  );
}

function normalizeExecutable(value) {
  const firstToken = String(value)
    .trim()
    .replace(/^['"`]+|['"`]+$/g, "")
    .split(/\s+/u)[0];
  const name = basename(firstToken).toLowerCase();
  return name.replace(/\.(?:cmd|exe)$/u, "");
}

function blockedTokens(text) {
  return new Set(
    text
      .split(/[\s/\\"'`;|&()]+/u)
      .filter((token) => token.length > 0)
      .map(normalizeExecutable)
      .filter((token) => BLOCKED_EXECUTABLES.has(token)),
  );
}

function shellText(values) {
  const strings = [];
  const visit = (value) => {
    if (typeof value === "string") strings.push(value);
    else if (Array.isArray(value)) value.forEach(visit);
  };
  values.forEach(visit);
  return strings.join(" ");
}

function childOptionsIndex(values) {
  return values.findIndex(
    (value) =>
      value !== null && typeof value === "object" && !Array.isArray(value),
  );
}

function childOptions(values) {
  const index = childOptionsIndex(values);
  return index === -1 ? undefined : values[index];
}

function optionsEnvironment(values) {
  return childOptions(values)?.env ?? process.env;
}

function executablePath(command, environment) {
  const commandText = String(command)
    .trim()
    .replace(/^['"`]+|['"`]+$/g, "")
    .split(/\s+/u)[0];
  if (commandText.includes("/") || commandText.includes("\\")) {
    return commandText;
  }
  return (environment.PATH ?? "")
    .split(delimiter)
    .map((directory) => `${directory}/${commandText}`)
    .find((candidate) => existsSync(candidate));
}

function guardExecutable(command, environment) {
  const executable = normalizeExecutable(command);
  if (NETWORK_CLI_EXECUTABLES.includes(executable)) {
    throw blockedCapability("network CLI", command);
  }
  if (CODING_AGENT_EXECUTABLES.includes(executable)) {
    throw blockedCapability(
      "coding-agent capability",
      executablePath(command, environment) ?? command,
    );
  }
}

function guardShellOption(values, environment) {
  const shell = childOptions(values)?.shell;
  if (typeof shell !== "string") return;
  guardExecutable(shell, environment);
  const shellTokens = blockedTokens(shell);
  if (NETWORK_CLI_EXECUTABLES.some((name) => shellTokens.has(name))) {
    throw blockedCapability("network CLI", shell);
  }
  if (CODING_AGENT_EXECUTABLES.some((name) => shellTokens.has(name))) {
    throw blockedCapability("coding-agent capability", shell);
  }
}

function guardChildProcess(method, command, values) {
  const environment = optionsEnvironment(values);
  const customExecutable = childOptions(values)?.execPath;
  if (method === "fork" && customExecutable !== undefined) {
    guardExecutable(customExecutable, environment);
  } else {
    guardExecutable(command, environment);
  }
  guardShellOption(values, environment);
  const shellCommand = shellText([
    command,
    ...values,
    childOptions(values)?.shell,
    customExecutable,
  ]);
  const tokens = blockedTokens(shellCommand);
  if (NETWORK_CLI_EXECUTABLES.some((name) => tokens.has(name))) {
    throw blockedCapability("network CLI", shellCommand);
  }
  if (CODING_AGENT_EXECUTABLES.some((name) => tokens.has(name))) {
    throw blockedCapability("coding-agent capability", shellCommand);
  }
}

function deterministicEnvironment(environment) {
  return {
    ...environment,
    RAW_SWARM_EXECUTION_LANE: "deterministic",
    NODE_OPTIONS: DETERMINISTIC_NODE_OPTIONS,
  };
}

function callbackInsertionIndex(method, values) {
  if (
    (method === "exec" || method === "execSync") &&
    typeof values.at(-1) === "function"
  ) {
    return values.length - 1;
  }
  if (method === "execFile") {
    const callbackIndex = values.findIndex(
      (value) => typeof value === "function",
    );
    if (callbackIndex !== -1) return callbackIndex;
  }
  return values.length;
}

function deterministicChildValues(method, values) {
  const environment = deterministicEnvironment(optionsEnvironment(values));
  const optionsIndex = childOptionsIndex(values);
  if (optionsIndex !== -1) {
    return values.map((value, index) =>
      index === optionsIndex
        ? {
            ...value,
            env: environment,
            ...(method === "fork"
              ? { execArgv: [...DETERMINISTIC_EXEC_ARGV] }
              : {}),
          }
        : value,
    );
  }
  const insertionIndex = callbackInsertionIndex(method, values);
  return [
    ...values.slice(0, insertionIndex),
    {
      env: environment,
      ...(method === "fork" ? { execArgv: [...DETERMINISTIC_EXEC_ARGV] } : {}),
    },
    ...values.slice(insertionIndex),
  ];
}

const childProcess = require("node:child_process");
for (const method of [
  "spawn",
  "spawnSync",
  "exec",
  "execSync",
  "execFile",
  "execFileSync",
  "fork",
]) {
  const original = childProcess[method];
  if (typeof original !== "function") continue;
  childProcess[method] = function guardedChildProcess(command, ...values) {
    guardChildProcess(method, command, values);
    return original.call(
      this,
      command,
      ...deterministicChildValues(method, values),
    );
  };
}

const workerThreads = require("node:worker_threads");
const OriginalWorker = workerThreads.Worker;
if (typeof OriginalWorker === "function") {
  class DeterministicWorker extends OriginalWorker {
    constructor(filename, options) {
      const sourceOptions =
        options !== null && typeof options === "object" ? options : {};
      super(filename, {
        ...sourceOptions,
        env: deterministicEnvironment(sourceOptions.env ?? process.env),
        execArgv: [...DETERMINISTIC_EXEC_ARGV],
      });
    }
  }
  workerThreads.Worker = DeterministicWorker;
}
syncBuiltinESMExports();

function blockedNetworkGlobal(name) {
  return blockedCapability("network capability", name);
}

for (const name of DETERMINISTIC_NETWORK_GLOBALS) {
  if (!(name in globalThis)) continue;
  try {
    Object.defineProperty(globalThis, name, {
      configurable: false,
      enumerable: true,
      get() {
        throw blockedNetworkGlobal(name);
      },
      set() {
        throw blockedNetworkGlobal(name);
      },
    });
  } catch {
    globalThis[name] = function blockedGlobalNetworkCapability() {
      throw blockedNetworkGlobal(name);
    };
  }
}
