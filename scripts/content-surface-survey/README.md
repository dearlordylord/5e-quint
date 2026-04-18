# Content surface coverage survey

Plan: `/plans/CONTENT_SURFACE_SURVEY.md`.

This directory runs a parallelized per-unit encoding survey across SRD 5.2.1 (and a PHB-only research sample) to decide between Option A and Option B for the content surface's scaling-shape encoding.

## Not to be confused with `packages/prototype-content-surface/content/`

This directory is the **mining / oracle pipeline**: for every SRD unit (504 distinct, 786+ subdirs with re-run history), it runs an LLM sub-agent against the current surface to propose an encoding or flag a widening. The outputs are **verdicts**, not content — `result.json` (sub-agent proposal) + `verdict.json` (harness validation) + `survey-results-srd.jsonl` (aggregate dataset) + `REPORT_SRD.md` (human-readable rollup). Nothing here is shipped as runtime content.

The **authored corpus** lives elsewhere: `packages/prototype-content-surface/content/<slug>.{dhall,json,trace.md}`. That is one entry per actually-authored unit (far smaller than 504). Its `.dhall` files are the source-of-truth mechanics definitions; its `.json` files feed the tracer and (in Phase D) the content-driven runtime.

One-liner: **this dir tells us what's MISSING; the package's `content/` dir holds what we've SHIPPED.** A unit typically flows: mining proposes → verdict flags a widening → we land the widening in `packages/prototype-content-surface/src/surface/types.ts` → we author the unit in `packages/prototype-content-surface/content/<slug>.dhall` → regression passes → we re-mine and the verdict goes `clean`.

## Parts

| File | Role |
| --- | --- |
| `unit-catalog.ts` | builds `unit-queue.jsonl` from `.references/` sources |
| `extract-unit-text.ts` | resolves a queue row's anchor to unit source text (no text embedded in queue) |
| `atom-whitelist.ts` | v4 atom/relation whitelist + Stage 1/2 extensions |
| `validate.ts` | harness validator — runs typecheck + tracer, computes authoritative verdict |
| `prompt-template.md` | Claude-facing prompt template (substituted per unit) |
| `worker.sh` | per-unit driver: extract → prompt → Claude → validate → append dataset row |
| `run-survey.sh` | orchestrator: reads queue, runs N workers in parallel, resumable |
| `close-loop.ts` | Stage 2 closure loop: ranks widening clusters, reruns a targeted batch, writes before/after closure report |
| `auto-close-loop.ts` | unattended batch driver: resumes from persisted state, applies timeouts, continues cluster-by-cluster |
| `run-auto-close-loop.sh` | supervised launcher for overnight runs: `start`, `status`, `logs`, `stop`, `restart` |
| `evidence/auto-close-loop/` | tracked per-batch archive: closure report + per-slug proposal/result/verdict snapshots |
| `provenance-check.sh` | pre-commit sweep: fails if PHB content leaked to main repo |

## Routing rule (hard)

SRD units produce artifacts in the **main repo**:

- `packages/prototype-content-surface/content/<slug>.dhall`
- `packages/prototype-content-surface/content/<slug>.json` + trace
- `scripts/content-surface-survey/results-srd/<slug>/` (verdict, result, proposal)
- `scripts/content-surface-survey/survey-results-srd.jsonl` (committed)

PHB-only units produce artifacts in the **research repo**:

- `.references/xphb-srd-pairing/phb-survey/workspace/content/<slug>.dhall`
- `.references/xphb-srd-pairing/phb-survey/workspace/content/<slug>.json` + trace
- `.references/xphb-srd-pairing/phb-survey/results/<slug>/`
- `.references/xphb-srd-pairing/phb-survey/survey-results-phb.jsonl`

The worker picks its paths by `source` field on each queue row. `provenance-check.sh` scans the main-repo outputs for PHB markers and fails the run if any are found.

## Run

