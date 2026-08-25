const { spawn } = require("node:child_process");
const { closeSync, openSync, readFileSync, readdirSync } = require("node:fs");
const { join } = require("node:path");

const SETTLEMENT_TIMEOUT_MILLISECONDS = 1_000;
const SETTLEMENT_POLL_MILLISECONDS = 20;

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
      return undefined;
    }
    return { state: fields[0], processGroup, startTime };
  } catch {
    return undefined;
  }
}

function processGroupHasLiveMembers(processGroup) {
  if (!Number.isSafeInteger(processGroup)) return false;
  let entries;
  try {
    entries = readdirSync("/proc", { withFileTypes: true });
  } catch {
    return false;
  }
  return entries.some((entry) => {
    if (!entry.isDirectory() || !/^\d+$/u.test(entry.name)) return false;
    const stat = readProcessStat(Number(entry.name));
    return (
      stat !== undefined &&
      stat.processGroup === processGroup &&
      stat.state !== "Z" &&
      stat.state !== "X"
    );
  });
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
  while (processGroupHasLiveMembers(processGroup) && Date.now() < deadline) {
    await delay(SETTLEMENT_POLL_MILLISECONDS);
  }
  return !processGroupHasLiveMembers(processGroup);
}

function writeCapturedOutput(stream, contents) {
  if (contents.length === 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    stream.write(contents, (error) => {
      if (error === undefined) resolve();
      else reject(error);
    });
  });
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
  }
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
  const processGroup = active.processGroup;
  await signalActiveProcessGroup(active, signal);
  const settled = await waitForChildSettlement(
    active,
    SETTLEMENT_TIMEOUT_MILLISECONDS,
  );
  const groupSettled =
    process.platform !== "linux" ||
    (await waitForProcessGroupSettlement(
      processGroup,
      SETTLEMENT_TIMEOUT_MILLISECONDS,
    ));
  if (!settled || !groupSettled) {
    if (process.platform === "linux") {
      if (!processGroupHasLiveMembers(processGroup)) {
        if (!settled) {
          await waitForChildSettlement(active, SETTLEMENT_TIMEOUT_MILLISECONDS);
        }
      } else {
        if (!active.groupVerified) {
          throw new Error(
            `The deterministic child process group for PID ${String(active.child.pid)} lost its ownership proof before escalation.`,
          );
        }
        process.kill(-processGroup, "SIGKILL");
      }
    } else {
      active.child.kill("SIGKILL");
    }
    const killed = await waitForChildSettlement(
      active,
      SETTLEMENT_TIMEOUT_MILLISECONDS,
    );
    const killedGroup =
      process.platform !== "linux" ||
      (await waitForProcessGroupSettlement(
        processGroup,
        SETTLEMENT_TIMEOUT_MILLISECONDS,
      ));
    if (!killed || !killedGroup) {
      throw new Error(
        `The deterministic child process group for PID ${String(active.child.pid)} did not settle after SIGKILL.`,
      );
    }
  }
}

async function finishActiveRun(active, buildDirectory) {
  const result = await active.closePromise;
  const stdoutPath = join(buildDirectory, `${active.commandLabel}.stdout`);
  const stderrPath = join(buildDirectory, `${active.commandLabel}.stderr`);
  await writeCapturedOutput(process.stdout, readFileSync(stdoutPath));
  await writeCapturedOutput(process.stderr, readFileSync(stderrPath));
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
      active.finished = finishActiveRun(active, buildDirectory);
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
      await active.finished;
    },
  };
}

module.exports = { createDeterministicRunner };
