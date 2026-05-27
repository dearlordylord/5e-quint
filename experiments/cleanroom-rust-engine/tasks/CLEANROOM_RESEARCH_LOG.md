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

## 2026-05-27 - Lane B wave 3 Spare the Dying vertical

- Targeted named obligation `BATTLE.SPELL.MAKE_STABLE_LIFECYCLE`.
- Inspected only cleanroom-local inputs and Rust files:
  `input/packages/battle-runtime/battle-runtime-hit-points.qnt`,
  `input/packages/battle-runtime/battle-runtime-healing-stabilization-selected-identity.mbt.qnt`,
  `input/packages/battle-runtime/battle-runtime-spell-invocation.qnt`,
  SRD 5.2.1 Spare the Dying and Stable RAW, `UBIQUITOUS_LANGUAGE.md`, and
  `ASSUMPTIONS.md`.
- Implemented Spare the Dying range scaling, target admission for zero-HP
  non-dead death-save targets, explicit `target_within_range` and spell-access
  witness facts, Magic action spending, and Stable lifecycle mutation that
  resets Death Saving Throw successes/failures.
- Added `engine/tests/battle_spare_the_dying.rs` for QNT/RAW-derived range,
  action, admission, rejection, and lifecycle mutation cases.
- Final `cd engine && cargo test` passed: 1 crate unit test, 46 Lane B battle
  tests, 19 Lane A character/sheet tests, and 2 semantic-core smoke tests
  passed.
- Final `cd engine && cargo clippy --all-targets -- -D warnings` passed.
- Obligation status in this cleanroom Rust engine: `BATTLE.SPELL.MAKE_STABLE_LIFECYCLE`
  moved to full for the modeled reducer slice.
- Cleanroom blocker: no source gap found for this obligation.

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

## 2026-05-27 - Lane C wave 3 next queue

- Read the current Lane C validation report plus cleanroom manifest,
  generator-readiness rows, and level 1-2 QNT/MBT join metadata.
- Added `tasks/CLEANROOM_NEXT_QUEUE.md` grouping the 35 not-attempted and 11
  partial scoped obligations into four implementation waves:
  movement/reaction closure, spell procedure/damage profiles, ongoing
  effects/areas/light/protection, and character/sheet projection closure.
- No source gap found while building the queue; gaps remain implementation and
  Rust-test coverage gaps.
- No tests run; this was a documentation-only planning update.

## 2026-05-27 - Lane A wave 3 ability-check proficiency projection

- Inspected copied sheet-projection QNT, scoped obligation metadata, Bard RAW,
  Playing-the-Game/Rules-Glossary RAW, ubiquitous language, and local Rust files
  only.
- Implemented `SHEET.ABILITY_CHECK.PROFICIENCY_BONUS` in
  `engine/src/character_creation.rs` as a focused projection for Performance
  ability-check proficiency bonus facts.
- Covered the QNT fixture cases for Jack of All Trades at Bard level 2,
  rounded-down Jack of All Trades, ordinary skill proficiency, Expertise, the
  no-other-Proficiency-Bonus gate, and missing Bard level 2.
- Added `engine/tests/character_creation_sheet_projections.rs` with six Rust
  tests mirroring those projection outcomes.
- `cd engine && cargo fmt`, `cd engine && cargo test`, and
  `cd engine && cargo clippy --all-targets` all passed.
- Source gap: no gap for the scoped Performance fixture. Broad skill coverage
  still needs either a complete skill enum/source contract or additional QNT
  coverage beyond the single Performance witness before claiming all character
  sheet ability-check proficiency projections.

## 2026-05-27 - Lane C wave 3 coverage refresh

- Read current local Rust APIs/tests plus cleanroom manifest and level 1-2
  QNT/MBT join metadata; no production TypeScript was read.
- Accounted for `engine/tests/battle_spare_the_dying.rs` and
  `engine/tests/character_creation_sheet_projections.rs`.
- Promoted `BATTLE.SPELL.MAKE_STABLE_LIFECYCLE` to implemented because Spare
  the Dying target admission and zero-HP non-dead Stable lifecycle mutation are
  directly modeled and tested.
- Moved `SHEET.ABILITY_CHECK.PROFICIENCY_BONUS` from not-attempted to partial:
  the replay cases are covered, but the Rust surface is still a narrow
  Performance projection rather than a full character-sheet ability-check
  projection domain.
- Conservative count: 2 fully implemented, 11 partially implemented, 34 not
  attempted, 0 blocked by source gap.
- `cd engine && cargo test` passed: 68 tests passed, 0 failed.

