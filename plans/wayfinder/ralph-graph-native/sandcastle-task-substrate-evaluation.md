# Sandcastle as Ralph's Task-Execution Substrate

## Answer

Sandcastle 0.12.0 cannot safely replace Ralph's low-level execution plumbing
as published. It is a credible basis for a **task-execution substrate**, but
only after Ralph keeps authority over task claims, the declared Base SHA,
review convergence, retry disposition, accepted-head integration, quarantine,
and cleanup policy, and after the substrate closes the lifecycle and typed-error
gaps below.

Do not adopt Sandcastle's planner, parallel-planner, reviewer, or merger
templates as Ralph's control plane. The
[review template](https://github.com/mattpocock/sandcastle/blob/e99f832f26dc9d245c019a9ddd19fa5dee792427/src/templates/parallel-planner-with-review/main.mts)
makes an agent infer the graph, fans out with unbounded `Promise.allSettled`,
treats “has commits” as completion, runs one reviewer that edits the branch,
and lets a merger agent merge and close issues.
Those are different semantics from Ralph's tracker-authoritative graph,
independent converging review, bounded retry scopes, accepted-head integration,
and dependency-preserving quarantine.

The safe ownership boundary is:

- **Ralph control plane:** tracker snapshot and claims, runnable frontier,
  bounded parallelism, `BaseSha`, attempt identity, reviewer/decider protocols,
  retry and non-convergence disposition, serialized accepted-head integration,
  evidence retention, and cleanup authorization.
- **Task-execution substrate:** create an exclusively leased worktree from an
  exact ref, prepare a sandbox, invoke or resume one agent process, stream and
  persist its evidence, report a typed outcome, and perform only the lifecycle
  transition explicitly requested by Ralph.

This preserves Ralph as the product and prevents Sandcastle from becoming a
second scheduler or task ledger.

## Evidence boundary

The Sandcastle evidence is pinned to
[`mattpocock/sandcastle@e99f832`](https://github.com/mattpocock/sandcastle/tree/e99f832f26dc9d245c019a9ddd19fa5dee792427),
published as `@ai-hero/sandcastle@0.12.0` on 2026-06-29. The assessment used
library contracts, implementation, tests, ADRs, and generated templates rather
than README claims alone.

The comparison uses the independently accepted Ralph orchestrator decisions,
[historical shell-harness evidence](../../../scripts/ralph-run.md), the
[bounded-leaf evidence](../cleanroom-ralph-redesign/bounded-ralph-leaf-contract.md),
the historical [worktree installer](../../../scripts/ralph-install-worktree.sh),
and [repository review gates](../../../.claude/review-rules.md). Historical
behavior is a candidate source, not a required compatibility target.

## Fit matrix

| Required behavior                  | Sandcastle evidence                                                                                                                                                                                                                                                                                                                                                                                                        | Disposition                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pnpm workspace preparation         | Worktree creation has host and sandbox lifecycle hooks. A focused test ran `pnpm install --offline --frozen-lockfile` in each created worktree successfully. The shipped templates instead copy `node_modules` and run `npm install`.                                                                                                                                                                                      | Compatible through a Ralph-supplied host hook. Do not use the template install/copy policy; it conflicts with this repo's isolated per-worktree pnpm install contract.                                                                                                                                                                                                |
| Shared resource locks              | [Bind-mount sandboxes](https://github.com/mattpocock/sandcastle/blob/e99f832f26dc9d245c019a9ddd19fa5dee792427/src/SandboxFactory.ts) mount the worktree's `.git` file and parent Git common directory at the same absolute paths. The focused test confirmed two task worktrees resolve the same absolute Git common directory.                                                                                            | Compatible. Existing public pnpm/MBT/proof scripts continue to own the shared lock. Sandcastle must not add a second broad lock or bypass those scripts.                                                                                                                                                                                                              |
| Stable per-task Base SHA           | [Named-branch creation](https://github.com/mattpocock/sandcastle/blob/e99f832f26dc9d245c019a9ddd19fa5dee792427/src/WorktreeManager.ts) accepts `baseBranch`, including a commit SHA, but only when the branch is new. On reuse, `baseBranch` is ignored; a clean branch may also be fast-forwarded from `origin`.                                                                                                          | Unsafe by default. Ralph must use a unique attempt branch, persist the declared `BaseSha`, and fail before agent launch unless the exact branch/worktree lineage satisfies the declared base contract. Substrate support should make this an atomic create-or-resume result, not a caller convention.                                                                 |
| Bounded implement/review handbacks | A long-lived `Sandbox` can run multiple agents, and successful Codex/Claude runs expose one-iteration `resume`/`fork` operations.                                                                                                                                                                                                                                                                                          | Useful primitive, incomplete protocol. Ralph must retain fresh reviewer sessions, verdict parsing, same-leaf handback checks, and the finite convergence cap.                                                                                                                                                                                                         |
| Non-zero implementation-agent outcome | [`invokeAgent`](https://github.com/mattpocock/sandcastle/blob/e99f832f26dc9d245c019a9ddd19fa5dee792427/src/Orchestrator.ts) converts a non-zero agent exit into `AgentError` before session capture and before returning stdout, commits, session id, or exit code. | Blocking gap. The substrate must return a typed `AgentProcessOutcome`, preserving exit code, bounded output, commits, partial evidence, and any observed session. Ralph then keeps that session and its worktree together in the same attempt lineage and resumes the exact implementation session when resumable. Incomplete WIP does not advance to semantic review. |
| Failure-preserved worktree         | [`createSandbox()`](https://github.com/mattpocock/sandcastle/blob/e99f832f26dc9d245c019a9ddd19fa5dee792427/src/createSandbox.ts) returns a long-lived handle, and abort leaves that handle usable. However top-level `run()` removes failed worktrees when they are clean, and the parallel template calls `sandbox.close()` in `finally`. `close()` preserves only uncommitted changes.                                   | Ralph can preserve a handle deliberately, but published defaults do not meet quarantine semantics. Cleanup must be an explicit control-plane decision; failure and non-convergence preserve worktree, branch, session, and evidence regardless of dirty status.                                                                                                       |
| Deterministic cleanup              | [`close()`](https://github.com/mattpocock/sandcastle/blob/e99f832f26dc9d245c019a9ddd19fa5dee792427/src/createWorktree.ts) marks the handle closed before cleanup, suppresses worktree-removal errors, and returns `preservedWorktreePath?: string`; named branches survive worktree removal.                                                                                                                               | Blocking gap. Cleanup needs an explicit typed result that distinguishes removed, preserved-by-policy, and cleanup-failed, and remains retryable/idempotent. Branch deletion remains a separate Ralph-authorized transition after accepted integration or reconciled quarantine.                                                                                       |
| Concurrent task branches           | Unique named branches can be created concurrently. The implementation disables global Git auto-upstream writes that otherwise contend on `.git/config.lock`.                                                                                                                                                                                                                                                               | Compatible for distinct attempt identities.                                                                                                                                                                                                                                                                                                                           |
| Exclusive access to one attempt    | The worktree-reuse implementation returns an existing managed worktree, including a dirty one. Two live `createWorktree()` handles can name the same path. Sandcastle's [worktree-locking ADR](https://github.com/mattpocock/sandcastle/blob/e99f832f26dc9d245c019a9ddd19fa5dee792427/docs/adr/0007-worktree-locking.md) specifies an exclusive PID lock, but no corresponding implementation exists at the pinned commit. | Blocking gap. Implement an exclusive worktree lease with stale-owner recovery before Ralph delegates an attempt. Ralph's remote tracker claim does not replace a local worktree lease.                                                                                                                                                                                |
| Serialized integration             | `merge-to-head` automatically merges a temporary branch into the caller's current branch. The templates ask a merger agent to merge all branches and close their issues.                                                                                                                                                                                                                                                   | Do not use either path. Ralph's integration actor must consume only an accepted commit, re-check base/accepted-head ancestry and claim ownership, serialize the merge, run required post-merge verification, then update the tracker.                                                                                                                                 |
| Typed Effect-facing failures       | Internally Sandcastle uses Effect tagged errors, but the [public API](https://github.com/mattpocock/sandcastle/blob/e99f832f26dc9d245c019a9ddd19fa5dee792427/src/index.ts) is deliberately Promise-only and exports only `CwdError` and `StructuredOutputError`; most operational error classes are not exported. Abort is propagated as the arbitrary `AbortSignal.reason` defect.                                        | Blocking gap for direct adoption. Publish a closed operational error union and typed process outcome, or maintain a narrow Ralph-owned fork exposing them. Ralph should lift that union into Effect directly; it must not classify private `_tag` values or error-message strings. Ralph can own a precise cancellation reason because it owns the `AbortController`. |
| Session persistence                | Successful resumable runs copy Claude/Codex session files from the sandbox to the host and expose session paths/ids per iteration. Capture failure fails the run.                                                                                                                                                                                                                                                          | Valuable primitive once failure-path capture is fixed. Ralph remains owner of attempt/session identity and evidence retention.                                                                                                                                                                                                                                        |

## Focused compatibility experiment

A disposable two-package pnpm workspace installed
`@ai-hero/sandcastle@0.12.0`, created two named worktrees concurrently from two
different commit SHAs, ran a frozen offline pnpm install in each worktree, and
then exercised close and reuse behavior. No agent or model was invoked.

Observed results:

```json
{
  "firstHead": "24cd74258aeb507b2a32cbf53b35fd569f7c20c5",
  "secondHead": "ea76f37144a4cf9c7be9949371df218311681697",
  "sharedGitCommonDir": true,
  "isolatedNodeModules": true,
  "dirtyClosePreservedWorktree": true,
  "cleanCloseRemovedWorktree": true,
  "differentBaseIgnoredOnReuse": true,
  "overlappingHandlesReturnedSamePath": true
}
```

The experiment establishes compatibility with exact-SHA first creation,
parallel distinct branches, per-worktree pnpm installs, and the repository's
Git-common-directory lock location. It also turns branch-base reuse and missing
exclusive leasing from hypothetical risks into reproduced behavior.

## Required substrate changes before adoption

These changes belong below the graph scheduler. They do not require Sandcastle
to understand trackers, dependency graphs, review verdicts, or integration
ordering.

1. **Exact create-or-resume contract.** Accept an attempt identity and declared
   base commit. Return a discriminated `created | resumed` result only after an
   exclusive lease and executable lineage check. Disable implicit remote
   fast-forward for Ralph-owned attempt branches.
2. **Exclusive worktree lease.** Implement the intent of Sandcastle's
   worktree-locking ADR with atomic acquisition, owner identity stronger than a
   bare reusable PID where practical, stale-owner recovery, and explicit
   release.
3. **Total agent-process outcome.** Return exit code, bounded stdout/stderr,
   observed completion, commits, session id/path, and interruption cause as a
   typed outcome. Infrastructure failure remains a separate closed error union.
   A resumable non-zero implementation outcome retains the exact session and
   worktree as one attempt lineage for continuation after the cause is
   addressed; it is not semantic-review input.
4. **Policy-driven lifecycle.** Separate `preserve`, `remove-worktree`, and
   `delete-branch` operations. Make cleanup results explicit, idempotent, and
   retryable; never silently consume failure.
5. **Failure-path session capture.** Capture any observed resumable session
   before classifying a non-zero exit or cancellation, while the sandbox still
   exists.
6. **Public typed errors.** Export the supported operational error algebra (or
   expose an Effect-native entry point) so Ralph does not depend on private
   tags, `instanceof` against unexported classes, or prose messages.

The safest adoption vehicle is a pinned narrow fork or an upstreamed change set
that Ralph qualifies with contract tests. A wrapper around the current Promise
surface is insufficient where it would merely reinterpret private errors,
paper over branch reuse, or reconstruct session evidence after Sandcastle has
already discarded it.

## Consequence for the tooling architecture decision

Carry Sandcastle forward as the strongest surveyed candidate for the
**task-execution substrate**, not as the graph-native orchestrator. The
tooling architecture choice should compare the cost of qualifying this modified
substrate with building a Ralph-owned implementation behind the same typed
execution port. The historical shell harness is evidence for candidate
requirements, not an executor implementation to retain.

This research does not choose the control plane and does not graduate the
map's crash recovery, tracker-port, integration, operator-surface, release
readiness, or orchestrator-verification fog. Those questions still depend on
the combined Ralph contract inventory and control-plane evaluation.

## Documentation ownership

This artifact records a Wayfinder adoption decision. It does not redefine D&D
language, Cleanroom product behavior, or modeling assumptions. The repository
tooling architecture owns the separate
[Ralph historical-harness boundary](../../../docs/tooling/ralph/ARCHITECTURE.md#historical-harness-boundary).
