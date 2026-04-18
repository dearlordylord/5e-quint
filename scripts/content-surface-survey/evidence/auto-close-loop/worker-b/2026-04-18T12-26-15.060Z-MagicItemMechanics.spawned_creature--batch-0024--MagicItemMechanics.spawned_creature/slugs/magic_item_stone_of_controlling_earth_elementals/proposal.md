## Surface gap: activation gate for item-to-ground contact

`Stone of Controlling Earth Elementals` fits the existing `magic_item` + `spawned_creature` family honestly for its main payload:

- Magic action activation
- once per dawn reuse
- summon a named catalog creature
- shared initiative / immediately-after-caster turn order
- bonus-action dismissal
- 1-hour / death expiration

The remaining mismatch is the activation precondition:

> "While touching this 5-pound stone to the ground, you can take a Magic action to summon an Earth Elemental."

The current surface can gate magic-item activations with `EquipmentPredicate` variants such as `holding_item` or `wearing_item`, but it cannot express contact between the item and terrain / ground as part of the activation requirement.

### Recommended widening

- Kind: `new_variant`
- Surface: `EquipmentPredicate` or activation-side `condition`
- Suggested shape:

```ts
{ readonly kind: "touching_item_to_ground" }
```

or, if a slightly more general form is preferred:

```ts
{
  readonly kind: "item_contact_state";
  readonly state: "touching_ground";
}
```

### Why this is surface, not atom, pressure

The underlying mechanics already fit existing v4 atoms and families:

- `activate`
- `use_count`
- `duration_window`
- `persist`
- `expire`
- `companion`
- `create_companion`
- `command_companion`

No new effect atom or top-level payload family is forced. The missing piece is only an activation-gate variant on the authored surface.
