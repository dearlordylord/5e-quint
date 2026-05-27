# Cleanroom Next Queue

Purpose: keep Lane A/B implementation moving from the latest Lane C coverage
map. Current cleanroom status is 2 fully implemented, 24 partial, 21 not
attempted, and 0 blocked by source gap. Coverage claims should stay
conservative until Lane C refreshes counts after implementation.

Already full; do not schedule unless regressions appear:

- `BATTLE.REACTION.OFFER_DECLINE_RESUME`
- `BATTLE.SPELL.MAKE_STABLE_LIFECYCLE`

## Best Next Short Slices

These are the best first picks after the current large integration batch because
they remain not attempted and are adjacent to newly landed helper surfaces.

| Rank | Lane | Obligation | Why it is a good next slice | Likely source files | Expected Rust tests |
| --- | --- | --- | --- | --- | --- |
| 1 | B | `BATTLE.SPELL.SAVE_GATED_ATTACK_ROLL_ADVANTAGE` | Not attempted and adjacent to the new save-gated condition and spell attack projection helpers. | `input/packages/battle-runtime/battle-runtime-save-gated-spell.qnt`, `input/packages/battle-runtime/battle-runtime-spell-attack.qnt` | Add focused tests for failed-save attack-roll Advantage active-effect application and attack-roll projection. |
| 2 | B | `BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS` | Not attempted and adjacent to the new spell damage branch helpers. | `input/packages/battle-runtime/battle-runtime-weapon-hit-spell-riders.qnt`, `input/packages/battle-runtime/battle-runtime-spell-invocation.qnt`, `input/packages/battle-runtime/battle-runtime-concentration.qnt` | Add `engine/tests/battle_spell_riders.rs` for after-hit rider admission, resource spend, concentration, and rider transfer. |
| 3 | B | `BATTLE.SPELL.INDEPENDENT_ATTACK_SEQUENCE` | Not attempted; should reuse spell invocation and spell attack damage branch helpers without requiring chained attack state first. | `input/packages/battle-runtime/battle-runtime-spell-attack.qnt`, `input/packages/battle-runtime/battle-runtime-spell-invocation.qnt` | Add `engine/tests/battle_spell_sequences.rs` for independent repeated attack sequence admission and per-target attack resolution. |
| 4 | B | `BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE` | Not attempted and pairs naturally after independent attack sequence. | `input/packages/battle-runtime/battle-runtime-chained-spell-attack.qnt`, `input/packages/battle-runtime/battle-runtime-spell-attack.qnt`, `input/packages/battle-runtime/battle-runtime-spell-invocation.qnt` | Extend `engine/tests/battle_spell_sequences.rs` for chained attack continuation and stop conditions. |
| 5 | A | `SHEET.SPELLBOOK_RITUAL.SPELL_ACCESS_PROJECTION` | Not attempted and isolated from battle reducers; useful Lane A projection work after sheet resource fixtures. | `input/packages/character-sheet-runtime/character-sheet-spellbook-ritual-selected-identity.mbt.qnt` | Add `engine/tests/character_sheet_projection.rs` or a focused spellbook projection test for ritual/spell access selected refs. |

## Recently Moved To Partial

Keep these out of top slots unless A/B explicitly chooses a deepening slice.

- `BATTLE.COMMAND.OPTION_AND_NEXT_TURN`
- `BATTLE.SANCTUARY.TARGETING_INTERDICTION`
- `BATTLE.SPELL.REACTION_CASTING_TIME`
- `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS`
- `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE`
- `BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS`
- `CREATION.CLASS_FEATURE_RESOURCE.PROJECTION`
- `CREATION.CLASS_FEATURE_SOURCE_FACT.PROJECTION`
- `CREATION.SKILL_EXPERTISE.CHOICE_FINALIZATION`
- `SHEET.FEATURE_RESOURCES.TRANSITIONS`
- `SHEET.WEAPON_MASTERY.RESELECTION`

Also keep earlier partials out of top slots unless a deepening slice is
requested: `SHEET.ARMOR_CLASS.BASE_FORMULA_CHOICE`,
`BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS`,
`BATTLE.SPELL.HIT_POINT_RESTORATION`, and
`SHEET.SPELL_SLOTS_PACT_SLOTS.TRANSITIONS`.

## Wave 1 - Remaining Spell Attack And Rider Closure

Goal: use the new spell damage/profile helpers to close spell attack-roll
Advantage, after-hit riders, and attack sequences.

Obligations:

- `BATTLE.SPELL.SAVE_GATED_ATTACK_ROLL_ADVANTAGE`
- `BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS`
- `BATTLE.SPELL.INDEPENDENT_ATTACK_SEQUENCE`
- `BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE`
- `BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS`
- `BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER`
- `BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES` (partial)
- `BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION` (partial)
- `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` (partial)

Likely source files:

- `input/packages/battle-runtime/battle-runtime-save-gated-spell.qnt`
- `input/packages/battle-runtime/battle-runtime-spell-attack.qnt`
- `input/packages/battle-runtime/battle-runtime-chained-spell-attack.qnt`
- `input/packages/battle-runtime/battle-runtime-weapon-hit-spell-riders.qnt`
- `input/packages/battle-runtime/battle-runtime-marked-riders.qnt`
- `input/packages/battle-runtime/battle-runtime-marked-spells.qnt`
- `input/packages/shared-algebras/proofs/rule-core/spell-damage-rider-projection-core.qnt`
- `input/packages/shared-algebras/proofs/rule-core/spell-chained-attack-damage-projection-core.qnt`
- `input/packages/shared-algebras/proofs/rule-core/spell-independent-attack-sequence-core.qnt`

Expected Rust tests:

- `engine/tests/battle_spell_sequences.rs`
- `engine/tests/battle_spell_riders.rs`
- Extensions to `engine/tests/battle_spell_damage.rs`

