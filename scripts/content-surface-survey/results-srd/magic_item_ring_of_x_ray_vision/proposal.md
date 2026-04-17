# Proposal: Ring of X-ray Vision — Surface Widening

## Unit

Ring of X-ray Vision — `magic_item`, rare, requires attunement.

## Outcome

`surface_widening` — two gaps in existing surface types; no missing v4 atoms.

## Gap 1: `SenseKind` missing `"x_ray_vision"`

### Problem

`grant_sense` is the correct effect atom for this unit's main mechanic. The tracer handles it and the type is well-formed. However `SenseKind` is a closed union:

```typescript
export type SenseKind =
  | "darkvision"
  | "blindsight"
  | "tremorsense"
  | "truesight";
```

X-ray vision — seeing through solid objects within a radius — is a distinct magical sense not expressible with any current variant.

### Proposed fix

Add `"x_ray_vision"` to `SenseKind`. The existing `grant_sense` atom, `rangeFeet` field, and tracer handler are already the right home. No new atom or relation is needed; only the discriminant is missing.

Proposed encoding of the main effect:

```dhall
{ kind = "grant_sense"
, sense = "x_ray_vision"
, rangeFeet = 30
}
```

### Notes on penetration limits

The RAW text specifies penetration thresholds (1 ft stone, 1 in metal, 3 ft wood/dirt, lead blocks). These are DM reference data — the DM adjudicates what is and isn't visible per these limits. They do not represent a deterministic mechanical resolution step and are legitimately excluded from core mechanics per `ARCHITECTURE.md`. The `description` field on the unit record carries them.

---

## Gap 2: Usage-conditional penalty save — no surface encoding

### Problem

> "Whenever you use the ring again before taking a Long Rest, you must succeed on a DC 15 Constitution saving throw or gain 1 Exhaustion level."

This is a **usage-history-conditional save**: it fires on the second and subsequent activations within a long rest window, not on every activation. No existing surface construct can express this:

- `ActivationPhase` has no conditional guard based on prior-use count — every phase fires on every activation.
- `OngoingTrigger` has no `on_reuse` or `on_activation` variant.
- `ActivatedAbilityMechanics` has no `usagePenalty` or conditional-check field.

The closest analog is a `save_gate` activation phase, but that would fire on the **first** use too, which is incorrect.

### Proposed fix (two options)

**Option A — `usagePenalty` field on `ActivatedAbilityMechanics`**

A new optional field that fires a save only when `useCount > 1` within the current reset window:

```typescript
export type ActivatedAbilityMechanics = ActivatedAbilityHeader & {
  readonly family: "activation";
  readonly phases: ReadonlyNonEmptyArray<ActivationPhase>;
  readonly usagePenalty?: {
    readonly triggersAfterUse: number;  // fires on use N+1 and beyond (1 = after first)
    readonly save: {
      readonly ability: Ability;
      readonly dc: number;
      readonly onFail: EffectAtom;
    };
  };
};
```

Encoding for this unit:

```dhall
usagePenalty =
  { triggersAfterUse = 1
  , save =
      { ability = "con"
      , dc = 15
      , onFail = { kind = "apply_condition", condition = "exhaustion" }
      }
  }
```

**Option B — `on_reuse` variant of `OngoingTrigger`**

A new trigger variant for ongoing operations that fires each time the associated activated ability is used (after the first within the reset cadence). This generalizes better but requires wiring activation events into the ongoing-operation trigger grammar.

Option A is narrower and sufficient for the current evidence.

### Notes on exhaustion

`apply_condition: "exhaustion"` exists in `EffectAtom` and `CONDITIONS`. In SRD 5.2.1 exhaustion is a leveled condition (1–6 exhaustion levels). This encoding applies +1 exhaustion level, which is the correct RAW reading ("gain 1 Exhaustion level"). No new atom is needed for the condition itself.

---

## Summary

| Gap | Kind | Fix scope |
|-----|------|-----------|
| `SenseKind` missing `"x_ray_vision"` | `surface_widening` | Add one string literal to `SenseKind` union |
| Usage-conditional penalty save | `surface_widening` | New optional field on `ActivatedAbilityMechanics` (Option A) or new `OngoingTrigger` variant (Option B) |

Both gaps are additions to existing surface types. The v4 atom inventory (`grant_sense`, `save_gate`, `apply_condition`) already has the right atoms; only the surface type discriminants are missing.
