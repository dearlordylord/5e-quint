# Widening Proposal: Indomitable (Fighter L9)

## Unit

**Slug:** `fighter_indomitable`  
**Kind:** `class_feature` (Fighter, acquired at level 9)  
**Provenance:** `srd-5.2.1`

## Outcome

`surface_widening` — the v4 atoms `modify_roll_reroll` and `branches_on_save` both exist in the taxonomy. The gap is purely in the surface layer: `ClassFeatureEffect` and `ClassFeatureActivationCost` do not yet expose these atoms.

The harness previously recorded `atom_widening` because the tracer threw `unhandled class-feature effect: reroll_saving_throw`. That classification is overcautious: the v4 atoms are present (TAXONOMY_atoms_graph.md §9 and §10). Corrected to `surface_widening`.

## What fits today

| Component | Status |
|---|---|
| `ClassFeatureRecord` kind | ✓ exists |
| `activation` mechanics family | ✓ exists |
| `use_count` resource | ✓ exists |
| `threshold_tiers` use-cap (1→2@L13→3@L17, axis=class) | ✓ exists |
| `long_rest` reset cadence | ✓ exists |

## What is missing

### Widening 1 — `reroll_saving_throw` in `ClassFeatureEffect`

**Source text:** "you can reroll it with a bonus equal to your Fighter level. You must use the new roll"

The current `ClassFeatureEffect` union is `GrantExtraActionEffect | HealHpEffect`. Indomitable's effect is a saving-throw reroll with a level-scaling additive bonus and forced-keep semantics. The v4 atom is `modify_roll_reroll` (taxonomy §9).

Proposed new variant shape:

```typescript
export type RerollSavingThrowEffect = {
  readonly kind: "reroll_saving_throw";
  // Bonus added to the rerolled result. For Indomitable: LinearPerLevel
  // with axis=class captures "bonus equal to your Fighter level."
  readonly bonus: LinearPerLevel<number>;
  // "You must use the new roll" = forced keep (not keep-higher).
  readonly keepPolicy: "forced";
};
```

The tracer would emit a `modify_roll_reroll` effect node connected via `grants` from the activate procedure, with a `scale_numeric_bonus` scaling node for the class-level bonus.

### Widening 2 — reactive trigger in `ClassFeatureActivationCost`

**Source text:** "If you fail a saving throw, you can reroll it"

The current `ClassFeatureActivationCost` is `{ kind: "free" } | { kind: "bonus_action" }` — both are proactive costs. Indomitable activates reactively at the moment of a save failure. Without a trigger condition, the surface cannot express that this feature is only available in the save-fail event boundary.

Proposed new variant:

```typescript
export type ClassFeatureReactionCost = {
  readonly kind: "reaction";
  readonly trigger: ClassFeatureTrigger;
};

export type ClassFeatureTrigger =
  | { readonly kind: "on_save_fail" };

// Updated union:
export type ClassFeatureActivationCost =
  | { readonly kind: "free" }
  | { readonly kind: "bonus_action" }
  | ClassFeatureReactionCost;
```

The tracer would emit a `reaction_window` node (existing atom) labeled with the trigger, mirroring the spell `triggered_reaction` subgraph but scoped to class features.

## What does NOT need widening

- The `on_save_fail` trigger maps to the existing v4 relation `branches_on_save` — no new relation needed.
- The bonus scaling (`LinearPerLevel<number>`, axis=class) is already representable with the existing `LinearPerLevel` type.
- The `threshold_tiers` use-cap and `long_rest` reset cadence are already in the surface.

## Honest encoding (once widened)

```json
{
  "id": "fighter_indomitable",
  "name": "Indomitable",
  "kind": "class_feature",
  "className": "fighter",
  "acquiredAtLevel": 9,
  "provenance": { "kind": "srd-5.2.1", "section": "Classes/Fighter#Indomitable" },
  "description": "If you fail a saving throw, you can reroll it with a bonus equal to your Fighter level...",
  "mechanics": {
    "family": "activation",
    "activationCost": {
      "kind": "reaction",
      "trigger": { "kind": "on_save_fail" }
    },
    "resource": {
      "kind": "use_count",
      "cap": {
        "kind": "threshold_tiers",
        "axis": "class",
        "base": 1,
        "tiers": [
          { "atLevel": 13, "value": 2 },
          { "atLevel": 17, "value": 3 }
        ]
      }
    },
    "resetCadence": { "kind": "long_rest" },
    "effect": {
      "kind": "reroll_saving_throw",
      "bonus": {
        "kind": "linear_per_level",
        "axis": "class",
        "base": 9,
        "perLevel": 1,
        "startingAtLevel": 9
      },
      "keepPolicy": "forced"
    }
  }
}
```

## Scope

Both proposed widenings are narrow additions to existing union types. No new family, no new top-level kind, no structural restructuring required. The v4 atom inventory already covers both mechanics.
