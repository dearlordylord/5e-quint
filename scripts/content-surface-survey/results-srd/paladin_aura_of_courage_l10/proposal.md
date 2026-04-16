# Proposal: Aura of Courage (paladin L10)

## Outcome: `structural_widening`

## Why the unit does not fit

Aura of Courage is a **passive, always-on aura**. The paladin gains it at level 10 and it is permanently active — no action, no bonus action, no trigger, no use count, no rest reset. The entire mechanic is:

> You and your allies have Immunity to the Frightened condition while in your Aura of Protection.

The current `ClassFeatureMechanics` union has exactly one family:

```typescript
export type ClassFeatureActivationMechanics = ClassFeatureMechanicsHeader & {
  readonly family: "activation";
  readonly effect: ClassFeatureEffect;
};
```

`ClassFeatureMechanicsHeader` mandates:
- `activationCost` — there is no activation cost; the aura is always on
- `resource: UseCountResource` — there is no use count
- `resetCadence: RestResetCadence` — there is no rest reset

Forcing this unit into `"activation"` with `{ kind: "free" }` cost and a fake `{ kind: "fixed", uses: 0 }` cap would be dishonest: it implies the feature can be turned off and exhausted, which is false.

## Proposed widenings (narrowest honest classification)

### 1. New class-feature family: `passive_aura`

A new mechanics family for class features that are spatially scoped and always active:

```
ClassFeaturePassiveAuraMechanics = {
  family: "passive_aura";
  auraRef: string;          // id of the named aura (e.g. "paladin_aura_of_protection")
  radiusFeet: number;       // or inherited from the named aura
  effect: PassiveAuraEffect;
}
```

The radius is specified in the Aura of Protection entry (10 ft at L6, expands at L18 via Aura Expansion). Aura of Courage and Aura of Devotion both piggyback on the same spatial zone, so the `auraRef` field threads them correctly without duplicating the radius.

### 2. New v4 atom: `grant_condition_immunity`

The v4 taxonomy has `grant_resistance` as a distinct atom from `apply_condition` / `remove_condition`. Immunity is a distinct rule tier in SRD 5.2.1: a creature with Immunity to a condition is never affected by it at all (the condition has "no effect"). `grant_resistance` cannot honestly carry this.

Candidate surface shape for `ClassFeatureEffect` union member:

```typescript
export type GrantConditionImmunityEffect = {
  readonly kind: "grant_condition_immunity";
  readonly condition: Condition;        // widening needed: "frightened" not in Condition union
  readonly target: "self_and_allies_in_aura" | "self" | "target_creature";
}
```

### 3. `Condition` union widening (surface_widening, secondary)

The current `Condition` type is:

```typescript
export type Condition = "prone";
```

`frightened` must be added. This is a `surface_widening` within the broader `structural_widening`.

### 4. Aura-scope attachment variant (surface_widening, secondary)

The effect targets "allies in the aura" — a spatial membership predicate, not a one-time spell targeting event. The existing `Attachment` union is cast-time. For the passive aura family, a new attachment variant or a target specifier is needed:

```
{ kind: "aura_members"; auraRef: string }
```

or represented inline on the `passive_aura` family header (the simpler approach).

## Encoding sketch (not authorable yet)

Once the surface is widened, the unit would encode as:

```dhall
{ kind = "class_feature"
, id = "paladin_aura_of_courage_l10"
, name = "Aura of Courage"
, className = "paladin"
, acquiredAtLevel = 10
, provenance = { kind = "srd-5.2.1", section = "Classes/Paladin#Level 10: Aura of Courage" }
, description = "..."
, mechanics =
    { family = "passive_aura"
    , auraRef = "paladin_aura_of_protection"
    , effect =
        { kind = "grant_condition_immunity"
        , condition = "frightened"
        , target = "self_and_allies_in_aura"
        }
    }
}
```

## Summary of required widenings

| Kind | Name | Priority |
|---|---|---|
| new family | `passive_aura` (ClassFeatureMechanics) | blocking |
| new atom | `grant_condition_immunity` | blocking |
| new variant | `Condition = "frightened"` | blocking |
| new variant | aura-scope target specifier | blocking |
