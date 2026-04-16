# Proposal: Passwall — structural_widening

## Unit summary

**Passwall** (level 5 transmutation, 1 hour timed, non-concentration) creates a traversable
passage through a solid surface (wood, plaster, or stone) for the duration, then safely ejects
any occupants when the passage expires.

## Why no existing family fits

| Family | Why it fails |
|---|---|
| `ongoing_effect` | Requires an `operation` field: either `roll_modifier` or `damage_on_hit`. Passwall has no operation on creatures. |
| `activation` | Requires at least one `ActivationPhase`, each of which must be `attack_roll` or `save_gate`. Passwall has neither. |
| `triggered_reaction` | Reaction-shaped spell (castingTime.kind = "reaction"). Passwall is a standard action cast. |
| `anchored_trigger` | Plants a dormant trigger that fires when creatures interact with the anchor. Passwall immediately creates the passage — there is no gating event. |

No honest coercion is possible. The spell's core mechanic is outside the current family space.

## Required widening: new `environment_modification` spell family

The missing family models spells that **create or alter a terrain feature** at a target location,
hold it for a timed duration, and optionally perform a deterministic cleanup when the feature
expires.

Proposed structure (sketch):

```typescript
export type EnvironmentModificationMechanics = SpellMechanicsHeader & {
  readonly family: "environment_modification";
  readonly anchor: SurfaceTarget;          // where the feature is created
  readonly effect: TerrainFeatureEffect;   // what feature is created
  readonly onExpiry?: ExpiryCleanup;       // deterministic cleanup when duration ends
};
```

### 1. New attachment / anchor: `surface_point`

Passwall targets a point on a material-typed solid surface. The existing `location` attachment
(closed to `door_or_window`) and the `object` attachment (untyped) do not carry the material
predicate (wood / plaster / stone) that scopes valid cast targets. A new anchor variant is
needed, or the `object` attachment needs a material-filter field.

### 2. New effect atom (or reuse `create_object`): terrain feature creation

`create_object` exists in v4. A new `create_passage` atom (or parameterized `create_object`
with a traversable-opening shape) would cover Passwall and generalise to related spells
(Stone Shape, Wall of Stone's permanent-hole option, etc.).

Proposed effect shape:
```typescript
export type CreatePassageEffect = {
  readonly kind: "create_passage";
  readonly material: ReadonlyArray<"wood" | "plaster" | "stone">;
  readonly maxWidthFeet: number;
  readonly maxHeightFeet: number;
  readonly maxDepthFeet: number;
  readonly structurallyStable: boolean;   // "creates no instability"
};
```

### 3. New lifecycle variant: `eject_occupants` on expiry

When the passage expires, creatures and objects inside are safely moved to the nearest
unoccupied space. This is a deterministic cleanup, different from `fall_on_end` (gravity) and
`return_on_end` (original location). A new `onExpiry` lifecycle variant is needed:

```typescript
export type ExpiryCleanup =
  | { readonly kind: "eject_occupants"; readonly destination: "nearest_unoccupied" };
```

## Atoms used from v4 (if the family were added)

| Atom | Category | Usage |
|---|---|---|
| `activate` | procedure | spell cast procedure |
| `action_quota` | resource | casting time: action |
| `spell_slot` | resource | level 5 slot consumed |
| `persist` | lifecycle | holds the feature for 1 hour |
| `expire` | lifecycle | passage closes after 1 hour |
| `create_object` / `create_passage` | effect | the passage itself |

Relations: `consumes`, `grants`, `attaches_to`, `persists_until`.

## Scope

This widening serves a clear cluster of SRD spells beyond Passwall:

- **Stone Shape** (touch, modifies stone into arbitrary form)
- **Wall of Stone** (creates a stone wall with optional permanent version)
- **Meld into Stone** (caster enters stone)
- **Rope Trick** (creates extradimensional space at rope top)

A single `environment_modification` family with a typed `TerrainFeatureEffect` union would
cover all of these without additional family proliferation.