## 2026-05-27 - Lane C wave 4 support queue refinement

- Refined `tasks/CLEANROOM_NEXT_QUEUE.md` against the latest committed Lane C
  status: 2 fully implemented, 11 partial, 34 not attempted, and 0 blocked by
  source gap.
- Removed `BATTLE.SPELL.MAKE_STABLE_LIFECYCLE` from the active queue because
  the current cleanroom report marks it fully implemented.
- Marked the best short next slices for A/B as
  `SHEET.ARMOR_CLASS.BASE_FORMULA_CHOICE`,
  `BATTLE.SPELL.REACTION_CASTING_TIME`,
  `BATTLE.SPELL.HIT_POINT_RESTORATION`,
  `CREATION.WEAPON_MASTERY.CHOICE_FINALIZATION`, and
  `BATTLE.COMMAND.OPTION_AND_NEXT_TURN`, with Sanctuary as a backup Lane B
  slice.
- Noted active concurrent Lane A armor-class and Lane B spell-profile work in
  the shared log; the queue now tells implementers to treat those as Lane C
  refresh inputs if they land before the next slice is picked.
- No Rust files were edited and no tests were run; this was a documentation-only
  planning update.

## 2026-05-27 - Lane A wave 4 armor-class base formula projection

- Used Wave 4 from `tasks/CLEANROOM_NEXT_QUEUE.md` and targeted
  `SHEET.ARMOR_CLASS.BASE_FORMULA_CHOICE`.
- Inspected only cleanroom-local copied QNT/RAW and Rust files:
  `character-sheet-armor-class-base-selected-identity.mbt.qnt`, Barbarian and
  Monk SRD RAW for Unarmored Defense, Character Creation AC RAW, Equipment
  Shield RAW, ubiquitous language, and scoped obligation metadata.
- Implemented `project_armor_class_base_formula` in
  `engine/src/character_creation.rs` for default unarmored AC, Barbarian
  Unarmored Defense with optional Shield bonus, and Monk Unarmored Defense
  without Shield.
- Added `engine/tests/character_sheet_armor_class.rs` with four tests mirroring
  the QNT default and selected-identity cases.
- `cd engine && cargo fmt`, `cd engine && cargo test`, and
  `cd engine && cargo clippy --all-targets` all passed.
- Obligation status: partial. The scalar formula projections in the copied QNT
  fixture are covered, but the broader obligation title includes selection from
  build/loadout/class-feature facts; Rust still receives the selected formula
  and Shield bonus as explicit inputs rather than deriving them from a full
  CharacterBuild/loadout state.
- Source gap: no source gap for the scoped scalar fixture. A full claim needs a
  machine-readable build/loadout AC admission contract or QNT that models the
  selector from armor, Shield, and competing class-feature formulas.

## 2026-05-27 - Lane B wave 4 spell procedure resource profile

- Used Wave 2 from `tasks/CLEANROOM_NEXT_QUEUE.md` and targeted
  `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`.
- Inspected only cleanroom-local copied QNT/RAW and Rust files:
  `spell-slot-expenditure.qnt`, `spell-invocation-resource-core.qnt`,
  `spell-invocation-target-cardinality-core.qnt`,
  `spell-invocation-action-slot-core.qnt`, `spell-definition-profiles.qnt`,
  `spell-procedure-profiles-examples.qnt`, `rule-core-spells.mbt.qnt`,
  SRD 5.2.1 spell slots/casting time/targets RAW, and ubiquitous language.
- Implemented spell slot ledger/expenditure, one slot-spell per turn gating,
  slotless cantrip admission, action-time vs Bonus Action spell costs, target
  cardinality profiles, invalid-target resource expenditure, and the small
  cleanroom spell definition profile set used by the QNT resource core.
- Added `engine/tests/battle_spell_profiles.rs` with eight tests covering
  Magic Missile slot-scaled target cardinality, Ray of Frost slotless casting,
  Healing Word Bonus Action cost, Mass Healing Word slot/target gates, invalid
  targets, rejected missing access/wrong slot/bad target count, and slot result
  helper behavior.
- Final `cd engine && cargo fmt`, `cd engine && cargo test`, and
  `cd engine && cargo clippy --all-targets -- -D warnings` passed.
- Obligation status in this cleanroom Rust engine: partial for
  `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`. This covers the generic
  resource/action/slot/cardinality reducer core, but not every listed spell
  procedure profile, reaction spell, readied spell, rider, or sequence owner in
  the broad scoped obligation.
- Source gap: no source gap for the implemented resource profile slice.

