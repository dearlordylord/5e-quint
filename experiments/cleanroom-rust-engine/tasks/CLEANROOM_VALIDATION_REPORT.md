# Cleanroom Validation Report

Status: obligation-to-Rust coverage map refreshed after wave 4 additions.

## Sources Inspected

- `input/cleanroom-input-manifest.json`
- `input/plans/rules-kernel-coverage/generator-readiness.jsonl`
- `input/plans/unit-profile-coverage/level1-2-qnt-mbt-join.json`
- local Rust public APIs in `engine/src/`
- local Rust tests in `engine/tests/`

No production TypeScript runtime or production TypeScript tests were read.

## Source Inventory

- Scoped cleanroom obligations: 47
- Manifest generator-ready rows: 32
- Join rows: 163
- Unique QNT-owned obligations in join: 47/47
- Unique parity-witnessed obligations in join: 47/47
- Open source-system join gaps: 0
- Manifest source blockers: 0

The percentages below are Rust cleanroom implementation coverage, not the
source-system QNT/MBT parity percentages.

## Rust Coverage Summary

- Implemented scoped obligations: 2/47 = 4.3%
- Partially implemented scoped obligations: 13/47 = 27.7%
- Not attempted scoped obligations: 32/47 = 68.1%
- Blocked by source gap: 0/47 = 0.0%

Only `BATTLE.REACTION.OFFER_DECLINE_RESUME` and
`BATTLE.SPELL.MAKE_STABLE_LIFECYCLE` are marked fully implemented. Every other
locally touched scoped obligation still omits at least one behavior named by the
obligation title, or has only generic helper coverage rather than the authored
obligation shape.

Adjacent implemented behavior not counted as scoped-obligation completion:

- `SHARED.HIT_POINTS.POSITIVE_DAMAGE`
- `SHEET.HP_REST_HIT_DICE.TRANSITIONS`
- `BATTLE.DAMAGE.ATTACK_BRANCHES`
- `BATTLE.DAMAGE.DEATH_SAVING_THROW_LIFECYCLE`
- `CREATION.DRAFT.FILL_BATCH_SLICE_REPLAY`
- `CREATION.CHOICE_DISCOVERY_CARDINALITY`

Those are useful Rust foundations, but they are not themselves among the 47
scoped obligation IDs in `input/cleanroom-input-manifest.json`.

## Implemented

| Obligation | Current Rust evidence |
| --- | --- |
| `BATTLE.REACTION.OFFER_DECLINE_RESUME` | `battle.rs` has reaction windows, decline/take choices, reaction quota spend, bounded nested windows, suspended-window resume, damage interruption windows, and concentration start/end/prevention/damage-save handling. `engine/tests/battle_reactions.rs` covers offer, decline, spend, unavailable quota, nested resume, opportunity trigger, readied movement reaction, damage interruption, and concentration save DC/break behavior. |
| `BATTLE.SPELL.MAKE_STABLE_LIFECYCLE` | `battle.rs` has Spare the Dying range scaling, invocation admission, action spend, zero-HP non-dead player-character target admission, non-admission for positive-HP/dead/monster targets, and stable lifecycle mutation. `engine/tests/battle_spare_the_dying.rs` covers those scoped behaviors. |

## Partially Implemented

