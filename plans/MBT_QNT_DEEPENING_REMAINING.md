# MBT/QNT Deepening — Remaining Work

This file captures what is left to finish the
`mbt-qnt-deepening` worktree's plan after the first session. The
work shipped so far lives in branch `mbt-qnt-deepening`, eight
commits on top of `master` at `a22894e2`:

1. `9a3f9c77` Add rule-core imports to metamagic tests slice
2. `dc8c8d8f` Inline rule-core concentration into bridge consumer
3. `2fe25edd` Extract stat-block-bridge run test_ blocks into examples sibling
4. `03395ba0` Extract feature-bridge run test_ blocks into examples sibling
5. `6fd3ded3` Extract movement-bridge run test_ blocks into examples sibling
6. `123e2916` Extract spell-bridge run test_ blocks into examples sibling
7. `6830385e` Consolidate small selected-identity drivers behind witness
8. `dc66b5e9` Start tranche 2: migrate bardic-inspiration + add mbt timeout knob

Done so far:

- Candidate 4 (concentration bridge inline) shipped.
- Candidate 2 (four bridge `run test_*` extractions) shipped.
  Quint canonical self-tests rose from 411 → 437 passing because
  those bridge tests were orphaned from the canonical runner
  before this work; the four extractions reach them via the
  examples-sibling import.
- Candidate 1 Tranche 1 shipped (12 small drivers + the
  `selected-identity-witness.ts` module). Average per-driver TS
  line reduction was 34%, below the 50% gate; the user
  authorised continuing on the basis that the witness absorbs a
  fixed amount of boilerplate and large drivers carry per-test
  setup the witness was not designed to deduplicate.
- Tranche 2 starter: bardic-inspiration migrated. The witness
  gained an optional `mbtParityTimeoutMs` field for drivers that
  need more than the default 120s vitest ceiling.

## Pre-existing flake surfaced during the session

`bardic-inspiration-selected-identity.mbt.test.ts` MBT parity
test times out at 120s under both the pre-migration driver and
the witness migration. The per-driver QNT spec imports the broad
`battleRuntime` module rather than a slim projection, so the
typescript-backend evaluator spends most of the budget loading
and evaluating the wider corpus. Suggested follow-ups, any of
which are out of this plan's scope:

- Trim the per-driver `bardic-inspiration-selected-identity.mbt.qnt`
  to a narrower projection that does not need the full
  `battleRuntime` import.
- Build and use the Rust evaluator
  (`./scripts/build-quint-evaluator.sh`) and rerun with
  `backend: "rust"` — but check the CLAUDE.md GLIBC note first.
- Raise `mbtParityTimeoutMs` to 300_000ms for this one driver if
  the slow path is acceptable.

## Tranche 2 drivers (completed in follow-up)

Sized by current TS LoC before migration:

| Driver | TS LoC | Notes |
| --- | --- | --- |
| `level2-control-spell` | 465 | spell driver, several procedures |
| `level2-damage-spell` | 475 | spell driver |
| `level2-protection-spell` | 481 | spell driver |
| `find-familiar` | 600 | feature, multi-procedure |
| `condition-removal-protection` | 616 | spell projection, multi-procedure |
| `dispel-magic` | 647 | reaction-flow heavy |
| `feature` | 678 | feature catalog, multi-unit |
| `mage-armor` | 736 | spell, possibly slot-level heavy |
| `attack-spell-shape` | 902 | 5 cantrips, multi-procedure |
| `condition-saving-throw` | 926 | 6 spells, 8 procedures |
| `roll-modifier-buff` | 1107 | largest; multi-unit |

All eleven tranche 2 drivers above now use
`defineSelectedIdentityWitness`. Their per-file `defineDriver`,
`run`, and `stateCheck` harnesses were removed, with procedure
evidence retained in discover functions.

## Tranche 3 drivers (completed in follow-up)

Sized by per-driver QNT (`*.mbt.qnt`) LoC, the threshold the
plan uses to classify these as large:

| Driver | QNT LoC | TS LoC |
| --- | --- | --- |
| `movement-forced-movement` | 132 | 1303 |
| `level1-damage-spell` | 187 | 2206 |
| `creature-type-protection-and-charm` | 261 | 1477 |
| `sanctuary` | 266 | 1112 |
| `level1-spatial-witness` | 518 | 4627 |
| `level1-buff-mark-smite` | 690 | 4166 |

All six tranche 3 drivers above now use
`defineSelectedIdentityWitness`. The two very large drivers keep
their reducer fixture/action evidence in plain runtime replay
objects behind the witness. `level1-buff-mark-smite` retains a
custom Quint-state projection hook because its runtime projection
has nested domain-shaped evidence for Searing Smite, Shillelagh,
and True Strike while the shared witness schema is otherwise flat.

## Final reviewer-loop convergence (completed in follow-up)

Verification completed after tranches 2 and 3:

- `pnpm --filter @dnd/battle-runtime exec tsc --noEmit`
- Deterministic replay sweep:
  `pnpm exec vitest run src/*selected-identity.mbt.test.ts --testNamePattern 'deterministically'`
- Focused MBT for every migrated tranche 2 and tranche 3 driver.
- Flat witness smoke MBT after the nested-projection witness hook:
  `pnpm --filter @dnd/battle-runtime exec vitest run src/level1-damage-spell-selected-identity.mbt.test.ts`
- Canonical QNT self-tests:
  `pnpm exec quint test --backend typescript ./battle-runtime-self-tests.qnt --match test_`
  with 437 passing.
- `git diff --check`

Reviewer-loop notes:

- RAW/ubiquitous-language: no modeled SRD rules were changed; the
  work moved MBT harness/projection plumbing while preserving the
  existing reducer fixture evidence and package-local QNT
  projections.
- Architecture/connascence: `selected-identity-witness.ts` now
  owns shared replay, MBT invocation, flat Quint state parsing, and
  optional nested projection normalization. A brittle Grease
  witness check that depended on an exact invalid-message string
  was weakened to the executable invariant that the mismatched
  movement fill is rejected.
- Code review round 1:
  - Finding: the nested-projection witness extension allowed a
    non-flat projection to omit `normalizeQuintState`, which would
    compile but force the flat schema parser to masquerade as the
    nested projection type. Fix: split the witness API into flat
    and custom-normalized variants so custom projection shapes must
    provide a normalizer.
  - Finding: the flat parser's `as` cast lacked the required local
    justification. Fix: add a cast note tying the mapped type to
    the runtime schema derived from the same flat projection schema.
- Code review round 2:
  - Finding: custom-normalized witnesses still constructed a flat
    runtime schema unnecessarily. Fix: build the runtime schema
    only for flat witnesses and keep the custom path entirely on
    the supplied normalizer.
- Convergence: no remaining reasonable findings after the second
  pass. The remaining custom normalizer is intentional for nested
  domain-shaped projection data.

## Resume protocol

1. `git worktree add` is already done; switch into
   `.worktrees/mbt-qnt-deepening`.
2. `pnpm install` if `node_modules/` does not exist there.
3. Verify the eight commits above with
   `git log --oneline master..HEAD`.
4. Continue tranche 2 starting from the smallest driver
   (`level2-control-spell`). The witness is committed and
   re-usable as-is; the migration template is the
   `fireball-selected-identity.mbt.test.ts` shape.
5. Use the existing `pnpm exec quint test --backend typescript
   ./battle-runtime-self-tests.qnt --match test_` invocation to
   sanity-check the canonical Quint self-tests after each
   tranche commit (expect 437 passing throughout the rest of
   Candidate 1 since tranche 1's drivers do not change the
   Quint-side count).
