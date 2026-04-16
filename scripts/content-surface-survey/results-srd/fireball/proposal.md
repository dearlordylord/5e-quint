# Fireball — Surface Widening Proposal

**Unit:** Fireball (spell, srd-5.2.1, level 3)  
**Outcome:** `surface_widening`

## Gap

Fireball fits the `activation` / `save_gate` family cleanly in all respects except one: its saving throw outcome is **half damage on success**, not no damage.

The current `Effect` union in `types.ts` is:

```typescript
export type DamageEffect = {
  readonly kind: "damage";
  readonly damageType: DamageType;
  readonly amount: DiceAmount;
};

export type NoneEffect = { readonly kind: "none" };

export type Effect = DamageEffect | NoneEffect;
```

"Half as much damage on a successful save" cannot be expressed as an independent `DiceAmount`:

| Slot level | onFail | onSuccess (half) |
|-----------|--------|-----------------|
| 3 (base)  | 8d6    | 4d6             |
| 4         | 9d6    | 4.5d6 ← not an integer |
| 5         | 10d6   | 5d6             |
| 6         | 11d6   | 5.5d6 ← not an integer |

The half-damage amount is always relative to the onFail amount at the same slot level — it cannot be stated as a standalone `DiceExpr` / `DiceAmount` for arbitrary upcast levels. Any attempt to encode it as a separate fixed expression would be dishonest.

## Proposed Widening

Add a new `Effect` variant:

```typescript
export type HalfOfFailDamageEffect = {
  readonly kind: "half_of_fail_damage";
};

export type Effect = DamageEffect | NoneEffect | HalfOfFailDamageEffect;
```

**Semantics:** When `onSuccess` carries `{ kind: "half_of_fail_damage" }`, the save-success damage equals the `onFail` damage amount (at the same resolved slot level) divided by 2, rounded down per standard SRD rounding rules ("always round down unless a rule says otherwise").

**No new atoms required.** The underlying concept (proportional/conditional damage on save) is present in the v4 taxonomy. This is purely a surface-layer shape gap: the existing `save_gate` phase structure and `DiceAmount` scaling machinery are sufficient once the new `Effect` variant exists.

## Scope

This widening would unblock a large fraction of evocation damage spells that share the "save half" pattern:

- Fireball, Lightning Bolt, Cone of Cold, Ice Storm, Shatter, Thunderwave, Burning Hands, Meteor Swarm, Sunburst, Circle of Death, …

All of these are SRD-shippable content stalled on the same single gap.

## Secondary Effect (Out-of-Core)

Fireball also states: *"Flammable objects in the area that aren't being worn or carried start burning."*

This is a world-state / environmental effect (object ignition). It has no foothold in the current surface and is legitimately out-of-core for the combat engine. It should be tracked as a future environmental-trigger family concern, not a blocker for encoding Fireball's primary mechanic.
