# Proposal: Widenings required for Befuddlement

**Unit:** Befuddlement (level 8 enchantment, SRD 5.2.1)  
**Outcome:** `surface_widening`  
**Family:** `activation` / `save_gate` (correct; no structural widening needed)

---

## What the spell does

Single-target INT save (150 ft range, instantaneous duration):

- **On fail:** 10d12 Psychic damage + indefinite condition ("can't cast spells or take the Magic action"), with a saving throw repeat at the end of every 30 days to end the condition; also ends on Greater Restoration / Heal / Wish.
- **On success:** half damage only, no condition.

---

## Gap 1 — `apply_condition` missing from spell `Effect`

`Effect` in `types.ts` is:

```typescript
export type Effect = DamageEffect | NoneEffect;
```

The on-fail branch needs to apply a condition. `apply_condition` already appears in the mastery layer (`SaveGateRiderResult`) but has never been lifted into the spell `Effect` type.

**Proposed widening:**

```typescript
export type ApplyConditionEffect = {
  readonly kind: "apply_condition";
  readonly condition: Condition;
};

export type Effect = DamageEffect | NoneEffect | ApplyConditionEffect;
```

---

## Gap 2 — `Condition` enum covers only `"prone"`

```typescript
export type Condition = "prone";
```

"Can't cast spells or take the Magic action" is not representable. The SRD defines a rich set of conditions (blinded, charmed, frightened, incapacitated, paralyzed, petrified, poisoned, prone, restrained, stunned, unconscious) and Befuddlement's debuff is a named, rule-defined state (described as "Befuddlement" in the Rules Glossary of SRD 5.2.1).

**Proposed widening:**

Expand `Condition` to include at minimum:

```typescript
export type Condition =
  | "prone"
  | "incapacitated"        // suppresses actions/reactions — closest parent
  | "befuddled";           // SRD 5.2.1 Rules Glossary named condition
```

The `Befuddlement` condition in SRD 5.2.1 Rules Glossary specifically prevents spellcasting and the Magic action. It is distinct from `incapacitated` (which is broader). A dedicated `"befuddled"` condition value is the honest choice.

---

## Gap 3 — Single `onFail: Effect` cannot deliver compound effects

Currently each save-gate branch is:

```typescript
onFail: Effect   // a single Effect
```

Befuddlement's on-fail delivers **both** damage and a condition simultaneously. There is no compound or sequence variant in `Effect`.

**Proposed widening (option A — compound variant):**

```typescript
export type CompoundEffect = {
  readonly kind: "compound";
  readonly effects: ReadonlyArray<DamageEffect | ApplyConditionEffect>;
};

export type Effect = DamageEffect | NoneEffect | ApplyConditionEffect | CompoundEffect;
```

**Proposed widening (option B — branch restructure):**

Replace `onFail: Effect` with `onFail: ReadonlyArray<Effect>` and let the tracer iterate. This is a more invasive change but avoids a new compound kind.

Option A is preferred: it is additive, keeps the tracer's switch exhaustive, and the `compound` concept is already latent in the v4 subgraph model (multiple effect atoms granted from a single resolution node).

---

## Gap 4 — `repeat_save` and non-combat cadence absent from `types.ts`

The v4 taxonomy includes `repeat_save` as a Resolution atom. It is not in `types.ts`. More specifically, Befuddlement's repeat save fires at a calendar interval (end of every 30 days), not at the end of a round or turn. No cadence grammar exists in the surface for out-of-combat intervals.

**Proposed widening:**

Add a `repeat_save` lifecycle shape to the surface. At minimum:

```typescript
export type RepeatSave = {
  readonly kind: "repeat_save";
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly cadence:
    | { readonly kind: "end_of_turn" }
    | { readonly kind: "end_of_days"; readonly days: number };
  readonly onSuccess: "end_effect";
};
```

This would attach to the `apply_condition` effect as a termination path alongside the named-spell dispel clause (Greater Restoration / Heal / Wish). The named-spell dispel clause is a separate gap not modeled here (it requires a `dispel_by_named_spell` surface shape or a caller-owned signal — leaning toward caller-owned per ARCHITECTURE.md).

---

## Summary

| Gap | Kind | Atoms affected |
|-----|------|----------------|
| `apply_condition` absent from spell `Effect` | `new_variant` | `apply_condition` (already in v4) |
| `Condition` too narrow | `new_variant` | `apply_condition` (widened domain) |
| Compound on-fail not expressible | `new_variant` | new `compound` Effect variant |
| `repeat_save` and 30-day cadence absent | `new_variant` | `repeat_save` (already in v4) |

No new v4 taxonomy atoms are required. All four gaps can be addressed by adding variants to existing surface types.
