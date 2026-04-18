# Widening Proposal: Power Word Heal

## Unit

- **Slug**: `power_word_heal`
- **Kind**: spell (level 9, enchantment, instantaneous, action, 60 ft, V/S)
- **Outcome**: `surface_widening`

## Why it doesn't fit

Power Word Heal is an unconditional single-target heal-all spell with secondary condition-removal riders. It cannot be encoded honestly because the surface type system is missing four shapes that the spell requires:

### 1. `ActivationPhase` needs an `unconditional` variant

**Current state:** `ActivationPhase` is a discriminated union of `attack_roll` and `save_gate` only.

**Gap:** Power Word Heal applies its effects to the target with no roll of any kind — no attack roll, no saving throw. There is no phase variant for "apply effect directly to target."

**Proposed shape:**
```typescript
| {
    readonly kind: "unconditional";
    readonly attachment: Attachment;
    readonly effect: Effect;
  }
```

**SRD evidence:** "A wave of healing energy washes over one creature you can see within range."

---

### 2. `DiceAmount` needs a `restore_all` variant

**Current state:** `DiceAmount` supports `fixed` (a DiceExpr), `threshold_tiers`, and `linear_per_level`. All are dice expressions.

**Gap:** Power Word Heal restores **all** hit points — it sets HP to maximum, not a rolled amount. This is not representable as any dice expression.

**Proposed shape:**
```typescript
| { readonly kind: "restore_all" }
```

This variant carries no parameters; the semantic is "restore target to its maximum HP."

**SRD evidence:** "The target regains all its Hit Points."

---

### 3. Spell `Effect` needs a `heal_hp` variant

**Current state:** `Effect = DamageEffect | NoneEffect`. Spells have no way to express a heal effect.

`HealHpEffect` exists in `ClassFeatureEffect` but is not reachable from the spell activation pipeline.

**Gap:** Power Word Heal's primary mechanic is healing. Without `heal_hp` in the spell `Effect` union, healing spells cannot be encoded at all.

**Proposed change:** Promote `HealHpEffect` into the shared `Effect` union (or duplicate it there), so spell phases can reference it.

**SRD evidence:** "The target regains all its Hit Points."

---

### 4. Spell `Effect` needs a `remove_condition` variant

**Current state:** `Effect = DamageEffect | NoneEffect`. No condition-removal effect exists in the spell effect type.

The v4 atom `remove_condition` is in the taxonomy. The surface encoding shape is missing.

**Gap:** Power Word Heal removes up to five named conditions (Charmed, Frightened, Paralyzed, Poisoned, Stunned) unconditionally. This is a distinct mechanical effect with no surface representation.

**Proposed shape:**
```typescript
export type RemoveConditionEffect = {
  readonly kind: "remove_condition";
  readonly conditions: ReadonlyArray<Condition>;
};
```

The `Condition` type currently only includes `"prone"` (defined for mastery use). It needs to be widened to include at least `"charmed" | "frightened" | "paralyzed" | "poisoned" | "stunned"`.

**SRD evidence:** "If the creature has the Charmed, Frightened, Paralyzed, Poisoned, or Stunned condition, the condition ends."

---

### 5. (Secondary) Prone/Reaction rider needs a new surface shape

**Gap (narrower):** "If the creature has the Prone condition, it can use its Reaction to stand up" — this opens a player-choice reaction window gated on the Prone condition being present. It is not the same as `remove_condition` (the Prone condition is not removed unconditionally; instead the creature is *offered* a reaction to stand). There is no surface shape for a conditional reaction grant.

This is the narrowest widening — it could be omitted from a first-pass implementation and noted as an omission.

**SRD evidence:** "If the creature has the Prone condition, it can use its Reaction to stand up."

---

## Minimum viable widening set (ordered)

1. Add `restore_all` to `DiceAmount` (unlocks full-heal encoding)
2. Add `heal_hp` to spell `Effect` union (unlocks heal spells generally)
3. Widen `Condition` to include the five named conditions
4. Add `remove_condition` to spell `Effect` union (unlocks condition-removal spells)
5. Add `unconditional` to `ActivationPhase` (unlocks spells without rolls)
6. (Optional) Add Prone/Reaction rider shape

Steps 1–5 collectively unblock Power Word Heal (minus the Prone/Reaction rider). They also unblock other healing spells (Cure Wounds, Heal, Lesser Restoration, Greater Restoration) and are broadly useful across the spell catalog.

## v4 atom coverage

All required v4 atoms already exist:
- `heal` — present
- `remove_condition` — present
- `activate` — present

No new atoms needed. All gaps are surface encoding shapes (new variants of existing types).
