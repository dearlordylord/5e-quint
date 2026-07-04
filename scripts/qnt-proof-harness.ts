import { execFile, execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export type NonEmptyReadonlyArray<T> = readonly [T, ...T[]];

export type QntModuleDiscoveryConfig = {
  readonly packageRootUrl: URL;
  readonly corpusRootRelativePath: string;
  readonly recursive: boolean;
};

export type ProofModule = {
  readonly modulePath: string;
  readonly runNames: NonEmptyReadonlyArray<string>;
};

export type InductiveProofModule = {
  readonly modulePath: string;
  readonly invariantName: string;
  readonly maxSteps: number;
};

export type ProofModuleOutcome =
  | { readonly tag: "passed"; readonly module: string }
  | {
      readonly tag: "failed";
      readonly module: string;
      readonly detail: string;
    };

export type ProofModuleDiscoveryConfig = QntModuleDiscoveryConfig & {
  readonly runNamePrefix?: string;
};

export type ProofModuleRunConfig = {
  readonly packageRootUrl: URL;
  readonly proofModule: ProofModule;
  readonly matchPattern?: string;
};

export type InductiveProofModuleRunConfig = {
  readonly packageRootUrl: URL;
  readonly proofModule: InductiveProofModule;
};

type ProofProcessConfig = {
  readonly packageRootUrl: URL;
  readonly modulePath: string;
  readonly proofKind: "inductive" | "run-block";
  readonly args: NonEmptyReadonlyArray<string>;
  readonly timedOutDetail: string;
  readonly env?: NodeJS.ProcessEnv;
  readonly requiredStdoutFragment?: string;
};

type ProofProgressEvent = "fail" | "heartbeat" | "pass" | "start" | "timeout";

const runBlockPattern = /^[ \t]*run\s+([A-Za-z_][A-Za-z0-9_]*)\b/gm;

export const proofModuleTimeoutMs = 360_000;
const proofProgressIntervalMs = 60_000;
const apalacheJavaBin = `${process.env.HOME ?? ""}/.local/java/jdk-17.0.18+8-jre/bin`;

function asDirectoryPath(path: string): string {
  return path === "" || path.endsWith("/") ? path : `${path}/`;
}

function extractRunNames(
  source: string,
  runNamePrefix: string | undefined,
): NonEmptyReadonlyArray<string> | null {
  const names = Array.from(
    source.matchAll(runBlockPattern),
    (match) => match[1],
  ).filter((name) =>
    runNamePrefix === undefined ? true : name.startsWith(runNamePrefix),
  );
  if (names.length === 0) return null;
  const [first, ...rest] = names;
  return [first, ...rest];
}

function discoverQntPaths(
  directoryUrl: URL,
  relativeDirectory: string,
  recursive: boolean,
): readonly string[] {
  return readdirSync(directoryUrl, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = `${relativeDirectory}${entry.name}`;
    if (entry.isDirectory()) {
      return recursive
        ? discoverQntPaths(
            new URL(`${entry.name}/`, directoryUrl),
            `${relativePath}/`,
            recursive,
          )
        : [];
    }
    return entry.isFile() && entry.name.endsWith(".qnt") ? [relativePath] : [];
  });
}

export function discoverQntModulePaths(
  config: QntModuleDiscoveryConfig,
): readonly string[] {
  const corpusRootRelativePath = asDirectoryPath(config.corpusRootRelativePath);
  const corpusRootUrl = new URL(corpusRootRelativePath, config.packageRootUrl);
  return discoverQntPaths(corpusRootUrl, "", config.recursive)
    .map((relativePath) => `${corpusRootRelativePath}${relativePath}`)
    .sort((left, right) => left.localeCompare(right));
}

export function discoverRunBlockProofModules(
  config: ProofModuleDiscoveryConfig,
): readonly ProofModule[] {
  return discoverQntModulePaths(config)
    .flatMap((relativePath): readonly ProofModule[] => {
      const runNames = extractRunNames(
        readFileSync(new URL(relativePath, config.packageRootUrl), "utf8"),
        config.runNamePrefix,
      );
      return runNames === null ? [] : [{ modulePath: relativePath, runNames }];
    })
    .sort((left, right) => left.modulePath.localeCompare(right.modulePath));
}

function escapeRegExp(source: string): string {
  return source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function exactRunNameMatch(runNames: NonEmptyReadonlyArray<string>): string {
  return `^(?:${runNames.map(escapeRegExp).join("|")})$`;
}

function killProcessTree(rootPid: number): void {
  let psLines: readonly string[];
  try {
    psLines = execFileSync("ps", ["-eo", "pid=,ppid="], { encoding: "utf8" })
      .trim()
      .split("\n");
  } catch {
    try {
      process.kill(rootPid, "SIGKILL");
    } catch {
      // already gone
    }
    return;
  }

  const childrenByParent = new Map<number, number[]>();
  for (const line of psLines) {
    const parts = line.trim().split(/\s+/);
    const pid = Number(parts[0]);
    const ppid = Number(parts[1]);
    if (!Number.isInteger(pid) || !Number.isInteger(ppid)) continue;
    const siblings = childrenByParent.get(ppid) ?? [];
    siblings.push(pid);
    childrenByParent.set(ppid, siblings);
  }

  const ordered: number[] = [];
  const stack: number[] = [rootPid];
  while (stack.length > 0) {
    const pid = stack.pop();
    if (pid === undefined) break;
    ordered.push(pid);
    for (const child of childrenByParent.get(pid) ?? []) stack.push(child);
  }

  for (const pid of ordered.reverse()) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // already gone
    }
  }
}

