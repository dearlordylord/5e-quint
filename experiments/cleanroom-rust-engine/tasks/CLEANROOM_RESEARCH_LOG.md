# Cleanroom Research Log

Record experiment findings here. Keep entries factual and short:

- what the agent tried;
- which QNT/RAW files were used;
- what compiled or failed;
- what source fact was missing, ambiguous, or insufficient.

Do not paste production TypeScript code or observations from production
TypeScript runtime files.

## 2026-05-27 - Lane C validation pass

- Inspected cleanroom instructions, Lane C task, manifest, level 1-2 summary,
  generator-readiness metadata, relevant QNT files, ubiquitous language, and
  local Rust files only.
- Baseline `cd engine && cargo test` passed before Lane C test additions: 1
  crate unit test passed.
- Added `engine/tests/semantic_core_smoke.rs` for currently exposed pure data
  and projection behavior derived from `battle-runtime-model.qnt`,
  `hit-point-damage.qnt`, and `UBIQUITOUS_LANGUAGE.md`.
- Expanded `cd engine && cargo test` failed at compile time before integration
  tests ran: `engine/src/lib.rs` declares `pub mod character_creation;`, but
  `engine/src/character_creation.rs` is absent in the working tree.
- Lane C did not repair `engine/src/character_creation.rs` because Lane A owns
  that file.
- After `engine/src/character_creation.rs` became present again in the shared
  working tree, final `cd engine && cargo test` passed: 1 crate unit test and 2
  Lane C integration tests passed.
- No QNT/RAW source gap found for the smoke-test area. The larger blocker is
  missing Rust semantic-core API surface for most copied obligations.

## 2026-05-27 - Obligation-to-Rust coverage map

- Read the cleanroom manifest, generator-readiness JSONL, level 1-2 QNT/MBT
  join JSON, and local Rust public APIs/tests only.
- Built the 47-obligation coverage map in `tasks/CLEANROOM_VALIDATION_REPORT.md`.
- Conservative count: 0 fully implemented, 11 partially implemented, 36 not
  attempted, 0 blocked by source gap.
- The input metadata reports 47/47 QNT-owned and 47/47 parity-witnessed source
  obligations with no open source-system join gaps; current gaps are Rust
  implementation/test coverage gaps.
- `cd engine && cargo test` passed: 45 tests passed, 0 failed.

## 2026-05-27 - Lane A character creation vertical

- Inspected `AGENTS.md`, `README.md`, `tasks/LANE_A_CHARACTER_CREATION.md`,
  `input/cleanroom-input-manifest.json`, `input/UBIQUITOUS_LANGUAGE.md`,
  `input/ASSUMPTIONS.md`, character-creation QNT slice/MBT files, and the
  referenced SRD 5.2.1 RAW files only.
- Implemented the draft/hole/fill protocol from
  `input/packages/character-creation-runtime/character-creation-runtime-slice.qnt`
  in `engine/src/character_creation.rs`.
- Added stale-revision rejection, per-fill issue reporting, duplicate-fill
  detection, choice cardinality checks, valid-vs-supported choice checks,
  Standard Array and Point Buy validation, atomic batch rejection, and accepted
  batch revision advancement.
- Added Rust tests in `engine/tests/character_creation_draft.rs` covering the
  QNT manifest path and rejection actions, plus level-1 and level-2 Fighter
  finalization.
- Final `cd engine && cargo test` passed: 1 crate unit test, 11 battle tests, 11
  Lane A character-creation tests, and 2 semantic-core smoke tests passed.
- Cleanroom blocker: broader level 1-2 finalized build facts remain
  under-specified by the current character-creation QNT slice. The slice itself
  notes a follow-up need for parity coverage of selected Unit refs, HP/Hit Die
  derivation, proficiencies, resources, and loadout identity before widening
  beyond the manifest path.

## 2026-05-27 - Lane A finalized-build breadth check

- Inspected copied character-creation selected-identity/projection QNT,
  rules-kernel obligation metadata, level 1-2 unit-profile metadata, referenced
  SRD 5.2.1 RAW, ubiquitous language, and local Rust files only.
- Determined Fighter Weapon Mastery selected Unit refs are honestly
  implementable from cleanroom inputs:
  `character-creation-runtime-slice.qnt` supplies the accepted Fighter mastery
  weapon choices and validation protocol, and
  `character-creation-weapon-mastery-containers-selected-identity.mbt.qnt`
  supplies the finalized `fighter_weapon_mastery`, `class_fighter`,
  `weapon_longsword`, `weapon_spear`, and `weapon_flail` projection facts.
- Updated `CharacterBuild` to use class-specific variants and project Fighter
  Weapon Mastery selected Unit refs without modeling selected mastery-property
  runtime behavior.
- Added Rust tests covering the finalized Fighter Weapon Mastery Unit refs and
  class-specific build shape.
