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
