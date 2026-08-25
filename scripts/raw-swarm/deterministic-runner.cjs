const { spawn } = require("node:child_process");
const { closeSync, openSync, readFileSync, readdirSync } = require("node:fs");
const { join } = require("node:path");

const SETTLEMENT_TIMEOUT_MILLISECONDS = 1_000;
const SETTLEMENT_POLL_MILLISECONDS = 20;
const OUTPUT_FLUSH_TIMEOUT_MILLISECONDS = 500;

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function readProcessStat(pid) {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    const fields = stat
      .slice(stat.lastIndexOf(")") + 2)
      .trim()
      .split(/\s+/);
    const processGroup = Number(fields[2]);
    const startTime = fields[19];
    if (
      fields[0] === undefined ||
      !Number.isSafeInteger(processGroup) ||
      startTime === undefined
    ) {
      throw new Error(`Could not parse process ${String(pid)} statistics.`);
    }
    return { state: fields[0], processGroup, startTime };
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return undefined;
    }
    throw new Error(
      `Could not observe process ${String(pid)}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function observeProcessGroup(processGroup) {
  if (!Number.isSafeInteger(processGroup)) {
    throw new Error(
      "Could not observe an invalid deterministic process group.",
    );
  }
  let entries;
  try {
    entries = readdirSync("/proc", { withFileTypes: true });
  } catch (error) {
    throw new Error(
      `Could not observe deterministic process groups: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const members = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !/^\d+$/u.test(entry.name)) continue;
    const stat = readProcessStat(Number(entry.name));
    if (
      stat !== undefined &&
      stat.processGroup === processGroup &&
      stat.state !== "X"
    ) {
      members.push({
        pid: Number(entry.name),
        processGroup: stat.processGroup,
        startTime: stat.startTime,
        state: stat.state,
      });
    }
  }
  return members;
}

async function waitForChildSettlement(active, timeoutMilliseconds) {
  const deadline = Date.now() + timeoutMilliseconds;
  while (!active.closed && Date.now() < deadline) {
    await delay(SETTLEMENT_POLL_MILLISECONDS);
  }
  return active.closed;
}

async function waitForProcessGroupSettlement(
  processGroup,
  timeoutMilliseconds,
) {
  const deadline = Date.now() + timeoutMilliseconds;
  let members = observeProcessGroup(processGroup);
  while (members.length > 0 && Date.now() < deadline) {
    await delay(SETTLEMENT_POLL_MILLISECONDS);
    members = observeProcessGroup(processGroup);
  }
  return { settled: members.length === 0, members };
}

function writeCapturedOutput(stream, contents) {
  if (contents.length === 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    stream.write(contents, (error) => {
      if (error === undefined || error === null) resolve();
      else reject(error);
    });
  });
}

