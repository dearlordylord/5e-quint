import { createRequire } from "node:module";

const MODEL_ENTRYPOINT_GUARD_ENV = "DND_RAW_SWARM_MODEL_ENTRYPOINT_GUARD";
const MODEL_ENTRYPOINT_GUARD_VERSION = "v1";
const require = createRequire(import.meta.url);
const {
  assertModelLaneLock,
}: {
  readonly assertModelLaneLock: () => void;
} = require("./model-lane-capability.cjs");

export function assertModelEntryPointGuard(): void {
  const expectedGitSha = process.env.RAW_SWARM_EXPECTED_GIT_SHA ?? "";
  if (
    !/^[0-9a-f]{40}$/.test(expectedGitSha) ||
    process.env[MODEL_ENTRYPOINT_GUARD_ENV] !==
      `${MODEL_ENTRYPOINT_GUARD_VERSION}:${expectedGitSha}` ||
    !/^[123]$/.test(process.env.DND_RAW_SWARM_MODEL_LANE ?? "") ||
    process.env.DND_RAW_SWARM_MODEL_LANE_GUARD !== "v1"
  ) {
    throw new Error(
      "Raw Swarm model-backed entrypoints must be launched through the public model wrapper.",
    );
  }
  try {
    assertModelLaneLock();
  } catch {
    throw new Error(
      "Raw Swarm model-backed entrypoints must be launched through the public model wrapper.",
    );
  }
}
