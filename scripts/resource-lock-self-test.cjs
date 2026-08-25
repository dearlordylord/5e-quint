#!/usr/bin/env node

const assert = require("node:assert/strict");
const { spawn, spawnSync } = require("node:child_process");
const {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} = require("node:fs");
const { tmpdir } = require("node:os");
const path = require("node:path");

const repositoryRoot = path.resolve(__dirname, "..");
const wrapperNames = [
  "resource-lock-owner.sh",
  "with-resource-lock.sh",
  "with-broad-workspace-lock.sh",
  "with-mbt-lock.sh",
];
const retiredLockNames = [
  "ralph-heavy-verification.lock",
  "ralph-broad-workspace-check.lock",
  "ralph-mbt.lock",
];
const waitTimeoutMs = 20_000;

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  assert.equal(
    result.status,
    0,
    `${command} ${args.join(" ")} failed:\n${result.stderr}`,
  );
  return result.stdout.trim();
}

function waitFor(predicate, description) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const poll = () => {
      if (predicate()) {
        resolve();
        return;
      }
      if (Date.now() - startedAt >= waitTimeoutMs) {
        reject(new Error(`Timed out waiting for ${description}.`));
        return;
      }
      setTimeout(poll, 10);
    };
    poll();
  });
}

function waitForResult(resultProvider, description) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const poll = () => {
      const result = resultProvider();
      if (result !== undefined) {
        resolve(result);
        return;
      }
      if (Date.now() - startedAt >= waitTimeoutMs) {
        reject(new Error(`Timed out waiting for ${description}.`));
        return;
      }
      setTimeout(poll, 10);
    };
    poll();
  });
}

async function assertDetachedSupervision(
  supervised,
  detachedPidPath,
  linked,
  temporaryRoot,
) {
  try {
    const detachedIdentity = await waitForResult(() => {
      if (!existsSync(detachedPidPath)) return undefined;
      return processIdentity(
        Number(readFileSync(detachedPidPath, "utf8").trim()),
      );
    }, "the detached supervised child");

    try {
      assert.ok(detachedIdentity, "the detached child has a live identity");
      supervised.kill("SIGTERM");
      await waitFor(
        () => !processIdentityIsLive(detachedIdentity),
        "the detached child to be terminated by shared supervision",
      );

      const reacquiredLog = path.join(temporaryRoot, "reacquired.log");
      const reacquired = guardedSpawn(linked, "with-mbt-lock.sh", [
        "contender",
        reacquiredLog,
      ]);
      assert.equal(await waitForExit(reacquired, "the reacquirer"), 0);
      assert.deepEqual(logLines(reacquiredLog), ["contender-start"]);
    } finally {
      if (supervised.exitCode === null) supervised.kill("SIGKILL");
      signalProcessIdentity(detachedIdentity, "SIGKILL");
    }
  } catch (error) {
    if (supervised.exitCode === null) supervised.kill("SIGKILL");
    throw error;
  }
}

