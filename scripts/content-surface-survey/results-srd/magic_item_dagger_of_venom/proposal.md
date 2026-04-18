# Proposal: magic_item_dagger_of_venom

## Outcome: surface_widening

The Dagger of Venom has two distinct mechanics:

1. **+1 passive** — fits cleanly as a `composite` passive: `modify_roll_numeric` on `["attack_roll"]` and `modify_damage_numeric`, both scoped to this weapon via `weaponFilter: { kind: "specific_item", itemId: "magic_item_dagger_of_venom" }`.
2. **Poison coating** — does not fit. Two independent surface gaps block encoding.

---

## Gap 1: No "activation-arms-an-on-hit-rider" pattern

**SRD text:**
> You can take a Bonus Action to magically coat the blade with poison. The poison remains for 1 minute or until an attack using this weapon hits a creature. That creature must succeed on a DC 15 Constitution saving throw…

The poison coating is a two-phase mechanic:

- **Phase A (activation):** Spend a Bonus Action. Arm the weapon with a pending on-hit effect. Resource: use_count 1, reset at dawn.
- **Phase B (on hit):** When the armed weapon hits, fire the save gate. The armed state is consumed.

Neither existing family captures this:

- `on_hit_trigger` fires on every weapon hit (or optionally when the wielder chooses). There is no activation step and no concept of an "armed state" that gates whether the rider fires.
- `activation` family has `ActivationPhase` variants: `attack_roll`, `save_gate`, `direct`, `ability_check_gate`, `random_table`. None of these represents "defer to the next weapon hit."

### Proposed widening

A new subgraph or variant for **armed-on-hit riders** that composes an activation step with a deferred on-hit trigger:

```
armed_on_hit_rider:
  activationCost: bonus_action
  resource: use_count { cap: fixed 1 }
  resetCadence: dawn
  armedDuration: { kind: "timed", value: { unit: "minute", amount: 1 } }
  trigger: weapon_hit (expends armed state on first qualifying hit)
  onHit: save_gate { ... }
```

The `armedDuration` covers the "1 minute or until hit" expiry clause. The `trigger` fires once and disarms.

This pattern may also apply to other "coat/anoint weapon" items in the SRD (e.g., applying poisons manually). A general `armed_on_hit_rider` subgraph is preferable to a per-item hack.

---

## Gap 2: SaveGateRiderResult cannot express damage

**SRD text:**
> …or take 2d10 Poison damage and have the Poisoned condition for 1 minute.

The save's fail branch requires **both** a damage instance (2d10 Poison) and a condition application (Poisoned).

`SaveGateRiderResult` is:
```typescript
export type SaveGateRiderResult =
  | { readonly kind: "apply_condition"; readonly condition: Condition }
  | { readonly kind: "none" };
```

This can only apply one condition or do nothing. It cannot express damage, and it cannot express a composite of damage + condition.

This is deliberately narrower than `EffectAtom` (the full save gate's `onFail: EffectAtom` supports composites). The narrowing was appropriate for simple mastery riders (Topple: just prone; Sap: just disadvantage), but the Dagger of Venom is the first item that uses an on-hit save gate with a damage component.

### Proposed widening

Widen `SaveGateRiderResult` to admit a damage variant and composite:

```typescript
export type SaveGateRiderResult =
  | { readonly kind: "apply_condition"; readonly condition: Condition }
  | { readonly kind: "damage"; readonly damageType: DamageTypeRef; readonly amount: DiceAmount }
  | { readonly kind: "composite"; readonly effects: ReadonlyNonEmptyArray<SaveGateRiderResult> }
  | { readonly kind: "none" };
```

A `composite` variant allows the Dagger of Venom's "2d10 Poison damage AND Poisoned condition" fail branch without replacing the whole type with `EffectAtom`.

---

## Encoding plan (once gaps are closed)

```
composite:
  parts:
    # Part 1 — passive +1
    - family: passive
      condition: { kind: "always" }
      grants:
        - { kind: "modify_roll_numeric", on: ["attack_roll"], delta: { kind: "fixed_dice", dice: 1, dieSize: 1, sign: "+" }, weaponFilter: { kind: "specific_item", itemId: "magic_item_dagger_of_venom" } }
        - { kind: "modify_damage_numeric", delta: { kind: "fixed_dice", dice: 1, dieSize: 1, sign: "+" }, weaponFilter: { kind: "specific_item", itemId: "magic_item_dagger_of_venom" } }

    # Part 2 — poison coating (needs armed_on_hit_rider + SaveGateRiderResult.composite)
    - family: armed_on_hit_rider        # NEW
      activationCost: { kind: "bonus_action" }
      resource: { kind: "use_count", cap: { kind: "fixed", uses: 1 } }
      resetCadence: { kind: "dawn" }
      armedDuration: { kind: "timed", value: { unit: "minute", amount: 1 } }
      trigger: { kind: "weapon_hit" }
      onHit:
        kind: save_gate
        ability: con
        dc: { kind: "fixed", dc: 15 }
        onFail:
          kind: composite                # NEW variant of SaveGateRiderResult
          effects:
            - { kind: "damage", damageType: "poison", amount: { kind: "fixed", expr: { dice: 2, dieSize: 10 } } }
            - { kind: "apply_condition", condition: "poisoned" }
            # Note: Poisoned is for 1 minute — duration on a condition rider not currently expressible either (separate gap)
        onSuccess: { kind: "none" }
```

Note: the Poisoned condition's duration ("for 1 minute") is a third gap — condition riders have no duration qualifier in the current surface. This is a pre-existing gap also observed in other poison/paralysis items and is not specific to this unit.
