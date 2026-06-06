# Acid Arrow RAW Corpus Reconciliation

Date: 2026-06-06

## Decision

Resolved. The active SRD 5.2.1 markdown corpus now carries the audited Acid
Arrow damage relationship:

- immediate hit damage: 4d4 Acid damage;
- target-end delayed hit damage: 2d4 Acid damage at the end of the target's
  next turn;
- miss damage: half of the initial damage only;
- higher-slot scaling: both initial and later damage increase by 1d4 per Spell
  Slot level above 2.

No `ASSUMPTIONS.md` override is used for Acid Arrow. The correction is a local
SRD corpus repair, not a new modeling choice.

## Completed Outputs

- RAW corpus repaired in
  `.references/srd-5.2.1/Spells/Descriptions-A-D.md#Acid Arrow`.
- Surface authored shape repaired in
  `packages/surface/content/acid_arrow.dhall` and generated JSON.
- Acid Arrow installed in the SRD Unit catalog.
- Battle runtime admits the structural `spellAttackDamage` profile with
  explicit `halfInitialOnly` miss damage and target-end delayed damage.
- Focused QNT proof owner added at
  `packages/battle-runtime/battle-runtime-acid-arrow.qnt`.
- Runtime parity and selected-identity evidence are checker-visible through
  `packages/battle-runtime/src/unit-profile-admission-damage-spells.test.ts`
  and
  `packages/battle-runtime/src/level2-damage-spell-selected-identity.mbt.test.ts`.

## Verification

- `pnpm exec node scripts/unit-profile-coverage-check.cjs --write` passes and
  reports 276 Units and 166 profiles.
- `plans/unit-profile-coverage/LEVEL1_3_FULL_SUPPORT.md` now reports the full
  support claim as pass, with strict=0, selected-identity=0, and
  SRD-authored-readiness=0 blockers.