## 2026-05-27 - Lane C wave 4 coverage refresh

- Read current local Rust APIs/tests plus cleanroom manifest, generator-readiness
  rows, and level 1-2 QNT/MBT join metadata; no production TypeScript was read.
- Accounted for `engine/tests/battle_spell_profiles.rs` and
  `engine/tests/character_sheet_armor_class.rs`.
- Moved `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` from not-attempted to
  partial: current Rust covers resource/action/slot/cardinality behavior for a
  small profile set, while the scoped obligation spans the broader spell
  procedure matrix.
- Moved `SHEET.ARMOR_CLASS.BASE_FORMULA_CHOICE` from not-attempted to partial:
  current Rust covers selected formula projection cases, but not derivation of
  the selected formula from full CharacterBuild/loadout/class-feature facts.
- Conservative count: 2 fully implemented, 13 partially implemented, 32 not
  attempted, 0 blocked by source gap.
- `cd engine && cargo test` passed: 80 tests passed, 0 failed.

## 2026-05-27 - Lane C wave 5 support queue refresh

- Refined `tasks/CLEANROOM_NEXT_QUEUE.md` against the wave 4 Lane C status:
  2 fully implemented, 13 partial, 32 not attempted, and 0 blocked by source
  gap.
- Removed newly partial `SHEET.ARMOR_CLASS.BASE_FORMULA_CHOICE` from the ranked
  top slots and marked it as a deepening-only follow-up unless A/B chooses to
  model full build/loadout/class-feature formula selection.
- Marked `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` as partial in the spell
  procedure wave and reframed that wave around remaining damage branches,
  sequences, and riders.
- Current top queue is `BATTLE.COMMAND.OPTION_AND_NEXT_TURN`,
  `BATTLE.SANCTUARY.TARGETING_INTERDICTION`,
  `SHEET.WEAPON_MASTERY.RESELECTION`,
  `BATTLE.SPELL.REACTION_CASTING_TIME`, and
  `BATTLE.SPELL.HIT_POINT_RESTORATION`.
- No Rust files were edited and no tests were run; this was a documentation-only
  planning update.

## 2026-05-27 - Lane A wave 5 spell slot and Pact Slot transitions

- Targeted `SHEET.SPELL_SLOTS_PACT_SLOTS.TRANSITIONS` from the Wave 4 queue.
- Inspected only cleanroom-local copied QNT/RAW and Rust files:
  `input/packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt`,
  `input/.references/srd-5.2.1/Spells/Gaining-and-Casting.md`,
  `input/.references/srd-5.2.1/Rules-Glossary.md`,
  `input/.references/srd-5.2.1/Classes/Wizard.md`,
  `input/.references/srd-5.2.1/Classes/Warlock.md`,
  Sorcerer RAW for created Spell Slot expiry, ubiquitous language, and scoped
  obligation metadata.
- Implemented fixture-supported slot facts and transitions in
  `engine/src/character_creation.rs`: sheet slot state admission, Short Rest
  Pact Slot recovery, Arcane Recovery level 2 refund, Long Rest ordinary/Pact
  restoration with created level 1 slot expiry, interrupted-rest outcomes, and
  Magical Cunning Pact Slot recovery.
- Added `engine/tests/character_sheet_resources.rs` with eleven tests mirroring
  the deterministic QNT replay cases and exact rejection messages.
- `cd engine && cargo fmt`, `cd engine && cargo test`, and
  `cd engine && cargo clippy --all-targets -- -D warnings` all passed.
- Obligation status: partial. The copied QNT owner is explicitly fixture-bound,
  and Rust now covers those transition fixtures, but this is not yet a full
  arbitrary character-sheet resource engine.
- Source gaps: full coverage still needs a machine-readable contract deriving
  expected Spell Slot and Pact Slot capacities from complete build/class facts,
  a generic Arcane Recovery choice model beyond the level 2 fixture, and created
  Spell Slot state for levels beyond the copied level 1 fixture.

## 2026-05-27 - Lane A overnight feature-resource transitions

- Targeted `SHEET.FEATURE_RESOURCES.TRANSITIONS` from the A-owned queue.
- Inspected only cleanroom-local copied QNT/RAW and Rust files:
  `input/packages/character-battle-runtime/character-sheet-feature-resources.mbt.qnt`,
  Paladin Lay On Hands RAW, Druid Wild Shape RAW, Monk Focus and Uncanny
  Metabolism RAW, Sorcerer Font of Magic and Metamagic RAW, Short/Long Rest RAW,
  ubiquitous language, and scoped obligation metadata.
