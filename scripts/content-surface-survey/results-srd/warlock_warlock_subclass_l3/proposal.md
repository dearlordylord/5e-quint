# Proposal: `subclass_choice` family for `ClassFeatureMechanics`

## Unit

`warlock_warlock_subclass_l3` — Warlock Subclass (warlock L3)

## Gap

The current surface has exactly one `ClassFeatureMechanics` family: `"activation"`. It requires:

```typescript
type ClassFeatureMechanicsHeader = {
  readonly activationCost: ClassFeatureActivationCost;
  readonly resource: UseCountResource;
  readonly resetCadence: RestResetCadence;
};
export type ClassFeatureActivationMechanics = ClassFeatureMechanicsHeader & {
  readonly family: "activation";
  readonly effect: ClassFeatureEffect;  // grant_extra_action | heal_hp
};
```

The "Warlock Subclass" feature has none of these components. Its sole mechanic is:

> "You gain a Warlock subclass of your choice … For the rest of your career, you gain each of your subclass's features that are of your Warlock level or lower."

This is a **permanent character-progression choice** made once at level 3. It:
- Is not activated (no action, bonus action, or free trigger)
- Consumes no quota resource
- Has no rest-reset cadence
- Grants no `grant_extra_action` or `heal_hp` effect

Forcing it into `activation` would require inventing a fake `effect` field — producing a dishonest trace.

## Scope

This is not isolated to Warlock. Every SRD class has an identical "XYZ Subclass" feature at level 3:

| Class | Feature slug |
|---|---|
| Barbarian | `barbarian_barbarian_subclass_l3` |
| Bard | `bard_bard_subclass_l3` |
| Cleric | `cleric_cleric_subclass_l3` |
| Druid | `druid_druid_subclass_l3` |
| Fighter | `fighter_fighter_subclass_l3` |
| Monk | `monk_monk_subclass_l3` |
| Paladin | `paladin_paladin_subclass_l3` |
| Ranger | `ranger_ranger_subclass_l3` |
| Rogue | `rogue_rogue_subclass_l3` |
| Sorcerer | `sorcerer_sorcerer_subclass_l3` |
| Warlock | `warlock_warlock_subclass_l3` |
| Wizard | `wizard_wizard_subclass_l3` |

All 12 instances require the same widening. A single new family covers them all.

## Proposed widening

### New `ClassFeatureMechanics` family: `subclass_choice`

```typescript
export type SubclassChoiceMechanics = {
  readonly family: "subclass_choice";
  readonly acquiredAtLevel: number;
  // Optional: list of available archetype IDs if the set is closed at
  // authoring time (e.g. ["fiend_patron"]). Omit for open-ended choices.
  readonly archetypes?: ReadonlyArray<string>;
};
```

`ClassFeatureMechanics` becomes:

```typescript
export type ClassFeatureMechanics =
  | ClassFeatureActivationMechanics
  | SubclassChoiceMechanics;
```

### Tracer extension

The tracer's `traceClassFeatureMechanics` switch gains a `"subclass_choice"` arm that emits:

- A `class_feature_root` source node (already present from the outer tracer)
- A `choose` procedure node (v4 procedure atom — already in taxonomy)
- An `subclass_feature_root` attachment node (v4 source atom — records the choice target)

The subgraph is:

```
class_feature_root → choose → subclass_feature_root
```

All three atoms (`choose`, `class_feature_root`, `subclass_feature_root`) already exist in the v4 taxonomy. No new v4 atoms are required — only a new surface family and a new tracer arm.

## Classification rationale

- **`structural_widening`** (not `surface_widening` or `atom_widening`): the gap is at the family level of `ClassFeatureMechanics`, not a missing variant of an existing shape or a missing v4 atom.
- The v4 atoms `choose` and `subclass_feature_root` already exist; the surface type system simply has no family that connects them.
