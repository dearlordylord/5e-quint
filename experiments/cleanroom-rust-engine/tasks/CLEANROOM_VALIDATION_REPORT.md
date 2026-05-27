# Cleanroom Validation Report

Status: first combined cleanroom milestone passing.

## Sources Inspected

- `AGENTS.md`
- `README.md`
- `tasks/LANE_C_QNT_PARITY_VALIDATION.md`
- `input/cleanroom-input-manifest.json`
- `input/plans/unit-profile-coverage/LEVEL1_2_ULTRA_GOLDEN_SUMMARY.md`
- `input/plans/rules-kernel-coverage/generator-readiness.jsonl`
- `input/UBIQUITOUS_LANGUAGE.md`
- `input/packages/battle-runtime/battle-runtime-model.qnt`
- `input/packages/shared-algebras/proofs/rule-core/hit-point-damage.qnt`
- `input/packages/shared-algebras/proofs/rule-core/hit-point-recovery.qnt`
- `input/packages/battle-runtime/battle-runtime-hit-points.qnt`
- `input/packages/character-creation-runtime/character-creation-runtime-slice.qnt`
- local Rust files under `engine/src/`

## Inventory

Manifest metrics:

- Scoped obligations: 47
- Copied QNT files: 156
- Copied files total: 209
- Generator-readiness rows in manifest: 32
- Generator-readiness status: 32 `generation-subset-clean`, 0 blockers

Level 1-2 summary claims:

- Support completeness: pass
- QNT/generator readiness: pass
- MBT/parity evidence: pass
- MCP scenario evidence: pass

## Rust Test Checklist

Initial executable test target added:

- `engine/tests/semantic_core_smoke.rs`
- `engine/tests/character_creation_draft.rs`
- `engine/tests/battle_hit_points.rs`
- `engine/tests/battle_damage.rs`
- `engine/tests/battle_actions.rs`

Covered by the smoke test file:

- Ability score projection for the six QNT abilities.
  - QNT source: `input/packages/battle-runtime/battle-runtime-model.qnt`
  - Domain source: `input/UBIQUITOUS_LANGUAGE.md`
  - Rust surface: `types::AbilityScores::score`
- Available hit-point field projection.
  - QNT source: `input/packages/shared-algebras/proofs/rule-core/hit-point-damage.qnt`
  - Domain source: `input/UBIQUITOUS_LANGUAGE.md`
  - Rust surface: `battle::HitPoints::new`

Covered by the first combined milestone:

- `CREATION.DRAFT.FILL_BATCH_SLICE_REPLAY`: accepted/rejected fill batch
  behavior, stale revision, atomic rejection, and issue reporting.
- `CREATION.CHOICE_DISCOVERY_CARDINALITY`: initial and manifest-path open-hole
  transitions.
- `SHARED.HIT_POINTS.POSITIVE_DAMAGE`: positive damage, Temporary HP
  absorption, HP clamping, zero-HP outcomes, and monster/PC distinction.
- `SHEET.HP_REST_HIT_DICE.TRANSITIONS`: healing cap, regained-HP lifecycle
  reset, dead-creature no-op healing, and knock-out recovery.
- Battle damage primitives: damage type aggregation,
  immunity/resistance/vulnerability, scalar reduction allocation, attack roll
  outcome, attack damage admission, and knock-out attack disposition.
- Battle action/resource primitives: Dash, Disengage, Dodge, Help, Hide/Search
  witness facts, Ready movement, reaction spending/reset, Second Wind,
  failed-check boost, Cunning Action, Innate Sorcery, bonus-action Dash
  Temporary HP, Action Surge, and Extra Attack count tracking.

Pending executable parity tests:

- `BATTLE.SPELL.MAKE_STABLE_LIFECYCLE`: `spareTheDyingTargetAdmitted` and `applySpareTheDying`.
- Character-creation finalized build breadth beyond the manifest path:
  selected Unit refs, HP/Hit Die derivation, proficiencies, resources, and
  loadout identity.
- Remaining battle spell, reaction, movement, command, feature, and sheet
  obligations from `input/cleanroom-input-manifest.json`.

## Validation Runs

Baseline before Lane C test additions:

```text
Command: cd engine && cargo test
Result: pass
Tests: 1 passed
```

First expanded run after adding `engine/tests/semantic_core_smoke.rs`:

```text
Command: cd engine && cargo test
Result: fail to compile
Error: E0583, file not found for module `character_creation` declared by engine/src/lib.rs
Observed local state: engine/src/character_creation.rs is deleted in the working tree
```

The failure occurred before integration tests executed. Lane C did not edit
`engine/src` because `tasks/LANE_A_CHARACTER_CREATION.md` assigns
`engine/src/character_creation.rs` to Lane A.

Final run after `engine/src/character_creation.rs` became present again in the
shared working tree:

```text
Command: cd engine && cargo test
Result: pass
Tests: 1 crate unit test passed; 2 integration tests passed; 0 doc tests
```

Combined milestone after Lanes A and B landed:

```text
Command: cd engine && cargo fmt --check && cargo test
Result: pass
Tests: 1 crate unit test, 31 battle tests, 11 character-creation tests, and 2
semantic-core smoke tests passed
```

## Current Blockers

- Character-creation source gap: the current QNT slice explicitly covers the
  manifest draft protocol path more deeply than finalized build breadth. Wider
  level 1-2 creation needs more QNT parity facts for selected Unit refs, HP/Hit
  Die derivation, proficiencies, resources, and loadout identity before a
  cleanroom implementation can honestly claim full breadth.
- Battle breadth gap: no blocker for the implemented first battle slices, but
  wider spell/reaction/continuation behavior still needs additional verticals
  against the remaining copied QNT obligations.
- Transient shared-worktree blocker observed during validation:
  `engine/src/character_creation.rs` was temporarily absent while
  `engine/src/lib.rs` still declared it. This is resolved in the final run and
  did not require Lane C edits to `engine/src`.

## Cleanroom Source Assessment

For the implemented first milestone, QNT plus RAW/ubiquitous language were
sufficient to derive meaningful character-creation and battle behavior without
reading production TypeScript.

For full level 1-2 parity, the copied QNT and readiness metadata identify the
obligations and source files, but the Rust engine still needs more verticals and
the character-creation QNT source needs broader finalized-build facts.
