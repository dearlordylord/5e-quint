import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../.."),
  id = randomUUID();
const evidence = join(root, ".audit/linux-verification-integration", id);
const fixture = join(evidence, "fixture"),
  jobs = [],
  controls = [];
mkdirSync(join(fixture, "scripts/raw-swarm"), { recursive: true });
const json = (file) => JSON.parse(readFileSync(file, "utf8"));
function command(binary, args, cwd = fixture) {
  const result = spawnSync(binary, args, {
    cwd,
    encoding: "utf8",
    timeout: 60_000,
  });
  assert.equal(
    result.status,
    0,
    result.stderr || `${binary} failed: ${result.status}`,
  );
  return result.stdout.trim();
}
function start(script, parentMode = "direct") {
  assert(["direct", "watched", "exitBeforeStartup"].includes(parentMode));
  const runnerArgs = [
    join(import.meta.dirname, "run.mjs"),
    "--owner-wrapper",
    "--owner-pid",
    String(process.pid),
    "scripts/with-broad-workspace-lock.sh",
    "node",
    "-e",
    script,
  ];
  const launcher =
    "const a=process.argv.slice(1);a[a.indexOf('--owner-pid')+1]=String(process.pid);const c=require('node:child_process').spawn(process.execPath,a,{stdio:'inherit'});" +
    (parentMode === "exitBeforeStartup"
      ? "process.exit(0);"
      : "c.on('exit',code=>process.exitCode=code??1);");
  const args =
    parentMode !== "direct" ? ["-e", launcher, ...runnerArgs] : runnerArgs;
  const child = spawn(process.execPath, args, {
    cwd: fixture,
    env: {
      ...process.env,
      DND_VERIFICATION_LOCK_ACQUISITION_TIMEOUT_MS: "60000",
      DND_VERIFICATION_EXECUTION_TIMEOUT_MS: "60000",
      DND_VERIFICATION_STAGE_TIMEOUT_MS: "60000",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const record = { child, text: "" };
  const ready = new Promise((done) => {
    const receive = (data) => {
      record.text += data;
      if (record.text.includes("ADAPTER_READY")) done();
    };
    child.stdout.on("data", receive);
    child.stderr.on("data", receive);
  });
  const finished = new Promise((done) =>
    child.on("close", (code, signal) => done({ code, signal })),
  );
  async function wait(promise) {
    let timer;
    try {
      return await Promise.race([
        promise,
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(new Error(`Runner timeout\n${record.text}`)),
            300_000,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }
  record.ready = () =>
    wait(
      Promise.race([
        ready,
        finished.then(() => {
          throw new Error(`Runner exited before readiness\n${record.text}`);
        }),
      ]),
    );
  record.finished = () => wait(finished);
  record.directory = () => {
    const match = record.text.match(/Linux verification job: (.+)\n/u);
    assert(match, record.text);
    return match[1];
  };
  jobs.push(record);
  return record;
}

try {
  command("git", ["init", "--quiet"]);
  for (const file of [
    "resource-lock-owner.sh",
    "with-resource-lock.sh",
    "with-broad-workspace-lock.sh",
    "with-mbt-lock.sh",
    "process-supervision.sh",
    "verification-deadline-policy.mjs",
    "verification-receipts.mjs",
    "raw-swarm/process-supervisor.c",
  ]) {
    copyFileSync(join(root, "scripts", file), join(fixture, "scripts", file));
    if (file.endsWith(".sh")) chmodSync(join(fixture, "scripts", file), 0o755);
  }
  writeFileSync(join(fixture, ".gitignore"), "node_modules/\n.scratch/\n");
  writeFileSync(
    join(fixture, "package.json"),
    '{"private":true,"packageManager":"pnpm@10.29.3"}\n',
  );
  writeFileSync(join(fixture, "pnpm-workspace.yaml"), "packages: []\n");
  command("pnpm", ["install", "--lockfile-only", "--ignore-scripts"]);
  writeFileSync(join(fixture, "source.txt"), "committed");
  writeFileSync(join(fixture, "removed.txt"), "committed");
  command("git", ["add", "."]);
  command("git", [
    "-c",
    "user.name=Fixture",
    "-c",
    "user.email=fixture@example.invalid",
    "commit",
    "--quiet",
    "-m",
    "fixture",
  ]);
  writeFileSync(join(fixture, "source.txt"), "dirty source");
  writeFileSync(join(fixture, "staged.txt"), "indexed version");
  command("git", ["add", "staged.txt"]);
  writeFileSync(join(fixture, "staged.txt"), "working version");
  rmSync(join(fixture, "removed.txt"));
  mkdirSync(join(fixture, "node_modules"));
  writeFileSync(
    join(fixture, "node_modules/host-platform.txt"),
    "host dependencies",
  );
  const first = start(
    `const fs=require('node:fs'); const cp=require('node:child_process'); if(fs.readFileSync('source.txt','utf8')!=='dirty source'||fs.readFileSync('staged.txt','utf8')!=='working version'||cp.execFileSync('git',['show',':staged.txt'],{encoding:'utf8'})!=='indexed version'||fs.existsSync('removed.txt')||fs.existsSync('node_modules/host-platform.txt'))process.exit(42); console.log('ADAPTER_READY A '+Date.now()); const timer=setInterval(()=>{if(fs.existsSync('/output/release')){clearInterval(timer); console.log('ADAPTER_END A '+Date.now());}},50); setTimeout(()=>process.exit(124),30000).unref();`,
  );
  await first.ready();
  controls.push(
    "staged index, dirty source, deletion and dependency isolation",
  );
  const metadata = json(join(first.directory(), "input.json"));
  command("docker", [
    "run",
    "--rm",
    "--name",
    `dnd-verify-interop-${id}`,
    "--network",
    "none",
    "--cpus",
    "0.25",
    "--memory",
    "64m",
    "--mount",
    `type=bind,src=${join(fixture, ".git")},dst=/old-common,readonly`,
    metadata.image,
    "bash",
    "-c",
    'exec 9</old-common/dnd-heavy-verification.lock; if flock --exclusive --nonblock 9; then exit 42; else status=$?; test "$status" -eq 1; fi',
  ]);
  controls.push("old common-directory mount contends with new file binds");
  const second = start("console.log('ADAPTER_READY B '+Date.now());");
  writeFileSync(join(first.directory(), "outputs/release"), "release");
  assert.equal((await first.finished()).code, 0, first.text);
  assert.equal((await second.finished()).code, 0, second.text);
  assert(
    Number(second.text.match(/ADAPTER_READY B (\d+)/u)?.[1]) >=
      Number(first.text.match(/ADAPTER_END A (\d+)/u)?.[1]),
  );
  controls.push("mutual exclusion across independent containers");
  const cancel = start(
    "console.log('ADAPTER_READY CANCEL'); setInterval(()=>{},1000);",
  );
  await cancel.ready();
  cancel.child.kill("SIGTERM");
  assert.equal((await cancel.finished()).code, 143, cancel.text);
  const canceled = json(join(cancel.directory(), "input.json"));
  assert.notEqual(
    spawnSync("docker", ["inspect", canceled.name], { encoding: "utf8" })
      .status,
    0,
  );
  controls.push("SIGTERM cancellation and owned-container cleanup");
  const owner = start(
    "console.log('ADAPTER_READY OWNER');setInterval(()=>{},1000);",
    "watched",
  );
  await owner.ready();
  owner.child.kill("SIGTERM");
  await owner.finished();
  assert.equal(
    json(join(owner.directory(), "result.json")).exitCode,
    125,
    owner.text,
  );
  controls.push("loss of original macOS parent cancels the runner");
  const startup = start(
    "console.log('ADAPTER_SHOULD_NOT_RUN');",
    "exitBeforeStartup",
  );
  await startup.finished();
  assert.equal(
    json(join(startup.directory(), "result.json")).failure,
    "ownerLostBeforeStartup",
  );
  assert(!existsSync(join(startup.directory(), "input.json")));
  controls.push("pre-spawn owner identity prevents startup after parent loss");
  const crash = start(
    "console.log('ADAPTER_READY CRASH');setInterval(()=>{},1000);",
  );
  await crash.ready();
  const crashed = json(join(crash.directory(), "input.json"));
  crash.child.kill("SIGKILL");
  await crash.finished();
  const stoppedCode = Number(command("docker", ["wait", crashed.name]));
  assert([143, 137].includes(stoppedCode));
  controls.push(
    "hard client loss closes stdin and terminates the container workload",
  );
  const final = start(
    "console.log('ADAPTER_READY FINAL'); process.exitCode=7;",
  );
  assert.equal((await final.finished()).code, 7, final.text);
  assert.equal(
    readFileSync(join(fixture, "node_modules/host-platform.txt"), "utf8"),
    "host dependencies",
  );
  controls.push("lock reacquisition and exact failure exit code");
  writeFileSync(
    join(fixture, "package.json"),
    JSON.stringify({
      private: true,
      packageManager: "pnpm@10.29.3",
      scripts: {
        prepare:
          "node -e \"require('node:fs').writeFileSync('source.txt','prepare mutation')\"",
      },
    }),
  );
  const prepareMutation = start("console.log('ADAPTER_SHOULD_NOT_RUN');");
  assert.equal(
    (await prepareMutation.finished()).code,
    1,
    prepareMutation.text,
  );
  assert(
    prepareMutation.text.includes(
      "Frozen source changed during dependency-installation",
    ),
  );
  assert(!prepareMutation.text.includes("\nADAPTER_SHOULD_NOT_RUN\n"));
  controls.push(
    "dependency lifecycle cannot silently change the frozen source",
  );
  writeFileSync(
    join(fixture, "package.json"),
    '{"private":true,"packageManager":"pnpm@10.29.3"}\n',
  );
  const payloadMutation = start(
    "require('node:fs').writeFileSync('source.txt','payload mutation');console.log('ADAPTER_READY MUTATION');",
  );
  assert.equal(
    (await payloadMutation.finished()).code,
    1,
    payloadMutation.text,
  );
  assert(
    payloadMutation.text.includes("Frozen source changed during verification"),
  );
  assert.equal(
    readFileSync(join(fixture, "source.txt"), "utf8"),
    "dirty source",
  );
  controls.push(
    "verification payload cannot qualify a modified private source",
  );
  writeFileSync(
    join(evidence, "summary.json"),
    JSON.stringify({ passed: true, controls }, null, 2) + "\n",
  );
  console.log(JSON.stringify({ passed: true, controls, evidence }, null, 2));
} finally {
  for (const record of jobs)
    if (record.child.exitCode === null && record.child.signalCode === null) {
      record.child.kill("SIGTERM");
      await record.finished();
    }
  const stores = new Set();
  for (const record of jobs) {
    if (!record.text.includes("Linux verification job: ")) continue;
    const path = record.directory();
    mkdirSync(join(evidence, "jobs"), { recursive: true });
    cpSync(path, join(evidence, "jobs", path.split("/").at(-1)), {
      recursive: true,
    });
    if (existsSync(join(path, "input.json"))) {
      const input = json(join(path, "input.json"));
      const inspect = spawnSync(
        "docker",
        ["inspect", "--format", "{{json .Config.Labels}}", input.name],
        { encoding: "utf8", timeout: 30_000 },
      );
      if (inspect.status === 0) {
        assert.equal(
          JSON.parse(inspect.stdout)["io.dnd.verification-job"],
          input.name.slice("dnd-verify-".length),
        );
        command("docker", ["stop", "--time", "25", input.name]);
        command("docker", ["rm", input.name]);
      }
      // The fixture has a unique Git directory, hence this store was created
      // only by this diagnostic. Never collect another repository's stores.
      stores.add(input.store);
    }
  }
  for (const store of stores)
    spawnSync("docker", ["volume", "rm", store], {
      stdio: "ignore",
      timeout: 30_000,
    });
  rmSync(fixture, { recursive: true, force: true });
}