- Implemented fixture-supported feature-resource facts and transitions in
  `engine/src/character_creation.rs`: Lay On Hands spend/heal/Poisoned removal
  admission, Long Rest resource resets, Short Rest Wild Shape and Monk Focus
  recovery, Font of Magic ordinary-slot-to-points and points-to-level-3-slot
  transitions, Uncanny Metabolism Initiative recovery, and Metamagic shared
  Sorcery Point pool projection.
- Extended `engine/tests/character_sheet_resources.rs` with fourteen
  feature-resource tests mirroring the deterministic QNT replay cases and exact
  rejection messages.
- `cd engine && cargo fmt`, `cd engine && cargo test`, and
  `cd engine && cargo clippy --all-targets -- -D warnings` all passed.
- Obligation status: partial. The copied QNT owner is a deterministic replay
  fixture and the Rust implementation covers those named cases; it is not yet a
  full generic feature-resource engine for every class feature.
- Source gaps: full coverage still needs build-derived feature resource
  capacities, a general Font of Magic spell-slot source/cost model for all
  supported spell levels, broader Lay On Hands condition-removal coverage, and a
  battle handoff contract for Metamagic beyond shared Sorcery Point expenditure.

## 2026-05-27 - Lane A overnight weapon mastery reselection

- Targeted `SHEET.WEAPON_MASTERY.RESELECTION` from the A-owned queue.
- Inspected only cleanroom-local copied QNT/RAW and Rust files:
  `input/packages/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.mbt.qnt`,
  Fighter/Barbarian/Paladin/Ranger/Rogue Weapon Mastery RAW, Equipment mastery
  RAW, Long Rest RAW, ubiquitous language, and scoped obligation metadata.
- Implemented typed sheet Weapon Mastery projection in
  `engine/src/character_creation.rs` for Paladin, Ranger, and Rogue selected
  two-weapon containers plus Long Rest reselection changed-choice counts.
- Added `engine/tests/character_sheet_projection.rs` with six tests mirroring
  the deterministic QNT selected/reselected identity cases and emitted unit ref
  strings.
- `cd engine && cargo fmt`, `cd engine && cargo test`, and
  `cd engine && cargo clippy --all-targets -- -D warnings` all passed.
- Obligation status: partial. The copied QNT fixture covers Paladin, Ranger,
  and Rogue two-choice projections and Long Rest reselection counts; Rust now
  covers those cases but not a full Surface eligibility/catalog pipeline.
- Source gaps: full coverage still needs machine-readable weapon eligibility
  facts for the complete weapon table and all Weapon Mastery classes, plus a
  sheet state contract for applying exactly the RAW-permitted Long Rest changes
  against an existing finalized CharacterBuild.

## 2026-05-27 - Lane A overnight class-feature resource/source projections

- Targeted paired obligations `CREATION.CLASS_FEATURE_RESOURCE.PROJECTION` and
  `CREATION.CLASS_FEATURE_SOURCE_FACT.PROJECTION`.
- Inspected only cleanroom-local copied QNT/RAW and Rust files:
  `input/packages/character-creation-runtime/character-creation-class-feature-projections.mbt.qnt`,
  Monk Martial Arts/Monk's Focus/Uncanny Metabolism RAW, Sorcerer Font of Magic
  and Metamagic RAW, relevant Cleric/Druid resource RAW named by the obligation
  metadata, ubiquitous language, and scoped obligation metadata.
- Implemented typed resource and source-fact projections in
  `engine/src/character_creation.rs` for the copied level 2 Monk and Sorcerer
  fixtures: Monk Focus use-count resource linked to Uncanny Metabolism and the
  Martial Arts die, and Sorcerer Font of Magic point pool linked to Metamagic
  option facts.
- Added `engine/tests/character_creation_projection.rs` with two tests mirroring
  the deterministic QNT replay fields and exact source-fact string identities.
- `cd engine && cargo fmt`, `cd engine && cargo test`, and
  `cd engine && cargo clippy --all-targets -- -D warnings` all passed.
- Obligation status: partial for both obligations. The copied QNT fixture covers
  Monk level 2 and Sorcerer level 2 projections; it does not cover every class
  feature resource/source fact named by the broad obligation metadata.
- Source gaps: full coverage still needs a machine-readable retained
  Surface-class-feature input contract and projection fixtures for Cleric
  Channel Divinity, Druid Wild Shape/Wild Companion, higher-level Monk Focus
  progression, higher-level Sorcery Point and Metamagic option progression, and
  replacement of Metamagic options on Sorcerer level gain.

