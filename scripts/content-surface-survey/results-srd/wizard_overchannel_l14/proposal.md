# Proposal: Overchannel (wizard L14) — structural_widening

## Unit

**Name:** Overchannel (Wizard L14)  
**Kind:** `class_feature`  
**Source:** SRD 5.2.1, Classes/Wizard#Level 14: Overchannel

## Why the unit does not fit

Overchannel has four mechanics that collectively force a structural widening:

### 1. Cast-time option pattern (structural — primary gap)

Overchannel fires as a choice the wizard makes *at the moment of casting a spell*, not as an independent activation. The relevant graph shape is:

```
spell_cast_window → [wizard decides to invoke Overchannel]
  → maximize damage roll of triggering spell
  → (if non-first use) self-damage consequence
```

The existing `ClassFeatureMechanics` family `activation` models `activate → direct immediate effect`. There is no family for "when you cast a qualifying spell, you may modify its outcome by invoking this feature." The closest surface analogy is the spell's own `activation` family, but that belongs to the spell, not to a class feature rider.

**Required addition:** A new class feature family — e.g. `spell_cast_option` — whose header carries a qualifying-spell predicate and whose body carries a cast-time effect (maximize rolls) plus an optional consequence (self-damage).

### 2. Maximize-damage effect (`modify_roll_substitute`) not in ClassFeatureEffect

The v4 taxonomy has the atom `modify_roll_substitute`. This concept fits Overchannel's payoff exactly: replace the triggering spell's damage roll with its maximum value. However, `ClassFeatureEffect` is currently:

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

Neither variant can express "replace the damage roll of the triggering spell with its maximum." A new variant is needed:

```typescript
export type MaximizeDamageRollEffect = {
  readonly kind: "maximize_damage_roll";
  readonly scope: "triggering_spell";
};
```

This is a `surface_widening` (v4 atom exists; surface variant is missing).

### 3. Self-damage consequence with bypass_resistance

Repeated use before a Long Rest inflicts Necrotic damage on the caster immediately after casting. Two properties are absent from `ClassFeatureEffect`:

- **Self-damage effect:** There is no `SelfDamageEffect` variant. The existing `HealHpEffect` with `target: "self"` covers healing; damage-to-self is the inverse but is not modeled.
- **Bypass resistance/immunity:** The damage "ignores Resistance and Immunity." The v4 atom `bypass_resistance` exists, but no surface type attaches it to a class feature damage effect.

Proposed new variant:

```typescript
export type SelfDamageConsequenceEffect = {
  readonly kind: "self_damage_consequence";
  readonly damageType: DamageType;
  readonly amount: DiceAmount;     // see §4 for the scaling challenge
  readonly bypassResistance: true;
  readonly bypassImmunity: true;
};
```

This is a `surface_widening` for each of the two missing surface properties.

### 4. Escalating penalty — new LevelAxis variant

The self-damage amount increases with each use before the Long Rest:
- 1st use: no damage  
- 2nd use: 2d12 × slot_level  
- 3rd use: 3d12 × slot_level  
- Nth use: N × d12 × slot_level  

The scale axis is "number of times this feature has been used since the last Long Rest." `LevelAxis` currently allows:

```typescript
export type LevelAxis = "character" | "class" | "slot" | "subclass" | "proficiency_bonus";
```

None of these covers a within-rest use counter. A new variant is needed:

```typescript
// proposed
| "use_count_before_long_rest"
```

This is a `surface_widening` (new variant of an existing surface type).

### 5. Qualifying-spell predicate (scope filter)

Overchannel applies only when the wizard casts a Wizard spell using a spell slot of levels 1–5 that deals damage. There is no surface type for attaching a class-feature trigger to a filtered spell cast. The activation family has no `triggerPredicate` or scope-filter field.

This predicate would be part of the new `spell_cast_option` family header (see §1).

## Proposed new family sketch

```typescript
// proposed ClassFeatureMechanics addition
export type SpellCastOptionMechanics = {
  readonly family: "spell_cast_option";
  // Predicate: which spell casts may trigger this option
  readonly triggerPredicate: SpellCastPredicate;     // new surface type
  // Optional resource + reset cadence (Overchannel has use_count reset on long_rest;
  // first use is free, subsequent uses carry a consequence)
  readonly resource?: UseCountResource;
  readonly resetCadence?: RestResetCadence;
  // What the wizard gains when invoking
  readonly onInvoke: ClassFeatureEffect;             // needs MaximizeDamageRollEffect
  // What the wizard pays on non-first invocations
  readonly onRepeatInvoke?: ClassFeatureConsequence; // needs SelfDamageConsequenceEffect
};

export type SpellCastPredicate = {
  readonly classSpell?: ClassName;          // "wizard"
  readonly maxSlotLevel?: number;           // 5
  readonly requiresDamage?: true;
};
```

## Summary

| Gap | Classification | Existing v4 atom? |
|-----|---------------|-------------------|
| Cast-time option family for class features | `structural_widening` | `spell_cast_window` exists in v4 |
| `modify_roll_substitute` in ClassFeatureEffect | `surface_widening` | Yes: `modify_roll_substitute` |
| Self-damage consequence in ClassFeatureEffect | `surface_widening` | `damage` atom exists |
| Bypass resistance/immunity on class feature damage | `surface_widening` | `bypass_resistance` atom exists |
| LevelAxis `use_count_before_long_rest` | `surface_widening` | No matching axis |
| Qualifying-spell predicate | `surface_widening` | — |

The dominant classification is `structural_widening` because the activation family's mental model (independent activation → effect) fundamentally cannot represent a cast-time modifier on a subsequent spell. A new `spell_cast_option` family is required before any surface widening can be applied.