async function forwardCapturedOutput(active) {
  try {
    await writeCapturedOutput(process.stdout, readFileSync(active.stdoutPath));
    await writeCapturedOutput(process.stderr, readFileSync(active.stderrPath));
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

function createActiveRun(boundary, command, args, environment, buildDirectory) {
  const commandLabel = command.replace(/[^A-Za-z0-9_.-]/gu, "_");
  const stdoutPath = join(buildDirectory, `${commandLabel}.stdout`);
  const stderrPath = join(buildDirectory, `${commandLabel}.stderr`);
  const stdoutFd = openSync(stdoutPath, "w");
  const stderrFd = openSync(stderrPath, "w");
  let child;
  try {
    child = spawn(boundary, [command, ...args], {
      detached: process.platform === "linux",
      env: environment,
      stdio: ["ignore", stdoutFd, stderrFd],
    });
  } finally {
    closeSync(stdoutFd);
    closeSync(stderrFd);
  }

  const active = {
    child,
    closed: false,
    commandLabel,
    closeResult: undefined,
    groupVerified: false,
    processGroup: child.pid,
    processStartTime: undefined,
    stderrPath,
    stdoutPath,
  };
  active.closePromise = new Promise((resolve, reject) => {
    child.once("error", (error) => {
      if (active.closed) return;
      active.closed = true;
      reject(error);
    });
    child.once("close", (status, signal) => {
      if (active.closed) return;
      active.closed = true;
      active.closeResult = { status, signal };
      resolve(active.closeResult);
    });
  });
  if (process.platform === "linux" && child.pid !== undefined) {
    const processStat = readProcessStat(child.pid);
    active.processStartTime = processStat?.startTime;
    active.groupVerified =
      processStat !== undefined &&
      processStat.state !== "Z" &&
      processStat.state !== "X" &&
      processStat.processGroup === active.processGroup;
  }
  active.outputPromise = active.closePromise.then(
    () => forwardCapturedOutput(active),
    (error) => ({ ok: false, error }),
  );
  return active;
}

function ownsProcessGroup(active) {
  if (
    process.platform !== "linux" ||
    active.child.pid === undefined ||
    active.processStartTime === undefined
  ) {
    return process.platform !== "linux";
  }
  const processStat = readProcessStat(active.child.pid);
  return (
    processStat !== undefined &&
    processStat.state !== "Z" &&
    processStat.state !== "X" &&
    processStat.processGroup === active.processGroup &&
    processStat.startTime === active.processStartTime
  );
}

async function waitForOwnedProcessGroup(active) {
  const deadline = Date.now() + SETTLEMENT_TIMEOUT_MILLISECONDS;
  while (!active.closed && Date.now() < deadline) {
    if (ownsProcessGroup(active)) return true;
    await delay(SETTLEMENT_POLL_MILLISECONDS);
  }
  return ownsProcessGroup(active);
}

function revalidateProcessGroupMembers(active, members) {
  for (const member of members) {
    const current = readProcessStat(member.pid);
    if (current === undefined) continue;
    if (
      current.processGroup !== active.processGroup ||
      current.startTime !== member.startTime
    ) {
      throw new Error(
        `The deterministic process group member ${String(member.pid)} changed identity before escalation.`,
      );
    }
  }
}

async function terminateVerifiedProcessGroup(active, initialObservation) {
  if (!active.groupVerified) {
    throw new Error(
      `The deterministic child process group for PID ${String(active.child.pid)} lost its ownership proof before cleanup.`,
    );
  }
  let observation = initialObservation;
  if (observation.settled) return observation;
  revalidateProcessGroupMembers(active, observation.members);
  try {
    process.kill(-active.processGroup, "SIGTERM");
  } catch (error) {
    if (!(error && typeof error === "object" && error.code === "ESRCH")) {
      throw error;
    }
  }
  observation = await waitForProcessGroupSettlement(
    active.processGroup,
    SETTLEMENT_TIMEOUT_MILLISECONDS,
  );
  if (observation.settled) return observation;
  revalidateProcessGroupMembers(active, observation.members);
  try {
    process.kill(-active.processGroup, "SIGKILL");
  } catch (error) {
    if (!(error && typeof error === "object" && error.code === "ESRCH")) {
      throw error;
    }
  }
  observation = await waitForProcessGroupSettlement(
    active.processGroup,
    SETTLEMENT_TIMEOUT_MILLISECONDS,
  );
  if (!observation.settled) {
    throw new Error(
      `The deterministic child process group for PID ${String(active.child.pid)} did not settle after SIGKILL.`,
    );
  }
  return observation;
}

async function ensureNormalProcessGroupSettlement(active) {
  if (process.platform !== "linux") return;
  if (!active.groupVerified) {
    throw new Error(
      `The deterministic child process group for PID ${String(active.child.pid)} was not verified before normal completion.`,
    );
  }
  const observation = await waitForProcessGroupSettlement(
    active.processGroup,
    SETTLEMENT_TIMEOUT_MILLISECONDS,
  );
  if (observation.settled) return;
  await terminateVerifiedProcessGroup(active, observation);
  throw new Error(
    `Deterministic command ${active.commandLabel} exited while descendant processes remained; the owned group was terminated before failing the phase.`,
  );
}

async function signalActiveProcessGroup(active, signal) {
  if (active.closed) return false;
  if (process.platform !== "linux") {
    active.child.kill(signal);
    return true;
  }
  if (!(await waitForOwnedProcessGroup(active))) {
    throw new Error(
      `The deterministic child process group for PID ${String(active.child.pid)} is not owned; refusing to signal an unverified group.`,
    );
  }
  active.groupVerified = true;
  try {
    process.kill(-active.processGroup, signal);
    return true;
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ESRCH") {
      return false;
    }
    throw error;
  }
}

async function terminateActiveRun(active, signal) {
  if (active.closed) return;
  await signalActiveProcessGroup(active, signal);
  const settled = await waitForChildSettlement(
    active,
    SETTLEMENT_TIMEOUT_MILLISECONDS,
  );
  const groupObservation =
    process.platform !== "linux" ||
    (await waitForProcessGroupSettlement(
      active.processGroup,
      SETTLEMENT_TIMEOUT_MILLISECONDS,
    ));
  if (process.platform === "linux" && !groupObservation.settled) {
    await terminateVerifiedProcessGroup(active, groupObservation);
    if (
      !(await waitForChildSettlement(active, SETTLEMENT_TIMEOUT_MILLISECONDS))
    ) {
      throw new Error(
        `The deterministic child process for PID ${String(active.child.pid)} did not reap after process-group termination.`,
      );
    }
  } else if (!settled) {
    if (process.platform === "linux") {
      await signalActiveProcessGroup(active, "SIGKILL");
    } else {
      active.child.kill("SIGKILL");
    }
    const childSettled = await waitForChildSettlement(
      active,
      SETTLEMENT_TIMEOUT_MILLISECONDS,
    );
    if (!childSettled) {
      throw new Error(
        `The deterministic child process for PID ${String(active.child.pid)} did not settle after SIGKILL.`,
      );
    }
  }
}

async function finishActiveRun(active) {
  const result = await active.closePromise;
  await ensureNormalProcessGroupSettlement(active);
  const output = await active.outputPromise;
  if (!output.ok) throw output.error;
  return result;
}

function createDeterministicRunner({ boundary, environment, buildDirectory }) {
  let activeRun;
  return {
    async run(command, args) {
      const active = createActiveRun(
        boundary,
        command,
        args,
        environment,
        buildDirectory,
      );
      activeRun = active;
      active.finished = finishActiveRun(active);
      try {
        return await active.finished;
      } finally {
        if (activeRun === active) activeRun = undefined;
      }
    },
    async terminateActive(signal) {
      const active = activeRun;
      if (active === undefined) return;
      await terminateActiveRun(active, signal);
      await Promise.race([
        active.outputPromise,
        delay(OUTPUT_FLUSH_TIMEOUT_MILLISECONDS).then(() => ({
          ok: false,
          timedOut: true,
        })),
      ]);
    },
  };
}

module.exports = { createDeterministicRunner };
