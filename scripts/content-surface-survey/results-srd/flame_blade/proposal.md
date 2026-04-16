# Widening Proposal: Flame Blade

**Unit:** Flame Blade (level 2 evocation)
**Outcome:** `surface_widening`
**Confidence:** high

---

## Why `ongoing_effect` is the right outer family

Flame Blade is a concentration spell (up to 10 minutes) that persists and enables an attack option repeatedly for its duration. The `ongoing_effect` family covers exactly this shape: a spell persists on an attachment and carries an operation that fires within that persistence.

The outer fields encode cleanly:

| Field | Value |
|---|---|
| `family` | `"ongoing_effect"` |
| `level` | `2` |
| `school` | `"evocation"` |
| `castingTime` | `{ kind: "bonus_action" }` |
| `range` | `{ kind: "self" }` |
| `components` | `{ v: true, s: true, m: "a sumac leaf" }` |
| `duration` | `{ kind: "concentration", upTo: { unit: "minute", amount: 10 } }` |
| `attachment` | `{ kind: "self" }` |

The upcast scaling (+1d6 fire per slot level above 2) is expressible as `DiceAmount.linear_per_level` with `axis: "slot"` once the core operation gap is resolved.

---

## Gap 1 — Missing `OngoingOperation` variant for conjured-weapon attack

**Evidence:** "As a Magic action, you can make a melee spell attack with the fiery blade."

The two existing `OngoingOperation` variants do not cover this:

- `roll_modifier` — passively modifies rolls on the attachment scope (Bless, Bane). Does not model an active attack.
- `damage_on_hit` — a rider that fires when the caster hits a creature already in the attachment scope (Hunter's Mark). The caster's attack is external to the spell; the spell just adds a damage bonus.

Flame Blade is neither. The spell **is** the attack: no attack exists until the caster spends the Magic action. The blade itself is the attack source, not a modifier on another attack.

**Proposed widening:**

```typescript
export type ConjuredWeaponAttackOperation = {
  readonly kind: "conjured_weapon_attack";
  readonly activationCost: "magic_action";  // or generalized: { kind: "action"; standardKind: "magic" }
  readonly attackKind: "melee_spell_attack";
  readonly damageType: DamageType;
  readonly amount: DiceAmount;  // base dice only; ability modifier handled by Gap 2
};

export type OngoingOperation =
  | RollModifierOperation
  | DamageOnHitOperation
  | ConjuredWeaponAttackOperation;  // new
```

This maps to a graph shape distinct from the existing `on_hit_window` rider:

```
activate → on_going_effect → (concentration lock, persist)
ongoing_effect → conjured_weapon_node (self, as weapon attachment)
conjured_weapon_node → action_window (magic_action cost, per use)
action_window → attack_roll (melee_spell_attack)
attack_roll → on_hit_window → damage (fire, 3d6 [+ spellcasting mod])
```

The `activationCost` field on the operation closes the "how to use this" gap that `roll_modifier` and `damage_on_hit` never need (they fire automatically).

---

## Gap 2 — `DiceExpr` cannot express a dynamic ability-modifier addend

**Evidence:** "On a hit, the target takes Fire damage equal to 3d6 plus your spellcasting ability modifier."

`DiceExpr.flat` is `readonly flat?: number` — a fixed integer baked at authoring time. Spellcasting ability modifier is a dynamic per-caster value (e.g., +4 for a druid with 18 Wisdom) that cannot be collapsed to a constant.

**Proposed widening:**

Option A — extend `DiceExpr` with an optional ability modifier field:

```typescript
export type DiceExpr = {
  readonly dice: number;
  readonly dieSize: number;
  readonly flat?: number;
  readonly abilityModifier?: "spellcasting" | "str" | "dex" | "con" | "int" | "wis" | "cha";
};
```

Option B — new discriminated `DamageFormula` union that allows composing dice + flat + ability modifier as separate addends. More expressive but heavier.

Option A is narrower (single-field addition to existing `DiceExpr`) and sufficient for Flame Blade, Divine Smite, and other spells that add a spellcasting modifier to damage.

---

## Omissions (not gaps in core mechanics)

- **Light shedding** ("sheds Bright Light in a 10-foot radius and Dim Light for an additional 10 feet") — environmental/narrative effect. Per `ARCHITECTURE.md`, notification surfaces and environmental effects are caller-owned, not core mechanics atoms. Correctly omitted.
- **Re-evocation** ("If you let go of the blade, it disappears, but you can evoke it again as a Bonus Action") — fringe interaction for dual-wielding or forced-drop scenarios. Not part of the attack mechanic. Omitting is safe for core encoding; could be noted in a future `blade_persistence` sub-feature if needed.

---

## Encoding path once gaps are filled

With both widenings in place, `flame_blade.dhall` would look like:

```dhall
{ kind = "spell"
, id = "flame_blade"
, name = "Flame Blade"
, provenance = { kind = "srd-5.2.1", section = "Spells/Descriptions-E-F#Flame Blade" }
, description = "..."
, mechanics =
    { family = "ongoing_effect"
    , level = 2
    , school = "evocation"
    , castingTime = { kind = "bonus_action" }
    , range = { kind = "self" }
    , components = { v = True, s = True, m = Some "a sumac leaf" }
    , duration = { kind = "concentration", upTo = { unit = "minute", amount = 10 } }
    , attachment = { kind = "self" }
    , operation =
        { kind = "conjured_weapon_attack"
        , activationCost = "magic_action"
        , attackKind = "melee_spell_attack"
        , damageType = "fire"
        , amount =
            { kind = "linear_per_level"
            , axis = "slot"
            , base = { dice = 3, dieSize = 6, abilityModifier = Some "spellcasting" }
            , perLevel = { dice = 1 }
            , startingAtLevel = 3
            }
        }
    }
}
```
