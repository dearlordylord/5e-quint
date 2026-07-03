import { execFile, execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export type NonEmptyReadonlyArray<T> = readonly [T, ...T[]];

export type ProofModule = {
  readonly modulePath: string;
  readonly runNames: NonEmptyReadonlyArray<string>;
};

export type ProofModuleOutcome =
  | { readonly tag: "passed"; readonly module: string }
  | {
      readonly tag: "failed";
      readonly module: string;
      readonly detail: string;
    };

export type ProofModuleDiscoveryConfig = {
  readonly packageRootUrl: URL;
  readonly corpusRootRelativePath: string;
  readonly recursive: boolean;
  readonly runNamePrefix?: string;
};

export type ProofModuleRunConfig = {
  readonly packageRootUrl: URL;
  readonly proofModule: ProofModule;
  readonly matchPattern?: string;
};

const runBlockPattern = /^[ \t]*run\s+([A-Za-z_][A-Za-z0-9_]*)\b/gm;

export const proofModuleTimeoutMs = 360_000;

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

export function discoverRunBlockProofModules(
  config: ProofModuleDiscoveryConfig,
): readonly ProofModule[] {
  const corpusRootRelativePath = asDirectoryPath(config.corpusRootRelativePath);
  const corpusRootUrl = new URL(corpusRootRelativePath, config.packageRootUrl);
  return discoverQntPaths(corpusRootUrl, "", config.recursive)
    .flatMap((relativePath): readonly ProofModule[] => {
      const modulePath = `${corpusRootRelativePath}${relativePath}`;
      const runNames = extractRunNames(
        readFileSync(new URL(modulePath, config.packageRootUrl), "utf8"),
        config.runNamePrefix,
      );
      return runNames === null ? [] : [{ modulePath, runNames }];
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

export async function runProofModule(
  config: ProofModuleRunConfig,
): Promise<ProofModuleOutcome> {
  const specPath = fileURLToPath(
    new URL(config.proofModule.modulePath, config.packageRootUrl),
  );
  const matchPattern =
    config.matchPattern ?? exactRunNameMatch(config.proofModule.runNames);
  const result = await new Promise<{
    readonly timedOut: boolean;
    readonly error: Error | null;
    readonly stdout: string;
    readonly stderr: string;
  }>((resolve) => {
    let timedOut = false;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    const child = execFile(
      "pnpm",
      [
        "exec",
        "quint",
        "test",
        "--backend",
        "typescript",
        "--match",
        matchPattern,
        specPath,
      ],
      {
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        clearTimeout(deadline);
        resolve({
          timedOut,
          error: error ?? null,
          stdout: typeof stdout === "string" ? stdout : "",
          stderr: typeof stderr === "string" ? stderr : "",
        });
      },
    );
    deadline = setTimeout(() => {
      timedOut = true;
      if (child.pid !== undefined) killProcessTree(child.pid);
    }, proofModuleTimeoutMs);
  });

  if (result.error === null) {
    if (!result.stdout.includes("passing")) {
      return {
        tag: "failed",
        module: config.proofModule.modulePath,
        detail: `quint test produced no "passing" summary:\n${result.stdout}`,
      };
    }
    return { tag: "passed", module: config.proofModule.modulePath };
  }

  const banner = result.timedOut
    ? `this module's run-block proofs were hard-killed at ${proofModuleTimeoutMs / 1000}s without finishing`
    : result.error.message;
  return {
    tag: "failed",
    module: config.proofModule.modulePath,
    detail: `${banner}\n${result.stderr}${result.stdout}`.trimEnd(),
  };
}
