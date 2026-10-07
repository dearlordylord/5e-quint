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
const fixtureScriptNames = [
  ...wrapperNames,
  "process-supervision.sh",
  "verification-deadline-policy.mjs",
  "raw-swarm/process-supervisor.c",
];
const retiredLockNames = [
  "ralph-heavy-verification.lock",
  "ralph-broad-workspace-check.lock",
  "ralph-mbt.lock",
];
const waitTimeoutMs = 20_000;
const resourceLockEnvironmentKeys = [
  "DND_RESOURCE_LOCK_KIND",
  "DND_RESOURCE_LOCK_OWNER_PID",
  "DND_RESOURCE_LOCK_OWNER_START_TIME",
  "DND_VERIFICATION_LOCK_ACQUISITION_TIMEOUT_MS",
  "DND_VERIFICATION_EXECUTION_TIMEOUT_MS",
  "DND_VERIFICATION_STAGE_TIMEOUT_MS",
];
const childDiagnostics = new WeakMap();

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
      try {
        if (predicate()) {
          resolve();
          return;
        }
      } catch (error) {
        reject(error);
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
      try {
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
      } catch (error) {
        reject(error);
      }
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
  if (child.exitCode !== null || child.signalCode !== null)
    return Promise.resolve(child.exitCode);
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(
        new Error(
          `Timed out waiting for ${description} to exit (pid=${child.pid}). ${childDiagnostics.get(child)?.join("") ?? ""}`,
        ),
      );
    }, waitTimeoutMs);
    child.once("exit", (code) => {
      clearTimeout(timeout);
      resolve(code);
    });
  });
}

function guardedSpawn(root, wrapperName, probeArgs) {
  return guardedCommandSpawn(
    root,
    wrapperName,
    "scripts/lock-probe.sh",
    probeArgs,
  );
}

function guardedCommandSpawn(root, wrapperName, command, args, env) {
  const child = spawn(
    "bash",
    [
      "-c",
      '. scripts/resource-lock-owner.sh && with_resource_lock_owner "$@"',
      "resource-lock-self-test",
      `scripts/${wrapperName}`,
      command,
      ...args,
    ],
    {
      cwd: root,
      env: independentFixtureEnvironment(env),
      stdio: ["ignore", "ignore", "pipe"],
    },
  );
  const stderr = [];
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk) => stderr.push(chunk));
  childDiagnostics.set(child, stderr);
  return child;
}

function independentFixtureEnvironment(overrides) {
  const environment = { ...process.env };
  for (const key of resourceLockEnvironmentKeys) delete environment[key];
  return overrides === undefined
    ? environment
    : { ...environment, ...overrides };
}

function fixtureChildFailure(child, description) {
  if (child.exitCode === null && child.signalCode === null) return undefined;
  const status =
    child.signalCode === null
      ? `exit status ${child.exitCode}`
      : `signal ${child.signalCode}`;
  const stderr = childDiagnostics.get(child)?.join("").trim();
  return `${description} exited before expected probe output (${status})${
    stderr === undefined || stderr === "" ? "." : `:\n${stderr}`
  }`;
}

function assertFixtureChildRunning(child, description) {
  const failure = fixtureChildFailure(child, description);
  if (failure !== undefined) throw new Error(failure);
}

function waitForProbeLine(child, logPath, expectedLine, description) {
  return waitFor(() => {
    if (logLines(logPath).includes(expectedLine)) return true;
    assertFixtureChildRunning(child, description);
    return false;
  }, description);
}

function processIdentity(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 1) return undefined;
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    const fields = stat.slice(stat.lastIndexOf(") ") + 2).split(" ");
    if (fields[0] === "Z" || fields[0] === "X") return undefined;
    return { pid, startTime: fields[19] };
  } catch {
    return undefined;
  }
}

function processIdentityIsLive(identity) {
  return processIdentity(identity.pid)?.startTime === identity.startTime;
}

function signalProcessIdentity(identity, signal) {
  if (!processIdentityIsLive(identity)) return;
  process.kill(identity.pid, signal);
}

