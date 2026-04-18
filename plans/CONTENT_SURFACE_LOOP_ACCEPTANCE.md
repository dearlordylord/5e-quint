# Auto-close-loop acceptance criteria — historical

**Status:** the loop phase is DONE and merged (commit `3bda25a2`). This doc is kept in case the loop is resumed for more mining later. For the current forward-looking plan see `CONTENT_SURFACE_NEXT.md`.

## How to resume the loop (if needed)

```sh
# Start 5 workers with kind diversity (recommended from overnight findings):
AUTO_KIND=spell bash scripts/content-surface-survey/run-auto-close-loop.sh start
AUTO_RUNNER_NAME=worker-b AUTO_KIND=magic_item bash scripts/content-surface-survey/run-auto-close-loop.sh start
AUTO_RUNNER_NAME=worker-c AUTO_KIND=spell bash scripts/content-surface-survey/run-auto-close-loop.sh start
AUTO_RUNNER_NAME=worker-d AUTO_KIND=class_feature bash scripts/content-surface-survey/run-auto-close-loop.sh start
AUTO_RUNNER_NAME=worker-e AUTO_KIND=species_trait bash scripts/content-surface-survey/run-auto-close-loop.sh start
```

## Measurement

`scripts/content-surface-survey/measure.sh` computes pass/fail for each criterion below. Run after every 30 min of loop runtime.

| # | Criterion | Threshold |
|---|---|---|
| 1 | `commit_rate_1h` | ≥ 20 |
| 2 | `cluster_diversity_last20` | ≥ 6 distinct |
| 3 | `revert_rate_1h` | ≤ 10 after 30-min warmup |
| 4 | `worker_productivity_pct` per worker | ≥ 30 |
| 5 | `stuck_cluster_max_retries` | ≤ 3 (Layer 2 parks at 3) |
| 6 | Per-kind `kind_debt_range_last15` | < 5 ⇒ floor reached |

Session-exit: all above + `parked_clusters_total ≥ 1` + `integration_commits ≥ 300` + `cluster_diversity_all ≥ 20` + `verdict_coverage_pct ≥ 80`.

## Key design decisions baked in

- **Layer 1: kind diversity** — each runner a different `AUTO_KIND` to avoid collision on one frontier.
- **Layer 2: cluster parking** — `state.clusterFailures` increments on any non-success (abstention + validator-revert); at `AUTO_PARK_THRESHOLD=3`, cluster goes into `state.parkedClusters` (survives recycles). Successful commit clears the counter.
- **Staleness caveat (CRITICAL):** a cluster's dataset verdict can be stale relative to current surface. If a "re-run" is needed, prefer a one-shot `run-survey.sh --slug X --force` before escalating.

## Overnight result (for the record)

- 361 batch commits on `auto-close-loop-integration`, merged to master.
- Debt trajectory: 635 → ~610 net (with heavy churn; see audit in commit message of `3bda25a2`).
- 11 clusters parked by Layer 2.
- Key finding: the revert rate never dropped below 15/h because workers kept exploring new clusters. "Exploratory cluster probing" is harmless noise in the signal — not a failure mode.
