## Figurine of Wondrous Power

This unit fits the existing `magic_item` record kind and the collection-level
`variants` shape, but it does **not** fit the current surface honestly.

The blocker is not the top-level kind. The blocker is that the collection's
variant payloads need spawn mechanics the current item-side surface cannot
express without lying about where the creature data comes from or when
secondary riders apply.

### Required widening

1. New variant on item-side spawned-creature payload: catalog-ref companion source

- Why: most figurines do not ship an inline stat block here. They turn into an
  already-named creature such as a Griffon, Lion, Giant Goat, Elephant,
  Nightmare, Mastiff, Giant Owl, or Raven. The current
  `MagicItemSpawnedCreatureMechanics` requires an inline `statBlock`.
- Pressure text:
  - "the figurine becomes a living creature specified in the figurine's description"
  - "This bronze statuette ... can become a Griffon"
  - "Each can become a Lion"
  - "This figurine can become a Giant Goat"
- Why existing shapes do not work:
  - Inlining those creatures would duplicate external monster data the item text
    only references.
  - `transform_target` is wrong because the figurine creates a companion rather
    than transforming an existing creature target.

Suggested direction:

```ts
type MagicItemSpawnedCreatureMechanics = ActivatedAbilityHeader &
  ({
    readonly family: "spawned_creature";
    readonly range: Range;
    readonly statBlock: CreatureStatBlock;
  } | {
    readonly family: "spawned_creature";
    readonly range: Range;
    readonly companionSource: {
      readonly kind: "catalog_ref";
      readonly creatureId: string;
    };
  });
```

2. New condition/state gate tying extra item mechanics to the active creature form

- Why: several variants add mechanics that apply only while the figurine is in
  creature form, or only while a rider is mounted on that creature. Current
  `CompositeMagicItemMechanics` can combine parts, but it cannot say "this
  grant only exists while the spawned form is active" or "only while you ride
  the goat/raven/etc."
- Pressure text:
  - "While you ride the goat, any Hostile creature that starts its turn within
    a 30-foot Emanation originating from the goat must succeed on a DC 15
    Wisdom saving throw..."
  - "While in raven form, the figurine grants you the ability to cast Animal
    Messenger on it."
- Why existing shapes do not work:
  - A plain passive `grant_spell_access` would be always on, which is false for
    the Silver Raven.
  - A plain ongoing spell-like operation cannot attach to a magic-item
    companion's mounted state.

Suggested direction:

```ts
type EquipmentPredicate =
  | ...
  | { readonly kind: "spawned_form_active" }
  | { readonly kind: "mounted_on_spawned_form" };
```

3. New passive-operation / resource cadence variant for form upkeep by elapsed time while active

- Why: Goat of Traveling spends charges per hour or portion thereof while in
  goat form, then locks out for 7 days and refills. Current activation resources
  can spend charges at activation time, and passive operations can repeat over
  elapsed time, but there is no item-side shape that says "while this spawned
  form remains active, drain 1 charge each hour or partial hour."
- Pressure text:
  - "It has 24 charges, and each hour or portion thereof it spends in goat form
    costs 1 charge."
  - "When it runs out of charges, it reverts to a figurine and can't be used
    again until 7 days have passed, when it regains all expended charges."

Suggested direction:

```ts
type PassiveOperation =
  | ...
  | {
      readonly trigger: {
        readonly kind: "elapsed_time_while_active";
        readonly unit: "hour";
        readonly amount: number;
        readonly roundsUpPartial: true;
      };
      readonly effect: { readonly kind: "spend_charge"; readonly amount: number };
    };
```

### Secondary unresolved pressure

- Golden Lions allow using one figurine or both simultaneously. Current
  companion control has `oneAtATime?: true` but no positive expression for a
  bounded simultaneous pair/set.
- Obsidian Steed has a 10% chance to ignore orders and, if mounted while
  disobedient, transports rider and steed to a random location on Hades. The
  random-disobedience state and rider-coupled exile are also not modeled by the
  current item-side spawn surface.
- Goat of Terror's removable horns create two temporary magic weapons tied to
  the goat's remaining duration. That wants object/item creation scoped to the
  spawned form's lifecycle.

Because those pressures are variant-defining rather than incidental, authoring a
partial collection record would be misleading.
