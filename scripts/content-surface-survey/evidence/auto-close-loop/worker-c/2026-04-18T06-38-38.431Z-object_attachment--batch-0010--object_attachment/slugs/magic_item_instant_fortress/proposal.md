## Instant Fortress

`Instant Fortress` fits the existing `magic_item` top-level kind, but it does not fit the current surface honestly enough to author `content/magic_item_instant_fortress.dhall`.

The narrowest correct classification is `surface_widening`, not `structural_widening`:

- the unit is still a magic item;
- its primary interaction is still an activation-shaped item ability;
- the blockers are missing surface variants and missing surface realization of an existing v4 atom, not a brand-new top-level family.

### Required widening

1. At-will activated magic-item abilities

- Why: the current `ActivatedAbilityMechanics` requires both `resource` and `resetCadence`.
- Pressure text: "As a Magic action, you can place this 1-inch adamantine statuette on the ground ..." and "Repeating the command word causes the tower to revert to statuette form"
- Why existing shapes do not work:
  - `use_count` would invent a charge/uses limit the item does not have.
  - `charge_pool` is also false; the item spends no charges.
  - forcing a fake resource would produce a misleading trace.

Suggested direction:

```ts
type ActivatedAbilityMechanics = {
  readonly family: "activation";
  readonly activationCost: ClassFeatureActivationCost;
  readonly resource?: ActivationResource;
  readonly resetCadence?: RestResetCadence;
  readonly phases: ReadonlyNonEmptyArray<ActivationPhase>;
}
```

or an explicit sentinel:

```ts
type ActivationResource = UseCountResource | ChargePoolResource | { readonly kind: "at_will" };
```

2. Surface realization of `create_object`

- Why: the main effect is creating a fortress object in the world.
- Pressure text: "cause it to grow rapidly into a square adamantine tower"
- Taxonomy status: `create_object` already exists in `TAXONOMY_atoms_graph.md`; this is not new atom pressure, it is a missing surface/tracer variant.
- Why existing atoms do not work:
  - `alter_item_kind` is too weak; the fortress is not merely a cosmetic kind swap.
  - `transport_exile`, `teleport`, and creature-facing effect atoms all miss the persistent object body.
  - `object` attachment exists, but there is no effect that creates or instantiates the object.

Suggested direction:

```ts
| {
    readonly kind: "create_object";
    readonly objectKind: string;
    readonly dimensions?: { ... };
  }
```

3. Persistent object state / commanded re-open / occupancy gate

- Why: the fortress keeps damage between forms, can revert only while empty, and later responds to the owner's command as a Bonus Action.
- Pressure text:
  - "which works only if the tower is empty"
  - "The door opens only at your command, which you can issue as a Bonus Action"
  - "Shrinking the tower back down to statuette form doesn't repair damage to the tower"
- Why this matters: this is durable object lifecycle/state, not a one-shot effect bundle.

This likely wants a bounded object-state subgraph rather than one more flat effect field:

- created object with persistent AC / HP / resistances / immunities
- later command-triggered state change on that same object
- reversion guard based on occupancy
- damage persistence across form changes

I am leaving this as a subgraph-level proposal rather than inventing a brittle one-off atom name.

### Secondary pressure

The push-clear rider is real but secondary to the creation/state gap:

- "Each creature in the area where the tower appears is pushed to an unoccupied space outside but next to the tower. Objects in the area that aren't being worn or carried are also pushed clear of the tower."

Creature displacement could likely reuse `force_move` or a future more precise placement shape. Unattended-object displacement adds separate object-movement pressure. Neither should be encoded alone while omitting the tower itself.

### Why I did not author a placeholder content file

Any valid JSON I could force through today would either:

- fake a consumable resource the item does not spend, or
- encode only the push rider / command word while dropping the fortress object itself.

That would produce a cleaner-looking trace at the cost of false mechanics, which this protocol explicitly forbids.
