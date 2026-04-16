# Proposal: paladin_aura_expansion_l18 — Structural Widening

## Unit

**Aura Expansion (Paladin L18)** — SRD 5.2.1, Classes/Paladin#Level 18: Aura Expansion

> "Your Aura of Protection is now a 30-foot Emanation."

## Classification: `structural_widening`

## Why the current surface cannot encode this unit honestly

### 1. No `passive` family for `ClassFeatureMechanics`

The only existing `ClassFeatureMechanics` family is `activation`. The `activation` family requires:

- `activationCost` — what the player spends to trigger the feature
- `resource` — a `use_count` pool with a cap
- `resetCadence` — when the pool refills
- `effect` — one of `GrantExtraActionEffect | HealHpEffect`

Aura Expansion has none of these. It is permanently active from the moment it is acquired at level 18 — no trigger, no cost, no pool, no effect that fires on demand. Forcing it into `activation` with `{ kind: "free" }` cost and a fabricated `use_count` would be structurally false and would generate a meaningless trace.

### 2. No effect atom for "expand emanation radius"

Even if a `passive` family existed, the needed effect is "change the radius of an existing class feature (Aura of Protection) from 10 feet to 30 feet." The v4 atom inventory contains:

- `modify_range` — applies to spell/attack targeting range (a one-shot constraint at cast time), not an aura footprint
- `modify_speed` — movement speed, not area radius
- No atom for `expand_emanation`, `modify_aura_radius`, or cross-feature parameter override

The distinction between `modify_range` and an emanation-radius modification is mechanically meaningful: aura footprint is a spatial region evaluated continuously each turn; spell range is a targeting constraint evaluated once at the moment of action.

### 3. No cross-feature reference mechanism

The surface has no way to declare "this feature modifies a parameter of another feature by id." Aura Expansion is a modifier on Aura of Protection (acquired at L6). Encoding it correctly would require either:
- A `targetFeatureId` reference field pointing to `paladin_aura_of_protection_l6`, or
- A dedicated `modify_class_feature` or `expand_emanation_radius` effect variant

## Proposed Widenings

### Widening 1: New family — `passive` for `ClassFeatureMechanics`

```typescript
export type ClassFeaturePassiveMechanics = {
  readonly family: "passive";
  readonly effect: ClassFeaturePassiveEffect;
};

export type ClassFeatureMechanics =
  | ClassFeatureActivationMechanics
  | ClassFeaturePassiveMechanics;
```

Motivation: Several class features are permanently-active upgrades with no activation gate (Aura Expansion, Barbarian Fast Movement, Barbarian Indomitable Might, Fighter Survivor, etc.). The `activation` family cannot model these without fabricating phantom resources.

### Widening 2: New effect type — `expand_emanation_radius`

```typescript
export type ExpandEmanationRadiusEffect = {
  readonly kind: "expand_emanation_radius";
  readonly targetFeatureId: string; // e.g. "paladin_aura_of_protection_l6"
  readonly radiusFeet: number;      // e.g. 30
};
```

This lets Aura Expansion honestly declare: "modify the emanation radius of Aura of Protection to 30 feet." A more general `ModifyFeatureParameterEffect` is also possible but may over-generalize before enough pressure cases exist.

## Other class features likely to hit the same `passive` gap

The following SRD features are permanently active and would require the same widening:

| Feature | Why passive |
|---|---|
| Barbarian Fast Movement (L5) | Speed bonus, always on while not in heavy armor |
| Barbarian Indomitable Might (L18) | STR check floor equals STR score, always on |
| Paladin Aura of Courage (L10) | Allies in aura can't be frightened while paladin is conscious |
| Fighter Survivor (L18) | Passive HP regen at turn start when below half max HP |

All are always-on and require a `passive` family to encode without fabricating activation structure.

## Atom inventory note

`modify_range` is in v4 and in the tracer but is not added to `ClassFeatureEffect` in `types.ts`, and even if it were, it maps to spell/attack range, not aura footprint. A new atom or a renamed/scoped variant of `modify_range` (e.g., `modify_emanation_radius`) would be the right addition.
