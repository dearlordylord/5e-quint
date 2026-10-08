# Verification Input Scope

Use Git-index queries when the question is about tracked repository paths:
`git ls-files -z -- <pathspec>` for paths and `git grep -- <pattern> <pathspec>`
for tracked text. Bound filesystem searches to the checkout or the named input
root when the contract includes untracked, ignored, generated, or external
inputs. Read tracked files from the working tree so unstaged edits remain visible.

Before replacing a walk with an index query, identify what its owner admits.
A tracked-only query must not hide a newly authored source file, an unregistered
proof, a content record, or a generated artifact that the gate must reject or
validate. Retain `git status` checks that enforce clean-worktree admission.
Ignored local RAW corpus discovery remains governed by the local-passage workflow
in [AGENTS.md](../../AGENTS.md).

## Pre-integration TypeScript Check

Before declaring implementation ready for integration, run
`pnpm typecheck:affected --base <base-revision>` from the checkout. The base
must precede the implementation changes; the default is `HEAD` for uncommitted
work. The public command acquires the broad verification lock, runs each
selected package's public typecheck serially, and includes changed test files.
Package ownership comes from pnpm's workspace inventory; transitive consumers
come from their package dependency declarations. Changes outside a known
package select all workspace packages.

The emitted JSON evidence includes the base, checked revision, input SHA-256,
package scope, elapsed time, and result. A passing result requires unchanged
inputs during execution. Changed inputs invalidate that evidence; rerun before
handoff. This scoped check does not replace the final integrated milestone.

## Local Repair And Integration Reruns

Use character-to-SDK handoff and battle-command tests to qualify behavior across
layers. When one fails, preserve its inputs, seed, fills, and continuation state;
reproduce the failure at the narrowest owning boundary. Fix and retest that local
case until it passes, then recheck the affected invariant and consumers. Existing
fixtures and deterministic trace replays should let the repair loop start after
character creation or battle setup when those earlier steps are unaffected.

Run the broader handoff again only when local evidence cannot establish the
result, the fix changes a crossed boundary, or a required acceptance gate calls
for it. Record that reason with the result. Keep broad reruns sparse; local
repair can require none before the final required integration run. Preserve all
existing acceptance obligations, including the stable-candidate milestone and
its coverage repair protocol.

## MCP And Browser Qualification

Use MCP/browser end-to-end qualification exceptionally: normally at most once
per calendar day per workstream. Gather local evidence and reviewer convergence
first so that one run qualifies the combined candidate. An explicit user request,
a mandatory acceptance gate, or a changed boundary whose correctness requires
end-to-end evidence can justify another run; record the reason. Package-local
MCP handler tests and protocol fixtures remain part of the local repair loop.

After an end-to-end failure, preserve the tool request/response or browser state
and reproduce it through the owning local handler, SDK command, or component.
Fix and retest there before considering another end-to-end run. Reuse the
captured session or fixture to enter after successful setup when its inputs and
preconditions remain valid.

## Reuse Past A Successful Stage

Prefer the owner's supported stage selector, package diagnostic, deterministic
replay, or saved-session entry point to repeating successful setup. Record the
entry point, checked revision, input fingerprint, prerequisite evidence, and
remaining stages. Reuse a prerequisite only when its relevant source, generated
artifacts, configuration, and session preconditions are unchanged. Invalidate
it when those inputs change.

A focused rerun supplies evidence for its own scope. If the owner has no supported
resume point, use a local reproduction rather than bypassing its acceptance
stages. The milestone and production coverage have no resumable acceptance
checkpoint: after coverage repair, a changed candidate still requires a fresh
full milestone. Build/test caches may reuse artifacts within that run.

## Milestone Failure Policy

`pnpm quality:milestone` collects prerequisite failures and blocks production
coverage unless every preceding required gate passes. The summary names the
blocking gates and reports failure. Use `pnpm quality:milestone --collect-all`
explicitly for diagnostic collection: coverage then requires only a successful
build, while failures still make the command fail. Either mode stops launching
stages after SIGKILL or exit 137 and retains existing descendant cleanup.

## Deadline Policy

The shared verification wrappers and stage owners use
[`scripts/verification-deadline-policy.mjs`](../../scripts/verification-deadline-policy.mjs)
for finite acquisition, execution, and stage budgets. Read that owner for defaults
and environment overrides; invalid limits are rejected before a payload starts.
Resource locks remain held until supervised descendant cleanup is established.

## Existing Scan Boundaries

The repository-owned scanners below enumerate their actual input directories,
not a parent workspace. Their inputs are broader than tracked paths:

| Input boundary                        | Owners                                                                                                                                                                                                                                                                                  | Why filesystem enumeration remains                                                                                     |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Checkout source and proof admission   | `check-qnt-inventory.cjs`, `qnt-import-closure.cjs`, `qnt-proof-harness.ts`, `check-qnt-run-block-separation.cjs`, `check-mbt-test-lanes.cjs`, `check-authored-id-dispatch-boundary.cjs`, `check-battle-runtime-import-ownership.cjs`, `check-battle-runtime-test-support-boundary.cjs` | Newly authored source/proof files must enter ownership, lane, import, and identity checks before staging.              |
| Coverage claims and package discovery | `raw-coverage-check.cjs`, `rules-kernel-coverage-{check,claim-scan}.cjs`, `unit-profile-coverage-{claim-scan,discovery}.cjs`, `workspace-quality-harness.mjs`                                                                                                                           | Claims and package inputs are checked against the actual checkout; the self-tests also create unstaged fixture inputs. |
| RAW and authored content              | `srd521/verify.mjs`, `srd521-surface-authored-corpus-audit.cjs`, `srd-unit-inventory.cjs`, `surface-content-peer-discovery.ts`, `check-surface-content-json-sync.ts`, `level-lt4-choice-closure-check.cjs`                                                                              | Local corpus files and content peers may be ignored or newly authored.                                                 |
| Installed or emitted artifacts        | `distribution/{check,third-party-notices}.mjs`, `raw-swarm/{benchmark-context.ts,sdk-player/consumer-distribution.ts}`                                                                                                                                                                  | Installed dependencies and emitted declarations are outside the tracked-source inventory.                              |
| Raw Swarm evidence and scratch inputs | `raw-swarm/{artifact-index.ts,scenario-catalogue.ts,fixed-scenario-benchmark.ts,findings.ts,generate-scenario.ts,sdk-player/sdk-review-packet-cli.ts,sdk-player/supervisor-cli.ts}`                                                                                                     | Evidence, requests, candidate sources, and per-execution scratch files are generated inputs.                           |
| Raw Swarm source admission            | `raw-swarm/check-lane-hygiene.cjs`                                                                                                                                                                                                                                                      | The gate inspects actual package and scenario files, including newly authored deterministic candidates.                |

`check-markdown-links.cjs` already uses `git ls-files -z` because its contract is
tracked Markdown. `raw-swarm/process-supervisor.c` enumerates `/proc` for owned
process-tree supervision; that is neither repository file discovery nor an
agent's lock-waiting loop.

Recheck these boundaries with a tracked-script query such as
`git grep -n -E 'readdirSync|readdir\(|opendir|walkSync|globSync' -- scripts`, then
inspect each caller's input root and its fixture tests. A separate
`git grep -n -E '/workspace|find \.\.|find /|pgrep' -- scripts` locates hardcoded
workspace searches and process-name waiting candidates; matches alone do not
establish that a production command performs those operations. The current
script audit found no repository-owned recursive parent-workspace search to
replace. Keep searches scoped to the relevant files rather than widening to
`/workspace` or sibling checkouts.