## 2026-05-27 - Lane A overnight Rogue Expertise choice finalization

- Targeted `CREATION.SKILL_EXPERTISE.CHOICE_FINALIZATION` from the A-owned
  queue.
- Inspected only cleanroom-local copied QNT/RAW and Rust files:
  `input/packages/character-creation-runtime/character-creation-rogue-expertise-selected-identity.mbt.qnt`,
  Rogue Expertise RAW, Rules Glossary Expertise RAW, Bard/Ranger/Wizard
  Expertise RAW named by the obligation metadata, ubiquitous language, and
  scoped obligation metadata.
- Implemented typed Rogue Expertise finalization in
  `engine/src/character_creation.rs` as a set of Expertise skills linked to the
  `rogue_expertise` feature unit, deriving selected/build Expertise counts from
  the set rather than storing duplicate booleans.
- Extended `engine/tests/character_creation_projection.rs` with two tests for
  the level 1 two-choice and level 6 four-choice QNT fixtures.
- `cd engine && cargo fmt` passed. Focused A-owned tests passed:
  `cargo test --test character_creation_projection --test character_sheet_projection --test character_sheet_resources --test character_creation_sheet_projections --test character_creation_draft --test character_sheet_armor_class`.
  `cd engine && cargo clippy --all-targets -- -D warnings` passed.
- Full `cd engine && cargo test` is blocked by an unrelated B-owned failure in
  `tests/battle_reaction_spells.rs::counterspell_reaction_rejects_wrong_trigger_spent_reaction_or_missing_slot`.
- Obligation status: partial. The copied QNT fixture covers Rogue level 1 and
  level 6 selected-identity outcomes; it does not cover the full cross-class
  Expertise scope named by the obligation metadata.
- Source gaps: full coverage still needs a machine-readable owned-skill
  proficiency contract, rejection fixtures for selecting unowned or repeated
  Expertise skills, and fixtures for Bard, Ranger, and Wizard Expertise choices.

## 2026-05-27 - Lane B wave 5 spell Hit Point restoration

- Targeted `BATTLE.SPELL.HIT_POINT_RESTORATION` from the queue.
- Inspected only cleanroom-local copied QNT/RAW and Rust files:
  `spell-hit-point-restoration-core.qnt`, `rule-core-spells.mbt.qnt`, SRD
  5.2.1 Cure Wounds, Healing Word, Mass Cure Wounds, Mass Healing Word, healing
  and zero-Hit-Point RAW, and ubiquitous language for Hit Points and Death.
- Added spell-level direct Hit Point restoration projection on top of the
  existing spell invocation and direct healing reducers. The new projection
  derives spell target count and target validity from explicit per-target
  witness facts for caster selection and spatial requirements.
- Added `engine/tests/battle_spell_hit_point_restoration.rs` covering Healing
  Word wounded and zero-Hit-Point targets, Mass Healing Word and Mass Cure
  Wounds multi-target projection, invalid explicit spatial witness resource
  spending without healing, and missing target / illegal healing-roll rejection
  without spending.
- Final `cd engine && cargo fmt`, `cd engine && cargo test`, and
  `cd engine && cargo clippy --all-targets -- -D warnings` passed.
- Obligation status: partial for `BATTLE.SPELL.HIT_POINT_RESTORATION`. The Rust
  engine now covers slot/action/target-cardinality gating, explicit target
  witness validity, healing roll legality, zero-Hit-Point recovery, and
  multi-target healing projection for the cleanroom profiles. It still does not
  model a full battle command hole frontier or authored target picker; callers
  supply target witness facts directly.
- Source gap: no cleanroom source gap for the implemented slice.

## 2026-05-27 - Lane B overnight command option and next turn

- Targeted `BATTLE.COMMAND.OPTION_AND_NEXT_TURN` from the B-owned queue.
- Inspected only cleanroom-local copied QNT/RAW and Rust files:
  `battle-runtime-command-choice.qnt`, the Command portion of
  `battle-runtime-ground-command.qnt`, SRD 5.2.1 Command spell text, and
  existing local Rust action/movement/reaction helpers.
- Implemented Command spell admission using the existing spell invocation
  reducer, slot-scaled target cardinality, selected-target failure facts, and
  pending-effect counts. Added next-turn follow behavior for Grovel, Drop,
  Halt, Approach, and Flee, including explicit movement route facts and an
  opportunity-attack continuation window for Flee.
