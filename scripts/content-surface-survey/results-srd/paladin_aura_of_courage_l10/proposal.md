# Proposal: Widening Required for `paladin_aura_of_courage_l10`

## Outcome: `surface_widening`

The `passive` family and `grant_condition_immunity` atom both exist in the current surface (gaps identified in the earlier `paladin_aura_of_devotion_l7` proposal have since been closed). One gap remains: `PassiveMechanics` has no area/aura scope concept, so the feature's central mechanic — immunity extending to allies within the Aura of Protection — cannot be expressed without producing a false trace.

---

## Gap: No aura scope on `PassiveMechanics`

**RAW text:**
> You and your allies have Immunity to the Frightened condition while in your Aura of Protection. If a Frightened ally enters the aura, that condition has no effect on that ally while there.

The immunity applies to:
1. The paladin themselves.
2. **All allies within the 10-ft Aura of Protection** (expanding to 30 ft at L18 via Aura Expansion).

The current `PassiveMechanics` shape:

```typescript
export type PassiveMechanics = {
  readonly family: "passive";
  readonly condition?: EquipmentPredicate;   // equipment gate on the bearer
  readonly suppressedBy?: ReadonlyNonEmptyArray<PassiveSuppressor>;
  readonly grants: ReadonlyArray<EffectAtom>;
  readonly operations?: ReadonlyNonEmptyArray<PassiveOperation>;
};
```

`grants` are implicitly bearer-scoped. There is no `attachment` or `auraScope` field. The surface cannot distinguish "this passive applies only to me" from "this passive applies to me and all friendly creatures within N feet."

A bearer-only encoding:

```dhall
{ family = "passive"
, grants = [ { kind = "grant_condition_immunity", condition = "frightened" } ]
}
```

would claim only the paladin gets the immunity — completely omitting the ally aura, which is the primary purpose of the feature. Per the guardrails: a misleading trace is worse than no trace.

---

## Proposed Widening

Add an optional `auraScope` field to `PassiveMechanics`:

```typescript
export type PassiveAuraScope = {
  readonly kind: "emanation";
  readonly radiusFeet: number;
  readonly occupants: "self_and_friendly" | "friendly_only";
};

export type PassiveMechanics = {
  readonly family: "passive";
  readonly condition?: EquipmentPredicate;
  readonly auraScope?: PassiveAuraScope;   // NEW — area scope for aura features
  readonly suppressedBy?: ReadonlyNonEmptyArray<PassiveSuppressor>;
  readonly grants: ReadonlyArray<EffectAtom>;
  readonly operations?: ReadonlyNonEmptyArray<PassiveOperation>;
};
```

The Aura of Courage encoding would then read:

```dhall
{ family = "passive"
, auraScope =
    { kind = "emanation"
    , radiusFeet = 10        -- expands to 30 at L18 via Aura Expansion
    , occupants = "self_and_friendly"
    }
, grants =
    [ { kind = "grant_condition_immunity", condition = "frightened" } ]
}
```

The tracer would emit an `area` attachment node (emanation 10 ft, friendly_to_source) rooted at the `grant` procedure, parallel to how `ongoing_effect` spells with area attachments are traced.

---

## Scope and Pressure Cases

This widening directly covers the entire paladin aura family:

| Feature | Radius | Effect |
|---------|--------|--------|
| Aura of Protection (L6) | 10 ft | +CHA mod to saves for self + allies |
| Aura of Courage (L10) | 10 ft | Frightened immunity for self + allies |
| Aura Expansion (L18) | 30 ft | Expands both auras above |
| Subclass auras (Oath of Devotion L7, etc.) | 10 ft | Various condition immunities |

The `Aura of Protection` feature additionally requires a `DiceDelta.ability_modifier` grant on saving throws scoped to the aura, which is a separate encoding concern, but would use the same `auraScope` field.

---

## Classification

- **Family**: `passive` ✓ exists  
- **Atom**: `grant_condition_immunity` ✓ exists  
- **Missing**: optional `auraScope` on `PassiveMechanics` — a new variant of an existing surface type  
- **Outcome**: `surface_widening`