## Wave 2 - Remaining Battle Active Effects And Areas

Goal: cover active-effect lifecycles that still have no Rust surface.

Obligations:

- `BATTLE.SPELL.CONDITION_IMMUNITY_TURN_START_TEMPORARY_HIT_POINTS`
- `BATTLE.SPELL.CREATURE_TYPE_PROTECTION_AND_CONDITION_PREVENTION`
- `BATTLE.SPELL.DANCING_LIGHTS_EMITTER_LIFECYCLE`
- `BATTLE.SPELL.HELD_LIGHT_EMITTER_LIFECYCLE`
- `BATTLE.SPELL.OBJECT_LIGHT_EMITTER_LIFECYCLE`
- `BATTLE.SPELL.FOG_CLOUD_OBSCUREMENT_LIFECYCLE`
- `BATTLE.SPELL.GREASE_GROUND_HAZARD_LIFECYCLE`
- `BATTLE.SPELL.SLEEP_REPEAT_SAVE_LIFECYCLE`
- `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS` (partial)
- `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE` (partial)
- `BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS` (partial)

Likely source files:

- `input/packages/battle-runtime/battle-runtime-restoration-and-buffs.qnt`
- `input/packages/battle-runtime/battle-runtime-timed-effects.qnt`
- `input/packages/battle-runtime/battle-runtime-creature-type-protection.qnt`
- `input/packages/battle-runtime/battle-runtime-light.qnt`
- `input/packages/battle-runtime/battle-runtime-area-trigger-timing.qnt`
- `input/packages/battle-runtime/battle-runtime-sleep-hideous-laughter.qnt`

Expected Rust tests:

- `engine/tests/battle_active_effects.rs`
- `engine/tests/battle_light_area.rs`
- `engine/tests/battle_protection_modifiers.rs`

## Wave 3 - Movement And Spell Movement

Goal: close movement resource/frontier behavior and spell-owned movement
replacement.

Obligations:

- `BATTLE.SPELL.FEATHER_FALL_MITIGATION_LIFECYCLE`
- `BATTLE.SPELL.JUMP_MOVEMENT_REPLACEMENT_LIFECYCLE`
- `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND` (partial)
- `BATTLE.SPELL.EXPEDITIOUS_RETREAT_DASH_LIFECYCLE` (partial)
- `BATTLE.SPELL.FORCED_REACTION_MOVEMENT_LIFECYCLE` (partial)

Likely source files:

- `input/packages/shared-algebras/proofs/rule-core/movement-spatial-grapple.qnt`
- `input/packages/shared-algebras/proofs/rule-core/reactions-continuations-concentration.qnt`
- `input/packages/battle-runtime/battle-runtime-movement.qnt`
- `input/packages/battle-runtime/battle-runtime-feather-fall.qnt`
- `input/packages/battle-runtime/battle-runtime-jump-movement.qnt`

Expected Rust tests:

- `engine/tests/battle_movement.rs`

## Wave 4 - Character And Sheet Projection Remainder

Goal: cover remaining character creation and sheet projection obligations, then
deepen fixture-based partials only where needed.

Obligations:

- `CREATION.ADVANCEMENT.CLASS_FEATURE_REPLACEMENT`
- `CREATION.CLASS_FEATURE_FEAT.CHOICE_FINALIZATION`
- `CREATION.ELDRITCH_INVOCATION.CHOICE_LIFECYCLE`
- `CREATION.SPELL_ACCESS.PACT_MAGIC_PROGRESSION`
- `SHEET.SPELLBOOK_RITUAL.SPELL_ACCESS_PROJECTION`
- `CREATION.CLASS_FEATURE_OPTION.PROJECTION` (partial)
- `CREATION.CLASS_FEATURE_RESOURCE.PROJECTION` (partial)
- `CREATION.CLASS_FEATURE_SOURCE_FACT.PROJECTION` (partial)
- `CREATION.SKILL_EXPERTISE.CHOICE_FINALIZATION` (partial)
- `CREATION.WEAPON_MASTERY.CHOICE_FINALIZATION` (partial)
- `SHEET.ABILITY_CHECK.PROFICIENCY_BONUS` (partial)
- `SHEET.ARMOR_CLASS.BASE_FORMULA_CHOICE` (partial)
- `SHEET.FEATURE_RESOURCES.TRANSITIONS` (partial)
- `SHEET.SPELL_SLOTS_PACT_SLOTS.TRANSITIONS` (partial)
- `SHEET.WEAPON_MASTERY.RESELECTION` (partial)

Likely source files:

- `input/packages/character-creation-runtime/character-creation-runtime-slice.qnt`
- `input/packages/character-creation-runtime/character-creation-class-feature-projections.mbt.qnt`
- `input/packages/character-creation-runtime/character-creation-class-feature-selected-identity.mbt.qnt`
- `input/packages/character-creation-runtime/character-creation-rogue-expertise-selected-identity.mbt.qnt`
- `input/packages/character-creation-runtime/character-creation-warlock-eldritch-invocations-selected-identity.mbt.qnt`
- `input/packages/character-sheet-runtime/character-sheet-feature-resources.mbt.qnt`
- `input/packages/character-sheet-runtime/character-sheet-spellbook-ritual-selected-identity.mbt.qnt`

Expected Rust tests:

- `engine/tests/character_creation_projection.rs`
- `engine/tests/character_sheet_projection.rs`
- `engine/tests/character_sheet_resources.rs`

## Lane C Refresh Rule

After each wave lands and passes `cargo test`, Lane C should refresh
`tasks/CLEANROOM_VALIDATION_REPORT.md` by moving only obligations whose full
scoped title is represented and tested. Partial helper or fixture coverage
should remain partial.
