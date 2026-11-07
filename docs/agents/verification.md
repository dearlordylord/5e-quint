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

A changed revision alone does not invalidate a successful stage. Invalidate
results according to changed inputs and affected boundaries, not commit identity.

When a cheap check fails after expensive stages have passed, the agent must
continue verification manually at finer granularity:

1. Preserve the completed run's receipts and identify its passed, failed and
   unexecuted stages.
2. Repair and rerun the failing check at the narrowest owning boundary, then
   check affected invariants and consumers.
3. Compare the repair with each previously passed stage's relevant source,
   generated artifacts, configuration and execution preconditions. Retain its
   PASS only where these are unchanged; rerun affected stages. Investigate
   uncertain dependencies rather than assuming reuse.
4. Complete the remaining general integration verification with the existing
   public stage/package commands and their locks, omitting the successful,
   unaffected prefix. Use `quality:repair` for supported stage selections and
   `coverage:diagnose --package <package>` for coverage repair. The absence of a
   single resume command does not require restarting the full milestone.
   A new commit or completed review round does not justify a full restart.
   Before any broader rerun, name the changed inputs that invalidate that scope
   or the operator's explicit request.
5. Record a combined acceptance summary mapping every required stage to its
   passing evidence, checked inputs, reuse justification or new execution.
   Acceptance requires all required scopes to be covered and no failed or
   unexecuted obligation to remain.

A focused rerun proves only its own scope. Granular continuation preserves every
required integration and production-coverage obligation while avoiding repeated
work. Report acceptance as combined evidence; the original failed milestone
command remains failed and must not be relabeled as a passing full run.

## Milestone Failure Policy

On macOS, public lock-taking commands and Linux-only self-tests automatically
use the isolated [Linux verification runner](../../scripts/linux-verification/README.md).
Docker must be running. Linux execution and existing acceptance gates remain
unchanged; runner evidence and generated outputs stay in a per-job directory.

`pnpm quality:milestone` stops launching checks after the first failure. Source
inventory checks precede build and expensive integration checks; all existing
gates remain required. Use `pnpm quality:milestone --collect-all` for diagnostic
collection: independent checks continue, and coverage requires a successful
build. Any failed or blocked check still fails the command. Both modes stop
after SIGKILL or exit 137 and retain existing descendant cleanup.

Use `pnpm quality:repair --checks <comma-separated milestone ids>` for a scoped
rerun with prerequisite closure. Coverage repair still uses `coverage:diagnose`.
Milestone and repair runs print a receipt path under `.scratch/verification/`.
Each receipt records commands, outcomes, and the Git-visible source fingerprint
before and after execution. Concurrent source edits invalidate the run. The
fingerprint includes tracked and unignored untracked files, except untracked
`.audit/` and `.artifacts/` evidence and untracked macOS AppleDouble files; it also
includes HEAD, Node and platform.
`pnpm quality:receipt --receipt <file> --checks <ids>` checks whether that source
evidence still covers the named checks. It does not certify generated artifacts,
installed dependencies, external inputs, or milestone acceptance; it never skips
execution. Verify those preconditions separately before reusing local evidence.
Receipt version 2 retains the checked execution environment. Source inspection
can use that recorded environment on a different host and separately reports
whether the inspecting environment matches; it does not imply a local execution.

### Dialogue Repair And Qualification

The workflow in `scripts/dialogue-workflow.mjs` uses the canonical MCP dialogue
driver and its evaluator. It requires that driver's checkout to be integrated;
`--repo <checkout>` can select an isolated checkout with the driver available.

- `pnpm dialogue:repair --out <fresh-dir> --case <case-id>` runs a diagnostic
  probe, capped at 12 calls, 8 turns and 180 seconds. The API driver supports
  `--resume <prior-dir> --resume-note <changed-boundaries>` instead of repeating
  setup. Its existing checkpoint/database safety checks remain authoritative.
- `pnpm dialogue:qualify --out <fresh-dir> --case <case-id>` first runs the public
  milestone, then starts a fresh dialogue. Resume and tool allowlists are
  refused. Both gates must pass on unchanged source. This certifies only the
  selected driver's evidence scope, not installed ChatGPT behavior.

Both modes accept the driver's `--prompt <file> --expect <expectation>` in place
of a case and `--client codex` for a fresh coding-agent probe. Codex does not
support resume or a turn budget; repair still caps calls and elapsed time.
Keep output outside source inputs, for example under `.scratch/` or `/tmp/`.
Rejected calls produce `failure-evidence/`: original request/response, observed
before/after state, preceding calls (including dice), and hashed copies of
available schema/history artifacts. The saved checkpoint is the end-of-run
checkpoint, not a pre-call SQLite snapshot. Repair never emits acceptance;
`workflow-verdict.json` states the mode and evidence scope explicitly.
Its `probe` result grades only newly executed calls, so historical rejections do
not permanently fail a repaired continuation. A healthy probe requires at least
one new call, no new canonical rejections, stable inputs and no infrastructure
failure. Reaching the diagnostic budget can be healthy; it does not establish
scenario completion, which is recorded separately as `scenarioClean`.

The existing inventory self-test runs `check:verification-workflow` controls
(about one second locally): they catch continued expensive work after failure,
stale receipts, resumed acceptance and model calls after a failed milestone.

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
