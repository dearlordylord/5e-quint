const {
  existsSync,
  lstatSync,
  readFileSync,
  realpathSync,
} = require("node:fs");
const { basename, delimiter, resolve, sep } = require("node:path");
const Module = require("node:module");
const { register } = Module;
const { pathToFileURL } = require("node:url");

const {
  CODING_AGENT_EXECUTABLES,
  DETERMINISTIC_FIXTURE_IDENTITIES,
  DETERMINISTIC_NETWORK_GLOBALS,
  DETERMINISTIC_NETWORK_MODULES,
  NETWORK_CLI_EXECUTABLES,
} = require("./lane-classification.cjs");

if (process.env.RAW_SWARM_EXECUTION_LANE !== "deterministic") {
  return;
}

const guardMarker = Symbol.for("dnd.raw-swarm.deterministic-capability-guard");
if (globalThis[guardMarker] === true) return;
globalThis[guardMarker] = true;

const NETWORK_MODULES = new Set(DETERMINISTIC_NETWORK_MODULES);

const BLOCKED_EXECUTABLES = new Set([
  ...CODING_AGENT_EXECUTABLES,
  ...NETWORK_CLI_EXECUTABLES,
]);
const TEST_FIXTURE_DIRECTORY = resolve(require("node:os").tmpdir());
const REPOSITORY_ROOT = resolve(__dirname, "../..");
const DETERMINISTIC_GUARD_PATH = resolve(__filename);
const DETERMINISTIC_NODE_OPTIONS = `--require=${DETERMINISTIC_GUARD_PATH}`;

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
  let path;
  try {
    path = realpathSync(filename);
  } catch {
    path = resolve(filename);
  }
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
  const commandText = String(command)
    .trim()
    .replace(/^['"`]+|['"`]+$/g, "")
    .split(/\s+/u)[0];
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

function isCanonicalFixtureExecutable(path, executableName) {
  if (typeof path !== "string") return false;
  const candidate = resolve(path);
  const marker = DETERMINISTIC_FIXTURE_IDENTITIES[executableName];
  if (typeof marker !== "string") return false;
  if (
    candidate === TEST_FIXTURE_DIRECTORY ||
    !candidate.startsWith(`${TEST_FIXTURE_DIRECTORY}${sep}`)
  ) {
    return false;
  }
  try {
    const stats = lstatSync(candidate);
    if (!stats.isFile() || stats.isSymbolicLink()) return false;
    if (realpathSync(candidate) !== candidate) return false;
    return readFileSync(candidate, "utf8").includes(marker);
  } catch {
    return false;
  }
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

function childOptionsIndex(values) {
  return values.findIndex(
    (value) =>
      value !== null && typeof value === "object" && !Array.isArray(value),
  );
}

function optionsEnvironment(values) {
  const index = childOptionsIndex(values);
  const options = index === -1 ? undefined : values[index];
  return options?.env ?? process.env;
}

function guardChildProcess(method, command, values) {
  const environment = optionsEnvironment(values);
  const executable = normalizeExecutable(command);
  const resolved = executablePath(command, environment);
  if (method !== "fork" && NETWORK_CLI_EXECUTABLES.includes(executable)) {
    throw blockedCapability("network CLI", command);
  }
  if (method !== "fork" && CODING_AGENT_EXECUTABLES.includes(executable)) {
    if (!isCanonicalFixtureExecutable(resolved, executable)) {
      throw blockedCapability("coding-agent capability", command);
    }
  }
  const shellCommand = shellText([command, ...values]);
  const tokens = blockedTokens(shellCommand);
  if (
    method !== "fork" &&
    NETWORK_CLI_EXECUTABLES.some((name) => tokens.has(name))
  ) {
    throw blockedCapability("network CLI", shellCommand);
  }
  if (
    method !== "fork" &&
    CODING_AGENT_EXECUTABLES.some((name) => tokens.has(name))
  ) {
    const agentTokens = CODING_AGENT_EXECUTABLES.filter((name) =>
      tokens.has(name),
    );
    if (
      agentTokens.some(
        (name) =>
          !(
            name === executable && isCanonicalFixtureExecutable(resolved, name)
          ) &&
          !isCanonicalFixtureExecutable(
            executablePath(name, environment),
            name,
          ),
      )
    ) {
      throw blockedCapability("child-process capability", shellCommand);
    }
  }
}

function deterministicChildValues(method, values) {
  const environment = {
    ...optionsEnvironment(values),
    RAW_SWARM_EXECUTION_LANE: "deterministic",
    NODE_OPTIONS: DETERMINISTIC_NODE_OPTIONS,
  };
  const optionsIndex = childOptionsIndex(values);
  if (optionsIndex !== -1) {
    return values.map((value, index) =>
      index === optionsIndex ? { ...value, env: environment } : value,
    );
  }
  let insertionIndex = values.length;
  if (
    (method === "exec" || method === "execSync") &&
    typeof values.at(-1) === "function"
  ) {
    insertionIndex = values.length - 1;
  } else if (method === "execFile") {
    const callbackIndex = values.findIndex(
      (value) => typeof value === "function",
    );
    if (callbackIndex !== -1) insertionIndex = callbackIndex;
  }
  return [
    ...values.slice(0, insertionIndex),
    { env: environment },
    ...values.slice(insertionIndex),
  ];
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
    guardChildProcess(method, command, values);
    return original.call(
      this,
      command,
      ...deterministicChildValues(method, values),
    );
  };
}

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
