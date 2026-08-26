const {
  closeSync,
  fstatSync,
  openSync,
  readFileSync,
  readlinkSync,
  realpathSync,
} = require("node:fs");
const { isAbsolute, resolve } = require("node:path");
const { spawnSync } = require("node:child_process");

function fail(message) {
  throw new Error(message);
}

function assertFlockResult(descriptor, expectedStatus) {
  const probe = spawnSync("flock", ["--exclusive", "--nonblock", "3"], {
    stdio: ["ignore", "ignore", "ignore", descriptor],
  });
  if (
    probe.error !== undefined ||
    probe.signal !== null ||
    probe.status !== expectedStatus
  ) {
    fail("Raw Swarm model operations require an inherited model-lane lock.");
  }
}

function processStartTime(pid) {
  const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
  const fields = stat
    .slice(stat.lastIndexOf(")") + 2)
    .trim()
    .split(/\s+/);
  const startTime = fields[19];
  if (startTime === undefined) {
    fail("Raw Swarm model operations require an inherited model-lane lock.");
  }
  return startTime;
}

function inheritedDescriptorPath(pid, descriptor) {
  return realpathSync(readlinkSync(`/proc/${pid}/fd/${descriptor}`));
}

function canonicalLaneLockPath(expectedName) {
  const commonDirectory = spawnSync(
    "git",
    ["rev-parse", "--path-format=absolute", "--git-common-dir"],
    { encoding: "utf8" },
  );
  const commonDirectoryPath =
    typeof commonDirectory.stdout === "string"
      ? commonDirectory.stdout.trim()
      : "";
  if (
    commonDirectory.error !== undefined ||
    commonDirectory.signal !== null ||
    commonDirectory.status !== 0 ||
    !isAbsolute(commonDirectoryPath)
  ) {
    fail("Raw Swarm model operations require the canonical model-lane lock.");
  }
  try {
    return realpathSync(resolve(commonDirectoryPath, expectedName));
  } catch {
    fail("Raw Swarm model operations require the canonical model-lane lock.");
  }
}

function resolveLanePaths(ownerPid, laneFd, lockPathInput) {
  try {
    const lockPath = realpathSync(resolve(lockPathInput));
    const inheritedLockPath = inheritedDescriptorPath(ownerPid, laneFd);
    const currentDescriptorPath = inheritedDescriptorPath(process.pid, laneFd);
    fstatSync(laneFd).isFile() ||
      fail("Raw Swarm model operations require an inherited model-lane lock.");
    return { lockPath, inheritedLockPath, currentDescriptorPath };
  } catch {
    fail("Raw Swarm model operations require the canonical model-lane lock.");
  }
}

function assertHeldModelLaneLock(lockPath, laneFd) {
  const probeDescriptor = (() => {
    try {
      return openSync(lockPath, "a+");
    } catch {
      fail("Raw Swarm model operations require a held model-lane lock.");
    }
  })();
  try {
    assertFlockResult(probeDescriptor, 1);
    assertFlockResult(laneFd, 0);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Raw Swarm")) {
      throw error;
    }
    fail("Raw Swarm model operations require a held model-lane lock.");
  } finally {
    closeSync(probeDescriptor);
  }
}

function hasAncestorProcess(pid, expectedAncestorPid) {
  let currentPid = pid;
  while (currentPid > 1) {
    if (currentPid === expectedAncestorPid) return true;
    const status = readFileSync(`/proc/${currentPid}/status`, "utf8");
    const parentMatch = /^PPid:\s+(\d+)$/mu.exec(status);
    if (parentMatch === null) return false;
    currentPid = Number(parentMatch[1]);
  }
  return false;
}

/**
 * The lane and path variables describe the wrapper's selection, but are not a
 * capability. The wrapper also inherits its locked file descriptor into the
 * model process. A fresh descriptor must be unable to acquire the path while
 * flock on the inherited descriptor must succeed; this distinguishes the
 * wrapper-held lock from a caller that merely forges environment values.
 */
function assertModelLaneLock(environment = process.env) {
  const lane = environment.DND_RAW_SWARM_MODEL_LANE ?? "";
  const lockPathInput = environment.DND_RAW_SWARM_MODEL_LANE_LOCK_PATH ?? "";
  const laneFdInput = environment.DND_RAW_SWARM_MODEL_LANE_FD ?? "";
  const ownerPidInput = environment.DND_RAW_SWARM_MODEL_LANE_OWNER_PID ?? "";
  const ownerStartTime =
    environment.DND_RAW_SWARM_MODEL_LANE_OWNER_START_TIME ?? "";
  if (!/^[123]$/.test(lane) || !isAbsolute(lockPathInput)) {
    fail("Raw Swarm model operations require an inherited model-lane lock.");
  }
  if (!/^[0-9]+$/.test(laneFdInput)) {
    fail("Raw Swarm model operations require an inherited model-lane lock.");
  }
  const laneFd = Number(laneFdInput);
  if (!Number.isSafeInteger(laneFd) || laneFd < 3) {
    fail("Raw Swarm model operations require an inherited model-lane lock.");
  }
  if (!/^[0-9]+$/.test(ownerPidInput)) {
    fail("Raw Swarm model operations require an inherited model-lane lock.");
  }
  const ownerPid = Number(ownerPidInput);
  if (!Number.isSafeInteger(ownerPid) || ownerPid <= 1) {
    fail("Raw Swarm model operations require an inherited model-lane lock.");
  }
  if (processStartTime(ownerPid) !== ownerStartTime) {
    fail("Raw Swarm model operations require an inherited model-lane lock.");
  }
  const expectedName = `raw-swarm-model-lane-${lane}.lock`;
  const canonicalLockPath = canonicalLaneLockPath(expectedName);
  const { lockPath, inheritedLockPath, currentDescriptorPath } =
    resolveLanePaths(ownerPid, laneFd, lockPathInput);
  if (
    lockPath !== canonicalLockPath ||
    inheritedLockPath !== lockPath ||
    currentDescriptorPath !== lockPath ||
    !hasAncestorProcess(process.pid, ownerPid)
  ) {
    fail("Raw Swarm model operations require the canonical model-lane lock.");
  }
  assertHeldModelLaneLock(lockPath, laneFd);
}

module.exports = { assertModelLaneLock };

if (require.main === module) {
  try {
    assertModelLaneLock();
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 64;
  }
}
