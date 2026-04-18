## Folding Boat

`Folding Boat` fits the existing top-level `magic_item` kind, and its core mechanic is already in the v4 atom inventory via `alter_item_kind`.

It does **not** fit the current authored surface honestly, so this should stop at proposal-only.

### Required widenings

1. New activation shape for resource-less command-word item activations

- Why: each command word "requires a Magic action to use", but the current `ActivatedAbilityMechanics` requires both `resource` and `resetCadence`.
- Pressure text:
  - "This item also has three command words, each requiring a Magic action to use"
- Why existing surface shapes do not work:
  - `activation` is the right family, but it assumes every activation consumes a use-count or charge pool.
  - Fabricating a fake `use_count` or fake reset cadence would be a dishonest trace.

Suggested direction:

```ts
type ActivatedAbilityHeader = {
  readonly activationCost: ClassFeatureActivationCost;
  readonly resource?: ActivationResource;
  readonly resetCadence?: RestResetCadence;
  ...
}
```

or an explicit no-resource variant that preserves the current invariants.

2. New attachment variant for the affected item/object itself

- Why: the command word changes the `Folding Boat` item, not the wielder/creature using it.
- Pressure text:
  - "The box unfolds into a Rowboat."
  - "The box unfolds into a Keelboat."
  - "The Folding Boat folds back into a box..."
- Why existing surface shapes do not work:
  - `self` would misleadingly read as the activating creature rather than the item.
  - `target` / `area` / `mark` are also wrong; nothing is being targeted at range.
- Taxonomy note: `item` / `object` attachments already exist in `TAXONOMY_atoms_graph.md`; the authored surface is what's missing them.

Suggested direction:

```ts
type Attachment =
  | ...
  | { readonly kind: "item" }
  | { readonly kind: "object" };
```

3. New destruction-policy variant for item destruction when the active form reaches 0 HP

- Why: destruction is tied to vessel damage, not charges or pool exhaustion.
- Pressure text:
  - "If either vessel is reduced to 0 Hit Points, the Folding Boat is destroyed."
- Why existing surface shapes do not work:
  - `last_charge_roll` is wrong trigger and wrong math.
  - `permanent_on_empty` is wrong trigger.
  - `none` omits a real mechanical consequence.

Suggested direction:

```ts
| {
    readonly kind: "on_active_form_zero_hp";
  }
```

### Secondary unresolved pressure

The fold-back command also has a real activation precondition the current surface cannot express:

- Pressure text: "The Folding Boat folds back into a box if no creatures are aboard."

That wants a general non-equipment activation predicate or attachment-state gate. It is secondary to the three primary gaps above, but it should not be silently omitted in a `clean` encoding.
