# Proposal: Widenings Required for Healing Word

**Unit:** Healing Word (Level 1, Abjuration, Bonus Action)  
**Outcome:** `surface_widening`

---

## Why it doesn't fit

Healing Word is an instantaneous bonus-action spell that restores HP to one visible creature in range, with no attack roll and no saving throw. The `activation` family is the correct structural home, but three surface-level gaps prevent honest encoding.

---

## Gap 1 — `ActivationPhase` missing a direct-apply variant

**Current surface:**
```typescript
export type ActivationPhase =
  | { readonly kind: "attack_roll"; ... }
  | { readonly kind: "save_gate"; ... };
```

Both existing variants require a roll resolution gate before any effect fires. Healing Word has **no gate** — the heal fires unconditionally on cast (the caster simply targets a creature they can see within range).

**Proposed widening:**
```typescript
| {
    readonly kind: "direct_apply";
    readonly attachment: Attachment;
    readonly effect: Effect;
  }
```

This covers all "unconditional effect" spells: heal spells (Healing Word, Cure Wounds), buff spells that apply an effect without rolling (Bless is ongoing_effect, but some single-phase unconditional effects exist). The tracer would emit the effect atom directly off the `activate` procedure, skipping any resolution node.

---

## Gap 2 — `Effect` (spell) missing a `heal_hp` variant

**Current surface:**
```typescript
export type Effect = DamageEffect | NoneEffect;
```

`HealHpEffect` exists in `ClassFeatureEffect` but is not reachable from spell phases. The direct-apply phase can only carry spells effects, so `heal_hp` must be promoted (or re-declared) in the spell `Effect` union.

**Proposed widening:**
```typescript
export type HealEffect = {
  readonly kind: "heal_hp";
  readonly amount: DiceAmount;
  readonly target: "target_creature";
};

export type Effect = DamageEffect | HealEffect | NoneEffect;
```

The `target` field on the heal can reference the `direct_apply` phase's attachment (same pattern as damage effects attaching to the phase's attachment). Reusing the existing `heal` v4 atom in the tracer — no atom-level widening needed.

---

## Gap 3 — `DiceExpr` cannot represent a dynamic stat addend

**Current surface:**
```typescript
export type DiceExpr = {
  readonly dice: number;
  readonly dieSize: number;
  readonly flat?: number;          // static integer only
};
```

Healing Word heals `2d4 + spellcasting ability modifier`. The modifier is a character stat that varies per caster — it cannot be encoded as a fixed `flat: number`.

**Proposed widening (option A — named stat addend):**
```typescript
export type StatRef = "spellcasting_ability_modifier" | "proficiency_bonus";

export type DiceExpr = {
  readonly dice: number;
  readonly dieSize: number;
  readonly flat?: number;
  readonly statAddend?: StatRef;   // dynamic stat added to the roll
};
```

**Proposed widening (option B — expand DiceAmount):**
Add a `stat_scaled` DiceAmount kind that holds a base DiceExpr plus a named stat coefficient. Either option works; Option A is narrower.

**Note:** Cure Wounds has the identical issue (`1d8 + spellcasting ability modifier`), so this pressure will recur.

---

## What encodes cleanly

- **Bonus action casting time** → `{ kind: "bonus_action" }` ✓  
- **Range: 60 ft** → `{ kind: "point", feet: 60 }` ✓  
- **Components: V only** → `{ v: true, s: false, m: false }` ✓  
- **Duration: Instantaneous** → `{ kind: "instantaneous" }` ✓  
- **Single target** → `{ kind: "target", selection: { mode: "one" } }` ✓  
- **Slot scaling (+2d4/level above 1)** → `{ kind: "linear_per_level", axis: "slot", base: { dice: 2, dieSize: 4 }, perLevel: { dice: 2 }, startingAtLevel: 1 }` ✓  

---

## Tracer impact

Once Gap 1 and Gap 2 are resolved, the tracer's `traceActivation` function needs a new `case "direct_apply"` branch that:
1. Emits the attachment node
2. Calls `traceEffect` for the heal effect (which emits a `heal` atom)
3. Emits a `grants` edge from the procedure to the effect
4. Emits an `attaches_to` edge from the effect to the attachment

No new v4 atoms are required — `heal` already exists in the taxonomy.
