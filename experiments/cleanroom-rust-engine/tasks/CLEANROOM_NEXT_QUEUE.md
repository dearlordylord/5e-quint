# Cleanroom Next Queue

Purpose: keep Lane A/B implementation moving from the latest Lane C coverage
map. Current cleanroom status is 2 fully implemented, 11 partial, 34 not
attempted, and 0 blocked by source gap. Coverage claims should stay
conservative until Lane C refreshes counts after implementation.

Already full; do not schedule unless regressions appear:

- `BATTLE.REACTION.OFFER_DECLINE_RESUME`
- `BATTLE.SPELL.MAKE_STABLE_LIFECYCLE`

## Best Next Short Slices

These are the best first picks after A/B wave 4 work because each has local
source evidence, a narrow expected Rust test surface, and a clear coverage gain.
The status basis is the latest committed Lane C map. If the active Lane A armor
class work lands first, treat rank 1 as a Lane C refresh item and start
implementation at ranks 2-5.

| Rank | Lane | Obligation | Why it is a good next slice | Likely source files | Expected Rust tests |
| --- | --- | --- | --- | --- | --- |
| 1 | A | `SHEET.ARMOR_CLASS.BASE_FORMULA_CHOICE` | Best from the committed baseline: not attempted, deterministic scalar projection, no battle reducer dependency. Skip as implementation work if Lane A's active AC slice has already landed. | `input/packages/character-sheet-runtime/character-sheet-armor-class-base-selected-identity.mbt.qnt` | Add or validate `engine/tests/character_sheet_projection.rs` / `engine/tests/character_sheet_armor_class.rs` cases for Barbarian/Monk/class-feature/loadout AC base formula selected refs. |
| 2 | B | `BATTLE.SPELL.REACTION_CASTING_TIME` (partial) | Builds directly on the finished reaction/continuation vertical and can close concrete reaction-spell trigger/slot-ledger behavior. | `input/packages/battle-runtime/battle-runtime-reaction-window.qnt`, `input/packages/battle-runtime/battle-runtime-spell-invocation.qnt`, `input/packages/battle-runtime/battle-runtime-reaction-casting-time.mbt.qnt` | Extend `engine/tests/battle_reactions.rs` or add `engine/tests/battle_reaction_spells.rs` for spell-cast and after-damage triggers, Reaction spend, slot spend, interruption, and resume. |
| 3 | B | `BATTLE.SPELL.HIT_POINT_RESTORATION` (partial) | Existing healing core is close; remaining gap is target-selection holes and multi-target projection. | `input/packages/shared-algebras/proofs/rule-core/spell-hit-point-restoration-core.qnt`, `input/packages/battle-runtime/rule-core-spells.mbt.qnt` | Extend `engine/tests/battle_hit_points.rs` or add `engine/tests/battle_spell_restoration.rs` for healing-roll holes, zero-HP recovery, and multi-target healing. |
| 4 | A | `CREATION.WEAPON_MASTERY.CHOICE_FINALIZATION` (partial) | Current Rust covers Fighter refs, but scoped rows require Paladin/Ranger/Rogue selected CharacterBuild class-choice refs. | `input/packages/character-creation-runtime/character-creation-weapon-mastery-containers-selected-identity.mbt.qnt` | Extend `engine/tests/character_creation_draft.rs` or add `engine/tests/character_creation_projection.rs` for the scoped class containers. |
| 5 | B | `BATTLE.COMMAND.OPTION_AND_NEXT_TURN` | Generation-subset clean and standalone enough to add command option effects without pulling in the larger spell profile matrix. | `input/packages/battle-runtime/battle-runtime-command-choice.qnt`, `input/packages/battle-runtime/battle-runtime-ground-command.qnt` | Add `engine/tests/battle_command.rs` for Halt/Grovel/Flee/Drop-style option effects and next-turn consequences. |

Backup short slice if Lane B wants an active-effect target rule instead of
Command: `BATTLE.SANCTUARY.TARGETING_INTERDICTION`, using
`input/packages/battle-runtime/battle-runtime-sanctuary.qnt` and focused tests
for ward creation, direct-target interdiction, replacement target selection,
area-effect exclusion, and early end.

## Wave 1 - Short Projection And Reaction Closure

Goal: close small, high-signal partials and deterministic projections before
starting the larger spell-profile matrix.

Obligations:

- `SHEET.ARMOR_CLASS.BASE_FORMULA_CHOICE`
- `SHEET.ABILITY_CHECK.PROFICIENCY_BONUS` (partial)
- `CREATION.WEAPON_MASTERY.CHOICE_FINALIZATION` (partial)
- `SHEET.WEAPON_MASTERY.RESELECTION`
- `BATTLE.SPELL.REACTION_CASTING_TIME` (partial)
- `BATTLE.SPELL.HIT_POINT_RESTORATION` (partial)
- `BATTLE.COMMAND.OPTION_AND_NEXT_TURN`
- `BATTLE.SANCTUARY.TARGETING_INTERDICTION`

