# Proposal: Surface Widenings for Divine Spark (cleric_divine_spark)

## Unit

**Name:** Divine Spark  
**Kind:** class_feature (cleric)  
**Acquired at level:** 2 (via Channel Divinity)  
**Provenance:** SRD 5.2.1, section "Classes/Cleric#Level 2: Channel Divinity"

> Note: The heading "Divine Spark" does not appear as a standalone markdown heading in Cleric.md. It is a bold sub-item within the "Level 2: Channel Divinity" section. The extract-unit-text tool therefore reports it as not found. The full rule text is quoted below.

### Source Text

> **Divine Spark.** As a Magic action, you point your Holy Symbol at another creature you can see within 30 feet of yourself and focus divine energy at it. Roll 1d8 and add your Wisdom modifier. You either restore Hit Points to the creature equal to that total or force the creature to make a Constitution saving throw. On a failed save, the creature takes Necrotic or Radiant damage (your choice) equal to that total. On a successful save, the creature takes half as much damage (round down).
>
> You roll an additional d8 when you reach Cleric levels 7 (2d8), 13 (3d8), and 18 (4d8).

---

## Outcome: `surface_widening`

The `activation` family for class features exists and is the correct family. The unit's full mechanics cannot be encoded because four distinct surface shapes are missing. All required v4 taxonomy atoms exist (`choose`, `save_gate`, `damage`, `heal`, `scale_die_count`, `use_count`). The gaps are entirely in the authored surface types.

---

## What Fits (no widening needed)

### Channel Divinity resource

The use-count pool with tiered cap and partial-short/full-long reset is representable:

```
resource: { kind: "use_count", cap: { kind: "threshold_tiers", axis: "class", base: 2, tiers: [{ atLevel: 6, value: 3 }, { atLevel: 18, value: 4 }] } }
resetCadence: { kind: "partial_short_full_long", shortRestRefill: 1 }
```

### Die-count scaling

The 1d8 → 2d8 → 3d8 → 4d8 scaling by class level tier fits `DiceAmount.threshold_tiers` with `scale_die_count`:

```
amount: { kind: "threshold_tiers", axis: "class", base: { dice: 1, dieSize: 8 }, tiers: [{ atLevel: 7, override: { dice: 2 } }, { atLevel: 13, override: { dice: 3 } }, { atLevel: 18, override: { dice: 4 } }] }
```

---

## Gap 1: `ClassFeatureActivationCost` missing `action` variant

**Missing:** `{ readonly kind: "action"; readonly actionKind?: StandardActionKind }`

Divine Spark costs a **Magic action** (one of the SRD's 12 standard action kinds). The surface only supports `free` and `bonus_action`. This is a clearly missing variant — the same shape needed for any class feature that costs your action.

**Proposed addition:**
```typescript
export type ClassFeatureActivationCost =
  | { readonly kind: "free" }
  | { readonly kind: "bonus_action" }
  | { readonly kind: "action"; readonly actionKind: StandardActionKind };  // NEW
```

For Divine Spark: `{ kind: "action", actionKind: "magic" }`.

---

## Gap 2: `ClassFeatureEffect` missing choice mechanism

**Missing:** A `choose_effect` variant allowing player-selected branching at use time.

The cleric picks at the moment of activation: either heal OR force a saving throw. This is fundamentally a `choose` procedure (v4 taxonomy atom), but the surface `ClassFeatureEffect` union is a single-outcome type with no branching:

```typescript
export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect;
```

**Proposed addition:**
```typescript
export type ChooseEffect = {
  readonly kind: "choose_effect";
  // Exactly one branch is taken at use time; caller chooses.
  readonly choices: ReadonlyArray<ClassFeatureEffect>;
};

export type ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect | ChooseEffect;
```

For Divine Spark, `choices` would contain [HealHpEffect, SaveGateDamageEffect].

---

## Gap 3: `ClassFeatureEffect` missing save-gate damage effect

**Missing:** A save-gate damage effect variant for class features.

The damage branch of Divine Spark requires: target makes a CON saving throw (DC = cleric's spell save DC); on fail, takes full damage; on success, takes half. The spell surface has `ActivationPhase.save_gate` for this exact pattern, but `ClassFeatureEffect` has no equivalent.

**Proposed addition:**
```typescript
export type SaveGateDamageEffect = {
  readonly kind: "save_gate_damage";
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly damageType: DamageTypeOrChoice;  // see Gap 5
  readonly amount: DiceAmount;
  readonly onFail: "full";
  readonly onSuccess: "half";  // or a more general Effect if needed
};

export type ClassFeatureEffect =
  | GrantExtraActionEffect
  | HealHpEffect
  | ChooseEffect
  | SaveGateDamageEffect;
```

For Divine Spark: `{ kind: "save_gate_damage", ability: "con", dc: { kind: "caster_spell_save_dc" }, damageType: ..., amount: ..., onFail: "full", onSuccess: "half" }`.

---

## Gap 4: `DiceExpr`/`DiceAmount` missing ability modifier addend

**Missing:** A way to express "Nd8 + [ability modifier]" as an amount.

The amount rolled is "1d8 and add your Wisdom modifier". The current `DiceExpr` has:
```typescript
export type DiceExpr = {
  readonly dice: number;
  readonly dieSize: number;
  readonly flat?: number;   // fixed number only
};
```

`flat` is a compile-time constant. A character's Wisdom modifier is runtime-dependent (it's their Wis score − 10) / 2, rounded down). This cannot be encoded as a fixed number.

**Proposed addition** (Option A — extend DiceExpr):
```typescript
export type DiceExpr = {
  readonly dice: number;
  readonly dieSize: number;
  readonly flat?: number;
  readonly abilityModifier?: Ability;  // NEW — adds the modifier of the named ability
};
```

**Option B** — a separate `DiceExprTerm` union type to allow composing dice + flat + modifier terms, keeping backward compatibility.

For Divine Spark: `{ dice: 1, dieSize: 8, abilityModifier: "wis" }`.

---

## Gap 5: `DamageType` missing "choose at use time" variant

**Missing:** A way to express that the player selects from a closed set of damage types at activation.

The cleric chooses Necrotic or Radiant at the moment of use. `DamageType` is a closed literal union; there is no mechanism to say "one of these two, chosen at runtime by the player."

**Proposed addition:**
```typescript
export type DamageTypeOrChoice =
  | DamageType
  | { readonly kind: "choice"; readonly options: ReadonlyArray<DamageType> };
```

For Divine Spark: `{ kind: "choice", options: ["necrotic", "radiant"] }`.

This pattern also applies to Chromatic Orb and other choice-of-damage-type spells.

---

## Authoring Impact Summary

| Gap | Widenings required | v4 atoms involved |
|---|---|---|
| Magic action cost | New `ClassFeatureActivationCost` variant | — (no new atom needed) |
| Choose heal vs damage | New `ChooseEffect` variant | `choose` (already in v4) |
| Save-gate damage effect | New `SaveGateDamageEffect` variant | `save_gate`, `damage` (already in v4) |
| Ability modifier addend | New field in `DiceExpr` | — (surface-level only) |
| Damage type choice | New `DamageTypeOrChoice` shape | — (surface-level only) |

All five gaps are pure surface widenings. No new v4 atoms are required — the v4 taxonomy already includes `choose`, `save_gate`, and `damage`. The tracer would need corresponding new branches in its exhaustive switch statements once the surface is widened.
