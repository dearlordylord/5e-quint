import { execFile, spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, cp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { captureShippedHttpMcpEntrypoint } from "./effect3-baseline.ts";

const execFileAsync = promisify(execFile);
const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EFFECT_VERSION = "4.0.0-rc.112";
const ALLOWED_PRODUCTION_EFFECT_PACKAGES = new Map([
  ["effect", EFFECT_VERSION],
  ["@effect/platform-node", EFFECT_VERSION],
  ["@effect/platform-node-shared", EFFECT_VERSION],
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

async function collectDeployedEffectVersions(
  directory: string,
  observed: Map<string, Set<string>>,
): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await collectDeployedEffectVersions(path, observed);
      continue;
    }
    if (!entry.isFile() || entry.name !== "package.json") continue;
    const manifest: unknown = JSON.parse(await readFile(path, "utf8"));
    if (
      !isRecord(manifest) ||
      typeof manifest.name !== "string" ||
      typeof manifest.version !== "string" ||
      (manifest.name !== "effect" && !manifest.name.startsWith("@effect/"))
    ) {
      continue;
    }
    const versions = observed.get(manifest.name) ?? new Set<string>();
    versions.add(manifest.version);
    observed.set(manifest.name, versions);
  }
}

function assertDeployedEffectCohort(
  observed: ReadonlyMap<string, ReadonlySet<string>>,
): void {
  for (const [name, versions] of observed) {
    if (name !== "effect" && !name.startsWith("@effect/")) continue;
    const expected = ALLOWED_PRODUCTION_EFFECT_PACKAGES.get(name);
    if (expected === undefined) {
      throw new Error(
        `deployed MCP contains unsupported Effect package ${name}`,
      );
    }
    if (versions.size !== 1 || !versions.has(expected)) {
      throw new Error(
        `deployed MCP contains ${name} versions ${[...versions].join(", ")}; expected only ${expected}`,
      );
    }
  }
  for (const [name, expected] of ALLOWED_PRODUCTION_EFFECT_PACKAGES) {
    const versions = observed.get(name);
    if (versions === undefined || !versions.has(expected)) {
      throw new Error(
        `deployed MCP is missing ${name}@${expected}; observed ${[
          ...observed.entries(),
        ]
          .map(
            ([packageName, packageVersions]) =>
              `${packageName}@${[...packageVersions].join(",")}`,
          )
          .join("; ")}`,
      );
    }
  }
}

async function runPnpm(args: readonly string[]): Promise<string> {
  const { stdout } = await execFileAsync("pnpm", [...args], {
    cwd: REPOSITORY_ROOT,
    maxBuffer: 64 * 1024 * 1024,
  });
  return stdout;
}

async function smokeDeployedMcp(temporaryRoot: string): Promise<void> {
  const deployedMcp = join(temporaryRoot, "mcp");
  await runPnpm([
    "--filter",
    "@dnd/mcp",
    "deploy",
    "--prod",
    "--legacy",
    deployedMcp,
  ]);
  const deployedEffectVersions = new Map<string, Set<string>>();
  await collectDeployedEffectVersions(
    join(deployedMcp, "node_modules"),
    deployedEffectVersions,
  );
  assertDeployedEffectCohort(deployedEffectVersions);
  const manifest: unknown = JSON.parse(
    await readFile(join(deployedMcp, "package.json"), "utf8"),
  );
  if (!isRecord(manifest) || manifest.name !== "@dnd/mcp") {
    throw new Error("deployed MCP manifest is missing its package identity");
  }
  await captureShippedHttpMcpEntrypoint({
    cwd: deployedMcp,
    entrypoint: "src/public-index.ts",
    release: "effect4-clean-consumer",
  });
}

async function firstOutputLine(child: ChildProcess): Promise<string> {
  return new Promise((resolveLine, reject) => {
    let output = "";
    const timeout = setTimeout(() => {
      reject(new Error("application clean-consumer server did not start"));
    }, 10_000);
    child.once("error", reject);
    child.stdout?.on("data", (chunk: Buffer | string) => {
      output += chunk.toString();
      const newline = output.indexOf("\n");
      if (newline < 0) return;
      clearTimeout(timeout);
      resolveLine(output.slice(0, newline));
    });
  });
}

async function cleanExit(
  child: ChildProcess,
  stderr: () => string,
): Promise<void> {
  await new Promise<void>((resolveExit, reject) => {
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("application clean-consumer shutdown timed out"));
    }, 5_000);
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      if (code === 0 && signal === null) {
        resolveExit();
      } else {
        reject(
          new Error(
            `application clean-consumer exited ${signal ?? code ?? "unknown"}: ${stderr()}`,
          ),
        );
      }
    });
    child.kill("SIGTERM");
  });
}

async function smokeBuiltApplication(temporaryRoot: string): Promise<void> {
  await runPnpm(["--filter", "@dnd/app", "run", "build"]);
  const deployedApp = join(temporaryRoot, "app");
  await cp(resolve(REPOSITORY_ROOT, "packages/app/dist"), deployedApp, {
    recursive: true,
  });
  const deployedServer = join(temporaryRoot, "static-server.mjs");
  await cp(
    resolve(REPOSITORY_ROOT, "packages/app/static-server.mjs"),
    deployedServer,
  );
  const child = spawn(process.execPath, [deployedServer, deployedApp, "0"], {
    cwd: deployedApp,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr?.setEncoding("utf8");
  child.stderr?.on("data", (chunk: string) => {
    stderr = `${stderr}${chunk}`.slice(-8_192);
  });
  try {
    const port = Number(await firstOutputLine(child));
    if (!Number.isInteger(port) || port <= 0) {
      throw new Error("application clean-consumer reported an invalid port");
    }
    const indexResponse = await fetch(`http://127.0.0.1:${port}/`);
    const index = await indexResponse.text();
    if (!indexResponse.ok || !index.includes('<div id="root"></div>')) {
      throw new Error("built application did not serve its root document");
    }
    const scriptPath = /<script[^>]+src="([^"]+\.js)"/u.exec(index)?.[1];
    if (scriptPath === undefined) {
      throw new Error("built application root has no JavaScript entry asset");
    }
    const scriptResponse = await fetch(`http://127.0.0.1:${port}${scriptPath}`);
    const script = await scriptResponse.arrayBuffer();
    if (!scriptResponse.ok || script.byteLength === 0) {
      throw new Error("built application JavaScript entry asset is unreadable");
    }
    await cleanExit(child, () => stderr.trim());
    if (stderr.trim() !== "") {
      throw new Error(
        `application clean-consumer wrote stderr: ${stderr.trim()}`,
      );
    }
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGKILL");
    }
  }
}

async function main(): Promise<void> {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "dnd-effect4-consumer-"));
  try {
    await smokeDeployedMcp(temporaryRoot);
    await smokeBuiltApplication(temporaryRoot);
    console.log(
      "Effect 4 clean-consumer smoke passed for deployed MCP and built application entrypoints.",
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
