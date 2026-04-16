# Content surface coverage — SRD report

_Generated from `survey-results-srd.jsonl` (28 units)._

## Outcome distribution

| Verdict | Count |
| --- | --- |
| `atom_widening` | 18 |
| `structural_widening` | 7 |
| `clean` | 2 |
| `surface_widening` | 1 |

## Per-kind outcome breakdown

| Kind | clean | surface | atom | structural | total |
| --- | --- | --- | --- | --- | --- |
| class_feature | 1 | 0 | 10 | 1 | 12 |
| mastery | 0 | 0 | 0 | 3 | 3 |
| species_trait | 0 | 0 | 0 | 1 | 1 |
| spell | 1 | 1 | 8 | 2 | 12 |

## Atom frequency (units-that-emit-it)

| Atom | Units |
| --- | --- |
| `activate` | 17 |
| `action_quota` | 9 |
| `spell_root` | 9 |
| `class_feature_root` | 8 |
| `grant_extra_action` | 8 |
| `rest_window` | 8 |
| `use_count` | 8 |
| `spell_slot` | 7 |
| `target` | 7 |
| `damage` | 4 |
| `expire` | 4 |
| `attack_roll` | 3 |
| `on_hit_window` | 3 |
| `save_gate` | 3 |
| `concentrate` | 2 |
| `concentration_lock` | 2 |
| `modify_roll_numeric` | 2 |
| `persist` | 2 |
| `scale_die_count` | 2 |
| `area` | 1 |
| `restrict_action_set` | 1 |
| `scale_target_count` | 1 |

## Widening-proposal frequency (normalized)

Claude's raw proposal text is normalized to canonical tags via regex rules; unmatched proposals fall through with their raw name. Frequency = number of distinct units that proposed this widening.

