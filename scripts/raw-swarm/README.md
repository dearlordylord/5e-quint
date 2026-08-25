# Raw Swarm

Raw Swarm is an evidence-producing external-consumer workflow for finding
gaps in the public D&D adjudicator SDK. Raw Swarm does not turn catalogue
membership into a RAW-coverage or player-correctness claim.

## Execution lanes

Raw Swarm has three operational lanes. Choose the lane before running a
command; a successful command in one lane is not evidence for another lane.

| Lane                                  | Purpose                                                                                                                                                                                                                                                     | Public command                                     |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Deterministic repository verification | Unit, property, schema, protocol, projection, replay, report, and boundary tests. Reachable repository-owned Node sources run under a capability guard; no live model, provider API, coding-agent, or network capability is admitted through that boundary. | `pnpm check:raw-swarm-deterministic`               |
| Bounded manual trial                  | One explicitly selected model-backed authoring, player, review, or benchmark operation.                                                                                                                                                                     | `pnpm raw-swarm:model:trial -- <operation> ...`    |
| Durable campaign                      | One operation within an operator-owned, deadline-bound campaign such as #332. The campaign protocol still owns unique identities, serialized catalogue/index writes, replay, review, and export.                                                            | `pnpm raw-swarm:model:campaign -- <operation> ...` |

Both model commands require a clean worktree and
`RAW_SWARM_EXPECTED_GIT_SHA` equal to its full current revision. The campaign
command also requires a lowercase `RAW_SWARM_OPERATION_ID` and a future
`RAW_SWARM_OPERATION_DEADLINE_UTC`. They fail before the selected operation if
the Codex CLI is not authenticated. Model work uses one of three repository
model-lane locks; catalogue-writing operations additionally use the canonical
one-at-a-time authoring protocol. The active #332 operation remains responsible
for assigning distinct worktrees and Evidence Sets to its three lanes.
The public commands are the only supported model entrypoints: they perform
the lock, credential, revision, and configuration checks before handing off a
guarded process. Direct model scripts reject invocation without that handoff.

The model invocation owner enforces a 30-minute timeout for each model call.
The public wrapper also caps a complete manual-trial operation at two hours and
a complete durable-campaign operation at eight hours. Scenario Campaign
configuration supplies positive iteration and candidate bounds, the SDK player
has a finite continuation limit, and fixed benchmark profiles have a closed
phase plan. These are execution budgets, not quality gate defaults. Missing
configuration or credentials is a failed model operation; it is never
converted to a skipped or partial pass.

Available model operations are `scenario-campaign`, `scenario-review`,
`scenario-character-authoring`, `scenario-setup-authoring`, `sdk-player`,
`post-play-review`, `fixed-benchmark-prepare`, and `freeplay`. Deterministic
catalogue rendering, replay, report, assembly, and comparison commands remain
direct commands because they do not call a model.

The quality gate runs `check:raw-swarm-lane-hygiene` before the deterministic
check. The hygiene check preserves the classified quality-owned test inventory,
classifies the two pre-existing MCP prototype tests in a closed exclusion list,
and rejects any new unclassified test or quality command that reaches a public
model lane. Its closed Vitest filename inventory expands Vitest's default
include glob, `**/*.{test,spec}.?(c|m)[jt]s?(x)`, into every `.test` and `.spec`
JavaScript/TypeScript form, including JSX/TSX and CJS/MJS/CTS/MTS variants.
That same canonical extension inventory drives extensionless internal-import
resolution during transitive capability scanning. The deterministic runner
statically inventories reachable repository-owned sources, preloads a Node
capability guard, and prepends
failing shims for known coding-agent and network CLI names. Model-telemetry
tests inject controlled Node fixtures through the spawn seam; no stamped or
forgeable coding-agent executable is admitted.

The deterministic body removes inherited `NODE_OPTIONS`, compiles the
repository-owned `process-supervisor.c` helper with the validated
`/usr/bin/cc` system compiler, and refuses to continue if that compiler or
Linux seccomp is unavailable. Compiler lookup ignores `PATH`, `CC`, and
compiler-option environment variables and uses a small sanitized environment.
This bootstrap happens before the kernel filter; the compiler is therefore a
trusted host-toolchain prerequisite, not something this lane claims to isolate
with its own filter. The helper installs the filter before `pnpm`, `mise`, or
the test runner starts; the Linux kernel then inherits it across
workers, forks, shells, `env -i`, and custom launchers, independently of
JavaScript environment variables.

The filter allows only `AF_UNIX` socket and socket-pair creation, closes every
inherited descriptor above standard error, and allows only regular files,
FIFOs, terminal character devices, and the exact `/dev/null` device identity
on standard descriptors. It rejects inherited sockets, anon-inodes, non-tty
character devices such as `/dev/zero`, and unknown descriptor types, denies
connection, network-send, and descriptor-transfer syscalls (including
`SCM_RIGHTS` paths), and denies all `io_uring` setup/submission syscalls. Its
syscall-ABI check kills a process using an unexpected architecture instead of
silently weakening the filter. Before installing it, the helper fails closed
unless `/proc/self/status` proves that the host has no effective
`CAP_NET_ADMIN`, `CAP_NET_RAW`, or `CAP_SYS_ADMIN`, and `/dev/net/tun` is not
accessible. The filter additionally denies session/process-group and namespace
escape syscalls (`setsid`, `setpgid`, `setns`, namespace-bearing `clone`,
`clone3`, and changing the child-subreaper setting) plus `TUNSETIFF`; these
checks complement, rather than replace, the trusted-host prerequisite. The
JavaScript guard remains defense in depth
for static/runtime capability inventory, browser globals, and known executable
names; it is not the security boundary and does not trust module-origin or
fixture-marker claims. A basename cannot prove a coding-agent identity: known
names are categorically rejected. The exact source inventory proves only that
repository-owned source does not invoke a known coding-agent path; semantic
identity of an arbitrary alias is outside the trusted-source threat model. Any
alias reached by admitted source still inherits the kernel communication
denial. This is a deterministic-lane contract, not a hostile-root or
untrusted-toolchain claim.