Likely source files:

- `input/packages/character-sheet-runtime/character-sheet-armor-class-base-selected-identity.mbt.qnt`
- `input/packages/character-sheet-runtime/character-sheet-ability-check-proficiency-bonus.mbt.qnt`
- `input/packages/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.mbt.qnt`
- `input/packages/character-creation-runtime/character-creation-weapon-mastery-containers-selected-identity.mbt.qnt`
- `input/packages/battle-runtime/battle-runtime-reaction-window.qnt`
- `input/packages/battle-runtime/battle-runtime-spell-invocation.qnt`
- `input/packages/battle-runtime/battle-runtime-reaction-casting-time.mbt.qnt`
- `input/packages/shared-algebras/proofs/rule-core/spell-hit-point-restoration-core.qnt`
- `input/packages/battle-runtime/battle-runtime-command-choice.qnt`
- `input/packages/battle-runtime/battle-runtime-ground-command.qnt`
- `input/packages/battle-runtime/battle-runtime-sanctuary.qnt`

Expected Rust tests:

- `engine/tests/character_sheet_projection.rs` for AC base formula, broader
  ability-check proficiency projection, and weapon mastery reselection.
- `engine/tests/character_creation_projection.rs` for Paladin/Ranger/Rogue
  weapon mastery finalization.
- `engine/tests/battle_reaction_spells.rs`, `engine/tests/battle_command.rs`,
  and `engine/tests/battle_spell_restoration.rs` for the battle slices above.

## Wave 2 - Movement And Turn-Command Expansion

Goal: complete movement resource/frontier behavior and spell-owned movement
replacement after the small reaction/command slices are stable.

Obligations:

- `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND` (partial)
- `BATTLE.SPELL.FORCED_REACTION_MOVEMENT_LIFECYCLE` (partial)
- `BATTLE.SPELL.EXPEDITIOUS_RETREAT_DASH_LIFECYCLE` (partial)
- `BATTLE.SPELL.FEATHER_FALL_MITIGATION_LIFECYCLE`
- `BATTLE.SPELL.JUMP_MOVEMENT_REPLACEMENT_LIFECYCLE`

Likely source files:

- `input/packages/shared-algebras/proofs/rule-core/movement-spatial-grapple.qnt`
- `input/packages/shared-algebras/proofs/rule-core/reactions-continuations-concentration.qnt`
- `input/packages/battle-runtime/battle-runtime-movement.qnt`
- `input/packages/battle-runtime/battle-runtime-feather-fall.qnt`
- `input/packages/battle-runtime/battle-runtime-jump-movement.qnt`

Expected Rust tests:

- Add or extend `engine/tests/battle_movement.rs` for Stand/Drop Prone,
  Grapple/Escape/Release, forced movement admission, no-movement fallback,
  Expeditious Retreat, Feather Fall, and Jump replacement.

## Wave 3 - Spell Procedure, Damage, And Riders

Goal: promote existing attack/damage helpers into spell/profile-level reducers
for slots, target cardinality, attack/save branches, and riders.
If Lane B's active spell resource/profile slice lands first, treat
`BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` as a Lane C partial-refresh item and
start new implementation at the damage branches, sequences, and riders below.

Obligations:

- `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`
- `BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES` (partial)
- `BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION` (partial)
- `BATTLE.SPELL.INDEPENDENT_ATTACK_SEQUENCE`
- `BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE`
- `BATTLE.SPELL.SAVE_GATED_ATTACK_ROLL_ADVANTAGE`
- `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE`
- `BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS`
- `BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS`
- `BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER`

Likely source files:

- `input/packages/shared-algebras/proofs/rule-core/spell-invocation-resource-core.qnt`
- `input/packages/shared-algebras/proofs/rule-core/spell-slot-expenditure.qnt`
- `input/packages/shared-algebras/proofs/rule-core/spell-invocation-target-cardinality-core.qnt`
- `input/packages/shared-algebras/proofs/rule-core/spell-damage-projection-core.qnt`
- `input/packages/shared-algebras/proofs/rule-core/spell-save-gate.qnt`
- `input/packages/shared-algebras/proofs/rule-core/spell-save-damage-projection-core.qnt`
- `input/packages/shared-algebras/proofs/rule-core/spell-save-condition-projection-core.qnt`
- `input/packages/shared-algebras/proofs/rule-core/spell-attack-damage-projection-core.qnt`
- `input/packages/battle-runtime/battle-runtime-spell-attack.qnt`
- `input/packages/battle-runtime/battle-runtime-chained-spell-attack.qnt`
- `input/packages/battle-runtime/battle-runtime-weapon-hit-spell-riders.qnt`
- `input/packages/battle-runtime/battle-runtime-marked-riders.qnt`
- `input/packages/battle-runtime/battle-runtime-marked-spells.qnt`