| Canonical widening | Units | Pressure cases |
| --- | --- | --- |
| `class_level_tiers` | 8 | barbarian_rage, bard_bardic_inspiration, cleric_channel_divinity, cleric_divine_spark, fighter_indomitable, fighter_second_wind, +2 more |
| `bonus_action_activation` | 4 | bard_bardic_inspiration, fighter_second_wind, monk_focus_points, paladin_lay_on_hands |
| `anchored_trigger_family` | 3 | alarm, counterspell, death_ward |
| `conditional_bonus_damage` | 3 | barbarian_rage, monk_focus_points, rogue_sneak_attack |
| `extended_casting_time` | 3 | alarm, counterspell, death_ward |
| `grant_resistance_effect` | 3 | monk_focus_points, polymorph, protection_from_energy |
| `notify_caster_effect` | 3 | alarm, counterspell, death_ward |
| `per_turn_reset` | 3 | barbarian_rage, mastery_cleave, rogue_sneak_attack |
| `ritual_casting` | 3 | alarm, counterspell, death_ward |
| `ability_modifier_addend (RollTotal type wrapping DiceAmount)` | 2 | cleric_channel_divinity, cleric_divine_spark |
| `apply_condition_effect` | 2 | fire_bolt, mastery_topple |
| `attack_predicate_gate` | 2 | barbarian_rage, rogue_sneak_attack |
| `caster_choice_damage_type` | 2 | polymorph, protection_from_energy |
| `ClassFeatureActivationCost.kind = "magic"` | 2 | cleric_channel_divinity, cleric_divine_spark |
| `damage_with_save (ClassFeatureEffect variant)` | 2 | cleric_channel_divinity, cleric_divine_spark |
| `dice_plus_flat` | 2 | eldritch_blast, fighter_second_wind |
| `heal_hp_effect` | 2 | fighter_second_wind, paladin_lay_on_hands |
| `heal_restore_hp (ClassFeatureEffect variant)` | 2 | cleric_channel_divinity, cleric_divine_spark |
| `MasteryRecord + mastery unit kind` | 2 | mastery_cleave, mastery_sap |
| `on_hit_trigger mechanics family` | 2 | mastery_cleave, mastery_sap |
| `operation_union_in_ongoing_effect` | 2 | polymorph, protection_from_energy |
| `player_choice_branch (ClassFeatureEffect wrapper)` | 2 | cleric_channel_divinity, cleric_divine_spark |
| `proximity_predicate` | 2 | barbarian_rage, rogue_sneak_attack |
| `weapon_property_filter` | 2 | barbarian_rage, rogue_sneak_attack |
| `ability_substitution (OngoingEffectMechanics operation kind)` | 1 | shillelagh |
| `advantage_grant` | 1 | monk_focus_points |
| `AdvantageExpiry.target_uses_or_turn_start` | 1 | mastery_sap |
| `auto_hit_resolution` | 1 | eldritch_blast |
| `bonus_action (CastingTime variant)` | 1 | shillelagh |
| `bonus_equals_class_level` | 1 | fighter_indomitable |
| `ClassFeatureActivationCost.reaction` | 1 | fighter_indomitable |
| `damage_type_choice (DamageEffect damageType variant)` | 1 | shillelagh |
| `DcSource: weapon_attack_dc` | 1 | mastery_topple |
| `early_termination_condition` | 1 | monk_focus_points |
| `grant_bonus_action_attack (widen GrantExtraActionEffect with actionType)` | 1 | monk_martial_arts |
| `grant_die_resource` | 1 | bard_bardic_inspiration |
| `hp_pool_resource` | 1 | paladin_lay_on_hands |
| `instance_count_scaling` | 1 | eldritch_blast |
| `MasteryRecord + on_hit_trigger family` | 1 | mastery_topple |
| `modify_ac_effect` | 1 | shield |
| `modify_roll_advantage` | 1 | mastery_sap |
| `modify_roll_reroll (surface implementation of v4 atom)` | 1 | halfling_luck |
| `modify_roll_substitute surface implementation` | 1 | monk_martial_arts |
| `negate_named_effect` | 1 | shield |
| `object_attachment` | 1 | fire_bolt |
| `on_failed_save_trigger` | 1 | fighter_indomitable |
| `on_hit_trigger: optional flag` | 1 | mastery_topple |
| `partial_rest_refill` | 1 | monk_focus_points |
| `passive family for ClassFeatureMechanics` | 1 | hunters_mark |
| `passive_condition family for ClassFeatureMechanics` | 1 | monk_martial_arts |
| `post_roll_window (surface implementation of v4 atom)` | 1 | halfling_luck |
| `prohibit_concentration` | 1 | monk_focus_points |
| `prohibit_spellcasting` | 1 | monk_focus_points |
| `reaction_activation` | 1 | shield |
| `reactive_d20_bonus_window` | 1 | bard_bardic_inspiration |
| `reactive_trigger mechanics family` | 1 | halfling_luck |
| `remove_condition_effect` | 1 | paladin_lay_on_hands |
| `reroll_saving_throw` | 1 | fighter_indomitable |
| `RestResetCadence.partial_short_full_long_rest` | 1 | fighter_second_wind |
| `save_half_damage_branch` | 1 | fireball |
| `scale_attack_count` | 1 | hunters_mark |
| `scale_die_size / alt_damage_die surface implementation` | 1 | monk_martial_arts |
| `secondary_adjacent_target attachment` | 1 | mastery_cleave |
| `self_weapon (Attachment kind)` | 1 | shillelagh |
| `SpeciesTraitRecord` | 1 | halfling_luck |
| `triggered_reaction_family` | 1 | shield |
| `turn_extended_duration` | 1 | monk_focus_points |
| `UseCountCap.ability_score_modifier` | 1 | bard_bardic_inspiration |
| `weapon_damage_no_ability_mod` | 1 | mastery_cleave |
| `weapon_die_override (OngoingEffectMechanics operation kind)` | 1 | shillelagh |

## Structural widenings (new payload families / subgraphs)

### halfling_luck

