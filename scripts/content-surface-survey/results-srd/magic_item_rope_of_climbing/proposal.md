# Proposal: surface_widening for Rope of Climbing

## Summary

The Rope of Climbing (`magic_item`, Uncommon, SRD 5.2.1) cannot be encoded honestly. Five surface gaps prevent a complete encoding. The atom vocabulary is adequate — `reposition_attachment`, `modify_roll_advantage` with `skillFilter`, and `grant_damage_immunity` all exist — but the delivery structures are missing. No new v4 taxonomy atoms are required.

---

## Gap 1: `ActivatedAbilityMechanics` lacks an `operations` array (PRIMARY BLOCKER)

**RAW text:** *"10 feet at the start of each of your subsequent turns until reaching its destination or until you tell it to stop."*

After the Magic action activates the rope, the rope's free end moves 10 ft autonomously at the start of each of the user's turns until it reaches its destination. This is an ongoing operation on a magic-item activation: `on_caster_turn_start → reposition_attachment`.

`ActivatedAbilityMechanics` only has `phases: ReadonlyNonEmptyArray<ActivationPhase>` — a sequence of one-shot resolution steps. It has no `operations` array.

The spell surface has this capability via `OngoingEffectMechanics.operations: ReadonlyNonEmptyArray<OngoingOperation>`, but that family is spell-only (requires a `SpellMechanicsHeader`).

**Proposed widening:** Add an optional `operations?: ReadonlyNonEmptyArray<OngoingOperation>` field to `ActivatedAbilityMechanics`, or introduce a new composite family `ongoing_activation` for magic items that combines activation headers with ongoing operation lists.

The immediate 10 ft movement on the first command is expressible as a `direct` phase with `reposition_attachment`. The per-turn continuation requires the operations array.

---

## Gap 2: `PassiveOperation.trigger.unit` missing `'minute'`

**RAW text:** *"It regains 1 Hit Point every 5 minutes as long as it has at least 1 Hit Point."*

`PassiveOperation.trigger` is typed as `{ kind: "elapsed_time"; unit: "hour" | "day"; amount: number }`. A 5-minute regeneration cadence requires `unit: "minute"`.

**Proposed widening:** Extend the `unit` union to `"minute" | "hour" | "day"`.

---

## Gap 3: `ItemDestructionPolicy` missing HP-track destruction

**RAW text:** *"If the rope drops to 0 Hit Points, it is destroyed."*

Existing `ItemDestructionPolicy` variants (`none`, `last_charge_roll`, `permanent_on_empty`) are all scoped to charge-pool exhaustion. The rope has its own HP track and is destroyed deterministically when that track reaches 0, independent of any charge pool.

**Proposed widening:** Add `{ kind: "at_zero_hp" }` variant to `ItemDestructionPolicy`.

---

## Gap 4: No surface for item-as-object HP/AC/immunity stats

**RAW text:** *"The rope has AC 20, HP 20, and Immunity to Poison and Psychic damage."*

`CreatedObjectDurability` (`{ acValue, hpPerSection, damageImmunities, ... }`) covers the durability of objects *created* by spell/activation effects (e.g., Wall of Stone panels). There is no analogous surface for expressing that the magic item *itself* has HP, AC, and damage immunities as an attackable object.

**Proposed widening:** Add an optional `objectProfile?: { acValue: number; hp: number; damageImmunities?: ReadonlyNonEmptyArray<DamageType> }` (or similar) field to `MagicItemRecord`. This would be rendered as an `item_object_profile` node in the trace, distinct from `CreatedObjectDurability`.

---

## Gap 5: No `EquipmentPredicate` variant for item mode/state gate

**RAW text:** *"While knotted, the rope shortens to a 50-foot length and grants Advantage on ability checks made to climb using the rope."*

The climb-Advantage only applies when the rope is in knotted mode. The `EquipmentPredicate` variants (`wearing_item`, `holding_item`, `wearing_armor`, `wielding_weapon`, `all_of`, etc.) cover equipment presence/wear states but not a discrete item mode toggle (knotted vs. unknotted).

The `alter_item_kind` atom can express the mode transition itself, but there is no predicate to gate a passive grant on the item's current mode.

**Proposed widening:** Add `{ kind: "item_in_state"; state: string }` (or a more closed variant like `{ kind: "item_mode"; mode: "knotted" }`) to `EquipmentPredicate`.

---

## What would be needed for a clean encoding

With all five widenings applied, the encoding would be a `composite` magic item with:

1. **Passive part** (condition: `item_in_state: "knotted"`):
   - `modify_roll_advantage` on `ability_check`, `skillFilter: { kind: "fixed", skills: ["athletics"] }`, `mode: "advantage"`

2. **Activation part** (`standard_action: magic`, `use_count` cap with no reset — the ability is always usable):
   - Phase 1 (`direct`): `reposition_attachment` (immediate 10 ft on command)
   - Operations: `on_caster_turn_start → reposition_attachment` (per-turn autonomous movement)
   - Sub-commands (knot/unknot, fasten/unfasten, coil) expressible via `alter_item_kind` in additional phases

3. **Passive part** (HP regeneration): `PassiveOperation { trigger: { kind: "elapsed_time", unit: "minute", amount: 5 }, effect: heal_hp { amount: { kind: "fixed", expr: { dice: 0, dieSize: 1, flat: 1 } }, target: "self" } }` — once `minute` unit is added

4. **Record-level**: `objectProfile: { acValue: 20, hp: 20, damageImmunities: ["poison", "psychic"] }` and `destruction: { kind: "at_zero_hp" }`
