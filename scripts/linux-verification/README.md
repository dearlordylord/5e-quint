# Linux verification from macOS

Public lock-taking commands select this runner automatically on macOS. Linux
keeps the existing supervisor and lock wrappers. Docker must be running; the
first macOS invocation builds a dedicated tools image. Its recipe pins Node
24.20.0, pnpm's global fallback and mise; the project's packageManager/lockfile
remain authoritative for dependency installation.

Run the usual commands, for example `pnpm quality:repair --checks markdown-links`,
`pnpm check:workspace-quality-inventory`, `pnpm typecheck:affected`, or the final
`pnpm quality:milestone`. Composed deployment smoke checks dispatch their entire
build/check sequence so both phases use the same private workspace.

## Isolation and coordination

Each invocation creates a uniquely named container and freezes Git-visible
source and Git index, including staged, dirty/untracked files and deletions. Host node_modules,
ignored generated files, untracked audit/artifact outputs and macOS AppleDouble
files are excluded. Relative internal symlinks are preserved exactly; absolute
or external source symlinks are refused. A private Git index and read-only object alternate retain history
without writing to the source repository's index, refs or configuration.

The supervisor's existing shared-heavy-v3 filenames are the cross-revision lock
protocol. The runner binds those four lock files and the diagnostic holder file
into its private Git directory; all other Git access is read-only. This also
coordinates with existing containers and linked worktrees using the original
whole-common-directory mount. Do not change those protocol paths independently.

Dependencies and build output are private to each container. A repository/image
scoped pnpm download-store volume is retained as a cache; installation acquires
the existing broad lock. The materialized source is checked against the frozen
input after dependency installation and successful verification, using the read-only input's
canonical fingerprint policy. This prevents lifecycle scripts or checks from
silently qualifying different source. The two hashes scan the same Git-visible
scope as receipts and are Mac-boundary checks, not extra Linux milestone stages.
Failed or interrupted jobs stop without another source-verification pass.
No host dependency installation, Docker socket mount,
privileged container, global prune or other task's container/volume is used.
The default payload limits are 2 CPUs, 8 GiB memory without additional swap and
512 PIDs. Image construction is Docker's normal cached tools-image build.

## Results and lifecycle

Each invocation prints its host evidence directory under
`.audit/linux-verification/<job>/`: stdout, stderr, input/image identity, final
exit/state and exported outputs. Receipts, audit reports, coverage and dist
artifacts are copied under `outputs/`; source and host build directories are
never overwritten. A separate `pnpm build` therefore does not populate host dist.
Use a single container invocation for a pipeline that shares generated files.

SIGINT/SIGTERM propagate to the owned container. The host also monitors its own
live parent relationship against the PID captured by the caller before launch;
parent loss, including during startup, cancels with 125. Closing the Docker
client's stdin terminates the container workload even after an abrupt host
client loss. The existing Linux supervisor owns child cleanup; the container's
PID namespace is the final lifetime boundary. Normal completion/cancellation
removes only the container with this invocation's matching ownership label.
A hard kill of the host runner can leave a **stopped**, labeled container for
inspection; its workload and lock descriptors do not remain running.

Exit codes are preserved, including 137. Emergency results record Docker state
and skip source re-verification; a surviving container entrypoint also records
readable cgroup memory events, load and child identity. Follow the repository's
resource-failure protocol rather than retrying unchanged.

Optional configuration:

- `DND_LINUX_VERIFICATION_IMAGE`: an already installed tools image. It is read
  by immutable ID and never retagged or modified; it needs the recipe's tools
  including `/usr/local/bin/node`. Image entrypoints and healthchecks are disabled.
  Its `/workspace` must be empty so old source or build outputs cannot leak in.
- `DND_LINUX_VERIFICATION_CPUS` and `DND_LINUX_VERIFICATION_MEMORY`: payload caps.
- Existing `DND_VERIFICATION_*_TIMEOUT_MS`, `GOMEMLIMIT` and `GOGC` are forwarded.
  Host owner PIDs, credentials and arbitrary application environment are not.

This runner supports repository-contained verification inputs, not publication
credentials or external host paths. It does not certify installed ChatGPT UX.

## Checks

`pnpm check:verification-workflow` includes portable snapshot/container-plan
controls and runs in the existing inventory gate. The explicit macOS diagnostic
`pnpm check:verification-platform` uses its own tiny Git fixture and containers:
dirty source/deletions, dependency isolation, old/new mount lock contention,
concurrent exclusion, cancellation, parent/client loss and exit propagation.
It removes only its own fixture containers/store. It is diagnostic rather than
an added always-on Docker requirement for Linux CI.
