# Cleanroom Branch Coverage

This directory owns source-side branch coverage readiness artifacts for the
next cleanroom experiment.

The checker is `scripts/cleanroom-branch-coverage-check.cjs`.

## Source Branch Inventory

`source-branch-inventory.json` is generated from:

- `.mbt.qnt` drivers named in `branch-scope.jsonl`;
- Quint parse output for each driver;
- curated branch scope and replayability decisions from `branch-scope.jsonl`.

It records two different facts:

- `branchObligations[]`: named leaf actions Quint can report through
  `mbt::actionTaken`;
- `sampledInputs[]`: `nondet` picks Quint reports through `mbt::nondetPicks`.

Do not add branch actions by hand to the generated inventory. Add or update the
driver, then run:

```bash
pnpm cleanroom-branch-coverage:check -- --write
```

## Target Replay Evidence

`targetReplayEvidence` is not stored here as acceptance evidence. A target
language harness must generate it after executing copied QNT drivers through
that target's Quint/MBT replay lane.

The source checker can validate a target evidence file:

```bash
pnpm cleanroom-branch-coverage:check -- --target-replay-evidence <path>
```

Evidence rows must be keyed to the current source branch inventory hash, QNT
file hash, branch family, expected branch action, and observed
`mbt::actionTaken`. Diagnostic target-language unit tests are allowed for
debugging, but they do not satisfy target replay evidence.

## Scope Rows

`branch-scope.jsonl` is curated. It should contain scope, blocker, exemption,
and replayability decisions, not a duplicate branch inventory.

The initial tracer bullet covers one real driver and is not the full corpus
source-readiness gate:

- `packages/battle-runtime/battle-runtime-magic-missile.mbt.qnt`

That driver has two branch actions and one sampled input, so it exercises the
core source/target distinction without hardening the full corpus yet. Future
phases must add scope rows before additional cleanroom drivers become active
implementation tasks.
