## Thunderous Greatclub

Outcome: `structural_widening`

### Why it does not fit honestly

The current `MagicItemRecord.mechanics` is:

- `PassiveMechanics`
- `ActivatedAbilityMechanics`

This item is both:

- passive while attuned:
  - Strength floor to 20
  - extra `1d8` Thunder damage on creature hits
  - extra `3d8` Thunder damage on unattended object hits
- activated properties:
  - `Clap of Thunder` as a Magic action
  - `Earthquake` as a Magic action, with a dawn recharge

That cannot be represented as one honest record without inventing a fake dominant mode and dropping real mechanics.

### Minimum widening

Add a mixed magic-item mechanics shape so one item can carry both always-on grants and activated properties. For example:

```ts
type MagicItemMechanics =
  | PassiveMechanics
  | ActivatedAbilityMechanics
  | {
      readonly family: "mixed";
      readonly passive: PassiveMechanics;
      readonly activated: ReadonlyNonEmptyArray<ActivatedAbilityMechanics>;
    };
```

The exact shape can vary, but the core requirement is one item owning both passive and activated mechanics without duplication or splitting into multiple fake records.

### Secondary gaps exposed by this unit

1. `break_concentration` surface gap

The Earthquake property forces concentration to break on a failed save:

> "If that creature is also concentrating, it must succeed on a DC 20 Constitution saving throw, or its Concentration is broken."

The taxonomy has a `break` lifecycle atom, but `types.ts` has no corresponding authored effect or phase result.

2. Fissure / terrain-topology atom gap

The Earthquake property also creates a fissure:

> "you can cause a 30-foot-deep, 10-foot-wide fissure to open up on the ground anywhere in the area..."

This is more than damage or force movement. It changes terrain, can make creatures fall, can move them with the fissure edge on success, and collapses structures. No current atom or payload family expresses that.

### Notes on omitted subparts

- The passive Strength clause would fit `set_ability_score` with `mode: "floor"`.
- The passive extra Thunder damage against creatures could fit existing damage-on-hit machinery only if the item could also carry an honest passive on-hit rider in the same record as its activated properties.
- The extra Thunder damage to unattended objects and the Earthquake structure/object clauses also pressure non-creature targeting/world-object handling, but the mixed-family blocker comes first and is sufficient to stop authoring.
