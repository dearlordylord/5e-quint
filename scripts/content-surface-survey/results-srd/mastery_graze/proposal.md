# Proposal: Widenings required for Graze mastery

## Unit

- **Name:** Graze
- **Kind:** mastery
- **Source:** SRD 5.2.1 (Playing the Game — Weapons, Mastery Properties)

## Source text

> **Graze.** If your attack roll misses a creature, you can deal damage to that creature equal to the ability modifier you used to make the attack roll. This damage is the same type as the weapon's damage, and the damage can't be increased in any way, other than increasing the ability modifier.

## Why encoding was blocked

Graze cannot fit `OnHitTriggerMechanics` — the only mastery family currently in `MasteryMechanics`. Three distinct widenings are required before an honest encoding is possible.

---

## Widening 1 — New mastery family: `on_miss_trigger` (structural_widening)

**What the rule forces:**
Graze fires *when the attack roll misses*, not when it hits. The tracer's mastery subgraph (Subgraph G — On-Hit Rider) roots at an `attack_roll` resolution and immediately opens an `on_hit_window`. There is no path from a miss to a mastery effect.

**Proposed shape:**

```typescript
export type OnMissTriggerMechanics = {
  readonly family: "on_miss_trigger";
  readonly trigger: MasteryTrigger;   // weapon_hit / weapon_hit_melee_only scoped to miss
  readonly optional: boolean;
  readonly effect: MasteryEffect;
  readonly usageLimit?: MasteryUsageLimit;
};

export type MasteryMechanics = OnHitTriggerMechanics | OnMissTriggerMechanics;
```

The tracer would need a new `on_miss_window` opening path from `attack_roll` to the effect, parallel to the existing `on_hit_window` path.

**Graph shape:**
```
mastery_root → attack_roll → on_miss_window → <effect> → target (primary)
```

---

## Widening 2 — New `DiceAmount` variant: `ability_modifier` (surface_widening)

**What the rule forces:**
Graze damage = the ability modifier value (STR or DEX mod, as appropriate). This is a plain integer, not a dice expression. `DiceAmount` only expresses dice rolls (`DiceExpr` base) with optional level scaling. No existing variant can represent "the value of the ability modifier used for the attack roll."

**Proposed variant:**

```typescript
export type DiceAmount =
  | { readonly kind: "fixed"; readonly expr: DiceExpr }
  | { readonly kind: "ability_modifier"; readonly ability: "attack_ability" }
  // ... existing variants
```

`"attack_ability"` is a reference back to the weapon's attack ability (STR/DEX/finesse choice), not a fixed `Ability` enum value. This may require a small new type or a `"attack_ability"` sentinel.

---

## Widening 3 — Weapon-relative damage type (surface_widening)

**What the rule forces:**
Graze damage type = "the same type as the weapon's damage." `DamageType` is a closed union of 13 concrete strings; there is no "inherit from weapon" variant.

**Proposed variant:**

```typescript
export type DamageType =
  | "acid" | "bludgeoning" | ... | "thunder"  // existing
  | "weapon_damage_type";                       // new sentinel: same type as wielded weapon
```

Alternatively a `DamageTypeSource` discriminated union could be introduced, but a sentinel string keeps the change minimal.

---

## Impact assessment

| Layer | Change required |
|---|---|
| `types.ts` | Add `OnMissTriggerMechanics`, update `MasteryMechanics` union; add `{ kind: "ability_modifier" }` to `DiceAmount`; add `"weapon_damage_type"` to `DamageType` |
| `tracer.ts` | Add `on_miss_trigger` case in `traceMasteryMechanics`; add `ability_modifier` case in `traceDiceAmountScaling` / effect label; handle `weapon_damage_type` in `traceMasteryEffect` |
| Atom inventory | `on_miss_window` is already in v4 atom taxonomy (§4 Window Atoms); no new atoms needed. The effect is `damage` (existing). |

All three widenings are narrow. No new v4 atoms are required — `on_miss_window` already exists in the taxonomy (v4 §4). The structural gap is purely in the authored surface shape.

---

## Encoding blocked — no `.dhall` / `.json` / `.trace.md` produced

Forcing Graze into `OnHitTriggerMechanics` would produce a trace that misrepresents the mechanic as an on-hit effect. That trace would be misleading. Per the guardrails: *"A misleading trace is worse than no trace."*