Expected Rust tests:

- `engine/tests/battle_spell_profiles.rs` for action/slot/resource and
  target-cardinality procedure facts.
- `engine/tests/battle_spell_damage.rs` for attack/save damage branches,
  damage type choice, and resistance-spell once-per-turn reduction.
- `engine/tests/battle_spell_riders.rs` for after-hit, weapon-hosted, and
  marked-damage rider transfer.

## Wave 4 - Ongoing Effects And Character/Sheet Resources

Goal: add active-effect lifecycles and close the remaining character creation
and sheet-owned transition obligations.

Obligations:

- `BATTLE.SPELL.CONDITION_IMMUNITY_TURN_START_TEMPORARY_HIT_POINTS`
- `BATTLE.SPELL.CREATURE_TYPE_PROTECTION_AND_CONDITION_PREVENTION`
- `BATTLE.SPELL.DANCING_LIGHTS_EMITTER_LIFECYCLE`
- `BATTLE.SPELL.HELD_LIGHT_EMITTER_LIFECYCLE`
- `BATTLE.SPELL.OBJECT_LIGHT_EMITTER_LIFECYCLE`
- `BATTLE.SPELL.FOG_CLOUD_OBSCUREMENT_LIFECYCLE`
- `BATTLE.SPELL.GREASE_GROUND_HAZARD_LIFECYCLE`
- `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS`
- `BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS`
- `BATTLE.SPELL.SLEEP_REPEAT_SAVE_LIFECYCLE`
- `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` (partial)
- `CREATION.CLASS_FEATURE_OPTION.PROJECTION` (partial)
- `CREATION.ADVANCEMENT.CLASS_FEATURE_REPLACEMENT`
- `CREATION.CLASS_FEATURE_FEAT.CHOICE_FINALIZATION`
- `CREATION.CLASS_FEATURE_RESOURCE.PROJECTION`
- `CREATION.CLASS_FEATURE_SOURCE_FACT.PROJECTION`
- `CREATION.ELDRITCH_INVOCATION.CHOICE_LIFECYCLE`
- `CREATION.SKILL_EXPERTISE.CHOICE_FINALIZATION`
- `CREATION.SPELL_ACCESS.PACT_MAGIC_PROGRESSION`
- `SHEET.FEATURE_RESOURCES.TRANSITIONS`
- `SHEET.SPELLBOOK_RITUAL.SPELL_ACCESS_PROJECTION`
- `SHEET.SPELL_SLOTS_PACT_SLOTS.TRANSITIONS`

Likely source files:

- `input/packages/battle-runtime/battle-runtime-restoration-and-buffs.qnt`
- `input/packages/battle-runtime/battle-runtime-timed-effects.qnt`
- `input/packages/battle-runtime/battle-runtime-creature-type-protection.qnt`
- `input/packages/battle-runtime/battle-runtime-light.qnt`
- `input/packages/battle-runtime/battle-runtime-area-trigger-timing.qnt`
- `input/packages/battle-runtime/battle-runtime-roll-modifier-choice.qnt`
- `input/packages/battle-runtime/battle-runtime-thaumaturgy.qnt`
- `input/packages/battle-runtime/battle-runtime-sleep-hideous-laughter.qnt`
- `input/packages/shared-algebras/proofs/rule-core/unit-feature-*.qnt`
- `input/packages/character-creation-runtime/character-creation-runtime-slice.qnt`
- `input/packages/character-creation-runtime/character-creation-class-feature-projections.mbt.qnt`
- `input/packages/character-creation-runtime/character-creation-class-feature-selected-identity.mbt.qnt`
- `input/packages/character-creation-runtime/character-creation-rogue-expertise-selected-identity.mbt.qnt`
- `input/packages/character-creation-runtime/character-creation-warlock-eldritch-invocations-selected-identity.mbt.qnt`
- `input/packages/character-sheet-runtime/character-sheet-feature-resources.mbt.qnt`
- `input/packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt`
- `input/packages/character-sheet-runtime/character-sheet-spellbook-ritual-selected-identity.mbt.qnt`

Expected Rust tests:

- `engine/tests/battle_active_effects.rs`, `engine/tests/battle_light_area.rs`,
  and `engine/tests/battle_protection_modifiers.rs` for battle active effects.
- `engine/tests/battle_features.rs` for remaining feature-profile shapes.
- `engine/tests/character_creation_projection.rs` for finalized CharacterBuild
  selected refs, resources, source facts, spell access, expertise, and
  class-feature replacement.
- `engine/tests/character_sheet_resources.rs` for feature resources, spell
  slots, Pact Slots, Arcane Recovery, and Magical Cunning transitions.

## Lane C Refresh Rule

After each wave lands and passes `cargo test`, Lane C should refresh
`tasks/CLEANROOM_VALIDATION_REPORT.md` by moving only obligations whose full
scoped title is represented and tested. Partial helper coverage should remain
partial.
