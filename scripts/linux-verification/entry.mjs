import { spawn } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { verifyFrozenSource } from "./check-input.mjs";

const input = JSON.parse(readFileSync("/job/input.json", "utf8"));
if (readdirSync("/workspace").length !== 0)
  throw new Error("Verification tools image must have an empty /workspace");
const child = spawn("bash", ["/runner/prepare.sh", ...input.args], {
  cwd: "/workspace",
  stdio: ["ignore", "inherit", "inherit"],
  env: {
    ...process.env,
    DND_INPUT_REVISION: input.revision,
    DND_INPUT_CWD: input.cwd,
    DND_INPUT_HAS_WRAPPER: String(input.hasWrapper),
  },
});
let stopping = false;
function cancel() {
  if (stopping) return;
  stopping = true;
  child.kill("SIGTERM");
  // Exiting PID 1's command also closes the container's entire PID namespace.
  setTimeout(() => process.exit(137), 20_000).unref();
}
process.on("SIGINT", cancel);
process.on("SIGTERM", cancel);
process.stdin.on("end", cancel);
process.stdin.resume();
const outcome = await new Promise((resolve) => {
  child.on("error", (error) => resolve({ code: 1, error: error.message }));
  child.on("exit", (code, signal) =>
    resolve({ code: code ?? (signal === "SIGKILL" ? 137 : 143), signal }),
  );
});
process.stdin.pause();
const exitCode = (() => {
  if (stopping || outcome.code !== 0) return outcome.code;
  try {
    verifyFrozenSource(input, "verification");
    return 0;
  } catch (error) {
    console.error(error.message);
    return error?.exitCode === 137 ? 137 : 1;
  }
})();
if (exitCode === 137) {
  const read = (path) => {
    try {
      return readFileSync(path, "utf8");
    } catch (error) {
      return { unavailable: error.code };
    }
  };
  const evidence = {
    command: input.args,
    childPid: child.pid,
    memoryEvents: read("/sys/fs/cgroup/memory.events"),
    load: read("/proc/loadavg"),
    memory: read("/proc/meminfo"),
  };
  writeFileSync(
    "/output/resource-failure.json",
    JSON.stringify(evidence, null, 2) + "\n",
  );
}
if (!stopping && exitCode !== 137) {
  const exports = [".audit", ".scratch/verification", "coverage", "dist"];
  if (existsSync("/workspace/packages"))
    for (const pkg of readdirSync("/workspace/packages"))
      exports.push(`packages/${pkg}/coverage`, `packages/${pkg}/dist`);
  for (const path of exports) {
    if (!existsSync(join("/workspace", path))) continue;
    const target = join("/output", path);
    mkdirSync(join(target, ".."), { recursive: true });
    cpSync(join("/workspace", path), target, { recursive: true });
  }
}
if (outcome.error) console.error(outcome.error);
process.exitCode = exitCode;
