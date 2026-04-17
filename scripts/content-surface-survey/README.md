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

## Next: aggregate.ts

After a tier completes, `aggregate.ts` (not yet built) turns `survey-results-srd.jsonl` into `REPORT_SRD.md`:

- Outcome distribution by kind + tier
- Atom frequency (sorted by how many units reference each atom)
- Widening frequency (sorted by how many units propose each widening)
- Decision verdict: A vs B vs inconclusive per the rubric in the plan.
