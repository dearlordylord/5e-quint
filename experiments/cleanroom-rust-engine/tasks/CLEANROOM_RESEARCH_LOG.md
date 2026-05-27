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
