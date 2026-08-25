const { existsSync } = require("node:fs");
const { basename, delimiter, resolve, sep } = require("node:path");
const Module = require("node:module");
const { register } = Module;
const { pathToFileURL } = require("node:url");

const {
  CODING_AGENT_EXECUTABLES,
  NETWORK_CLI_EXECUTABLES,
} = require("./lane-classification.cjs");

if (process.env.RAW_SWARM_EXECUTION_LANE !== "deterministic") {
  return;
}

const guardMarker = Symbol.for("dnd.raw-swarm.deterministic-capability-guard");
if (globalThis[guardMarker] === true) return;
globalThis[guardMarker] = true;

const NETWORK_MODULES = new Set([
  "http",
  "https",
  "http2",
  "net",
  "tls",
  "dns",
  "dns/promises",
  "undici",
  "ws",
  "websocket",
  "isomorphic-ws",
  "node:http",
  "node:https",
  "node:http2",
  "node:net",
  "node:tls",
  "node:dns",
  "node:dns/promises",
  "node:undici",
]);

const BLOCKED_EXECUTABLES = new Set([
  ...CODING_AGENT_EXECUTABLES,
  ...NETWORK_CLI_EXECUTABLES,
]);
const TEST_FIXTURE_DIRECTORY = resolve(require("node:os").tmpdir());
const REPOSITORY_ROOT = resolve(__dirname, "../..");

register(
  pathToFileURL(resolve(__dirname, "deterministic-capability-loader.mjs")),
  {
    data: {
      blockedNetworkModules: [...NETWORK_MODULES],
      repositoryRoot: pathToFileURL(REPOSITORY_ROOT).href,
      temporaryRoot: pathToFileURL(TEST_FIXTURE_DIRECTORY).href,
    },
  },
);

function blockedCapability(kind, value) {
  return new Error(
    `Deterministic Raw Swarm lane blocked ${kind}: ${String(value)}`,
  );
}

function repositoryOwnedModule(parent) {
  const filename = parent?.filename;
  if (typeof filename !== "string") return true;
  const path = resolve(filename);
  return (
    !path.includes(`${sep}node_modules${sep}`) &&
    (path.startsWith(`${REPOSITORY_ROOT}${sep}`) ||
      path.startsWith(`${TEST_FIXTURE_DIRECTORY}${sep}`))
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

function executablePath(command, environment) {
  const commandText = String(command);
  if (commandText.includes("/") || commandText.includes("\\")) {
    return resolve(commandText);
  }
  for (const directory of (environment.PATH ?? "").split(delimiter)) {
    if (directory.length === 0) continue;
    const candidate = resolve(directory, commandText);
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

// Boundary tests use generated local command stubs under the OS temp root.
function isTestFixtureExecutable(path) {
  const candidate = resolve(path);
  return (
    candidate === TEST_FIXTURE_DIRECTORY ||
    candidate.startsWith(`${TEST_FIXTURE_DIRECTORY}${sep}`)
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

function blockedTokens(text) {
  return new Set(
    text
      .split(/[\s/\\"'`;|&()]+/u)
      .filter((token) => token.length > 0)
      .map(normalizeExecutable)
      .filter((token) => BLOCKED_EXECUTABLES.has(token)),
  );
}

function optionsEnvironment(values) {
  const options = values.find(
    (value) =>
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.hasOwn(value, "env"),
  );
  return options?.env ?? process.env;
}

function guardChildProcess(command, values) {
  const environment = optionsEnvironment(values);
  const executable = normalizeExecutable(command);
  const resolved = executablePath(command, environment);
  if (NETWORK_CLI_EXECUTABLES.includes(executable)) {
    throw blockedCapability("network CLI", command);
  }
  if (CODING_AGENT_EXECUTABLES.includes(executable)) {
    if (resolved === undefined || !isTestFixtureExecutable(resolved)) {
      throw blockedCapability("coding-agent capability", command);
    }
  }
  const shellCommand = shellText([command, ...values]);
  const tokens = blockedTokens(shellCommand);
  if (NETWORK_CLI_EXECUTABLES.some((name) => tokens.has(name))) {
    throw blockedCapability("network CLI", shellCommand);
  }
  if (CODING_AGENT_EXECUTABLES.some((name) => tokens.has(name))) {
    const agentTokens = CODING_AGENT_EXECUTABLES.filter((name) =>
      tokens.has(name),
    );
    if (
      agentTokens.some(
        (name) =>
          !isTestFixtureExecutable(executablePath(name, environment) ?? name),
      )
    ) {
      throw blockedCapability("child-process capability", shellCommand);
    }
  }
}

const originalModuleLoad = Module._load;
Module._load = function deterministicModuleLoad(request, parent, isMain) {
  if (NETWORK_MODULES.has(request) && repositoryOwnedModule(parent)) {
    throw blockedCapability("network capability", request);
  }
  return originalModuleLoad.call(this, request, parent, isMain);
};

if (typeof process.getBuiltinModule === "function") {
  const originalGetBuiltinModule = process.getBuiltinModule;
  process.getBuiltinModule = function deterministicBuiltinModule(name) {
    if (NETWORK_MODULES.has(name)) {
      throw blockedCapability("network capability", name);
    }
    return originalGetBuiltinModule.call(process, name);
  };
}

const childProcess = originalModuleLoad("node:child_process", module, false);
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
    guardChildProcess(command, values);
    return original.call(this, command, ...values);
  };
}

function blockedNetworkGlobal(name) {
  return blockedCapability("network capability", name);
}

for (const name of [
  "fetch",
  "WebSocket",
  "XMLHttpRequest",
  "WebTransport",
  "EventSource",
]) {
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
