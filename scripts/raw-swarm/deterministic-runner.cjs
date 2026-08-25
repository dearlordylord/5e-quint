const { spawn } = require("node:child_process");
const { closeSync, openSync, readFileSync, readdirSync } = require("node:fs");
const { join } = require("node:path");

const PROCESS_GROUP_SETTLEMENT_TIMEOUT_MILLISECONDS = 1_000;
const PROCESS_GROUP_SETTLEMENT_POLL_MILLISECONDS = 20;
const OUTPUT_FORWARD_TIMEOUT_MILLISECONDS = 500;

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
      stat.state !== "Z" &&
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
  while (!active.leaderClosed && Date.now() < deadline) {
    await delay(PROCESS_GROUP_SETTLEMENT_POLL_MILLISECONDS);
  }
  return active.leaderClosed;
}

async function waitForProcessGroupSettlement(
  processGroup,
  timeoutMilliseconds,
  recordObservation,
  beforePoll,
) {
  const deadline = Date.now() + timeoutMilliseconds;
  const observe = () => {
    const members = observeProcessGroup(processGroup);
    recordObservation?.(members);
    return members;
  };
  let members = observe();
  while (members.length > 0 && Date.now() < deadline) {
    await beforePoll?.(members);
    await delay(PROCESS_GROUP_SETTLEMENT_POLL_MILLISECONDS);
    members = observe();
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

function createActiveRun(
  boundary,
  command,
  args,
  environment,
  buildDirectory,
  registerActive,
) {
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
    leaderClosed: false,
    commandLabel,
    closeResult: undefined,
    ownershipRegistered: child.pid !== undefined,
    initialObservationError: undefined,
    lastObservedMembers: [],
    processGroup: child.pid,
    processStartTime: undefined,
    stderrPath,
    stdoutPath,
  };
  let resolveTerminationRequest;
  active.terminationRequest = undefined;
  active.terminationRequestPromise = new Promise((resolve) => {
    resolveTerminationRequest = resolve;
  });
  active.resolveTerminationRequest = resolveTerminationRequest;
  registerActive(active);
  active.closePromise = new Promise((resolve, reject) => {
    child.once("error", (error) => {
      if (active.leaderClosed) return;
      active.leaderClosed = true;
      reject(error);
    });
    child.once("close", (status, signal) => {
      if (active.leaderClosed) return;
      active.leaderClosed = true;
      active.closeResult = { status, signal };
      resolve(active.closeResult);
    });
  });
  if (process.platform === "linux" && child.pid !== undefined) {
    try {
      const processStat = readProcessStat(child.pid);
      active.processStartTime = processStat?.startTime;
    } catch (error) {
      active.initialObservationError = error;
    }
  }
  return active;
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

function observeActiveProcessGroup(active) {
  const members = observeProcessGroup(active.processGroup);
  active.lastObservedMembers = members;
  return members;
}

function requestTermination(active, signal) {
  if (active.terminationRequest !== undefined) return;
  active.terminationRequest = { signal, sent: false };
  active.resolveTerminationRequest();
}

async function signalActiveProcessGroup(active, signal, observedMembers) {
  if (process.platform !== "linux") {
    if (!active.leaderClosed) active.child.kill(signal);
    if (active.terminationRequest !== undefined) {
      active.terminationRequest.sent = true;
    }
    return true;
  }
  if (!active.ownershipRegistered) {
    throw new Error(
      `The deterministic child process group for PID ${String(active.child.pid)} was not registered; refusing to signal an unowned group.`,
    );
  }
  const members =
    observedMembers === undefined
      ? observeActiveProcessGroup(active)
      : observedMembers;
  active.lastObservedMembers = members;
  if (members.length === 0) {
    if (active.terminationRequest !== undefined) {
      active.terminationRequest.sent = true;
    }
    return false;
  }
  revalidateProcessGroupMembers(active, members);
  try {
    process.kill(-active.processGroup, signal);
    if (active.terminationRequest !== undefined) {
      active.terminationRequest.sent = true;
    }
    return true;
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ESRCH") {
      if (active.terminationRequest !== undefined) {
        active.terminationRequest.sent = true;
      }
      return false;
    }
    throw error;
  }
}

async function terminateVerifiedProcessGroup(
  active,
  initialObservation,
  terminationSignal = "SIGTERM",
) {
  if (!active.ownershipRegistered) {
    throw new Error(
      `The deterministic child process group for PID ${String(active.child.pid)} lost its ownership registration before cleanup.`,
    );
  }
  let observation = initialObservation;
  if (observation.settled) return observation;
  await signalActiveProcessGroup(
    active,
    terminationSignal,
    observation.members,
  );
  observation = await waitForProcessGroupSettlement(
    active.processGroup,
    PROCESS_GROUP_SETTLEMENT_TIMEOUT_MILLISECONDS,
    (members) => {
      active.lastObservedMembers = members;
    },
  );
  if (observation.settled) return observation;
  await signalActiveProcessGroup(active, "SIGKILL", observation.members);
  observation = await waitForProcessGroupSettlement(
    active.processGroup,
    PROCESS_GROUP_SETTLEMENT_TIMEOUT_MILLISECONDS,
    (members) => {
      active.lastObservedMembers = members;
    },
  );
  if (!observation.settled) {
    throw new Error(
      `The deterministic child process group for PID ${String(active.child.pid)} did not settle after SIGKILL.`,
    );
  }
  return observation;
}

async function settleOwnedProcessGroup(active) {
  if (process.platform !== "linux") return;
  const observation = await waitForProcessGroupSettlement(
    active.processGroup,
    PROCESS_GROUP_SETTLEMENT_TIMEOUT_MILLISECONDS,
    (members) => {
      active.lastObservedMembers = members;
    },
    (members) => {
      const request = active.terminationRequest;
      if (request !== undefined && !request.sent) {
        return signalActiveProcessGroup(active, request.signal, members);
      }
      return undefined;
    },
  );
  if (observation.settled) return;
  const terminationSignal = active.terminationRequest?.signal ?? "SIGTERM";
  await terminateVerifiedProcessGroup(active, observation, terminationSignal);
  if (active.terminationRequest !== undefined) return;
  throw new Error(
    `Deterministic command ${active.commandLabel} exited while descendant processes remained; the owned group was terminated before failing the phase.`,
  );
}

async function ensureNormalProcessGroupSettlement(active) {
  if (process.platform !== "linux") return;
  if (!active.ownershipRegistered) {
    throw new Error(
      `The deterministic child process group for PID ${String(active.child.pid)} was not registered before normal completion.`,
    );
  }
  await settleOwnedProcessGroup(active);
}

function ownedLeaderMember(active) {
  if (
    !active.ownershipRegistered ||
    active.child.pid === undefined ||
    active.processStartTime === undefined
  ) {
    return undefined;
  }
  const processStat = readProcessStat(active.child.pid);
  if (
    processStat === undefined ||
    processStat.state === "Z" ||
    processStat.state === "X" ||
    processStat.processGroup !== active.processGroup ||
    processStat.startTime !== active.processStartTime
  ) {
    return undefined;
  }
  return {
    pid: active.child.pid,
    processGroup: processStat.processGroup,
    startTime: processStat.startTime,
    state: processStat.state,
  };
}

async function terminateKnownGroupAfterObservationError(active) {
  if (!active.ownershipRegistered) return;
  const members =
    active.lastObservedMembers.length > 0
      ? active.lastObservedMembers
      : [ownedLeaderMember(active)].filter((member) => member !== undefined);
  if (members.length === 0) return;
  await signalActiveProcessGroup(active, "SIGTERM", members);
  await signalActiveProcessGroup(active, "SIGKILL", members);
  if (
    !(await waitForChildSettlement(
      active,
      PROCESS_GROUP_SETTLEMENT_TIMEOUT_MILLISECONDS,
    ))
  ) {
    throw new Error(
      `The deterministic child process for PID ${String(active.child.pid)} did not reap after observation failure cleanup.`,
    );
  }
}

async function cleanupOwnedProcessGroup(active) {
  if (process.platform !== "linux") {
    if (!active.leaderClosed) active.child.kill("SIGKILL");
    if (
      !(await waitForChildSettlement(
        active,
        PROCESS_GROUP_SETTLEMENT_TIMEOUT_MILLISECONDS,
      ))
    ) {
      throw new Error(
        `The deterministic child process for PID ${String(active.child.pid)} did not settle after SIGKILL.`,
      );
    }
    return;
  }
  try {
    if (!active.ownershipRegistered) {
      throw new Error(
        `The deterministic child process group for PID ${String(active.child.pid)} is not registered; refusing cleanup without an ownership record.`,
      );
    }
    const observation = await waitForProcessGroupSettlement(
      active.processGroup,
      PROCESS_GROUP_SETTLEMENT_TIMEOUT_MILLISECONDS,
      (members) => {
        active.lastObservedMembers = members;
      },
    );
    if (!observation.settled) {
      await terminateVerifiedProcessGroup(active, observation);
    }
  } catch (error) {
    await terminateKnownGroupAfterObservationError(active);
    throw error;
  }
  if (
    !(await waitForChildSettlement(
      active,
      PROCESS_GROUP_SETTLEMENT_TIMEOUT_MILLISECONDS,
    ))
  ) {
    throw new Error(
      `The deterministic child process for PID ${String(active.child.pid)} did not reap after process-group termination.`,
    );
  }
}

function describeError(error) {
  return error instanceof Error ? error.message : String(error);
}

async function settleActiveRun(active) {
  let result;
  let primaryError;
  try {
    if (active.initialObservationError !== undefined) {
      throw active.initialObservationError;
    }
    const firstEvent = await Promise.race([
      active.closePromise.then((closeResult) => ({
        kind: "leader-closed",
        closeResult,
      })),
      active.terminationRequestPromise.then(() => ({
        kind: "termination-requested",
      })),
    ]);
    if (
      firstEvent.kind === "termination-requested" &&
      active.terminationRequest !== undefined &&
      !active.terminationRequest.sent
    ) {
      await signalActiveProcessGroup(active, active.terminationRequest.signal);
    }
    if (firstEvent.kind === "termination-requested") {
      await settleOwnedProcessGroup(active);
      if (
        !(await waitForChildSettlement(
          active,
          PROCESS_GROUP_SETTLEMENT_TIMEOUT_MILLISECONDS,
        ))
      ) {
        throw new Error(
          `The deterministic child process for PID ${String(active.child.pid)} did not reap after process-group termination.`,
        );
      }
      result = await active.closePromise;
    } else {
      result = firstEvent.closeResult;
      await ensureNormalProcessGroupSettlement(active);
    }
    return result;
  } catch (error) {
    primaryError = error;
    try {
      await cleanupOwnedProcessGroup(active);
    } catch (cleanupError) {
      throw new Error(
        `Deterministic command ${active.commandLabel} failed: ${describeError(primaryError)}; cleanup failed: ${describeError(cleanupError)}`,
      );
    }
    throw primaryError;
  }
}

async function forwardCapturedOutputWithinDeadline(active) {
  const output = await Promise.race([
    active.outputPromise,
    delay(OUTPUT_FORWARD_TIMEOUT_MILLISECONDS).then(() => ({
      ok: false,
      timedOut: true,
    })),
  ]);
  if (output.ok) return;
  if (output.timedOut) {
    throw new Error(
      `Deterministic command ${active.commandLabel} timed out forwarding captured stdout/stderr.`,
    );
  }
  throw output.error;
}

async function finishActiveRun(active) {
  const result = await active.settlementPromise;
  await forwardCapturedOutputWithinDeadline(active);
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
        (registeredActive) => {
          activeRun = registeredActive;
        },
      );
      active.settlementPromise = settleActiveRun(active);
      active.outputPromise = active.settlementPromise.then(
        () => forwardCapturedOutput(active),
        (error) => ({ ok: false, error }),
      );
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
      requestTermination(active, signal);
      let settlementError;
      try {
        await active.settlementPromise;
      } catch (error) {
        settlementError = error;
      }
      let outputError;
      try {
        await forwardCapturedOutputWithinDeadline(active);
      } catch (error) {
        outputError = error;
      }
      if (settlementError !== undefined) throw settlementError;
      if (outputError !== undefined) throw outputError;
    },
  };
}

module.exports = { createDeterministicRunner };
