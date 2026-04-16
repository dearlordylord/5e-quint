# Proposal: Font of Inspiration (bard L5)

**Outcome:** `structural_widening`

## Source text

> You now regain all your expended uses of Bardic Inspiration when you finish a Short or Long Rest.
>
> In addition, you can expend a spell slot (no action required) to regain one expended use of Bardic Inspiration.

## Why it does not fit

Font of Inspiration contains two mechanically distinct sub-features that cannot both be expressed with the current `ClassFeatureMechanics = ClassFeatureActivationMechanics` surface:

### Sub-mechanic 1 — Passive reset cadence upgrade

"You now regain all your expended uses of Bardic Inspiration when you finish a Short or Long Rest."

This is a **passive rule** that changes the reset cadence of the Bardic Inspiration `use_count` resource from its base cadence (long rest only at L1) to `short_or_long_rest`. It is not an activation — there is no trigger, no cost, and no window. It is a permanent change to another feature's resource behavior.

The current surface has:
- No `passive_modifier` family for class features.
- No `ClassFeatureEffect` variant for "modify the reset cadence of another feature's resource."
- No cross-feature reference mechanism in `ClassFeatureMechanics`.

### Sub-mechanic 2 — Spell-slot recovery activation

"you can expend a spell slot (no action required) to regain one expended use of Bardic Inspiration."

This is an activation, but it requires two surface additions neither currently present:

1. **`ClassFeatureActivationCost: spell_slot`** — `ClassFeatureActivationCost` supports only `free` and `bonus_action`. Spending a spell slot (with no action expended) is a third distinct cost shape.

2. **`ClassFeatureEffect: recover_resource_use`** — the effect is refilling 1 use of a named external resource (Bardic Inspiration). `ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect` covers neither. The v4 taxonomy has `refund` as a procedure atom and `refunds` as a relation type, but the surface has no corresponding effect variant.

### Why this is structural, not just surface

The deeper problem is the single-effect, always-activation model. `ClassFeatureActivationMechanics` has one `effect` field. Font of Inspiration has two independent sub-mechanics:
- one passive (no activation, no cost)
- one activated (spell-slot cost, refund effect)

There is no honest way to encode both in a single `ClassFeatureActivationMechanics` record. Encoding only one sub-mechanic would produce a known-false trace. A multi-mechanic composition or a new family is required.

## Required widenings (in priority order)

### W1 — Multi-mechanic composition or new family

Either:
- Add a `multi_mechanic` family variant for `ClassFeatureMechanics` that supports an array of sub-mechanics, each of which can be activation or passive.
- Or add a `passive_modifier` family alongside `activation`.

Without this, encoding both sub-mechanics in a single class feature record is impossible.

### W2 — `ClassFeatureActivationCost: spell_slot`

```typescript
export type ClassFeatureActivationCost =
  | { readonly kind: "free" }
  | { readonly kind: "bonus_action" }
  | { readonly kind: "spell_slot" };    // NEW — no action expended
```

Evidence: "you can expend a spell slot (no action required)"

### W3 — `ClassFeatureEffect: recover_resource_use`

```typescript
export type RecoverResourceUseEffect = {
  readonly kind: "recover_resource_use";
  readonly resourceId: string;   // e.g. "bardic_inspiration"
  readonly count: number;        // typically 1
};
```

Maps to v4 `refund` procedure atom + `refunds` relation. Atom is already in the taxonomy; only the surface variant is missing.

### W4 — Cross-feature reset cadence modification (for Sub-mechanic 1)

Either a new `ClassFeatureEffect` variant:
```typescript
export type UpgradeResetCadenceEffect = {
  readonly kind: "upgrade_reset_cadence";
  readonly targetResourceId: string;
  readonly newCadence: RestResetCadence;
};
```

Or handle it at the authoring level as a passive annotation on the Bardic Inspiration resource node, referenced by feature id.

## Atom inventory impact

| Widening | v4 atom status |
|---|---|
| `recover_resource_use` effect | v4 has `refund` procedure + `refunds` relation — surface variant missing |
| `upgrade_reset_cadence` effect | No direct v4 atom — closest is `persist` / `expire` lifecycle, but reset cadence is a resource property, not a lifecycle atom |
| `spell_slot` activation cost | `spell_slot` resource atom exists; cost variant missing from surface |

## Relation to previously encoded units

- `bard_bardic_inspiration_l1` — Font of Inspiration modifies that feature's `resetCadence` and provides a secondary recovery channel. The cross-feature reference pattern used here (W4) is a new structural shape not seen in any prior encoded unit.
- `fighter_action_surge_l2` / `fighter_second_wind_l1` — both use simple single-activation, single-effect patterns. Font of Inspiration is the first unit to require either passive modification or multi-mechanic composition.