- Added `engine/tests/battle_command.rs` with seven tests covering slot-scaled
  target count, invalid target resource spending without pending effects,
  Grovel Prone/end-turn cleanup, Drop object count/end-turn cleanup, Halt
  action/Bonus Action/movement suppression, Approach movement/end-turn
  outcomes, and Flee all-remaining-movement / opportunity continuation.
- Final `cd engine && cargo fmt`, `cd engine && cargo test`, and
  `cd engine && cargo clippy --all-targets -- -D warnings` passed.
- Obligation status: partial for `BATTLE.COMMAND.OPTION_AND_NEXT_TURN`. The Rust
  engine covers the QNT option outcomes and a compact spell admission/pending
  projection, but still does not model full BattleState actor identity,
  initiative-round expiry, or item inventory mutation beyond table-supplied held
  object count.
- Source gap: no cleanroom source gap for the implemented slice.

## 2026-05-27 - Lane B overnight Sanctuary targeting interdiction

- Targeted `BATTLE.SANCTUARY.TARGETING_INTERDICTION` from the B-owned queue.
- Inspected only cleanroom-local copied QNT/RAW and Rust files:
  `battle-runtime-sanctuary.qnt`,
  `battle-runtime-sanctuary-selected-identity.mbt.qnt`, SRD 5.2.1 Sanctuary
  spell text, and existing local Rust spell invocation helpers.
- Implemented Sanctuary spell ward creation through the spell invocation reducer,
  the 1-minute duration projection, direct attack / damaging spell targeting
  interdiction, area-effect exclusion, replacement target admission with an
  explicit table witness, lose-attack-or-spell outcome, and early ward end when
  the warded creature makes an attack roll, casts a spell, or deals damage.
- Added `engine/tests/battle_sanctuary.rs` with six tests covering ward creation,
  invalid target resource spending without ward creation, direct targeting save
  request and loss/pass-through, legal replacement, illegal replacement, area
  exclusion, and early-end triggers.
- Final `cd engine && cargo fmt`, `cd engine && cargo test`, and
  `cd engine && cargo clippy --all-targets -- -D warnings` passed.
- Obligation status: partial for `BATTLE.SANCTUARY.TARGETING_INTERDICTION`. The
  Rust engine covers the compact ward/interdiction semantics and target-action
  early end, but not full BattleState active-effect sets, source actor identity
  beyond a Sanctuary-source witness, or interaction with other direct condition
  effects such as Invisibility cleanup.
- Source gap: no cleanroom source gap for the implemented slice.

## 2026-05-27 - Lane B overnight reaction casting time

- Targeted `BATTLE.SPELL.REACTION_CASTING_TIME` from the B-owned queue.
- Inspected only cleanroom-local copied QNT/RAW and Rust files:
  `battle-runtime-reaction-casting-time.mbt.qnt`,
  `battle-runtime-reaction-window.qnt`, `battle-runtime-spell-invocation.qnt`,
  SRD 5.2.1 Counterspell, Hellish Rebuke, and Casting Time / Reaction trigger
  text, plus existing local Rust reaction, spell slot, and damage helpers.
- Implemented a reaction-spell invocation helper that spends Reaction and spell
  slot resources together with trigger-specific admission. Added Counterspell
  branches for ending the triggering spell without expending its slot or allowing
  the triggering spell to resume and expend its slot. Added Hellish Rebuke
  after-damage resolution with slot scaling and saving-throw half damage.
- Added `engine/tests/battle_reaction_spells.rs` with five tests covering
  Counterspell end/resume/rejection branches and Hellish Rebuke after-damage,
  successful-save half damage, and bad-trigger rejection.
- Final `cd engine && cargo fmt`, `cd engine && cargo test --test
  battle_reaction_spells`, `cd engine && cargo test`, and `cd engine && cargo
  clippy --all-targets -- -D warnings` passed.
- Obligation status: partial for `BATTLE.SPELL.REACTION_CASTING_TIME`. The Rust
  engine covers the reaction spell trigger/resource/continuation outcomes from
  the cleanroom MBT, but not full interrupt-stack nesting, offered-reactor sets,
  nested Counterspell-on-Counterspell, or BattleState actor slot-use sets.
- Source gap: no cleanroom source gap for the implemented slice.

## 2026-05-27 - Lane B overnight roll modifier active effects

- Targeted `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS` from the B-owned queue.
- Inspected only cleanroom-local copied QNT/RAW and Rust files:
  `battle-runtime-roll-modifier-choice.qnt`, `battle-runtime-thaumaturgy.qnt`,
  `battle-runtime-roll-modifier-buff-selected-identity.mbt.qnt`, SRD 5.2.1
  Bane, Bless, Guidance, Pass without Trace, Enhance Ability, Enthrall,
  Thaumaturgy, and Advantage/Disadvantage RAW, plus ubiquitous language.
