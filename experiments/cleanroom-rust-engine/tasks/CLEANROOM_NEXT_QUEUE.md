# Cleanroom Next Queue

Purpose: keep Lane A/B implementation moving from the current Lane C coverage
map. This queue groups the 35 not-attempted and 11 partial scoped obligations
into coherent waves. Coverage claims should stay conservative until Lane C
refreshes counts after implementation.

## Wave 1 - Movement, Command, And Reaction Closure

Goal: close the movement/reaction seam around route facts, forced movement,
reaction-casting hooks, and turn-command consequences.

Obligations:

- `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND` (partial)
- `BATTLE.SPELL.FORCED_REACTION_MOVEMENT_LIFECYCLE` (partial)
- `BATTLE.SPELL.REACTION_CASTING_TIME` (partial)
- `BATTLE.COMMAND.OPTION_AND_NEXT_TURN`
- `BATTLE.SPELL.FEATHER_FALL_MITIGATION_LIFECYCLE`
- `BATTLE.SPELL.EXPEDITIOUS_RETREAT_DASH_LIFECYCLE` (partial)
- `BATTLE.SPELL.JUMP_MOVEMENT_REPLACEMENT_LIFECYCLE`

Likely source files:

- `input/packages/shared-algebras/proofs/rule-core/movement-spatial-grapple.qnt`
- `input/packages/shared-algebras/proofs/rule-core/reactions-continuations-concentration.qnt`
- `input/packages/battle-runtime/battle-runtime-movement.qnt`
- `input/packages/battle-runtime/battle-runtime-reaction-window.qnt`
- `input/packages/battle-runtime/battle-runtime-spell-invocation.qnt`
- `input/packages/battle-runtime/battle-runtime-command-choice.qnt`
- `input/packages/battle-runtime/battle-runtime-ground-command.qnt`
- `input/packages/battle-runtime/battle-runtime-feather-fall.qnt`
- `input/packages/battle-runtime/battle-runtime-jump-movement.qnt`

Expected Rust tests:

- Extend `engine/tests/battle_reactions.rs` for reaction-casting-time spell
  hooks and interruption/resume.
- Add or extend `engine/tests/battle_movement.rs` for Stand/Drop Prone,
  Grapple/Escape/Release, forced reaction movement, and movement replacement.
- Add `engine/tests/battle_command.rs` for Command option effects and next-turn
  reducer consequences.

## Wave 2 - Spell Procedure And Damage Profiles

Goal: promote generic attack/damage helpers into spell/profile-level reducers
for slots, target cardinality, attack/save branches, and riders.

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
- `BATTLE.SPELL.HIT_POINT_RESTORATION` (partial)
- `BATTLE.SPELL.MAKE_STABLE_LIFECYCLE` (partial)

Likely source files:

- `input/packages/shared-algebras/proofs/rule-core/spell-invocation-resource-core.qnt`
- `input/packages/shared-algebras/proofs/rule-core/spell-slot-expenditure.qnt`
- `input/packages/shared-algebras/proofs/rule-core/spell-invocation-target-cardinality-core.qnt`
- `input/packages/shared-algebras/proofs/rule-core/spell-invocation-action-slot-core.qnt`
- `input/packages/shared-algebras/proofs/rule-core/spell-damage-projection-core.qnt`
- `input/packages/shared-algebras/proofs/rule-core/spell-save-gate.qnt`
- `input/packages/shared-algebras/proofs/rule-core/spell-save-damage-projection-core.qnt`
- `input/packages/shared-algebras/proofs/rule-core/spell-save-condition-projection-core.qnt`
- `input/packages/shared-algebras/proofs/rule-core/spell-attack-damage-projection-core.qnt`
- `input/packages/shared-algebras/proofs/rule-core/spell-hit-point-restoration-core.qnt`
- `input/packages/battle-runtime/battle-runtime-spell-attack.qnt`
- `input/packages/battle-runtime/battle-runtime-chained-spell-attack.qnt`
- `input/packages/battle-runtime/battle-runtime-weapon-hit-spell-riders.qnt`
- `input/packages/battle-runtime/battle-runtime-marked-riders.qnt`
- `input/packages/battle-runtime/battle-runtime-marked-spells.qnt`
- `input/packages/battle-runtime/battle-runtime-hit-points.qnt`

Expected Rust tests:

- Add `engine/tests/battle_spell_profiles.rs` for action/slot/resource and
  target-cardinality procedure facts.
- Add `engine/tests/battle_spell_damage.rs` for attack/save damage branches,
  damage type choice, and resistance-spell once-per-turn reduction.
- Add `engine/tests/battle_spell_riders.rs` for after-hit, weapon-hosted, and
  marked-damage rider transfer.
- Extend `engine/tests/battle_hit_points.rs` for Spare the Dying and
  multi-target restoration projections.

## Wave 3 - Ongoing Effects, Areas, Light, And Protection

Goal: add active-effect lifecycles and table-boundary witnesses for recurring
spell effects, areas, light emitters, protection, and roll/scalar modifiers.

Obligations:

- `BATTLE.SANCTUARY.TARGETING_INTERDICTION`
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

Likely source files:

