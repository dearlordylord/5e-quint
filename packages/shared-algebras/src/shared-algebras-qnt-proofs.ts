import { execFile, execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const packageRootUrl = new URL("../", import.meta.url);
const proofsRootUrl = new URL("proofs/", packageRootUrl);

type NonEmptyReadonlyArray<T> = readonly [T, ...T[]];

export type ProofModule = {
  readonly modulePath: string;
  readonly runNames: NonEmptyReadonlyArray<string>;
};

const runBlockPattern = /^[ \t]*run\s+([A-Za-z_][A-Za-z0-9_]*)\b/gm;

function extractRunNames(source: string): NonEmptyReadonlyArray<string> | null {
  const names = Array.from(
    source.matchAll(runBlockPattern),
    (match) => match[1],
  );
  if (names.length === 0) return null;
  const [first, ...rest] = names;
  return [first, ...rest];
}

function discoverQntPaths(
  directoryUrl: URL,
  relativeDirectory: string,
): readonly string[] {
  return readdirSync(directoryUrl, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = `${relativeDirectory}${entry.name}`;
    if (entry.isDirectory()) {
      return discoverQntPaths(
        new URL(`${entry.name}/`, directoryUrl),
        `${relativePath}/`,
      );
    }
    return entry.isFile() && entry.name.endsWith(".qnt")
      ? [`proofs/${relativePath}`]
      : [];
  });
}

export function discoverProofModules(): readonly ProofModule[] {
  return discoverQntPaths(proofsRootUrl, "")
    .flatMap((modulePath): readonly ProofModule[] => {
      const runNames = extractRunNames(
        readFileSync(new URL(modulePath, packageRootUrl), "utf8"),
      );
      return runNames === null ? [] : [{ modulePath, runNames }];
    })
    .sort((left, right) => left.modulePath.localeCompare(right.modulePath));
}

export const proofModuleTimeoutMs = 360_000;

export type ProofModuleOutcome =
  | { readonly tag: "passed"; readonly module: string }
  | {
      readonly tag: "failed";
      readonly module: string;
      readonly detail: string;
    };

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

function escapeRegExp(source: string): string {
  return source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function runNameMatch(runNames: NonEmptyReadonlyArray<string>): string {
  return `^(?:${runNames.map(escapeRegExp).join("|")})$`;
}

export async function runProofModule(
  proofModule: ProofModule,
): Promise<ProofModuleOutcome> {
  const specPath = fileURLToPath(
    new URL(proofModule.modulePath, packageRootUrl),
  );
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
        runNameMatch(proofModule.runNames),
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
        module: proofModule.modulePath,
        detail: `quint test produced no "passing" summary:\n${result.stdout}`,
      };
    }
    return { tag: "passed", module: proofModule.modulePath };
  }

  const banner = result.timedOut
    ? `this module's run-block proofs were hard-killed at ${proofModuleTimeoutMs / 1000}s without finishing`
    : result.error.message;
  return {
    tag: "failed",
    module: proofModule.modulePath,
    detail: `${banner}\n${result.stderr}${result.stdout}`.trimEnd(),
  };
}