function logLines(logPath) {
  return existsSync(logPath)
    ? readFileSync(logPath, "utf8").trim().split("\n")
    : [];
}

async function assertSerialized(holder, contender, logPath) {
  try {
    await waitForProbeLine(holder, logPath, "holder-start", "the holder");
    await new Promise((resolve) => setTimeout(resolve, 120));
    assert.deepEqual(logLines(logPath), ["holder-start"]);
    assert.equal(await waitForExit(holder, "the holder"), 0);
    await waitForProbeLine(
      contender,
      logPath,
      "contender-start",
      "the contender",
    );
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
  let readinessPolls = 0;
  await assert.rejects(
    waitForResult(() => {
      readinessPolls += 1;
      if (readinessPolls === 1) return undefined;
      throw new Error("fixture readiness failure");
    }, "scheduled readiness failure"),
    /fixture readiness failure/,
  );
  const guardSource = readFileSync(
    path.join(repositoryRoot, "scripts", "with-resource-lock.sh"),
    "utf8",
  );
  assert.ok(
    guardSource.includes('source "$script_directory/process-supervision.sh"'),
    "the resource guard sources the shared process-supervision helper",
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
    for (const scriptName of fixtureScriptNames) {
      const destination = path.join(root, "scripts", scriptName);
      mkdirSync(path.dirname(destination), { recursive: true });
      copyFileSync(
        path.join(repositoryRoot, "scripts", scriptName),
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
        '  sleep "${3:-0.5}"',
        '  printf "%s-end\\n" "$label" >>"$log"',
        "fi",
        "",
      ].join("\n"),
    );
    chmodSync(probePath, 0o755);
    const detachedProbePath = path.join(root, "scripts", "detached-probe.cjs");
    writeFileSync(
      detachedProbePath,
      [
        "#!/usr/bin/env node",
        'const { spawn } = require("node:child_process");',
        'const { writeFileSync } = require("node:fs");',
        'if (process.argv[2] === "child") {',
        "  writeFileSync(process.env.DETACHED_PID_PATH, String(process.pid));",
        '  process.on("SIGTERM", () => {});',
        "  setInterval(() => {}, 1_000);",
        "} else {",
        '  const child = spawn(process.execPath, [__filename, "child"], {',
        "    detached: true,",
        "    env: process.env,",
        '    stdio: "ignore",',
        "  });",
        "  child.unref();",
        "  setInterval(() => {}, 1_000);",
        "}",
        "",
      ].join("\n"),
    );
    chmodSync(detachedProbePath, 0o755);

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
    for (const scriptName of [
      ...fixtureScriptNames,
      "lock-probe.sh",
      "detached-probe.cjs",
    ]) {
      const destination = path.join(linked, "scripts", scriptName);
      mkdirSync(path.dirname(destination), { recursive: true });
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

    for (const variable of resourceLockEnvironmentKeys.filter((key) =>
      key.startsWith("DND_VERIFICATION_"),
    )) {
      const invalidLog = path.join(temporaryRoot, `${variable}.log`);
      const invalid = guardedCommandSpawn(
        root,
        "with-broad-workspace-lock.sh",
        "scripts/lock-probe.sh",
        ["contender", invalidLog],
        { [variable]: "none" },
      );
      assert.equal(
        await waitForExit(invalid, "an invalid deadline policy"),
        64,
      );
      assert.deepEqual(
        logLines(invalidLog),
        [],
        "invalid policy never launches a payload",
      );
      assert.ok(childDiagnostics.get(invalid).join("").includes(variable));
    }
    const executionExpired = guardedCommandSpawn(
      root,
      "with-broad-workspace-lock.sh",
      "sleep",
      ["30"],
      { DND_VERIFICATION_EXECUTION_TIMEOUT_MS: "250" },
    );
    assert.equal(
      await waitForExit(executionExpired, "the execution deadline"),
      124,
    );
    assert.ok(
      childDiagnostics
        .get(executionExpired)
        .join("")
        .includes("execution deadline"),
    );

    const compilerProbePath = path.join(root, "scripts", "compiler-probe.cjs");
    const compilerPidPath = path.join(temporaryRoot, "compiler.pid");
    const compilerChildPidPath = path.join(temporaryRoot, "compiler-child.pid");
    writeFileSync(
      compilerProbePath,
      `const {spawn} = require("node:child_process");
const {writeFileSync} = require("node:fs");
if (process.argv[2] === "child") {
  writeFileSync(process.argv[3], String(process.pid));
} else {
  writeFileSync(process.argv[2], String(process.pid));
  spawn(process.execPath, [__filename, "child", process.argv[3], process.argv[4]], {stdio:"ignore"});
}
if (process.argv[4] !== "cooperative") process.on("SIGTERM", () => {});
setInterval(() => {}, 1000);
`,
    );
    const supervisionPath = path.join(
      root,
      "scripts",
      "process-supervision.sh",
    );
    const supervisionSource = readFileSync(supervisionPath, "utf8");
    const compilerFixture = supervisionSource.replace(
      "/usr/bin/cc",
      `${process.execPath} "${compilerProbePath}" "${compilerPidPath}" "${compilerChildPidPath}"`,
    );
    assert.notEqual(
      compilerFixture,
      supervisionSource,
      "the isolated fixture replaces only the trusted fixed compiler operation",
    );
    writeFileSync(supervisionPath, compilerFixture);
    const compilerTimedCommand = guardedCommandSpawn(
      root,
      "with-broad-workspace-lock.sh",
      "scripts/lock-probe.sh",
      ["contender", path.join(temporaryRoot, "compiler-payload.log")],
      { DND_VERIFICATION_EXECUTION_TIMEOUT_MS: "1000" },
    );
    const compilerIdentity = await waitForResult(
      () =>
        existsSync(compilerPidPath)
          ? processIdentity(Number(readFileSync(compilerPidPath, "utf8")))
          : undefined,
      "the bootstrap compiler",
    );
    const compilerChildIdentity = await waitForResult(
      () =>
        existsSync(compilerChildPidPath)
          ? processIdentity(Number(readFileSync(compilerChildPidPath, "utf8")))
          : undefined,
      "the compiler descendant",
    );
    assert.ok(compilerIdentity);
    assert.ok(compilerChildIdentity);
    console.log(
      `Compiler fixture pid=${compilerIdentity.pid} startTime=${compilerIdentity.startTime} child=${compilerChildIdentity.pid} childStartTime=${compilerChildIdentity.startTime}.`,
    );
    try {
      assert.equal(
        await waitForExit(
          compilerTimedCommand,
          "the compiler bootstrap deadline",
        ),
        137,
        "compiler bootstrap is bounded with escalation status preserved",
      );
      assert.equal(processIdentityIsLive(compilerIdentity), false);
      assert.equal(processIdentityIsLive(compilerChildIdentity), false);
      assert.deepEqual(
        logLines(path.join(temporaryRoot, "compiler-payload.log")),
        [],
      );
      const successor = guardedSpawn(linked, "with-mbt-lock.sh", [
        "contender",
        path.join(temporaryRoot, "compiler-successor.log"),
      ]);
      try {
        assert.equal(
          await waitForExit(successor, "the compiler cleanup successor"),
          0,
        );
      } finally {
        if (successor.exitCode === null && successor.signalCode === null) {
          successor.kill("SIGTERM");
          await waitForExit(successor, "the stopped compiler successor");
        }
      }
      console.log(
        `Compiler fixture cleanup status=137; pid=${compilerIdentity.pid} child=${compilerChildIdentity.pid} settled; successor=${successor.pid} status=0.`,
      );
    } finally {
      signalProcessIdentity(compilerIdentity, "SIGKILL");
      signalProcessIdentity(compilerChildIdentity, "SIGKILL");
      if (compilerTimedCommand.exitCode === null) {
        compilerTimedCommand.kill("SIGTERM");
        await waitForExit(compilerTimedCommand, "the compiler fixture cleanup");
      }
      writeFileSync(supervisionPath, supervisionSource);
    }

    for (const scenario of [
      { name: "deadline", action: "wait", status: 124 },
      { name: "owner-death", action: "owner", status: 125 },
      { name: "signal", action: "wrapper", status: 143 },
      { name: "publication", action: "publication", status: 143 },
    ]) {
      const pidPath = path.join(temporaryRoot, `compiler-${scenario.name}.pid`);
      const childPidPath = path.join(
        temporaryRoot,
        `compiler-${scenario.name}-child.pid`,
      );
      const statusPath = path.join(
        temporaryRoot,
        `compiler-${scenario.name}.status`,
      );
      const wrapperPath = path.join(root, "scripts", "with-resource-lock.sh");
      const wrapperSource = readFileSync(wrapperPath, "utf8");
      const baseCompiler = supervisionSource.replace(
        "/usr/bin/cc",
        `${process.execPath} "${compilerProbePath}" "${pidPath}" "${childPidPath}" "cooperative"`,
      );
      const publicationReleasePath = path.join(
        temporaryRoot,
        "publication-release",
      );
      const caseCompiler =
        scenario.action === "publication"
          ? baseCompiler.replace(
              "  supervision_compiler_pid=$!",
              () => `  while [[ ! -f "${publicationReleasePath}" ]]; do sleep 0.01; done
  kill -TERM "$$"
  supervision_compiler_pid=$!`,
            )
          : baseCompiler;
      writeFileSync(supervisionPath, caseCompiler);
      const recordedWrapper = wrapperSource.replace(
        "trap release_holder EXIT",
        `trap 'status=$?; release_holder; printf "%s\\n" "$status" >"${statusPath}"' EXIT`,
      );
      assert.notEqual(recordedWrapper, wrapperSource);
      writeFileSync(wrapperPath, recordedWrapper);
      const owned = guardedCommandSpawn(
        root,
        "with-broad-workspace-lock.sh",
        "scripts/lock-probe.sh",
        ["contender", path.join(temporaryRoot, `${scenario.name}-payload.log`)],
        {
          DND_VERIFICATION_EXECUTION_TIMEOUT_MS:
            scenario.action === "wait" ? "1000" : "5000",
        },
      );
      try {
        const identities = await Promise.all(
          [pidPath, childPidPath].map((file) =>
            waitForResult(() => {
              if (!existsSync(file)) {
                assertFixtureChildRunning(
                  owned,
                  "the cooperative compiler fixture",
                );
                return undefined;
              }
              return processIdentity(Number(readFileSync(file, "utf8")));
            }, `compiler ${scenario.name} readiness`),
          ),
        );
        const compiler = identities[0];
        const compilerChild = identities[1];
        assert.ok(compiler);
        assert.ok(compilerChild);
        const children = readFileSync(
          `/proc/${owned.pid}/task/${owned.pid}/children`,
          "utf8",
        )
          .trim()
          .split(/\s+/)
          .map(Number);
        assert.equal(
          children.length,
          1,
          "the original owner has exactly its guarded wrapper after bootstrap readiness",
        );
        const wrapper = processIdentity(children[0]);
        assert.ok(wrapper);
        if (scenario.action === "publication") {
          writeFileSync(publicationReleasePath, "release");
        }
        if (scenario.action === "owner") owned.kill("SIGTERM");
        if (scenario.action === "wrapper")
          signalProcessIdentity(wrapper, "SIGTERM");
        const status = await waitForResult(
          () =>
            existsSync(statusPath)
              ? Number(readFileSync(statusPath, "utf8").trim())
              : undefined,
          `compiler ${scenario.name} status`,
        );
        assert.equal(status, scenario.status);
        await waitForExit(owned, `compiler ${scenario.name} original owner`);
        assert.equal(processIdentityIsLive(compiler), false);
        assert.equal(processIdentityIsLive(compilerChild), false);
        assert.deepEqual(
          logLines(path.join(temporaryRoot, `${scenario.name}-payload.log`)),
          [],
        );
        const successor = guardedSpawn(linked, "with-mbt-lock.sh", [
          "contender",
          path.join(temporaryRoot, `${scenario.name}-successor.log`),
        ]);
        try {
          assert.equal(
            await waitForExit(successor, `compiler ${scenario.name} successor`),
            0,
          );
          console.log(
            `Compiler ${scenario.name} status=${status}; pid=${compiler.pid}/start=${compiler.startTime} child=${compilerChild.pid}/start=${compilerChild.startTime} settled before successor=${successor.pid} status=0.`,
          );
        } finally {
          if (successor.exitCode === null && successor.signalCode === null) {
            successor.kill("SIGTERM");
            await waitForExit(
              successor,
              "the compiler scenario successor cleanup",
            );
          }
        }
      } finally {
        for (const file of [pidPath, childPidPath]) {
          const identity = existsSync(file)
            ? processIdentity(Number(readFileSync(file, "utf8")))
            : undefined;
          if (identity !== undefined)
            signalProcessIdentity(identity, "SIGKILL");
        }
        if (owned.exitCode === null && owned.signalCode === null) {
          owned.kill("SIGTERM");
          await waitForExit(owned, "the cooperative compiler fixture cleanup");
        }
        writeFileSync(wrapperPath, wrapperSource);
        writeFileSync(supervisionPath, supervisionSource);
      }
    }

    const deadlineLog = path.join(temporaryRoot, "acquisition-deadline.log");
    const deadlineHolder = guardedSpawn(root, "with-broad-workspace-lock.sh", [
      "holder",
      deadlineLog,
    ]);
    await waitForProbeLine(
      deadlineHolder,
      deadlineLog,
      "holder-start",
      "the deadline holder",
    );
    const expiredContender = guardedCommandSpawn(
      linked,
      "with-mbt-lock.sh",
      "scripts/lock-probe.sh",
      ["contender", deadlineLog],
      {
        DND_VERIFICATION_LOCK_ACQUISITION_TIMEOUT_MS: "150",
      },
    );
    try {
      assert.equal(
        await waitForExit(expiredContender, "the deadline contender"),
        124,
        "blocked acquisition expires instead of launching its command",
      );
      assert.ok(
        childDiagnostics
          .get(expiredContender)
          .join("")
          .includes("acquisition deadline"),
      );
      assert.equal(
        await waitForExit(deadlineHolder, "the unaffected deadline holder"),
        0,
      );
      assert.deepEqual(logLines(deadlineLog), ["holder-start", "holder-end"]);
    } finally {
      if (deadlineHolder.exitCode === null) deadlineHolder.kill("SIGTERM");
      if (expiredContender.exitCode === null) expiredContender.kill("SIGTERM");
    }

    const sharedLog = path.join(temporaryRoot, "shared.log");
    const sharedHolder = guardedSpawn(root, "with-broad-workspace-lock.sh", [
      "holder",
      sharedLog,
    ]);
    await waitForProbeLine(
      sharedHolder,
      sharedLog,
      "holder-start",
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
    const cumulativePrimaryLog = path.join(
      temporaryRoot,
      "cumulative-primary.log",
    );
    const cumulativeAliasLog = path.join(temporaryRoot, "cumulative-alias.log");
    const cumulativeContenderLog = path.join(
      temporaryRoot,
      "cumulative-contender.log",
    );
    const cumulativeHolders = [
      ["dnd-heavy-verification.lock", cumulativePrimaryLog, "0.6"],
      [retiredLockNames[0], cumulativeAliasLog, "1.2"],
    ].map(([lockName, log, duration]) =>
      spawn(
        "flock",
        [
          "--exclusive",
          path.join(commonDir, lockName),
          probePath,
          "holder",
          log,
          duration,
        ],
        { cwd: root, stdio: "ignore" },
      ),
    );
    try {
      await waitForProbeLine(
        cumulativeHolders[0],
        cumulativePrimaryLog,
        "holder-start",
        "the cumulative primary holder",
      );
      await waitForProbeLine(
        cumulativeHolders[1],
        cumulativeAliasLog,
        "holder-start",
        "the cumulative alias holder",
      );
      const cumulativeContender = guardedCommandSpawn(
        linked,
        "with-mbt-lock.sh",
        "scripts/lock-probe.sh",
        ["contender", cumulativeContenderLog],
        { DND_VERIFICATION_LOCK_ACQUISITION_TIMEOUT_MS: "900" },
      );
      try {
        assert.equal(
          await waitForExit(cumulativeContender, "the cumulative contender"),
          124,
          "the acquisition budget must not restart at a later alias",
        );
        assert.deepEqual(logLines(cumulativeContenderLog), []);
      } finally {
        if (cumulativeContender.exitCode === null)
          cumulativeContender.kill("SIGTERM");
      }
      for (const holder of cumulativeHolders)
        assert.equal(await waitForExit(holder, "a cumulative holder"), 0);
    } finally {
      for (const holder of cumulativeHolders)
        if (holder.exitCode === null) holder.kill("SIGTERM");
    }

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
      await waitForProbeLine(
        holder,
        logPath,
        "holder-start",
        `${retiredLockName} holder`,
      );
      const contender = guardedSpawn(linked, "with-mbt-lock.sh", [
        "contender",
        logPath,
      ]);
      await assertSerialized(holder, contender, logPath);
    }

    const deadlineDetachedPidPath = path.join(
      temporaryRoot,
      "deadline-detached-child.pid",
    );
    const deadlineSupervised = guardedCommandSpawn(
      root,
      "with-broad-workspace-lock.sh",
      process.execPath,
      ["scripts/detached-probe.cjs"],
      {
        DETACHED_PID_PATH: deadlineDetachedPidPath,
        DND_VERIFICATION_EXECUTION_TIMEOUT_MS: "5000",
      },
    );
    const deadlineDetachedIdentity = await waitForResult(() => {
      if (!existsSync(deadlineDetachedPidPath)) {
        assertFixtureChildRunning(
          deadlineSupervised,
          "the escaped-child deadline wrapper",
        );
        return undefined;
      }
      return processIdentity(
        Number(readFileSync(deadlineDetachedPidPath, "utf8").trim()),
      );
    }, "the deadline's escaped child");
    assert.ok(deadlineDetachedIdentity);
    console.log(
      `Deadline fixture child pid=${deadlineDetachedIdentity.pid} startTime=${deadlineDetachedIdentity.startTime}; supervisor owner pid=${deadlineSupervised.pid}.`,
    );
    const cleanupContenderLog = path.join(
      temporaryRoot,
      "deadline-cleanup-contender.log",
    );
    const cleanupContender = guardedSpawn(linked, "with-mbt-lock.sh", [
      "contender",
      cleanupContenderLog,
    ]);
    try {
      await waitForProbeLine(
        cleanupContender,
        cleanupContenderLog,
        "contender-start",
        "the post-cleanup contender",
      );
      assert.equal(
        processIdentityIsLive(deadlineDetachedIdentity),
        false,
        "a successor acquires only after the escaped TERM-resistant descendant is settled",
      );
      assert.equal(
        await waitForExit(deadlineSupervised, "the escalated deadline cleanup"),
        137,
        "deadline cleanup preserves the existing escalation status",
      );
      assert.ok(
        childDiagnostics
          .get(deadlineSupervised)
          .join("")
          .includes("execution deadline"),
      );
      assert.equal(
        await waitForExit(cleanupContender, "the post-cleanup contender"),
        0,
      );
      console.log(
        `Deadline fixture cleanup status=137; child pid=${deadlineDetachedIdentity.pid} settled before successor pid=${cleanupContender.pid} acquired; successor status=0.`,
      );
    } finally {
      if (deadlineSupervised.exitCode === null)
        deadlineSupervised.kill("SIGTERM");
      if (cleanupContender.exitCode === null) cleanupContender.kill("SIGTERM");
      signalProcessIdentity(deadlineDetachedIdentity, "SIGKILL");
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