- `input/packages/battle-runtime/battle-runtime-sanctuary.qnt`
- `input/packages/battle-runtime/battle-runtime-restoration-and-buffs.qnt`
- `input/packages/battle-runtime/battle-runtime-timed-effects.qnt`
- `input/packages/battle-runtime/battle-runtime-creature-type-protection.qnt`
- `input/packages/battle-runtime/battle-runtime-light.qnt`
- `input/packages/battle-runtime/battle-runtime-ground-command.qnt`
- `input/packages/battle-runtime/battle-runtime-area-trigger-timing.qnt`
- `input/packages/battle-runtime/battle-runtime-roll-modifier-choice.qnt`
- `input/packages/battle-runtime/battle-runtime-thaumaturgy.qnt`
- `input/packages/battle-runtime/battle-runtime-sleep-hideous-laughter.qnt`
- `input/packages/shared-algebras/proofs/rule-core/unit-feature-*.qnt`

Expected Rust tests:

- Add `engine/tests/battle_active_effects.rs` for duration, cleanup,
  start/end-turn hooks, and concentration cleanup.
- Add `engine/tests/battle_light_area.rs` for light emitters, Fog Cloud, and
  Grease table-boundary witnesses.
- Add `engine/tests/battle_protection_modifiers.rs` for Sanctuary,
  creature-type protection, roll modifiers, scalar buffs, and Sleep repeat-save
  lifecycle.
- Extend `engine/tests/battle_actions.rs` or add `battle_features.rs` for
  remaining feature-profile shapes.

## Wave 4 - Character Creation And Sheet Projection Closure

Goal: broaden finalized build and sheet projections beyond the current Fighter
manifest path, then connect sheet-owned state transitions.

Obligations:

- `CREATION.WEAPON_MASTERY.CHOICE_FINALIZATION` (partial)
- `CREATION.CLASS_FEATURE_OPTION.PROJECTION` (partial)
- `CREATION.ADVANCEMENT.CLASS_FEATURE_REPLACEMENT`
- `CREATION.CLASS_FEATURE_FEAT.CHOICE_FINALIZATION`
- `CREATION.CLASS_FEATURE_RESOURCE.PROJECTION`
- `CREATION.CLASS_FEATURE_SOURCE_FACT.PROJECTION`
- `CREATION.ELDRITCH_INVOCATION.CHOICE_LIFECYCLE`
- `CREATION.SKILL_EXPERTISE.CHOICE_FINALIZATION`
- `CREATION.SPELL_ACCESS.PACT_MAGIC_PROGRESSION`
- `SHEET.ABILITY_CHECK.PROFICIENCY_BONUS`
- `SHEET.ARMOR_CLASS.BASE_FORMULA_CHOICE`
- `SHEET.FEATURE_RESOURCES.TRANSITIONS`
- `SHEET.SPELLBOOK_RITUAL.SPELL_ACCESS_PROJECTION`
- `SHEET.SPELL_SLOTS_PACT_SLOTS.TRANSITIONS`
- `SHEET.WEAPON_MASTERY.RESELECTION`

Likely source files:

- `input/packages/character-creation-runtime/character-creation-runtime-slice.qnt`
- `input/packages/character-creation-runtime/character-creation-class-feature-projections.mbt.qnt`
- `input/packages/character-creation-runtime/character-creation-class-feature-selected-identity.mbt.qnt`
- `input/packages/character-creation-runtime/character-creation-weapon-mastery-containers-selected-identity.mbt.qnt`
- `input/packages/character-creation-runtime/character-creation-fighter-fighting-style-selected-identity.mbt.qnt`
- `input/packages/character-creation-runtime/character-creation-rogue-expertise-selected-identity.mbt.qnt`
- `input/packages/character-creation-runtime/character-creation-warlock-eldritch-invocations-selected-identity.mbt.qnt`
- `input/packages/character-sheet-runtime/character-sheet-ability-check-proficiency-bonus.mbt.qnt`
- `input/packages/character-sheet-runtime/character-sheet-armor-class-base-selected-identity.mbt.qnt`
- `input/packages/character-sheet-runtime/character-sheet-feature-resources.mbt.qnt`
- `input/packages/character-sheet-runtime/character-sheet-spell-slots-pact-slots.mbt.qnt`
- `input/packages/character-sheet-runtime/character-sheet-spellbook-ritual-selected-identity.mbt.qnt`
- `input/packages/character-sheet-runtime/character-sheet-weapon-mastery-containers-selected-identity.mbt.qnt`

Expected Rust tests:

- Extend `engine/tests/character_creation_draft.rs` only for draft protocol
  cases that remain draft-owned.
- Add `engine/tests/character_creation_projection.rs` for finalized
  CharacterBuild selected refs, resources, source facts, spell access, expertise,
  and class-feature replacement.
- Add `engine/tests/character_sheet_projection.rs` for ability-check bonus, AC
  base formula, spellbook ritual projection, and weapon mastery reselection.
- Add `engine/tests/character_sheet_resources.rs` for feature resources, spell
  slots, Pact Slots, Arcane Recovery, and Magical Cunning transitions.

## Lane C Refresh Rule

After each wave lands and passes `cargo test`, Lane C should refresh
`tasks/CLEANROOM_VALIDATION_REPORT.md` by moving only obligations whose full
scoped title is represented and tested. Partial helper coverage should remain
partial.
