# Auto-close-loop acceptance criteria

This document defines what "progress", "reasonable pace", and "success" mean for the automated content-surface convergence loop. Every change to the loop must be measured against these.

## Why this doc exists

Night run audit (see `CONTENT_SURFACE_SURVEY.md` §"Audit note — 2026-04-18"):
- 213 commits landed, but weighted-debt net-dropped only 635→610 over 6.5h.
- Final hour was pure oscillation around 602-610.
- Top 4 clusters absorbed 40% of commits = chipping, not converging.
- `failed-surface-attempts.jsonl` kept growing at ~28/hour with no sign of slowing.

Without acceptance criteria, "more commits" felt like progress but was actually a local-optimum chase. This doc locks in what good looks like so future layers (2, 3, …) can be evaluated honestly.

---

## What progress looks like (positive signals)

1. **Integration commits grow.** Running count on `auto-close-loop-integration` increases.
2. **Cluster diversity in commits.** In any trailing 20-commit window, ≥6 distinct cluster names.
3. **Clean count grows.** Across kinds, sum of `totals.clean` trends up over hours (not just per-batch churn).
4. **Weighted debt per kind declines** toward the theoretical floor (refused units × 1 + un-encodable structural × 4).
5. **Revert rate eventually drops.** `failed-surface-attempts.jsonl` growth rate *decreases* after plateau detection engages, as workers stop re-attempting exhausted clusters.
6. **Per-kind traversal.** Each of the 5 kinds (spell, magic_item, class_feature, species_trait, feat/mastery) gets attention; no kind sits permanently starved.

## What reasonable pace looks like

Each criterion below is a one-liner computable by `scripts/content-surface-survey/measure.sh`.

| # | Metric | Pass threshold | Source |
|---|---|---|---|
| 1 | `commit_rate_1h` | ≥ 20 | `git log --since=1h auto-close-loop-integration ^master \| wc -l` |
| 2 | `cluster_diversity_last20` | ≥ 6 distinct | commit messages, strip leading `batch N ` |
| 3 | `revert_rate_1h` | ≤ 10 after 30-min warmup | timestamps in `failed-surface-attempts.jsonl` |
| 4 | `worker_productivity_pct` (each active worker) | ≥ 30 | state file: `improvedBatches / batch * 100` |
| 5 | `stuck_cluster_max_retries` | ≤ 3 | state file: `max(clusterFailures)` across workers |
| 6 | `kind_debt_range_last15` (each kind) | drop < 5 ⇒ floor reached | `history.jsonl`: max−min of `weightedDebt` over last 15 entries with `.kind == K` |

Below the pass threshold for ≥ 2 consecutive 30-min reports ⇒ escalate or stop.

## What success looks like (session exit)

A session is "done" when ALL of:

- `kind_debt_range_last15 < 5` has held for ≥ 30 min (≥ 1 full report cycle) for each active kind. *("Kind has reached its floor.")*
- At least one cluster has been parked (proves Layer 2 mechanism engaged). `parked_clusters_total ≥ 1`.
- `revert_rate_1h ≤ 5`.
- `stuck_cluster_max_retries ≤ 3`.
- `integration_commits_vs_master ≥ 300`.
- `cluster_diversity_all ≥ 20` (unique cluster names across all commits since branching from master).
- `verdict_coverage_pct ≥ 80` where `pct = count(results-srd/*/verdict.json) / count(unit-queue.jsonl)`.

Anything less ⇒ in-progress, not done.

## Anti-patterns (bugs, not slow progress)

Each should be a one-liner check. If any triggers, stop and fix.

- **`dominant_cluster_share ≥ 0.5` across 3 consecutive 30-min windows.** One cluster claims ≥ half the commits in each of 3 windows ⇒ picker is stuck.
- **`revert_rate_60m` strictly monotonic-increasing over 3 consecutive 20-min sub-windows.** Speculative work accelerating.
- **`commits_per_kind_imbalance > 5`** (`max/min` excluding kinds with < 10 queue units). Kind diversity regressed.
- **`worker_zero_improved_batches ≥ 8`** any worker has `improvedBatches` unchanged across 8 consecutive batches. Recycle isn't moving them.
- **`integration_branch_diverged = true`**: `git rev-parse auto-close-loop-integration` ≠ the integration worktree HEAD.
- **`slug_regression_committed ≥ 1`**: scan closure reports under `.output/content-surface-closure/` for any `before ∈ {clean,atom,surface}` with committed `after` of worse weight. Validator bug — should never be > 0 on the committed timeline.

`measure.sh` must print `✓` / `✗` for each numbered criterion + each anti-pattern, with the underlying number, so a 30-min report is a single invocation.

## How to measure

Fleet status (every 5-min ping):
- Per-worker `{kind, batch, improvedBatches, noImproveStreak, errorStreak, currentCluster}`.
- Integration commit count.
- `history.jsonl` line count.

Trend metrics (every 30-min convergence report):
- Δ commits since last report, by cluster.
- Δ history lines since last report.
- Acceptance rate = Δ commits / Δ history.
- Revert rate = Δ failed-surface-attempts / Δ minutes.
- Cluster diversity in last 20 commits.
- Per-kind debt snapshot.

Against-criteria check (explicit in each convergence report):
- Commit rate ≥ 20/h? ✓/✗
- Cluster diversity ≥ 6? ✓/✗
- Revert rate ≤ 10/h (post-warmup)? ✓/✗
- Any anti-pattern triggered? ✓/✗

If any criterion fails for 2 consecutive reports, escalate or stop.

## Layer evaluation rubric

Each structural change to the loop must be evaluated against:

1. **Commit rate** — did it go up, down, or stay flat?
2. **Revert rate** — did the change reduce wasted codex calls?
3. **Cluster diversity** — did the change broaden coverage?
4. **Anti-pattern triggers** — did it introduce any new failure mode?

A change that improves none of (1)-(3) and doesn't fix a known anti-pattern is a null result — revert it rather than accumulate prompt/code cruft.

**Layer 1.5 case study (2026-04-18):**
- Commit rate: no change (~40/h → ~40/h).
- Revert rate: no change (0.48/min → 0.46/min).
- Cluster diversity: no change (same flip clusters).
- Verdict: null result. Revert when Layer 2 ships.
