# Auto-Close-Loop Evidence

This directory is the tracked durable archive for completed `auto-close-loop`
batches.

Each batch archive is written under a runner-specific subdirectory and contains:

- `closure-report.json`
- `batch-metadata.json`
- per-slug snapshots of:
  - `proposal.md`
  - `result.json`
  - `verdict.json`

This is intentionally different from:

- `scripts/content-surface-survey/results-srd/`
  - mutable latest rerun state for a slug
  - overwritten by later reruns

- `.output/content-surface-closure/`
  - machine-local telemetry, locks, state, and failure logs
  - operational data, not the durable git-backed evidence store

Parallel workers do not integrate batch-local `results-srd/*` files directly,
because those collide too easily. Instead, completed batches archive their
evidence here and integrate the reusable source/content changes separately.