- `cd engine && cargo fmt`, `cd engine && cargo test`, and
  `cd engine && cargo clippy --all-targets` all passed.
- Remaining cleanroom blocker: broader finalized-build breadth is still not
  fully generated. HP/Hit Die derivation, full proficiencies, broad resources,
  spell access, and loadout identity need their own QNT-backed verticals or a
  machine-readable finalization contract before they can be claimed as complete.

## 2026-05-27 - Lane B battle core verticals

- Inspected `AGENTS.md`, `README.md`, `tasks/LANE_B_BATTLE_CORE.md`,
  `input/cleanroom-input-manifest.json`, `input/UBIQUITOUS_LANGUAGE.md`,
  `input/ASSUMPTIONS.md`, relevant SRD 5.2.1 RAW, and battle semantic-core QNT
  files only.
- Implemented hit point damage, healing, Temporary Hit Points, knockout
  disposition, direct hit point restoration spell facts, Death Saving Throw
  lifecycle, and zero-HP damage behavior in `engine/src/battle.rs`.
- Implemented damage type aggregation, immunity/resistance/vulnerability,
  scalar reduction allocation, attack roll outcomes, attack damage admission,
  and knockout attack disposition from the battle damage QNT slices.
- Implemented action/resource primitives for turn action costs, Dash,
  Disengage, Dodge, Help attack, Hide/Search caller witnesses, Ready movement,
  reaction spending/reset, Second Wind, Tactical Mind-style failed ability check
  boost, Cunning Action, Innate Sorcery activation, bonus-action Dash Temporary
  Hit Points, Action Surge, and Extra Attack count tracking.
- Added Rust tests in `engine/tests/battle_hit_points.rs`,
  `engine/tests/battle_damage.rs`, and `engine/tests/battle_actions.rs` derived
  from the corresponding QNT examples and RAW anchors.
- Final `cd engine && cargo test` passed: 1 crate unit test, 31 Lane B battle
  tests, 11 Lane A character-creation tests, and 2 semantic-core smoke tests
  passed.
- Cleanroom blocker: no blocker for the implemented Lane B slices. Wider
  spell/reaction/continuation behavior still needs additional Lane B verticals
  against the remaining copied QNT obligations.

## 2026-05-27 - Lane B reaction/continuation vertical

- Inspected only cleanroom-local inputs and Rust files:
  `input/packages/shared-algebras/proofs/rule-core/reactions-continuations-concentration.qnt`,
  `reactions-continuations-concentration-examples.qnt`,
  `movement-spatial-grapple.qnt`, SRD 5.2.1 reaction/opportunity attack/Ready
  and Concentration RAW, `UBIQUITOUS_LANGUAGE.md`, and `ASSUMPTIONS.md`.
- Implemented reaction window kinds, suspended-window resume, decline/advance,
  matching reaction choice, reaction quota spending, opportunity attack trigger
  witnesses, readied movement release, minimal movement/grapple facts needed by
  that reaction protocol, and concentration interruption after damage.
- Added `engine/tests/battle_reactions.rs` with QNT-example-derived coverage
  for offer/decline/spend, unavailable reactions, bounded nested windows,
  opportunity attack admission, readied movement, concentration start/end/
  prevention, concentration damage save DCs, and target-specific concentration
  breakage.
- Final `cd engine && cargo test` passed: 1 crate unit test, 41 Lane B battle
  tests, 13 Lane A character-creation tests, and 2 semantic-core smoke tests
  passed.
- Final `cd engine && cargo clippy --all-targets -- -D warnings` passed.
- Cleanroom blocker: no source gap for this reaction/continuation vertical.
  Spell-specific reaction procedures such as Shield, Counterspell, and Hellish
  Rebuke remain unimplemented pending separate QNT-backed verticals.

## 2026-05-27 - Combined-worktree Lane C refresh

- Read the cleanroom manifest, generator-readiness JSONL, level 1-2 QNT/MBT
  join JSON, and current local Rust public APIs/tests only.
- Refreshed `tasks/CLEANROOM_VALIDATION_REPORT.md` after the Fighter Weapon
  Mastery refs and reaction/continuation vertical landed in the shared
  worktree.
- Conservative count: 1 fully implemented, 11 partially implemented, 35 not
  attempted, 0 blocked by source gap.
- Promoted `BATTLE.REACTION.OFFER_DECLINE_RESUME` to implemented based on
  reaction offer/decline/spend, bounded nested windows, suspended-window resume,
  damage interruption, and concentration damage-save coverage.
- Kept `CREATION.WEAPON_MASTERY.CHOICE_FINALIZATION` partial because current
  Rust finalizes Fighter Weapon Mastery refs, while the scoped join rows name
  Paladin/Ranger/Rogue weapon mastery choices.
- `cd engine && cargo test` passed: 57 tests passed, 0 failed.
