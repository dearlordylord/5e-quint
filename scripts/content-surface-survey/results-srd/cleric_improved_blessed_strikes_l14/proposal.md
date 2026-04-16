# Proposal: Improved Blessed Strikes (Cleric L14)

## Outcome: `structural_widening`

## Unit Summary

Improved Blessed Strikes upgrades whichever of the two Blessed Strikes options the cleric selected at level 7:

- **Divine Strike branch**: Extra weapon-hit damage increases to 2d8.
- **Potent Spellcasting branch**: After dealing damage with a Cleric cantrip, the cleric may optionally grant Temporary Hit Points equal to 2 × Wisdom modifier to themselves or an ally within 60 feet.

Neither branch fits an existing `ClassFeatureMechanics` family without fabricating mechanics that don't exist in the rule text. No content files were authored.

---

## Gap 1: No passive rider family in ClassFeatureMechanics

`ClassFeatureMechanics` currently has a single family: `activation`. It requires:

```
activationCost + resource (use_count) + resetCadence + effect
```

Divine Strike is a **passive always-on on-hit damage rider** — it fires automatically on every qualifying weapon attack hit. There is no activation, no quota consumed, and no reset cadence. Encoding it under `activation` would require inventing fields the rule doesn't support.

The closest existing surface analog is `OnHitTriggerMechanics` (the mastery family), but `MasteryRecord` is a separate unit kind. A mastery is not a class feature.

**Proposed widening**: Add a `passive_on_hit_rider` family to `ClassFeatureMechanics`:

```typescript
export type ClassFeaturePassiveOnHitRiderMechanics = {
  readonly family: "passive_on_hit_rider";
  readonly trigger: MasteryTrigger;             // or a class-feature-specific trigger type
  readonly damageType: DamageType;
  readonly amount: DiceAmount;
};
```

All atoms needed (`attack_roll`, `on_hit_window`, `damage`, `scale_die_count`) already exist in v4. Only the new subgraph shape is required.

---

## Gap 2: No cantrip-damage-triggered rider family

Potent Spellcasting fires an **optional rider** when the cleric casts a Cleric cantrip **and** deals damage. This is a composite trigger:

1. `spell_cast_window` (scoped to Cleric cantrips)
2. Damage is confirmed to have been dealt
3. Caster **may** (optional) apply the effect

This is structurally closer to a reaction or a post-damage window than to an activation. No existing family covers it. The `activation` family is player-initiated; this fires off an event the player already took (casting a cantrip).

**Proposed widening**: Add a `triggered_spell_cast_rider` family to `ClassFeatureMechanics`:

```typescript
export type ClassFeatureSpellCastRiderMechanics = {
  readonly family: "triggered_spell_cast_rider";
  readonly trigger: { readonly kind: "cantrip_damage"; readonly classRestriction: ClassName };
  readonly optional: boolean;
  readonly effect: ClassFeatureEffect;
};
```

This maps to a `spell_cast_window` atom (with filter) in the tracer, followed by an optional `on_hit_window`-like branching.

---

## Gap 3: Missing `grant_temp_hp` ClassFeatureEffect variant

The Potent Spellcasting rider grants **Temporary Hit Points**, not regular healing. Temp HP is mechanically distinct:

- Does not stack with other temp HP (only the higher pool survives)
- Forms a separate HP buffer that absorbs damage before regular HP
- Is not equivalent to healing for purposes of effects that reference healing

The existing `HealHpEffect` (`kind: "heal_hp"`) covers regular HP restoration only.

**Proposed widening**: Add a `GrantTempHpEffect` variant to `ClassFeatureEffect`:

```typescript
export type GrantTempHpEffect = {
  readonly kind: "grant_temp_hp";
  readonly amount: TempHpAmount;     // see Gap 4
  readonly target: "self_or_ally";
  readonly rangeFeet: number;
};
```

A `grant_temp_hp` atom would also need to be added to the v4 taxonomy (currently only `heal` exists in the effect category).

---

## Gap 4: Missing ability-modifier-scalar amount type

The Temp HP amount is `2 × Wisdom modifier`. This is a **character-stat-derived flat amount** — not a dice expression, not a threshold tier, not a linear-per-level increment. `DiceAmount` supports:

- `fixed` — a constant dice expression with optional flat
- `threshold_tiers` — jumps at level thresholds
- `linear_per_level` — grows linearly per level

None can express "multiply an ability score modifier by a constant." The modifier is a runtime character projection, not a formula with a compile-time base.

**Proposed widening**: Add a new amount variant (either to `DiceAmount` or as a separate `TempHpAmount` type):

```typescript
export type AbilityModifierScaled = {
  readonly kind: "ability_modifier_times";
  readonly ability: Ability;
  readonly multiplier: number;
};
```

---

## Gap 5: Missing branch-choice meta-structure

Improved Blessed Strikes is semantically bound to the L7 Blessed Strikes choice. The L14 record is not a standalone feature — it upgrades one of two possible prior states. The surface has no way to express:

> "This feature record upgrades whichever of {A, B} the character previously acquired."

**Possible mitigations (not yet proposed as concrete schema changes)**:

1. Encode two separate `ClassFeatureRecord` entries (one for each branch) linked by a shared `parentFeatureId` field — but `parentFeatureId` doesn't exist on `ClassFeatureRecord`.
2. Add a `conditional_upgrade` wrapper family at the record level.
3. Treat the two branches as independent features (separate records for `cleric_improved_divine_strike_l14` and `cleric_improved_potent_spellcasting_l14`) and handle the branching at the character sheet / advancement layer, not the content surface.

Option 3 is probably the lowest-cost workaround once the other gaps are resolved, but it requires the schema to allow optional precondition metadata so the surface can describe "this record is only applicable if the character has feature X."

---

## Minimum Widening Path

| Branch | Gaps forced |
|---|---|
| Divine Strike only | Gap 1 (passive_on_hit_rider family) + v4 atom for passive class feature on-hit rider |
| Potent Spellcasting only | Gap 2 (cantrip_damage_trigger family) + Gap 3 (grant_temp_hp) + Gap 4 (ability_modifier_times) |
| Both (full unit) | Gaps 1–5 |

**Divine Strike is the smaller widening** — all required v4 atoms already exist (`attack_roll`, `on_hit_window`, `damage`, `scale_die_count`). Only the new subgraph shape is required. Potent Spellcasting forces three additional widenings including a new effect atom.
