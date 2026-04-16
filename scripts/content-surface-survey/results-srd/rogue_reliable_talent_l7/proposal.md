# Proposal: Widening required for Reliable Talent (rogue L7)

## Unit

- **Name:** Reliable Talent (rogue L7)
- **Slug:** `rogue_reliable_talent_l7`
- **Kind:** `class_feature`
- **Outcome:** `structural_widening`

## Source text

> Whenever you make an ability check that uses one of your skill or tool proficiencies, you can treat a d20 roll of 9 or lower as a 10.

## Why encoding is blocked

### Primary gap: no `passive` family for `ClassFeatureMechanics`

The surface defines exactly one `ClassFeatureMechanics` family:

```typescript
export type ClassFeatureMechanics = ClassFeatureActivationMechanics;
```

`ClassFeatureActivationMechanics` requires:

| Field | What Reliable Talent actually has |
|---|---|
| `activationCost` | No activation at all — fires automatically |
| `resource: UseCountResource` | No use count, no cap |
| `resetCadence` | Nothing to reset |
| `effect` | An effect exists, but it is gated on a passive roll trigger |

Reliable Talent is an **always-on passive**: it applies automatically on every ability check that uses a skill or tool proficiency. There is no deliberate invocation, no expendable resource, and no rest-based recovery. Populating these fields with placeholder values (e.g., `uses: 999`, arbitrary `resetCadence`) would produce a trace that misrepresents the rule structure.

**Proposal:** Add a `passive` (or `always_on`) family to `ClassFeatureMechanics`:

```typescript
export type ClassFeaturePassiveMechanics = {
  readonly family: "passive";
  readonly trigger: PassiveTrigger;   // when does the passive fire?
  readonly effect: PassiveEffect;     // what does it do when triggered?
};
```

A `PassiveTrigger` would need to express "whenever the owner makes an ability check using a skill or tool proficiency" — a new trigger grammar not currently in the surface.

Other candidates for the same family: Evasion (rogue L7 / monk L7), Uncanny Dodge (rogue L5), Danger Sense (barbarian L2).

### Secondary gap: roll-floor substitution effect

The SRD text "treat a d20 roll of 9 or lower as a 10" is a **conditional floor substitution** on the d20. The v4 taxonomy has `modify_roll_substitute` which is the conceptually closest atom. However:

- The substitution is conditional on the roll being ≤ 9 (a threshold, not a reroll).
- The condition applies only when the check uses a skill or tool proficiency.

Whether `modify_roll_substitute` is broad enough to absorb this without a new variant is a taxonomy question for the next widening round. The present blocker is the missing family, not this atom.

**Proposed atom (tentative):** `modify_roll_floor` — sets a lower bound on a d20 roll result under a qualifying condition. Alternatively, extend `modify_roll_substitute` with a `threshold` variant:

```typescript
| {
    readonly kind: "modify_roll_substitute";
    readonly mode: "floor";
    readonly threshold: number;  // treat rolls ≤ threshold as floorValue
    readonly floorValue: number;
    readonly on: ReadonlyArray<RollKind>;
    readonly condition: "proficiency_used";  // scope gate
  }
```

## No content files authored

Per protocol, no `.dhall`, `.json`, or `.trace.md` files are written for `structural_widening` outcomes. The misleading trace that `activation` would produce is worse than no trace.
