# Autoresearch: SRD 5.2.1 PDF Markdown

## Objective

Produce publication-quality Markdown regenerated solely and deterministically from the checked-in official SRD 5.2.1 PDF, with validated source mapping and no Downfallx dependency

## Metrics

- Primary: qualityLossPpm (ppm, lower is better)
- Secondary: none yet

## How to Run

`pnpm srd:autoresearch:benchmark` prints `METRIC name=value` lines.

## Files in Scope

- scripts/srd521/generator/\*\*
- scripts/srd521/section-manifest.json
- .references/srd-5.2.1/\*\*

## Off Limits

- TBD: add off-limits files or behaviors if needed

## Constraints

- - Decision contract: qualityLossPpm is treated as a quality-bearing score; faster runs should not be promoted when component evidence shows quality or correctness erosion.

## Decision Rules

- Keep when the primary metric improves or a baseline is needed and checks pass.
- Discard when the metric is equal or worse, unless the run only establishes the baseline.
- Log crashes and failed checks with a concrete rollback reason.
- Put next-step guidance in ASI so another Codex session can continue.

## Stop Conditions

- Stop when the target metric reaches the agreed threshold.
- For qualitative loops, stop when `quality_gap=0`, checks pass, and no high-impact open finding remains.
- Stop when maxIterations is reached or the user interrupts.

## Research Notes

- Source-backed facts, contradictions, and open questions go here or in linked scratchpad files.
- For deep research loops, link the scratchpad folder and summarize the current synthesis.

## What's Been Tried

- Baseline: pending

## Resume This Session

Read the current decision before resuming:

```bash
node /home/node/.codex/plugins/cache/TheGreenCedar/codex-autoresearch/3.0.0/scripts/autoresearch.mjs state --cwd /tmp/dnd-srd-migration.o1ZAHD --report
```

Follow its next action. A measurement is a keep only after the accepted checks and repeat requirements pass.