The native process supervisor is the shared lifecycle owner for both
deterministic and model lanes. It becomes a Linux subreaper, forks the command,
and uses one parent-lineage ownership mechanism plus `waitpid(-1, ...)` to
signal and reap the leader and every reparented descendant. A detached child
cannot escape ownership by calling `setsid` or clearing its environment. The
deterministic runner starts the supervisor with the seccomp filter; model
wrappers start the same supervisor in
`--supervise-only` mode, so model/API/coding-agent network access remains
available. Both modes compile the repository-owned supervisor with the
validated `/usr/bin/cc` system compiler and fail explicitly if the Linux
toolchain or `/proc` ownership boundary is unavailable. The JavaScript and
shell wrappers only start one supervisor at a time with inherited standard
streams, pass its exact PID as the named owner argument, and wait for its
close; no environment marker is used as an ownership boundary.
On normal leader exit, a surviving descendant causes bounded `SIGTERM` then
`SIGKILL` cleanup and a non-clean phase status. If the supervisor cannot prove
that `SIGKILL` settled the tree, it retains ownership and retries rather than
releasing a lock. `SIGTERM`, `SIGINT`, and
`SIGHUP` are handled by the native supervisor, which forwards the signal to
each owned descendant, escalates when required, reaps the tree, and returns the
corresponding signal status. Normal owner death and handled signals use
the same bounded cleanup. The shell deliberately never escalates by killing
the supervisor: it waits for the supervisor's own cleanup before releasing a
resource or model-lane lock. The helper and command use parent-death signals
for their immediate owners; a process forcibly killed with `SIGKILL` cannot run
handlers, so external `SIGKILL` of the supervisor or wrapper remains outside
the cleanup guarantee.

The deterministic command is Linux-only and fails explicitly on unsupported
platforms or toolchains. A process started outside the helper is not covered;
ordinary deterministic evidence must therefore use the public command, which
owns compilation and boundary installation before any verification phase.

## Vocabulary

These terms have one package-wide meaning:

- A **Scenario Campaign** (or **Campaign**) is the bounded authoring process
  that generates, compares, revises, reviews, and either admits or rejects
  Candidates. Its planned Scenario identity is a reservation until admission.
- A **Scenario Candidate** (or **Candidate**) is authored prose and typed
  planning facts under Campaign review. A rejected Candidate never becomes a
  Scenario.
- A **Scenario** is one immutable, admitted authored input with a semantic
  identity, title, purpose, retained review, and retained stage authorities.
- An **Execution** is one externally identified attempt to exercise exactly
  one admitted Scenario through the public SDK, whether it reaches the first
  SDK call or is obstructed during character or setup authoring.
- A **Benchmark** is one controlled comparison whose target Execution or
  Execution Profile identities and context authorities are explicit.
- An **Evidence Set** is the immutable authority collection produced by one
  Campaign, Execution, or Benchmark. Its identifier is not a Scenario,
  Execution, Campaign, Candidate, or Benchmark identity; its filesystem path
  is only storage projection.
- **Run** is not a Raw Swarm domain term. Do not use unqualified `Run` to
  identify any of these objects. A database-local `runId` is only a row key;
  qualify any operational run by its owning protocol or use the domain term
  above.

Start with the role protocol for the work you are doing:

- [Scenario authoring](SCENARIO_AUTHORING.md) — operator-owned campaign
  workflow, complete catalogue comparison, bounded revision, and admission.
- [Scenario execution](SCENARIO_EXECUTION.md) — player/DM and setup workflow
  through the ordinary public SDK.
- [Evidence review](EVIDENCE_REVIEW.md) — independent review, retained
  authorities, exact reads, and finding disposition.

The [Raw Swarm operations reference](OPERATIONS.md) contains the detailed
prototype commands and existing MCP/direct-SDK evidence procedures. Read the
role protocol first; it owns the procedure for that role. Role protocols link
back here for vocabulary and must not redefine these terms.

Render the one-entry-per-admitted-Scenario catalogue before authoring:

```sh
mise exec -- pnpm raw-swarm:catalogue -- --json
```

The command reads the canonical admission records and their referenced
authorities. It fails on unreadable, mismatched, dangling, or incomplete
evidence; do not replace a failed read with a sample or a hand-maintained list.

Scenario generation is instructions-first. Do not add a novelty score,
embedding index, retrieval service, Campaign mode, scenario DSL, or automated
admission gate. Runtime behavior continues to dispatch on typed procedure
facts and state, never Scenario identity or catalogue labels. Public authored
records and examples also follow
[`docs/mushroom-playbook/AUTHORING.md`](../../docs/mushroom-playbook/AUTHORING.md).