function quintVerifyEnv(): NodeJS.ProcessEnv {
  if (process.env.HOME === undefined) return process.env;
  return {
    ...process.env,
    PATH: `${apalacheJavaBin}:${process.env.PATH ?? ""}`,
  };
}

function elapsedMsSince(startedAtMs: number): number {
  return Date.now() - startedAtMs;
}

function logProofProgress(
  config: ProofProcessConfig,
  event: ProofProgressEvent,
  startedAtMs: number,
  pid: number | undefined,
): void {
  console.error(
    `QNT_PROOF_EVENT ${JSON.stringify({
      event,
      kind: config.proofKind,
      module: config.modulePath,
      pid,
      elapsedMs: elapsedMsSince(startedAtMs),
      timeoutMs: proofModuleTimeoutMs,
      command: ["quint", ...config.args],
    })}`,
  );
}

async function runProofProcess(
  config: ProofProcessConfig,
): Promise<ProofModuleOutcome> {
  const startedAtMs = Date.now();
  let childPid: number | undefined;
  const result = await new Promise<{
    readonly timedOut: boolean;
    readonly error: Error | null;
    readonly stdout: string;
    readonly stderr: string;
  }>((resolve) => {
    let timedOut = false;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    const child = execFile(
      "pnpm",
      ["exec", "quint", ...config.args],
      {
        cwd: fileURLToPath(config.packageRootUrl),
        encoding: "utf8",
        env: config.env ?? process.env,
        maxBuffer: 64 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        clearTimeout(deadline);
        clearInterval(heartbeat);
        resolve({
          timedOut,
          error: error ?? null,
          stdout: typeof stdout === "string" ? stdout : "",
          stderr: typeof stderr === "string" ? stderr : "",
        });
      },
    );
    childPid = child.pid;
    logProofProgress(config, "start", startedAtMs, childPid);
    heartbeat = setInterval(() => {
      logProofProgress(config, "heartbeat", startedAtMs, childPid);
    }, proofProgressIntervalMs);
    deadline = setTimeout(() => {
      timedOut = true;
      logProofProgress(config, "timeout", startedAtMs, childPid);
      if (childPid !== undefined) killProcessTree(childPid);
    }, proofModuleTimeoutMs);
  });

  if (result.error === null) {
    if (
      config.requiredStdoutFragment !== undefined &&
      !result.stdout.includes(config.requiredStdoutFragment)
    ) {
      logProofProgress(config, "fail", startedAtMs, childPid);
      return {
        tag: "failed",
        module: config.modulePath,
        detail:
          `quint produced no "${config.requiredStdoutFragment}" summary:\n` +
          result.stdout,
      };
    }
    logProofProgress(config, "pass", startedAtMs, childPid);
    return { tag: "passed", module: config.modulePath };
  }

  const banner = result.timedOut ? config.timedOutDetail : result.error.message;
  logProofProgress(config, "fail", startedAtMs, childPid);
  return {
    tag: "failed",
    module: config.modulePath,
    detail: `${banner}\n${result.stderr}${result.stdout}`.trimEnd(),
  };
}

export async function runProofModule(
  config: ProofModuleRunConfig,
): Promise<ProofModuleOutcome> {
  const specPath = fileURLToPath(
    new URL(config.proofModule.modulePath, config.packageRootUrl),
  );
  const matchPattern =
    config.matchPattern ?? exactRunNameMatch(config.proofModule.runNames);
  return runProofProcess({
    packageRootUrl: config.packageRootUrl,
    modulePath: config.proofModule.modulePath,
    proofKind: "run-block",
    args: [
      "test",
      "--backend",
      "typescript",
      "--match",
      matchPattern,
      specPath,
    ],
    timedOutDetail: `this module's run-block proofs were hard-killed at ${proofModuleTimeoutMs / 1000}s without finishing`,
    requiredStdoutFragment: "passing",
  });
}

export async function runInductiveProofModule(
  config: InductiveProofModuleRunConfig,
): Promise<ProofModuleOutcome> {
  const specPath = fileURLToPath(
    new URL(config.proofModule.modulePath, config.packageRootUrl),
  );
  return runProofProcess({
    packageRootUrl: config.packageRootUrl,
    modulePath: config.proofModule.modulePath,
    proofKind: "inductive",
    args: [
      "verify",
      specPath,
      "--inductive-invariant",
      config.proofModule.invariantName,
      "--invariant",
      config.proofModule.invariantName,
      "--max-steps",
      String(config.proofModule.maxSteps),
      "--verbosity",
      "1",
    ],
    timedOutDetail: `this module's inductive proof was hard-killed at ${proofModuleTimeoutMs / 1000}s without finishing`,
    env: quintVerifyEnv(),
  });
}