| Obligation | Current Rust evidence | Missing for full scoped coverage |
| --- | --- | --- |
| `BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES` | `battle.rs` has generic attack roll, critical, hit/miss, and attack damage procedures; `engine/tests/battle_damage.rs` covers those branches. | Spell-specific attack branches and Saving Throw full/half/no-damage branches are not modeled. |
| `BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION` | `battle.rs` has damage types, by-type aggregation, immunity/resistance/vulnerability ordering, and scalar reduction allocation; `engine/tests/battle_damage.rs` covers these. | Resistance-spell once-per-turn use state and spell damage-type choice lifecycle are not modeled. |
| `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` | `battle.rs` has feature pools, Second Wind, failed ability-check boost, Cunning Action, Innate Sorcery, bonus-action dash temporary HP, Action Surge, and Extra Attack count; `engine/tests/battle_actions.rs` covers them. | The broader supported action, bonus action, reaction, passive, resource, and active-effect profile matrix is incomplete. |
| `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND` | `battle.rs` has Dash, Disengage, Dodge, Hide, Search, readied movement, movement spend/budget/remaining helpers, grapple speed suppression, Opportunity Attack trigger facts, and attack-action movement segmentation; `engine/tests/battle_actions.rs` and `engine/tests/battle_reactions.rs` cover these. | Stand/Drop Prone and Grapple/Escape/Release actions are not modeled; spatial frontier facts are still caller witnesses rather than a full movement frontier reducer. |
| `BATTLE.SPELL.EXPEDITIOUS_RETREAT_DASH_LIFECYCLE` | `battle.rs` has standard and bonus-action Dash resource spend; `engine/tests/battle_actions.rs` covers dash costs. | Spell slot spend, immediate spell cast, concentration-owned later permission, and cleanup are not modeled. |
| `BATTLE.SPELL.FORCED_REACTION_MOVEMENT_LIFECYCLE` | `battle.rs` has reaction windows, bounded continuation ordering, readied reaction movement spend, movement spend admission, and Opportunity Attack interruption facts; `engine/tests/battle_reactions.rs` covers these generic pieces. | Failed-save forced movement, no-movement fallback, spell-specific movement fill admission, and Dissonant Whispers lifecycle are not modeled. |
| `BATTLE.SPELL.HIT_POINT_RESTORATION` | `battle.rs` has direct hit-point restoration profiles, dice count, die size, area profile for Mass Cure Wounds, healing, and zero-HP recovery interaction; `engine/tests/battle_hit_points.rs` covers direct restoration. | Target-selection holes and multi-target healing projection are not modeled. |
| `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` | `battle.rs` has spell slot ledger/expenditure, one slot-spell-per-turn gating, slotless cantrip admission, action-time versus Bonus Action spell costs, target cardinality profiles, invalid-target resource expenditure, and a small cleanroom spell definition profile set. `engine/tests/battle_spell_profiles.rs` covers Magic Missile slot-scaled targets, Ray of Frost slotless casting, Healing Word Bonus Action cost, Mass Healing Word slot/target gates, invalid targets, missing access, wrong slot, bad target count, and slot result helper behavior. | The scoped obligation's source matrix spans many spell procedure profiles and semantic cores, including spell damage projections, defensive effects, scalar buffs, damage riders, chained/independent attack sequences, turn hooks, object damage, repeat-save lifecycles, and readied spell response. Current Rust covers only the generic resource/action/slot/cardinality slice. |
| `BATTLE.SPELL.REACTION_CASTING_TIME` | `battle.rs` has reaction windows for damage interruption/readied spell kinds, generic reaction spend, bounded interruption/resume, and damage-triggered interruption; `engine/tests/battle_reactions.rs` covers the generic protocol. | Spell-cast and after-damage spell triggers, Spell Slot ledger, and concrete reaction spell resolution are not modeled. |
| `CREATION.CLASS_FEATURE_OPTION.PROJECTION` | `character_creation.rs` has draft holes and fills for Fighter Fighting Style and related class-feature choices; `engine/tests/character_creation_draft.rs` covers acceptance/rejection. | Final CharacterBuild option, Unit ref, proficiency, cantrip, and Ability Check bonus fact projections are not modeled. |
| `CREATION.WEAPON_MASTERY.CHOICE_FINALIZATION` | `character_creation.rs` has a Fighter Weapon Mastery draft hole, selected weapon refs on finalized Fighter builds, class/feature Unit refs, and string projections; `engine/tests/character_creation_draft.rs` covers the manifest path and finalized refs. | The join rows for this scoped obligation are Paladin/Ranger/Rogue weapon mastery choices, so the current Fighter-only finalization is not full scoped coverage. |
| `SHEET.ABILITY_CHECK.PROFICIENCY_BONUS` | `character_creation.rs` has an ability-check proficiency projection helper for Performance with Jack of All Trades, skill proficiency, Expertise, and no-other-Proficiency-Bonus rejection branches; `engine/tests/character_creation_sheet_projections.rs` covers the copied replay cases. | The Rust surface is a narrow Performance fixture projection rather than a broader character-sheet ability-check projection over the full skill/check domain. |
| `SHEET.ARMOR_CLASS.BASE_FORMULA_CHOICE` | `character_creation.rs` has `project_armor_class_base_formula` for default unarmored AC, Barbarian Unarmored Defense with optional Shield bonus, and Monk Unarmored Defense without Shield. `engine/tests/character_sheet_armor_class.rs` covers the copied selected-identity/default formula cases. | The broader obligation title includes selection from CharacterBuild, loadout, and class-feature facts. Current Rust receives the selected formula and Shield bonus as explicit inputs rather than deriving the selected base formula from full build/loadout state and competing AC sources. |

## Not Attempted

- `BATTLE.COMMAND.OPTION_AND_NEXT_TURN`
- `BATTLE.SANCTUARY.TARGETING_INTERDICTION`
- `BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS`
- `BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE`
- `BATTLE.SPELL.CONDITION_IMMUNITY_TURN_START_TEMPORARY_HIT_POINTS`
- `BATTLE.SPELL.CREATURE_TYPE_PROTECTION_AND_CONDITION_PREVENTION`
- `BATTLE.SPELL.DANCING_LIGHTS_EMITTER_LIFECYCLE`
- `BATTLE.SPELL.FEATHER_FALL_MITIGATION_LIFECYCLE`
- `BATTLE.SPELL.FOG_CLOUD_OBSCUREMENT_LIFECYCLE`
- `BATTLE.SPELL.GREASE_GROUND_HAZARD_LIFECYCLE`
- `BATTLE.SPELL.HELD_LIGHT_EMITTER_LIFECYCLE`
- `BATTLE.SPELL.INDEPENDENT_ATTACK_SEQUENCE`
- `BATTLE.SPELL.JUMP_MOVEMENT_REPLACEMENT_LIFECYCLE`
- `BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER`
- `BATTLE.SPELL.OBJECT_LIGHT_EMITTER_LIFECYCLE`
- `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS`
- `BATTLE.SPELL.SAVE_GATED_ATTACK_ROLL_ADVANTAGE`
- `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE`
- `BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS`
- `BATTLE.SPELL.SLEEP_REPEAT_SAVE_LIFECYCLE`
- `BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS`
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
- `SHEET.WEAPON_MASTERY.RESELECTION`

## Blocked By Source Gap

None identified.

The manifest and join inputs report no generator-readiness blockers and no open
QNT/MBT join gaps for the 47 scoped obligations. Current gaps are Rust
implementation and Rust test coverage gaps, not missing cleanroom source facts.

## Latest Validation Run

```text
Command: cd engine && cargo test
Result: pass
Tests: 80 passed; 0 failed; 0 ignored; 0 doc tests
```