```sh
# 1. Build the unit queue (spells only for now; class features / feats /
#    traits / masteries / items need additional parsing).
pnpm --filter @dnd/prototype-content-surface exec tsx \
  ../../scripts/content-surface-survey/unit-catalog.ts

# 2. Smoke-test the pipeline in dry-run (no Claude calls).
#    Uses any pre-existing encodings in the prototype's content/ dir.
./run-survey.sh --tier 1 --dry-run

# 3. Real run, tier 0 first (5 strategic units).
./run-survey.sh --tier 0

# 4. Tier 1 if tier 0 looked good.
./run-survey.sh --tier 1

# 5. Tier 2 (full SRD spells).
MAX_PARALLEL=5 ./run-survey.sh --tier 2

# 5b. Slice the next 10 unprocessed tier-2 units.
MAX_PARALLEL=5 ./run-survey.sh --tier 2 --limit 10

# 5c. Run one item by slug.
./run-survey.sh --slug bless

# 5d. Force-rerun one item even if it already has a dataset row.
./run-survey.sh --slug bless --force

# 6. Verify no PHB leaked into main repo.
./provenance-check.sh

# 7. Aggregate report (TBD: aggregate.ts).
pnpm --filter @dnd/prototype-content-surface exec tsx \
  ../../scripts/content-surface-survey/aggregate.ts

# 8. Run the convergence loop on one widening cluster or explicit batch.
#    This is the tracer-bullet closure path: rank pressure, rerun a
#    small batch sequentially, and inspect the before/after report.
pnpm --filter @dnd/prototype-content-surface exec tsx \
  ../../scripts/content-surface-survey/close-loop.ts --top 15

pnpm --filter @dnd/prototype-content-surface exec tsx \
  ../../scripts/content-surface-survey/close-loop.ts \
  --cluster grant_sense --limit 3 --execute --backend codex

pnpm --filter @dnd/prototype-content-surface exec tsx \
  ../../scripts/content-surface-survey/close-loop.ts \
  --kind magic_item --cluster modify_speed_effect --limit 2 --execute --backend codex

# 9. Overnight unattended loop. Defaults:
#    AUTO_KIND=magic_item, AUTO_BACKEND=codex, limit=2, batch timeout=30m.
bash scripts/content-surface-survey/run-auto-close-loop.sh start
bash scripts/content-surface-survey/run-auto-close-loop.sh status
bash scripts/content-surface-survey/run-auto-close-loop.sh logs
bash scripts/content-surface-survey/run-auto-close-loop.sh stop

# 9b. Parallel workers with shared cluster leasing and serialized integration.
#     Each runner gets its own worktree/state/log, but successful batch commits
#     integrate through the shared auto-close-loop-integration branch.
AUTO_RUNNER_NAME=worker-a bash scripts/content-surface-survey/run-auto-close-loop.sh start
AUTO_RUNNER_NAME=worker-b bash scripts/content-surface-survey/run-auto-close-loop.sh start
AUTO_RUNNER_NAME=worker-a bash scripts/content-surface-survey/run-auto-close-loop.sh status
AUTO_RUNNER_NAME=worker-b bash scripts/content-surface-survey/run-auto-close-loop.sh status

# 10. Same, but auto-commit each completed batch atom.
#     Requires a clean tracked worktree before start.
AUTO_COMMIT=1 bash scripts/content-surface-survey/run-auto-close-loop.sh start
```

## Gotchas

- **Slug matches encoding filename.** The worker now treats `content/<slug>.dhall` as the authored artifact and `content/<slug>.json` as the runtime artifact consumed by validation/tracing. If you pre-populate an encoding for dry-run testing, the slug must match.
- **Dhall compiler required.** The worker compiles `content/<slug>.dhall` to `content/<slug>.json` with `dhall-to-json` before validation and tracing.
- **PHB workspace setup.** First PHB unit processed creates a copy of the prototype package under `.references/xphb-srd-pairing/phb-survey/workspace/`. That's intentional — no PHB tooling in main repo.
- **Rate limit.** `.ralphrc` sets `MAX_CALLS_PER_HOUR=100`. 5 parallel workers with ~5 min average = 60 calls/hour — well within.
- **Dataset locking.** Worker uses `flock` on `survey-results-*.jsonl.lock` for concurrent appends.
- **Validator is authoritative.** Claude's `result.json` is input; the harness verdict is the recorded truth. Discrepancies listed in the dataset row.
- **Resume-safe.** Re-running `run-survey.sh` skips units with an existing dataset row.
- **Failures are retried.** `refused` / `invalid` verdicts do not get dataset rows, so they remain eligible on the next run.
- **`--limit N` caps new work.** The limit applies to unprocessed units after tier filtering and dataset-skip checks.
- **`--slug <slug>` narrows to one queue row.** It combines with `--tier` if you want an extra safety filter.
- **`--force` is overwrite semantics.** It bypasses dataset skip, removes any existing dataset row for that slug, reruns the worker, and re-adds the row only if the new verdict succeeds.

