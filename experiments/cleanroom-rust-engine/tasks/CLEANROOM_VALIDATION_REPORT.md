# Cleanroom Validation Report

Status: obligation-to-Rust coverage map refreshed after the latest completed
A/B batch.

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
- Partially implemented scoped obligations: 31/47 = 66.0%
- Not attempted scoped obligations: 14/47 = 29.8%
- Blocked by source gap: 0/47 = 0.0%

Only `BATTLE.REACTION.OFFER_DECLINE_RESUME` and
`BATTLE.SPELL.MAKE_STABLE_LIFECYCLE` are marked fully implemented. Every other
locally touched scoped obligation still omits at least one behavior named by the
obligation title, or has fixture/helper coverage rather than the full authored
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
| `BATTLE.COMMAND.OPTION_AND_NEXT_TURN` | `battle.rs` has Command spell admission, slot-scaled target cardinality, selected-target failure facts, pending-effect counts, and next-turn Grovel/Drop/Halt/Approach/Flee behavior including Flee opportunity-attack continuation. `engine/tests/battle_command.rs` covers those option outcomes. | Full BattleState actor identity, initiative-round expiry, and item inventory mutation beyond table-supplied held object count are not modeled. |
| `BATTLE.DAMAGE.SPELL_SAVE_ATTACK_BRANCHES` | `battle.rs` has generic attack roll/damage branches plus spell attack damage profiles, hit/miss/Critical Hit dice validation, spell damage types, hit projections, and save-gated full/half/no-damage branches. `engine/tests/battle_damage.rs` and `engine/tests/battle_spell_damage.rs` cover these branches. | Coverage is still profile/helper-level; full spell invocation sequencing, all joined spell/profile rows, and unit-feature save-damage integration are not fully modeled. |
| `BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION` | `battle.rs` has damage types, by-type aggregation, immunity/resistance/vulnerability ordering, scalar reduction allocation, and spell profile damage-type projection. `engine/tests/battle_damage.rs` and `engine/tests/battle_spell_damage.rs` cover these. | Resistance-spell once-per-turn use state and authored spell damage-type choice lifecycle are not modeled. |
| `BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS` | `battle.rs` has feature pools, Second Wind, failed ability-check boost, Cunning Action, Innate Sorcery, bonus-action dash temporary HP, Action Surge, and Extra Attack count; `engine/tests/battle_actions.rs` covers them. | The broader supported action, bonus action, reaction, passive, resource, and active-effect profile matrix is incomplete. |
| `BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND` | `battle.rs` has Dash, Disengage, Dodge, Hide, Search, readied movement, movement spend/budget/remaining helpers, grapple speed suppression, Opportunity Attack trigger facts, and attack-action movement segmentation; `engine/tests/battle_actions.rs` and `engine/tests/battle_reactions.rs` cover these. | Stand/Drop Prone and Grapple/Escape/Release actions are not modeled; spatial frontier facts are still caller witnesses rather than a full movement frontier reducer. |
| `BATTLE.SANCTUARY.TARGETING_INTERDICTION` | `battle.rs` has Sanctuary spell ward creation through spell invocation, duration projection, direct attack/damaging spell interdiction, area-effect exclusion, replacement target admission via witness, lose-attack/spell outcome, and ward early end. `engine/tests/battle_sanctuary.rs` covers those branches. | Full BattleState active-effect sets, source actor identity beyond a Sanctuary-source witness, and interaction with other direct condition effects are not modeled. |
| `BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS` | `battle.rs` has a Divine Smite after-melee-hit damage rider with bonus-action spell profile, explicit melee-hit trigger witness before resource spend, Radiant damage projection, slot/upcast/Fiend-or-Undead dice projection, non-Concentration status, Critical Hit doubling, and target damage adjustments. `engine/tests/battle_spell_riders.rs` covers these branches. | Current Rust covers the Divine Smite rider path only, not Divine Favor, Paladin's Smite feature uses, Hunter's Mark, Ensnaring Strike, Searing Smite, Shining Smite, or full BattleState actor/target integration. |
| `BATTLE.SPELL.EXPEDITIOUS_RETREAT_DASH_LIFECYCLE` | `battle.rs` has standard and bonus-action Dash resource spend; `engine/tests/battle_actions.rs` covers dash costs. | Spell slot spend, immediate spell cast, concentration-owned later permission, and cleanup are not modeled. |
| `BATTLE.SPELL.FORCED_REACTION_MOVEMENT_LIFECYCLE` | `battle.rs` has reaction windows, bounded continuation ordering, readied reaction movement spend, movement spend admission, and Opportunity Attack interruption facts; `engine/tests/battle_reactions.rs` covers these generic pieces. | Failed-save forced movement, no-movement fallback, spell-specific movement fill admission, and Dissonant Whispers lifecycle are not modeled. |
| `BATTLE.SPELL.HIT_POINT_RESTORATION` | `battle.rs` has direct hit-point restoration profiles, dice count, die size, area profile for Mass Cure Wounds, healing, zero-HP recovery interaction, spell invocation integration, target cardinality gating, explicit target witness validity, healing-roll legality, and multi-target projection for the cleanroom profiles. `engine/tests/battle_hit_points.rs` and `engine/tests/battle_spell_hit_point_restoration.rs` cover these. | Full battle command target-selection holes, authored target picker/frontier behavior, and non-witnessed target derivation are not modeled; callers still supply target witness facts directly. |
| `BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS` | `battle.rs` has spell slot ledger/expenditure, one slot-spell-per-turn gating, slotless cantrip admission, action-time versus Bonus Action spell costs, target cardinality profiles, invalid-target resource expenditure, and a small cleanroom spell definition profile set. `engine/tests/battle_spell_profiles.rs` plus the newer spell-specific tests exercise more profile families, including Faerie Fire and Divine Smite. | The scoped obligation's source matrix spans many spell procedure profiles and semantic cores; current Rust covers selected resource/action/slot/cardinality and profile helper slices, not the whole procedure matrix. |
| `BATTLE.SPELL.REACTION_CASTING_TIME` | `battle.rs` has reaction windows plus reaction-spell invocation, Counterspell end/resume/rejection branches, Hellish Rebuke after-damage trigger, slot scaling, save half damage, Reaction spend, and slot spend. `engine/tests/battle_reactions.rs` and `engine/tests/battle_reaction_spells.rs` cover these. | Full interrupt-stack nesting, offered-reactor sets, nested Counterspell-on-Counterspell, and BattleState actor slot-use sets are not modeled. |
| `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS` | `battle.rs` has roll-modifier active-effect projection for Bane, Bless, Guidance, Pass without Trace, Enhance Ability, Enthrall, and Thaumaturgy Booming Voice, including d4 deltas, fixed skill/passive deltas, selected ability projection, and one-minute Thaumaturgy count. `engine/tests/battle_roll_modifiers.rs` covers these. | Full spell casting admission, concentration lifecycle, multi-target active-effect ownership, and all runtime-selected profile identities are not modeled. |
| `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE` | `battle.rs` has Blindness/Deafness profile facts, slot-scaled target cardinality, condition choice, failed-save Blinded/Deafened active effects, successful-save no-condition branch, invalid target witness handling, and repeat-save cleanup. `engine/tests/battle_save_gated_conditions.rs` covers these. | Other joined save-gated condition spells and full BattleState multi-target turn ownership are not modeled. |
| `BATTLE.SPELL.SAVE_GATED_ATTACK_ROLL_ADVANTAGE` | `battle.rs` has Faerie Fire as a level-1 action spell profile with area witness admission, failed-save creature outlines, object outlines keyed by explicit object identity, Concentration start for admitted/effective casts, invisible benefit denial, and attack-roll Advantage projection with Advantage/Disadvantage cancellation. `engine/tests/battle_faerie_fire.rs` covers these. | Full BattleState area targeting, persistent object outline ownership, duration ticking, and cleanup when Concentration ends are not modeled. |
| `BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS` | `battle.rs` has scalar-buff profiles and projections for Shield of Faith, Longstrider, Spider Climb, Aid, False Life, Barkskin, and Fly, with willing/spatial witnesses, target scaling, concentration flags, non-stacking Aid, and Temporary Hit Point choice. `engine/tests/battle_scalar_buffs.rs` covers these. | Full BattleState multi-actor active-effect ownership, concentration cleanup/fall frames for ended Fly, and timed duration ticking/removal are not modeled. |
| `CREATION.ADVANCEMENT.CLASS_FEATURE_REPLACEMENT` | `character_creation.rs` has Fighter Fighting Style level-gain replacement from Defense to Archery and Warlock invocation replacement projections. `engine/tests/character_creation_projection.rs` covers those fixture cases. | Current Rust covers selected Fighter/Warlock replacement fixtures, not a generic class-feature replacement protocol or all invalid replacement shapes. |
| `CREATION.CLASS_FEATURE_FEAT.CHOICE_FINALIZATION` | `character_creation.rs` has Fighter Fighting Style selected-feat projection for finalized Defense at Fighter level 1. `engine/tests/character_creation_projection.rs` covers this fixture. | Current Rust covers one Fighter feat choice, not the full Fighting Style feat catalog, qualification/admission rules, or Paladin/Ranger Fighting Style finalization fixtures. |
| `CREATION.CLASS_FEATURE_OPTION.PROJECTION` | `character_creation.rs` has draft holes and fills for Fighter Fighting Style plus typed class-feature order option projections for Cleric Protector/Thaumaturge and Druid Magician/Warden, including selected option identity, extra cantrip refs, weapon/armor training facts, and Ability Check bonus fact kind. `engine/tests/character_creation_draft.rs` and `engine/tests/character_creation_projection.rs` cover these. | Current Rust covers selected Fighter and Cleric/Druid fixtures, not the full option catalog or invalid option admission/rejection contracts. |
| `CREATION.CLASS_FEATURE_RESOURCE.PROJECTION` | `character_creation.rs` projects Monk Focus and Sorcerer Font of Magic resource facts with use-count/point-pool kinds, maximums, and rest refill flags. `engine/tests/character_creation_projection.rs` covers those fixture projections. | Current Rust covers Monk/Sorcerer fixtures, not all retained class-feature resources from Surface class progression. |
| `CREATION.CLASS_FEATURE_SOURCE_FACT.PROJECTION` | `character_creation.rs` projects Uncanny Metabolism source facts and Sorcerer Metamagic source facts, including shared-resource links, Martial Arts die source, spell-use limits, selection repeatability, option costs, stacking mode, and effect kinds. `engine/tests/character_creation_projection.rs` covers these. | Current Rust covers fixture source facts, not the full class-feature source-fact catalog. |
| `CREATION.ELDRITCH_INVOCATION.CHOICE_LIFECYCLE` | `character_creation.rs` has Warlock invocation lifecycle projections for level 1 Armor of Shadows selection, level 2 invocation gain, level 3 non-repeatable replacement, level 3 repeatable-choice replacement, prerequisite-retained replacement rejection, and duplicate-selection rejection. `engine/tests/character_creation_projection.rs` covers these. | Current Rust covers representative Warlock level 1/2/3/5 lifecycle fixtures, not arbitrary Warlock level progression, complete invocation catalogs, or every invalid invocation selection shape. |
| `CREATION.SKILL_EXPERTISE.CHOICE_FINALIZATION` | `character_creation.rs` finalizes Rogue Expertise skill choices over owned skill proficiency count for level 1 and level 6 shapes. `engine/tests/character_creation_projection.rs` covers those choices. | The broader scoped rows include non-Rogue expertise identities; current Rust is a focused Rogue projection, not a complete expertise finalization domain. |
| `CREATION.SPELL_ACCESS.PACT_MAGIC_PROGRESSION` | `character_creation.rs` projects Pact Magic cantrip count, prepared spell count, Pact Slot count, and slot level alongside Warlock invocation lifecycle fixtures. `engine/tests/character_creation_projection.rs` covers the representative level 1/2/3/5 cases. | Current Rust covers copied Warlock fixture facts, not arbitrary Pact Magic progression across every Warlock level or a complete spell-access contract. |
| `CREATION.WEAPON_MASTERY.CHOICE_FINALIZATION` | `character_creation.rs` has a Fighter Weapon Mastery draft hole, selected weapon refs on finalized Fighter builds, class/feature Unit refs, and string projections; `engine/tests/character_creation_draft.rs` covers the manifest path and finalized refs. | The join rows for this scoped obligation are Paladin/Ranger/Rogue weapon mastery choices, so the current Fighter-only finalization is not full scoped coverage. |
| `SHEET.ABILITY_CHECK.PROFICIENCY_BONUS` | `character_creation.rs` has an ability-check proficiency projection helper for Performance with Jack of All Trades, skill proficiency, Expertise, and no-other-Proficiency-Bonus rejection branches; `engine/tests/character_creation_sheet_projections.rs` covers the copied replay cases. | The Rust surface is a narrow Performance fixture projection rather than a broader character-sheet ability-check projection over the full skill/check domain. |
| `SHEET.ARMOR_CLASS.BASE_FORMULA_CHOICE` | `character_creation.rs` has `project_armor_class_base_formula` for default unarmored AC, Barbarian Unarmored Defense with optional Shield bonus, and Monk Unarmored Defense without Shield. `engine/tests/character_sheet_armor_class.rs` covers the copied selected-identity/default formula cases. | The broader obligation title includes selection from CharacterBuild, loadout, and class-feature facts. Current Rust receives the selected formula and Shield bonus as explicit inputs rather than deriving the selected base formula from full build/loadout state and competing AC sources. |
| `SHEET.FEATURE_RESOURCES.TRANSITIONS` | `character_creation.rs` has sheet feature resource facts and transitions for Lay On Hands spend/reset, Short Rest Wild Shape/Monk Focus recovery, Long Rest Sorcery Point/created-slot/Uncanny reset, Font of Magic conversion and slot creation gates, Uncanny Metabolism recovery, and Metamagic shared pool bridge. `engine/tests/character_sheet_resources.rs` covers these. | Current Rust covers the named fixture transitions, not a generic feature-resource engine derived from complete character build and battle state. |
| `SHEET.SPELLBOOK_RITUAL.SPELL_ACCESS_PROJECTION` | `character_creation.rs` has spellbook Ritual invocation projection for the Wizard Ritual Adept Detect Magic fixture, accepting spellbook Ritual access without preparation or Spell Slot cost and rejecting a prepared-only path. `engine/tests/character_sheet_projection.rs` covers these cases. | Current Rust covers one Wizard spellbook Ritual fixture, not a complete spell definition catalog, every Ritual spell, or non-Wizard ritual-casting features. |
| `SHEET.SPELL_SLOTS_PACT_SLOTS.TRANSITIONS` | `character_creation.rs` has fixture-supported sheet slot facts, capacity admission, Short Rest Pact Slot recovery, level 2 Arcane Recovery refund, Long Rest ordinary/Pact restoration with created level 1 slot expiry, interrupted-rest outcomes, and Magical Cunning Pact Slot recovery. `engine/tests/character_sheet_resources.rs` covers the deterministic QNT replay cases and rejection messages. | Current Rust covers copied fixture transitions, not a full arbitrary character-sheet resource engine. Full coverage still needs capacities derived from complete build/class facts, a generic Arcane Recovery choice model beyond the level 2 fixture, and created Spell Slot state beyond the copied level 1 fixture. |
| `SHEET.WEAPON_MASTERY.RESELECTION` | `character_creation.rs` has sheet Weapon Mastery selected ref and Long Rest reselection projections for Paladin, Ranger, and Rogue two-choice containers, including changed-choice counts. `engine/tests/character_sheet_projection.rs` covers those copied fixture cases. | Current Rust receives class and selected weapon refs directly and does not derive eligibility from full Surface feature/loadout facts or rewrite a full CharacterBuild state. |

## Not Attempted

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
- `BATTLE.SPELL.SLEEP_REPEAT_SAVE_LIFECYCLE`
- `BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS`

## Blocked By Source Gap

None identified.

The manifest and join inputs report no generator-readiness blockers and no open
QNT/MBT join gaps for the 47 scoped obligations. Current gaps are Rust
implementation and Rust test coverage gaps, not missing cleanroom source facts.

## Latest Validation Run

```text
Command: cd engine && cargo test
Result: pass
Tests: 187 passed; 0 failed; 0 ignored; 0 doc tests
```
