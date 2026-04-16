# Widening Proposal: True Strike

**Outcome:** `surface_widening`  
**Unit:** True Strike (cantrip, Divination, SRD 5.2.1)

---

## What fits

- Family: `activation` — correct, True Strike is an instantaneous one-shot spell.
- Phase kind: `attack_roll` — correct, the core is an attack roll.
- Duration: `instantaneous` — fits.
- Casting time: `action` — fits.
- Range: `self` — fits.
- The cantrip scaling (+1d6 Radiant at character levels 5, 11, 17) is representable as a `threshold_tiers` `DiceAmount` with `axis = "character"`.

## What does not fit

### 1. `AttackKind` has no weapon attack variant

**Current:** `"ranged_spell_attack" | "melee_spell_attack"`

True Strike makes a **weapon attack**, not a spell attack. The spell directs the caster to attack with the weapon used in casting — the weapon's properties (reach, range, finesse, two-handed, thrown, etc.) apply. A `melee_spell_attack` or `ranged_spell_attack` does not use a physical weapon; it is a purely magical attack roll against AC. These are mechanically distinct:

- Spell attacks cannot critically hit on a 19 (unless modified), weapon attacks can.
- Weapon attacks interact with weapon-specific features (Smite, Sneak Attack eligibility, mastery).
- The damage dice come from the weapon, not the spell.

**Proposed addition:**

```typescript
export type AttackKind =
  | "ranged_spell_attack"
  | "melee_spell_attack"
  | "melee_weapon_attack"   // new — weapon attack initiated by a spell
  | "ranged_weapon_attack"; // new — ranged weapon attack initiated by a spell
```

---

### 2. `DiceAmount` has no weapon damage variant

**Current:** `{ kind: "fixed"; expr: DiceExpr } | threshold_tiers | linear_per_level`

The base damage of True Strike is the weapon's damage dice — 1d6 for a shortsword, 1d8 for a longsword, 1d10 for a glaive, etc. A fixed `DiceExpr` cannot represent this; the amount is determined at runtime by the equipped weapon.

**Proposed addition:**

```typescript
export type DiceAmount =
  | { readonly kind: "fixed"; readonly expr: DiceExpr }
  | { readonly kind: "weapon_damage" }                     // new — defers to equipped weapon's damage dice
  | { readonly kind: "weapon_damage_plus"; readonly extra: DiceAmount } // optional convenience form
  | threshold_tiers
  | linear_per_level;
```

The `weapon_damage` variant has no static fields because the dice are entirely runtime-determined. The extra Radiant scaling is a second effect, not a modifier of the weapon damage.

---

### 3. `DamageEffect.damageType` has no player-choice variant

**Current:** `DamageType` is a closed union of 13 named damage types. `DamageEffect` takes a single fixed `damageType`.

True Strike lets the player choose between Radiant and the weapon's normal damage type at the moment of the hit. Neither a player-choice union nor a `"weapon_normal"` sentinel exists.

**Proposed addition:**

```typescript
export type DamageTypeSource =
  | DamageType                              // existing: fixed type
  | { readonly kind: "weapon_normal" }      // new: defers to weapon's damage type
  | {                                       // new: player chooses at hit time
      readonly kind: "player_choice";
      readonly options: ReadonlyArray<DamageType | { readonly kind: "weapon_normal" }>;
    };
```

Or more narrowly, just add the two sentinel variants that True Strike requires:

```typescript
// In DamageEffect:
export type DamageEffect = {
  readonly kind: "damage";
  readonly damageType:
    | DamageType
    | { readonly kind: "weapon_normal" }
    | { readonly kind: "player_choice"; readonly options: ReadonlyArray<DamageType | "weapon_normal"> };
  readonly amount: DiceAmount;
};
```

---

### 4. `ActivationPhase` attack_roll has no spellcasting ability override

**Current:** The `attack_roll` phase has `attackKind` and `onHit`/`onMiss` effects but no mechanism to express which ability modifier is used for the roll.

True Strike explicitly substitutes the caster's spellcasting ability modifier for STR/DEX on both the attack roll and the damage roll. This is not a rider or ongoing effect — it is integral to this attack.

**Proposed addition** (narrowest honest form):

```typescript
// In the attack_roll ActivationPhase:
export type AttackAbilitySource =
  | { readonly kind: "default" }             // STR or DEX per weapon (no override)
  | { readonly kind: "spellcasting_ability" }; // override to spellcasting ability

// Add to the attack_roll phase:
{
  readonly kind: "attack_roll";
  readonly attachment: Attachment;
  readonly attackKind: AttackKind;
  readonly abilitySource?: AttackAbilitySource; // optional: defaults to "default"
  readonly onHit: Effect;
  readonly onMiss: Effect;
}
```

---

## Example shape (for illustration only — not a working JSON)

```
attack_roll phase:
  attackKind: "melee_weapon_attack"  (or "ranged_weapon_attack")
  abilitySource: { kind: "spellcasting_ability" }
  onHit:
    damage:
      damageType: { kind: "player_choice", options: ["radiant", "weapon_normal"] }
      amount: { kind: "weapon_damage" }
    + extra damage (only if dealing radiant or on any hit per cantrip text):
      damageType: "radiant"
      amount: threshold_tiers axis=character base={0d6} tiers=[{atL5: 1d6}, {atL11: 2d6}, {atL17: 3d6}]
```

Note: the cantrip upgrade text says "the attack deals extra Radiant damage" regardless of which damage type the player chose. The extra Radiant is not conditional on choosing Radiant for the base damage — it's always added. This is a secondary effect that can be expressed with existing atoms once the base damage shape is in place.

---

## Summary

All four gaps are new variants of existing surface types — no new families, no new v4 atoms required. The v4 atom inventory (`attack_roll`, `damage`, `on_hit_window`, `scale_die_count`) is sufficient. The widenings are confined to `AttackKind`, `DiceAmount`, `DamageEffect.damageType`, and the `attack_roll` phase shape.