## Current limitations (catalog)

`unit-catalog.ts` parses spells from 5etools XPHB JSON. It does NOT yet parse:

- Class features from `.references/srd-5.2.1/Classes/*.md`
- Feats from `.references/srd-5.2.1/Feats.md`
- Species traits from `.references/srd-5.2.1/Character-Origins.md`
- Masteries (hardcode the 8)
- Magic items from `.references/srd-5.2.1/Magic-Items/`

Tier 1 includes ~15 manually-specified class features / species / masteries for coverage. Tier 2 coverage beyond spells requires extending the catalog parser.

## Convergence loop

After a tier completes:

1. `aggregate.ts` summarizes the pressure map in `REPORT_SRD.md`.
2. `auto-close-loop.ts` or a human selects one reusable cluster candidate.
3. A bounded surface-change attempt edits TS/package files for that family.
4. The affected batch is re-mined sequentially with `--force`.
5. The loop measures weighted-debt change and either keeps or reverts the attempt.
6. The script writes a before/after closure report under:
   - `.output/content-surface-closure/*.json`

## Evidence locations

There are now three different kinds of survey artifacts, and they are not interchangeable:

1. `scripts/content-surface-survey/results-srd/<slug>/`
   - mutable worker-local rerun artifacts
   - overwritten by future reruns
   - useful for the latest local state of a slug

2. `.output/content-surface-closure/`
   - machine-local telemetry and control files
   - runner state, locks, convergence history, latest snapshots, failure logs
   - not intended as durable git history

3. `scripts/content-surface-survey/evidence/auto-close-loop/`
   - tracked durable archive for completed auto-close-loop batches
   - one directory per batch/run stamp
   - stores:
     - `closure-report.json`
     - `batch-metadata.json`
     - per-slug `proposal.md`, `result.json`, `verdict.json`

The reason this exists separately from `results-srd/` is that parallel workers
rewrite `results-srd/` in place. We want those live working files for the
current rerun, but we do **not** want to merge them directly across workers.
The evidence archive is the durable, checked-in backup of what a completed batch
saw at the time it finished.

`close-loop.ts` is the rerun engine used inside the convergence loop.
By itself it is not enough for convergence; the reusable surface-change
step lives in `auto-close-loop.ts`.

`auto-close-loop.ts` is the unattended wrapper around that loop. It adds:

- persisted resume state in `.output/content-surface-closure/auto-close-loop.state.json`
- single-run lock in `.output/content-surface-closure/auto-close-loop.lock.json`
- latest global convergence snapshot in `.output/content-surface-closure/auto-close-loop.latest.json`
- append-only convergence history in `.output/content-surface-closure/auto-close-loop.history.jsonl`
- append-only failed-attempt log in `.output/content-surface-closure/failed-surface-attempts.jsonl`
- tracked per-batch evidence snapshots in `scripts/content-surface-survey/evidence/auto-close-loop/`
- bounded step-2 surface-change attempt before each rerun batch
- automatic keep-or-revert based on rerun outcome
- per-batch hard timeout
- self-recycling after failed-batch / no-improve / exhausted-state thresholds
- launcher-level supervisor restart if a runner process exits unexpectedly
- sleep between batches
- optional per-batch git commits for completed atoms (`AUTO_COMMIT=1`)
- optional multi-worker mode via `AUTO_RUNNER_NAME`
- shared cluster leasing so workers do not duplicate spend on the same family
- serialized integration onto `auto-close-loop-integration` after each successful batch atom
- worker reset to the merged integration state before the next batch

Use `run-auto-close-loop.sh` for overnight runs instead of manual `nohup`
commands.

`aggregate.ts` turns `survey-results-srd.jsonl` into `REPORT_SRD.md`:

- Outcome distribution by kind + tier
- Atom frequency (sorted by how many units reference each atom)
- Widening frequency (sorted by how many units propose each widening)
- Decision verdict: A vs B vs inconclusive per the rubric in the plan.
