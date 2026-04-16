# Proposal: Widening for Deflect Attacks (Monk L3)

## Outcome: `structural_widening`

The unit cannot be honestly encoded. Phase 1 is blocked by two surface gaps; Phase 2 forces a genuinely new structural pattern with no analog in the current class feature surface.

---

## Mechanic Decomposition

### Phase 1 — Damage Reduction Reaction (always available)

> When an attack roll hits you and its damage includes Bludgeoning, Piercing, or Slashing damage, you can take a Reaction to reduce the attack's total damage against you. The reduction equals 1d10 plus your Dexterity modifier and Monk level.

- **Activation:** Reaction (triggered by: hit by attack with B/P/S damage)
- **Effect:** Reduce incoming damage by `1d10 + Dex mod + Monk level`
- **Resource:** Reaction quota (no use-count cap — one reaction per round by the reaction rule)

### Phase 2 — Focus Point Redirect (conditional on Phase 1)

> If you reduce the damage to 0, you can expend 1 Focus Point to redirect some of the attack's force. If you do so, choose a creature you can see within 5 feet of yourself if the attack was a melee attack or a creature you can see within 60 feet of yourself that isn't behind Total Cover if the attack was a ranged attack. That creature must succeed on a Dexterity saving throw or take damage equal to two rolls of your Martial Arts die plus your Dexterity modifier. The damage is the same type dealt by the attack.

- **Gate:** Phase 1 must reduce damage to exactly 0
- **Cost:** 1 Focus Point (optional; the monk chooses)
- **Target:** Attack-kind-conditional range — 5 ft (melee) or 60 ft no total cover (ranged)
- **Resolution:** Dexterity saving throw (monk spell save DC)
- **On fail:** `2× Martial Arts die + Dex mod` damage, type = same as triggering attack

---

## Required Widenings

### W1 — `ClassFeatureActivationCost.reaction` (surface_widening)

**Current:**
```typescript
export type ClassFeatureActivationCost =
  | { readonly kind: "free" }
  | { readonly kind: "bonus_action" };
```

**Needed:**
```typescript
export type ClassFeatureActivationCost =
  | { readonly kind: "free" }
  | { readonly kind: "bonus_action" }
  | { readonly kind: "reaction"; readonly trigger: ReactionTrigger };
```

The `ReactionTrigger` type already exists in the spell surface and could be reused. The specific trigger here would be `{ kind: "hit_by_attack_roll" }` with an additional damage-type filter (B/P/S), which may itself require a new filter variant on `ReactionTrigger`.

---

### W2 — `reduce_damage_taken` atom (atom_widening)

TAXONOMY v4 §12 explicitly names this as a deferred atom:

> `reduce_damage_taken` distinct from `grant_resistance` — single-group pressure from class-feature reactions; Not promoted; single-group pressure.

This unit is the single-group pressure. The atom needs to carry:
- A `DiceAmount` for the reduction (here: `1d10`, scaled by class level via `linear_per_level` with `flat` addends for Dex and Monk level — or a new formula reference)
- Target: `self` (the monk reduces their own damage)

**Draft atom:**
```typescript
export type ReduceDamageTakenEffect = {
  readonly kind: "reduce_damage_taken";
  readonly amount: DiceAmount;  // base dice; modifiers are character-stat addends
};
```

Note: The `+ Dex modifier + Monk level` addends are character-stat references, not static flat values. If `DiceAmount` cannot carry stat references, an additional surface widening is needed for stat-reference addends.

---

### W3 — Conditional follow-up subgraph (structural_widening)

There is no mechanism in `ClassFeatureMechanics` to express:

1. A gate on Phase 1's result (damage reduced to 0)
2. An optional subsequent activation
3. Consuming a different resource (Focus Points) for that activation
4. A target selection that branches on the triggering attack's kind (melee vs. ranged)
5. An outbound save_gate
6. Outbound damage with a runtime-inherited type

The closest analog in the spell surface is the `triggered_reaction` family's Prepare/Prompt/Commit subgraph (Subgraph A), but that pattern is wired to spell families and cannot be composed into a class feature without generalizing the subgraph pattern across feature types.

**Candidate new family:**
```
conditional_follow_up:
  gate: { kind: "damage_to_zero" }   // Phase 1 result gate
  cost: { kind: "focus_point"; amount: 1 }
  optional: true
  target: { kind: "attack_kind_conditional"; melee: ...; ranged: ... }
  resolution: save_gate
  onFail: DamageEffect (with inherited damage type)
  onSuccess: NoneEffect
```

This is a new structural subgraph not derivable from any existing composition of current atoms.

---

### W4 — Focus Point resource variant (surface_widening / atom_widening)

`UseCountResource` models a per-feature counter with rest-reset cadence. Monk Focus Points are a shared class-level pool acquired at L2 (Monk's Focus), refilled on rest, and consumed across multiple features. A new resource reference is needed:

```typescript
export type FocusPointExpenditure = {
  readonly kind: "focus_point";
  readonly amount: number;
};
```

Or a more general `named_pool_expenditure` pattern that references the class's shared resource by name.

---

### W5 — `DamageType.inherited_from_trigger` (surface_widening)

The redirected damage inherits its type from the triggering attack, not a fixed value. `DamageType` is a closed enum; a new variant is needed:

```typescript
export type DamageType =
  | "acid" | "bludgeoning" | ... // existing
  | { readonly kind: "inherited"; readonly from: "triggering_attack" };
```

Or, `DamageType` could be refactored to allow a tagged-union variant alongside the existing string literals.

---

## Classification

| Gap | Kind | Severity |
|-----|------|----------|
| `ClassFeatureActivationCost.reaction` | surface_widening | Phase 1 blocked |
| `reduce_damage_taken` effect atom | atom_widening | Phase 1 blocked |
| Conditional follow-up subgraph | structural_widening | Phase 2 blocked |
| Focus Point pool resource | surface_widening | Phase 2 blocked |
| Inherited damage type | surface_widening | Phase 2 blocked |

**Overall: `structural_widening`** — Phase 2 requires a new structural subgraph pattern. Even with W1–W2, Phase 1 could be encoded, but omitting Phase 2 would misrepresent the feature (Phase 2 is the feature's payoff — the offensive redirect — not a minor rider).

---

## Notes on Ordering

If the surface is widened incrementally:

1. **W1 + W2 first** enables honest partial encoding of Phase 1 only (with a documented omission of Phase 2).
2. **W3 is the blocking structural widening** for Phase 2. It is the most invasive change and likely requires a new `ClassFeatureMechanics` family variant or a generalized subgraph composition mechanism.
3. **W4 + W5** are prereqs for W3's full implementation but have narrower scope.

The TAXONOMY v4 `reduce_damage_taken` entry (W2) should be promoted to a first-class atom as part of any widening that addresses this unit, since this is now confirmed multi-unit pressure (Deflect Attacks, and the note implies Uncanny Dodge also exercises this shape).
