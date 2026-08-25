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
model lane. The deterministic runner statically inventories reachable
repository-owned sources, preloads a Node capability guard, and prepends
failing shims for known coding-agent and network CLI names. Model-telemetry
tests inject controlled Node fixtures through the spawn seam; no stamped or
forgeable coding-agent executable is admitted.

The deterministic body removes inherited `NODE_OPTIONS`, compiles the
repository-owned `deterministic-network-boundary.c` helper with the validated
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
inherited descriptor above standard error, rejects non-Unix standard sockets,
denies connection, network-send, and descriptor-transfer syscalls (including
`SCM_RIGHTS` paths), and denies all `io_uring` setup/submission syscalls. Its
syscall-ABI check kills a process using an unexpected architecture instead of
silently weakening the filter. The JavaScript guard remains defense in depth
for static/runtime capability inventory, browser globals, and known executable
names; it is not the security boundary and does not trust module-origin or
fixture-marker claims. A basename cannot prove a coding-agent identity: known
names are categorically rejected, while an aliased executable is admitted only
when it is part of the exact repository source inventory and still runs inside
the kernel-denied route. That route blocks external communication even for an
alias; this is a deterministic-lane contract, not a hostile-root or
untrusted-toolchain claim.

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