- Implemented roll-modifier active-effect projection for Bane, Bless, Guidance,
  Pass without Trace, Enhance Ability, Enthrall, and Thaumaturgy Booming Voice.
  Added d4 roll delta application for Bane/Bless/Guidance, fixed Stealth and
  Perception deltas, passive Perception delta projection, and Thaumaturgy
  one-minute effect count / Charisma (Intimidation) Advantage projection.
- Added `engine/tests/battle_roll_modifiers.rs` with five tests covering
  Bless/Bane attack and save d4 modifiers, Guidance selected-skill ability check
  bonus, fixed Stealth/Passive Perception deltas, Enhance Ability selected
  ability projection, and Thaumaturgy Booming Voice count and roll mode.
- Final `cd engine && cargo fmt`, `cd engine && cargo test`, and
  `cd engine && cargo clippy --all-targets -- -D warnings` passed.
- Obligation status: partial for `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS`.
  The Rust engine covers the compact active-effect projections and d20 modifier
  semantics from the cleanroom QNT, but not full spell casting admission,
  concentration lifecycle, multi-target active-effect ownership, or all
  runtime-selected profile identities.
- Source gap: no cleanroom source gap for the implemented slice.

## 2026-05-27 - Lane C wave 5 coverage refresh

- Read current local Rust APIs/tests plus cleanroom manifest, generator-readiness
  rows, and level 1-2 QNT/MBT join metadata; no production TypeScript was read.
- Accounted for `engine/tests/battle_spell_hit_point_restoration.rs` and
  `engine/tests/character_sheet_resources.rs`.
- Kept `BATTLE.SPELL.HIT_POINT_RESTORATION` partial: the Rust engine now covers
  spell invocation integration, target cardinality, target witness validity,
  healing-roll legality, zero-Hit-Point recovery, and multi-target projection,
  but not full command target-selection holes or authored target-picking
  frontier behavior.
- Moved `SHEET.SPELL_SLOTS_PACT_SLOTS.TRANSITIONS` from not-attempted to
  partial: Rust covers the copied sheet slot/Pact Slot transition fixtures, but
  not a generic character-sheet resource engine derived from complete
  build/class facts.
- Conservative count: 2 fully implemented, 14 partially implemented, 31 not
  attempted, 0 blocked by source gap.
- `cd engine && cargo test` passed: 97 tests passed, 0 failed.

## 2026-05-27 - Lane B overnight scalar buff active effects

- Targeted `BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS` from the B-owned queue.
- Inspected only cleanroom-local copied QNT/RAW and Rust files:
  `spell-scalar-buff-projection-core.qnt`,
  `battle-runtime-restoration-and-buffs.qnt`,
  `battle-runtime-scalar-buff-active-effects.mbt.qnt`, SRD 5.2.1 Aid,
  Barkskin, False Life, Fly, Longstrider, Shield of Faith, Spider Climb,
  Temporary Hit Points, Fly Speed, and ubiquitous language.
- Implemented scalar-buff spell profiles, slot floors, action costs, target
  scaling, willing-target admission facts, active-effect projections for
  Armor Class, Speed, Climb Speed, Fly Speed, Hit Point maximum/current Hit
  Points, and Temporary Hit Points.
- Added explicit table witness inputs for target validity, target willingness,
  False Life dice, and Temporary Hit Point choice. Aid uses the highest active
  Hit Point maximum increase amount rather than stacking repeated lower effects.
- Added `engine/tests/battle_scalar_buffs.rs` with six tests covering profile
  facts, the focused MBT projection values, willing/spatial target witnesses,
  Barkskin and Fly projections, Aid upcast/non-stacking max increase, and False
  Life dice/Temporary Hit Point choice.
- Final `cd engine && cargo fmt`, `cd engine && cargo test --test
  battle_scalar_buffs`, `cd engine && cargo test`, and `cd engine && cargo
  clippy --all-targets -- -D warnings` passed.
- Obligation status: partial for `BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS`. The
  Rust engine covers the scalar projection and compact spell-admission
  semantics for the cleanroom-supported spells, but not full BattleState
  multi-actor active-effect ownership, concentration cleanup/fall frames for
  ended Fly, or timed duration ticking/removal.
- Source gap: no cleanroom source gap for the implemented slice.

## 2026-05-27 - Lane B overnight Blindness/Deafness save-gated condition