function waitForExit(child, description) {
  if (child.exitCode !== null) return Promise.resolve(child.exitCode);
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for ${description} to exit.`));
    }, waitTimeoutMs);
    child.once("exit", (code) => {
      clearTimeout(timeout);
      resolve(code);
    });
  });
}

function guardedSpawn(root, wrapperName, probeArgs) {
  return spawn(
    "bash",
    [
      "-c",
      '. scripts/resource-lock-owner.sh && with_resource_lock_owner "$@"',
      "resource-lock-self-test",
      `scripts/${wrapperName}`,
      "scripts/lock-probe.sh",
      ...probeArgs,
    ],
    { cwd: root, stdio: ["ignore", "ignore", "pipe"] },
  );
}

function logLines(logPath) {
  return existsSync(logPath)
    ? readFileSync(logPath, "utf8").trim().split("\n")
    : [];
}

async function assertSerialized(holder, contender, logPath) {
  try {
    await waitFor(
      () => logLines(logPath).includes("holder-start"),
      "the holder to start",
    );
    await new Promise((resolve) => setTimeout(resolve, 120));
    assert.deepEqual(logLines(logPath), ["holder-start"]);
    assert.equal(await waitForExit(holder, "the holder"), 0);
    assert.equal(await waitForExit(contender, "the contender"), 0);
    assert.deepEqual(logLines(logPath), [
      "holder-start",
      "holder-end",
      "contender-start",
    ]);
  } finally {
    if (holder.exitCode === null) holder.kill("SIGTERM");
    if (contender.exitCode === null) contender.kill("SIGTERM");
  }
}

async function runSelfTest() {
  const guardSource = readFileSync(
    path.join(repositoryRoot, "scripts", "with-resource-lock.sh"),
    "utf8",
  );
  const lockNames = ["dnd-heavy-verification.lock", ...retiredLockNames];
  let previousPosition = -1;
  for (const lockName of lockNames) {
    const position = guardSource.indexOf(lockName);
    assert.ok(position > previousPosition, `${lockName} has fixed lock order`);
    previousPosition = position;
  }

  const temporaryRoot = mkdtempSync(path.join(tmpdir(), "dnd-resource-lock-"));
  const root = path.join(temporaryRoot, "repository");
  const linked = path.join(temporaryRoot, "linked");
  mkdirSync(path.join(root, "scripts"), { recursive: true });
  try {
    for (const wrapperName of wrapperNames) {
      const destination = path.join(root, "scripts", wrapperName);
      copyFileSync(
        path.join(repositoryRoot, "scripts", wrapperName),
        destination,
      );
      chmodSync(destination, 0o755);
    }
    const probePath = path.join(root, "scripts", "lock-probe.sh");
    writeFileSync(
      probePath,
      [
        "#!/usr/bin/env bash",
        "set -euo pipefail",
        'label="$1"',
        'log="$2"',
        'printf "%s-start\\n" "$label" >>"$log"',
        'if [[ "$label" == holder ]]; then',
        "  sleep 0.5",
        '  printf "%s-end\\n" "$label" >>"$log"',
        "fi",
        "",
      ].join("\n"),
    );
    chmodSync(probePath, 0o755);

    run("git", ["init", "-b", "master"], root);
    run("git", ["config", "user.email", "resource-lock@example.invalid"], root);
    run("git", ["config", "user.name", "Resource Lock Self-Test"], root);
    run("git", ["add", "scripts"], root);
    run("git", ["commit", "-m", "resource lock fixture"], root);
    run(
      "git",
      ["worktree", "add", "--no-checkout", "-b", "linked", linked, "master"],
      root,
    );
    mkdirSync(path.join(linked, "scripts"), { recursive: true });
    for (const scriptName of [...wrapperNames, "lock-probe.sh"]) {
      const destination = path.join(linked, "scripts", scriptName);
      copyFileSync(path.join(root, "scripts", scriptName), destination);
      chmodSync(destination, 0o755);
    }
    assert.equal(
      run(
        "git",
        ["rev-parse", "--path-format=absolute", "--git-common-dir"],
        root,
      ),
      run(
        "git",
        ["rev-parse", "--path-format=absolute", "--git-common-dir"],
        linked,
      ),
    );

    const sharedLog = path.join(temporaryRoot, "shared.log");
    const sharedHolder = guardedSpawn(root, "with-broad-workspace-lock.sh", [
      "holder",
      sharedLog,
    ]);
    await waitFor(
      () => logLines(sharedLog).includes("holder-start"),
      "the shared-lock holder",
    );
    const sharedContender = guardedSpawn(linked, "with-mbt-lock.sh", [
      "contender",
      sharedLog,
    ]);
    await assertSerialized(sharedHolder, sharedContender, sharedLog);

    const commonDir = run(
      "git",
      ["rev-parse", "--path-format=absolute", "--git-common-dir"],
      root,
    );
    for (const retiredLockName of retiredLockNames) {
      const logPath = path.join(temporaryRoot, `${retiredLockName}.log`);
      const holder = spawn(
        "flock",
        [
          "--exclusive",
          path.join(commonDir, retiredLockName),
          probePath,
          "holder",
          logPath,
        ],
        { cwd: root, stdio: "ignore" },
      );
      await waitFor(
        () => logLines(logPath).includes("holder-start"),
        `${retiredLockName} holder`,
      );
      const contender = guardedSpawn(linked, "with-mbt-lock.sh", [
        "contender",
        logPath,
      ]);
      await assertSerialized(holder, contender, logPath);
    }
    const detachedPidPath = path.join(temporaryRoot, "detached-child.pid");
    const supervised = guardedCommandSpawn(
      root,
      "with-broad-workspace-lock.sh",
      process.execPath,
      ["scripts/detached-probe.cjs"],
      { DETACHED_PID_PATH: detachedPidPath },
    );
    await assertDetachedSupervision(
      supervised,
      detachedPidPath,
      linked,
      temporaryRoot,
    );
  } finally {
    if (existsSync(linked)) {
      spawnSync("git", ["worktree", "remove", "--force", linked], {
        cwd: root,
        stdio: "ignore",
      });
    }
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
  console.log("Resource lock self-test passed.");
}

runSelfTest().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
