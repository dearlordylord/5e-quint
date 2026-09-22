import { execFile, spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, cp, readFile, rm } from "node:fs/promises";
import { request } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { captureShippedHttpMcpEntrypoint } from "../packages/mcp/test-support/public-http-lifecycle.ts";

const execFileAsync = promisify(execFile);
const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
async function runSmokePhase<Result>(
  phase: string,
  operation: () => Promise<Result>,
): Promise<Result> {
  console.log(`[deployment-lifecycle] phase=${phase} outcome=started`);
  const startedAt = performance.now();
  try {
    const result = await operation();
    console.log(
      `[deployment-lifecycle] phase=${phase} outcome=passed durationMs=${Math.round(performance.now() - startedAt)}`,
    );
    return result;
  } catch (error) {
    console.log(
      `[deployment-lifecycle] phase=${phase} outcome=failed durationMs=${Math.round(performance.now() - startedAt)}`,
    );
    throw error;
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
  await runSmokePhase("mcp-deploy", () =>
    runPnpm([
      "--filter",
      "@dnd/mcp",
      "deploy",
      "--prod",
      "--legacy",
      deployedMcp,
    ]),
  );
  await runSmokePhase("mcp-lifecycle", () =>
    captureShippedHttpMcpEntrypoint({
      cwd: deployedMcp,
      entrypoint: "src/public-index.ts",
      release: "deployment-lifecycle",
    }),
  );
}

async function firstOutputLine(child: ChildProcess): Promise<string> {
  return new Promise((resolveLine, reject) => {
    let output = "";
    const timeout = setTimeout(() => {
      reject(new Error("deployed application server did not start"));
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

function assertSuccessfulCleanExit(
  code: number | null,
  signal: NodeJS.Signals | null,
  stderr: () => string,
): void {
  if (code === 0 && signal === null) return;
  throw new Error(
    `deployed application server exited ${signal ?? code ?? "unknown"}: ${stderr()}`,
  );
}

async function cleanExit(
  child: ChildProcess,
  stderr: () => string,
): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) {
    assertSuccessfulCleanExit(child.exitCode, child.signalCode, stderr);
    return;
  }
  await new Promise<void>((resolveExit, reject) => {
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("deployed application shutdown timed out"));
    }, 5_000);
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      try {
        assertSuccessfulCleanExit(code, signal, stderr);
        resolveExit();
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function readAssetAcrossShutdown(input: {
  readonly child: ChildProcess;
  readonly port: number;
  readonly path: string;
  readonly signal: "SIGINT" | "SIGTERM";
}): Promise<Buffer> {
  return new Promise((resolveResponse, reject) => {
    const outgoing = request(
      {
        host: "127.0.0.1",
        port: input.port,
        path: input.path,
        method: "GET",
      },
      (incoming) => {
        if (incoming.statusCode !== 200) {
          incoming.resume();
          reject(
            new Error(
              `application asset responded ${incoming.statusCode ?? "without status"}`,
            ),
          );
          return;
        }
        const declaredLength = Number(incoming.headers["content-length"]);
        const chunks: Buffer[] = [];
        let signaled = false;
        incoming.on("data", (chunk: Buffer) => {
          chunks.push(Buffer.from(chunk));
          if (signaled) return;
          signaled = true;
          const receivedLength = chunks.reduce(
            (total, current) => total + current.byteLength,
            0,
          );
          if (
            !Number.isInteger(declaredLength) ||
            declaredLength <= receivedLength
          ) {
            reject(
              new Error(
                "application asset completed before the shutdown signal could be coordinated",
              ),
            );
            return;
          }
          incoming.pause();
          if (!input.child.kill(input.signal)) {
            reject(
              new Error(
                `application did not accept coordinated ${input.signal}`,
              ),
            );
            return;
          }
          setImmediate(() => incoming.resume());
        });
        incoming.once("error", reject);
        incoming.once("end", () => {
          if (!signaled) {
            reject(new Error("application asset returned no response body"));
            return;
          }
          resolveResponse(Buffer.concat(chunks));
        });
      },
    );
    outgoing.once("error", reject);
    outgoing.end();
  });
}

async function smokeApplicationSignal(input: {
  readonly deployedApp: string;
  readonly deployedServer: string;
  readonly signal: "SIGINT" | "SIGTERM";
}): Promise<void> {
  const child = spawn(
    process.execPath,
    [input.deployedServer, input.deployedApp, "0"],
    {
      cwd: input.deployedApp,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let stderr = "";
  child.stderr?.setEncoding("utf8");
  child.stderr?.on("data", (chunk: string) => {
    stderr = `${stderr}${chunk}`.slice(-8_192);
  });
  try {
    const port = Number(await firstOutputLine(child));
    if (!Number.isInteger(port) || port <= 0) {
      throw new Error("deployed application server reported an invalid port");
    }
    const indexResponse = await fetch(`http://127.0.0.1:${port}/`);
    const index = await indexResponse.text();
    if (!indexResponse.ok || !index.includes('<div id="root"></div>')) {
      throw new Error("built application did not serve its root document");
    }
    const scriptPath = /<script[^>]+src="([^"]+\.js)"/u.exec(index)?.[1];
    if (scriptPath === undefined || !scriptPath.startsWith("/")) {
      throw new Error("built application root has no JavaScript entry asset");
    }
    const expectedScript = await readFile(
      join(input.deployedApp, scriptPath.slice(1)),
    );
    const receivedScript = await readAssetAcrossShutdown({
      child,
      port,
      path: scriptPath,
      signal: input.signal,
    });
    if (!receivedScript.equals(expectedScript)) {
      throw new Error(
        `application ${input.signal} shutdown truncated its in-flight asset response`,
      );
    }
    await cleanExit(child, () => stderr.trim());
    if (stderr.trim() !== "") {
      throw new Error(
        `deployed application server wrote stderr: ${stderr.trim()}`,
      );
    }
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGKILL");
    }
  }
}

async function smokeBuiltApplication(temporaryRoot: string): Promise<void> {
  const deployedApp = join(temporaryRoot, "app");
  const deployedServer = join(temporaryRoot, "static-server.mjs");
  await runSmokePhase("application-copy", async () => {
    await cp(resolve(REPOSITORY_ROOT, "packages/app/dist"), deployedApp, {
      recursive: true,
    });
    await cp(
      resolve(REPOSITORY_ROOT, "packages/app/static-server.mjs"),
      deployedServer,
    );
  });
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    await runSmokePhase(`application-lifecycle-${signal.toLowerCase()}`, () =>
      smokeApplicationSignal({ deployedApp, deployedServer, signal }),
    );
  }
}

async function main(): Promise<void> {
  const temporaryRoot = await mkdtemp(
    join(tmpdir(), "dnd-deployment-lifecycle-"),
  );
  try {
    await smokeDeployedMcp(temporaryRoot);
    await smokeBuiltApplication(temporaryRoot);
    console.log(
      "Deployment lifecycle smoke passed for the deployed MCP and application, including SIGINT/SIGTERM response drain.",
    );
  } finally {
    await runSmokePhase("cleanup", () =>
      rm(temporaryRoot, { recursive: true, force: true }),
    );
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