- Targeted a scoped vertical under
  `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE` from the B-owned queue.
- Inspected only cleanroom-local copied QNT/RAW and Rust files:
  `spell-save-condition-projection-core.qnt`,
  `battle-runtime-save-gated-spell.qnt`,
  `battle-runtime-condition-saving-throw-selected-identity.mbt.qnt`, SRD 5.2.1
  Blindness/Deafness, Blinded, Deafened, and ubiquitous language.
- Implemented the Blindness/Deafness spell profile as an action, level-2
  slot-spending save-gated condition spell with slot-scaled target cardinality
  and Constitution Saving Throw profile facts.
- Added chosen-condition active effects for Blinded or Deafened, explicit source
  identity for cleanup, failed-save application, successful-save no-condition
  branch, target-validity witness handling, and end-turn repeat-save cleanup for
  the matching source/condition choice.
- Added `engine/tests/battle_save_gated_conditions.rs` with seven tests covering
  profile facts, Blinded and Deafened failed-save branches, successful initial
  save, explicit invalid-target witness, illegal slot/target count rejection,
  and repeat-save cleanup that preserves nonmatching source/choice effects.
- Final `cd engine && cargo fmt`, `cd engine && cargo test --test
  battle_save_gated_conditions`, `cd engine && cargo test`, and `cd engine &&
  cargo clippy --all-targets -- -D warnings` passed.
- Obligation status: partial for `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE`.
  The Rust engine covers Blindness/Deafness condition choice, failed-save active
  effect, resource admission, and repeat-save cleanup, but not Color Spray,
  Entangle, Animal Friendship, Charm Person, Hold Person, Hideous Laughter, or
  full BattleState multi-target turn ownership.
- Source gap: no cleanroom source gap for the implemented slice.

## 2026-05-27 - Lane B overnight spell damage branches

- Targeted a scoped vertical under
  `BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES` from the B-owned queue.
- Inspected only cleanroom-local copied QNT/RAW and Rust files for spell damage
  projection and spell attack/save damage branch behavior.
- Added spell attack damage profile helpers, hit/miss/Critical Hit branch
  resolution, damage-type projection, object-target support facts, save-gated
  damage profile helpers, full/half/no-damage save branches, and failed-save
  rider projections.
- Added `engine/tests/battle_spell_damage.rs` covering spell attack profile
  facts, hit/miss/Critical Hit dice handling, save-gated targeting policies,
  damage type, slot/concentration flags, full/half/no-damage branches, and
  negative damage-roll rejection.
- Obligation status: partial for `BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES`.
  The Rust engine covers the focused branch helpers, but not full spell
  invocation sequencing, all joined spell/profile rows, or unit-feature
  save-damage integration.
- Source gap: no cleanroom source gap for the implemented slice.

## 2026-05-27 - Lane C large integration batch coverage refresh

- Read current local Rust APIs/tests plus cleanroom manifest, generator-readiness
  rows, and level 1-2 QNT/MBT join metadata; no production TypeScript was read.
- Accounted for current uncommitted tests/APIs:
  `battle_command.rs`, `battle_sanctuary.rs`, `battle_reaction_spells.rs`,
  `battle_roll_modifiers.rs`, `battle_save_gated_conditions.rs`,
  `battle_scalar_buffs.rs`, `battle_spell_damage.rs`,
  `character_creation_projection.rs`, `character_sheet_projection.rs`, and the
  expanded `character_sheet_resources.rs`.
- Moved these obligations from not-attempted to partial:
  `BATTLE.COMMAND.OPTION_AND_NEXT_TURN`,
  `BATTLE.SANCTUARY.TARGETING_INTERDICTION`,
  `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS`,
  `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE`,
  `BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS`,
  `CREATION.CLASS_FEATURE_RESOURCE.PROJECTION`,
  `CREATION.CLASS_FEATURE_SOURCE_FACT.PROJECTION`,
  `CREATION.SKILL_EXPERTISE.CHOICE_FINALIZATION`,
  `SHEET.FEATURE_RESOURCES.TRANSITIONS`, and
  `SHEET.WEAPON_MASTERY.RESELECTION`.
- Kept `BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES`,
  `BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION`,
  `BATTLE.SPELL.REACTION_CASTING_TIME`, and
  `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` partial with stronger evidence but
  not full scoped coverage.
- Conservative count: 2 fully implemented, 24 partially implemented, 21 not
  attempted, 0 blocked by source gap.
- `cd engine && cargo test` passed: 162 tests passed, 0 failed.