- **SpeciesTraitRecord** (new_subgraph) — UnitRecord = SpellRecord | ClassFeatureRecord — no species_trait discriminant exists. The tracer switch at tracer.ts:64 throws 'unhandled unit kind' before visiting any atom. A SpeciesTraitRecord type and corresponding tracer handler (speci
- **reactive_trigger mechanics family** (new_subgraph) — Halfling Luck is a passive reactive trigger: it fires automatically when a die-result condition is met (natural 1 on a d20), with no player activation, no use-count cap, and no rest reset. The surface's only mechanics family for non-spell u
- **post_roll_window (surface implementation of v4 atom)** (new_variant) — post_roll_window exists in v4 taxonomy §4 but is absent from the surface types and tracer. The reactive_trigger family needs it as the window atom that opens when a d20 result is available and before the roll is used. No new v4 atom needed 
- **modify_roll_reroll (surface implementation of v4 atom)** (new_variant) — modify_roll_reroll exists in v4 taxonomy §9 but is absent from the surface Effect union and tracer. Luck's effect is a forced-use reroll (keepHigher: false). The 'keep-higher vs forced-keep' variation is noted in v4 §11.E as expressible wit

### hunters_mark

- **passive family for ClassFeatureMechanics** (new_subgraph) — Extra Attack is always-on from level 5 onward — there is no activation, no use count, and no reset cadence. The only existing ClassFeatureMechanics family is 'activation', which requires UseCountResource and RestResetCadence. A new 'passive
- **scale_attack_count** (new_atom) — The atom 'scale_attack_count' is listed in v4 taxonomy (TAXONOMY_atoms_graph.md) as a new atom for 'the number of attacks per Attack action grows with level', with Extra Attack (2→4) as the canonical example. It is not implemented in types.

### mastery_cleave

- **MasteryRecord + mastery unit kind** (new_subgraph) — UnitRecord = SpellRecord | ClassFeatureRecord — no mastery kind exists. The tracer switch throws immediately on kind 'mastery'. A new MasteryRecord type and traceUnit branch are required before any mastery unit can be encoded.
- **on_hit_trigger mechanics family** (new_subgraph) — Cleave fires when the attacker hits with a melee weapon attack — it is not a use-count activation and has no casting time or spell slot. The existing activation and ongoing_effect families do not model passive weapon-hit triggers. A new Mas
- **secondary_adjacent_target attachment** (new_variant) — Cleave's secondary target must be within 5 ft of the primary target AND within reach. This is a relational constraint defined relative to the primary target, not the caster. v4's target atom has no adjacency-to-primary variant. The surface 
- **weapon_damage_no_ability_mod** (new_atom) — Cleave deals weapon damage to the secondary target but suppresses the ability modifier (unless negative). No v4 atom covers suppressing the ability modifier from weapon damage. The surface Effect type (DamageEffect | NoneEffect) cannot expr
- **once_per_turn reset cadence** (new_variant) — Cleave is limited to once per turn. RestResetCadence only covers rest-scoped resets. A turn-scoped reset uses turn_start_window (v4 §4, exists) but the surface RestResetCadence type has no turn_start variant.

### mastery_sap

- **MasteryRecord + mastery unit kind** (new_subgraph) — UnitRecord = SpellRecord | ClassFeatureRecord — no mastery kind exists. The tracer switch throws immediately on kind 'mastery'. A new MasteryRecord type and traceUnit branch are required before any mastery unit can be encoded.
- **on_hit_trigger mechanics family** (new_subgraph) — Sap fires automatically on every weapon hit — it is not a use-count activation and has no casting time or spell slot. The existing activation (use-count) and ongoing_effect families do not model passive weapon-hit triggers. A new MasteryMec
- **modify_roll_advantage** (new_atom) — Sap imposes Disadvantage on the target's next attack roll. The surface Effect type is DamageEffect | NoneEffect — no advantage/disadvantage variant exists. The v4 taxonomy lists modify_roll_advantage (§9, Effect Atoms) but it has not been a
- **AdvantageExpiry.target_uses_or_turn_start** (new_variant) — Sap's condition expires on whichever comes first: the target's next attack roll, or the start of your next turn. The surface Duration only covers timed (round/minute/hour/day), concentration, and instantaneous — no dual-trigger expiration v

### mastery_topple

- **MasteryRecord + on_hit_trigger family** (new_subgraph) — UnitRecord = SpellRecord | ClassFeatureRecord — no mastery kind exists. The tracer switch throws at runtime. Masteries share a common family shape (on_hit_trigger) that has no analog in spell or class-feature payload families.
- **Effect: apply_condition** (new_variant) — Topple applies the Prone condition on a failed save. apply_condition is in v4 §9 Effect Atoms but absent from types.ts Effect union (only damage | none).
- **DcSource: weapon_attack_dc** (new_variant) — DC formula is 8 + attack ability modifier + proficiency bonus — distinct from caster_spell_save_dc (the only existing DcSource variant). Weapon masteries use the attacker's attack-roll ability, not the spell save DC.
- **on_hit_trigger: optional flag** (new_variant) — Topple is optional ('you can force'); Sap is mandatory ('that creature has Disadvantage'). The trigger shape needs an optional boolean so encoding can faithfully represent the player's choice.

### monk_martial_arts

- **passive_condition family for ClassFeatureMechanics** (new_subgraph) — Martial Arts has no activation trigger, no use_count, and no reset cadence. ClassFeatureMechanics only has 'activation' which requires resource + resetCadence. A new 'passive_condition' family is needed with an equipment-state condition gat
- **grant_bonus_action_attack (widen GrantExtraActionEffect with actionType)** (new_variant) — Bonus Unarmed Strike grants a Bonus Action attack. GrantExtraActionEffect only models an extra standard Action. Bonus Action is a distinct economy slot in D&D 5e. v4 has bonus_action_window but no effect for granting a bonus-action attack.
- **scale_die_size / alt_damage_die surface implementation** (new_variant) — Martial Arts Die replaces the normal damage die with a class-level-tier-scaled die (d6 at L1, d8 at L5, d10 at L11, d12 at L17). v4 has 'scale_die_size' but DiceAmount has no class-level die-size tier variant.
- **modify_roll_substitute surface implementation** (new_variant) — Dexterous Attacks substitutes DEX for STR on attack/damage rolls and Grapple/Shove DC. v4 has 'modify_roll_substitute' but types.ts has no such operation — only additive modify_roll_numeric, which is wrong.

### shield

- **triggered_reaction** (new_subgraph) — Shield is a reaction opened by an external trigger (being hit by an attack roll or targeted by Magic Missile). It cannot be modeled as 'ongoing_effect' (no trigger ownership) or 'activation' (caster-chosen). DECISION_activation_vs_triggered
- **CastingTime.reaction** (new_variant) — CastingTime currently only allows { kind: 'action' }. Shield's casting time is a reaction with a specific trigger condition. The v4 taxonomy includes reaction_window (Window atom). The surface type needs a reaction variant carrying the trig
- **modify_ac** (new_atom) — Shield grants a flat +5 bonus to AC. This cannot be expressed as RollModifierOperation (which modifies the caster's own rolls) — AC is not a roll kind. modify_ac is already in the v4 effect atom inventory but is not yet implemented in types
- **negate_named_effect** (new_atom) — Shield grants immunity to Magic Missile damage for its duration. This is a named-effect negation requiring the target spell name. negate_named_effect is in v4 but not yet implemented in the surface. No existing effect type can represent dam


## Option A vs Option B — rubric verdict

Axis signals scan both widening NAMES and JUSTIFICATIONS (since Claude
often names the atom but hides the scaling axis in the justification
text, e.g. "hp_pool" named but "5 × paladin level" in justification).

`class_level_tiers` units: **9**
`linear_per_level` units: **3** — fighter_indomitable, fighter_second_wind, paladin_lay_on_hands
`pb_linked_scaling` units: **0**
`subclass_level_tiers` units: **0**
Other new axes (pb_linked + subclass_level): **0**

**Verdict: Option B** — class_level_tiers in 9 units ≥ 3 AND (linear_per_level in 3 ≥ 2 OR new-axis proposals in 0 ≥ 1).

