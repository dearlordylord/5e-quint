const {
  existsSync,
  lstatSync,
  readFileSync,
  realpathSync,
} = require("node:fs");
const { basename, delimiter, resolve, sep } = require("node:path");
const Module = require("node:module");
const { register, syncBuiltinESMExports } = Module;
const { fileURLToPath, pathToFileURL } = require("node:url");

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
const DETERMINISTIC_EXEC_ARGV = [DETERMINISTIC_NODE_OPTIONS];
const ownedModulePaths = new Set();
const ownedRequireContext = { active: false };

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

function canonicalPath(filename) {
  try {
    return realpathSync(filename);
  } catch {
    return resolve(filename);
  }
}

function isNodeModulesPath(path) {
  return path.split(sep).includes("node_modules");
}

function repositoryOwnedPath(path) {
  const canonical = canonicalPath(path);
  return (
    !isNodeModulesPath(canonical) &&
    (canonical.startsWith(`${REPOSITORY_ROOT}${sep}`) ||
      canonical.startsWith(`${TEST_FIXTURE_DIRECTORY}${sep}`) ||
      ownedModulePaths.has(canonical))
  );
}

function repositoryOwnedModule(parent) {
  const filename = parent?.filename;
  if (typeof filename !== "string") return true;
  return repositoryOwnedPath(filename);
}

function callerIsNodeModule() {
  const caller = String(new Error().stack ?? "")
    .split("\n")
    .slice(2)
    .find(
      (line) =>
        !line.includes("deterministic-capability-guard.cjs") &&
        !line.includes("node:internal"),
    );
  return caller?.replaceAll("\\", "/").includes("/node_modules/") ?? false;
}

function rememberOwnedModule(request, parent) {
  const parentOwned =
    repositoryOwnedModule(parent) || ownedRequireContext.active;
  if (!parentOwned || typeof request !== "string") return;
  const target = (() => {
    try {
      return Module._resolveFilename(request, parent, false);
    } catch {
      return undefined;
    }
  })();
  if (
    typeof target === "string" &&
    target.startsWith(sep) &&
    !isNodeModulesPath(canonicalPath(target))
  ) {
    ownedModulePaths.add(canonicalPath(target));
  }
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

function childOptions(values) {
  const index = childOptionsIndex(values);
  return index === -1 ? undefined : values[index];
}

function optionsEnvironment(values) {
  const options = childOptions(values);
  return options?.env ?? process.env;
}

function guardExecutable(command, environment, kind) {
  const executable = normalizeExecutable(command);
  const resolved = executablePath(command, environment);
  if (NETWORK_CLI_EXECUTABLES.includes(executable)) {
    throw blockedCapability("network CLI", command);
  }
  if (
    CODING_AGENT_EXECUTABLES.includes(executable) &&
    !isCanonicalFixtureExecutable(resolved, executable)
  ) {
    throw blockedCapability(kind, command);
  }
}

function guardShellOption(values, environment) {
  const shell = childOptions(values)?.shell;
  if (typeof shell !== "string") return;
  guardExecutable(shell, environment, "coding-agent capability");
  const shellTokens = blockedTokens(shell);
  if (NETWORK_CLI_EXECUTABLES.some((name) => shellTokens.has(name))) {
    throw blockedCapability("network CLI", shell);
  }
}

function guardPropagationRemoval(command, values) {
  const text = shellText([
    command,
    ...values,
    childOptions(values)?.shell,
    childOptions(values)?.execPath,
  ]);
  const tokens = text.split(/\s+/u).filter((token) => token.length > 0);
  const removesNodeOptions = tokens.some((token, index) => {
    const executable = normalizeExecutable(token);
    if (executable !== "env") return false;
    return tokens.slice(index + 1).some((candidate, offset, remaining) => {
      const normalized = candidate.replace(/^['"`]+|['"`]+$/g, "");
      if (
        normalized === "NODE_OPTIONS=" ||
        normalized.startsWith('NODE_OPTIONS=""') ||
        normalized.startsWith("NODE_OPTIONS=''")
      ) {
        return true;
      }
      if (normalized === "-u" || normalized === "--unset") {
        const next = remaining[offset + 1]?.replace(/^['"`]+|['"`]+$/g, "");
        return next === "NODE_OPTIONS";
      }
      if (normalized === "-uNODE_OPTIONS") return true;
      return normalized === "--unset=NODE_OPTIONS";
    });
  });
  if (removesNodeOptions) {
    throw blockedCapability("guard propagation", text);
  }
}

function guardChildProcess(method, command, values) {
  const environment = optionsEnvironment(values);
  const executable = normalizeExecutable(command);
  const resolved = executablePath(command, environment);
  if (method === "fork") {
    const customExecutable = childOptions(values)?.execPath;
    if (customExecutable !== undefined) {
      guardExecutable(
        customExecutable,
        environment,
        "child-process capability",
      );
    }
  } else {
    guardExecutable(command, environment, "coding-agent capability");
  }
  guardShellOption(values, environment);
  guardPropagationRemoval(command, values);
  const shellCommand = shellText([
    command,
    ...values,
    childOptions(values)?.shell,
    childOptions(values)?.execPath,
  ]);
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
          !(
            name === executable && isCanonicalFixtureExecutable(resolved, name)
          ) &&
          !(
            method === "fork" &&
            name === normalizeExecutable(childOptions(values)?.execPath) &&
            isCanonicalFixtureExecutable(
              executablePath(childOptions(values)?.execPath, environment),
              name,
            )
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

const originalModuleLoad = Module._load;
Module._load = function deterministicModuleLoad(request, parent, isMain) {
  if (
    NETWORK_MODULES.has(request) &&
    (repositoryOwnedModule(parent) || ownedRequireContext.active)
  ) {
    throw blockedCapability("network capability", request);
  }
  rememberOwnedModule(request, parent);
  return originalModuleLoad.call(this, request, parent, isMain);
};

const originalCreateRequire = Module.createRequire;
Module.createRequire = function deterministicCreateRequire(filename) {
  const createdRequire = originalCreateRequire.call(this, filename);
  const origin = (() => {
    try {
      return typeof filename === "string" && filename.startsWith("file:")
        ? fileURLToPath(filename)
        : filename instanceof URL
          ? fileURLToPath(filename)
          : String(filename);
    } catch {
      return String(filename);
    }
  })();
  const originIsNodeModule = origin.includes(`${sep}node_modules${sep}`);
  const originIsOwned = !originIsNodeModule && !callerIsNodeModule();
  if (!originIsOwned) return createdRequire;
  const deterministicRequire = function guardedCreatedRequire(
    request,
    ...values
  ) {
    const previous = ownedRequireContext.active;
    ownedRequireContext.active = true;
    try {
      return createdRequire(request, ...values);
    } finally {
      ownedRequireContext.active = previous;
    }
  };
  deterministicRequire.resolve = createdRequire.resolve;
  deterministicRequire.cache = createdRequire.cache;
  deterministicRequire.extensions = createdRequire.extensions;
  return deterministicRequire;
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

const workerThreads = originalModuleLoad("node:worker_threads", module, false);
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
