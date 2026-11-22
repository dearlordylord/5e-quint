import { spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { relative, resolve, sep } from "node:path";

const started = performance.now();
const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const args = process.argv.slice(2);
const cli = "scripts/raw-swarm/sdk-player/declaration-diagnostics-cli.ts";
const output =
  args[0] === "--out" && args.length === 2
    ? relative(repoRoot, resolve(repoRoot, args[1]))
    : undefined;
if (output !== undefined && !output.startsWith(`.audit${sep}`)) {
  console.error(
    "--out must name a fresh directory beneath .audit so verification artifacts are retained.",
  );
  process.exitCode = 64;
} else {
  const result =
    output !== undefined
      ? spawnSync(
          "sh",
          [
            "-c",
            `. scripts/resource-lock-owner.sh && with_resource_lock_owner scripts/with-broad-workspace-lock.sh pnpm exec tsx ${cli} "$@"`,
            "declaration-diagnostics",
            "--out",
            output,
          ],
          { cwd: repoRoot, stdio: "inherit" },
        )
      : spawnSync(process.execPath, ["--import", "tsx", cli, ...args], {
          cwd: repoRoot,
          stdio: "inherit",
        });
  if (result.error) console.error(result.error.message);
  process.exitCode = result.status ?? 1;
}

console.error(
  `Declaration diagnostic wall time: ${(performance.now() - started).toFixed(0)} ms`,
);
