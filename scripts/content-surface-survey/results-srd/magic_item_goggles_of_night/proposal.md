## Goggles of Night

Outcome: `atom_widening`

`Goggles of Night` fits the existing top-level shape `MagicItemRecord` with passive mechanics, but it does not fit honestly with the current effect atoms.

### What fits

- Unit kind: `magic_item`
- Mechanics family: `passive`
- Rarity / attunement / destruction all fit existing fields

### What does not fit

The current surface has `grant_sense`:

- `grant_sense { sense = "darkvision", rangeFeet = 60 }`

That can encode only the first clause:

> While wearing these dark lenses, you have Darkvision out to 60 feet.

It cannot encode the second clause:

> If you already have Darkvision, wearing the goggles increases its range by 60 feet.

Encoding this item as only `grant_sense darkvision 60 ft` would be dishonest, because a creature that already has Darkvision 60 feet should end up with 120 feet, not remain at 60 feet.

### Required widening

Proposed new atom: `modify_sense_range`

Suggested semantics:

- target an existing sense kind
- apply an additive range delta
- allow composition with `grant_sense` when the unit both grants the sense-if-absent and increases it-if-present

Sketch:

```ts
{
  kind: "modify_sense_range";
  sense: SenseKind;
  deltaFeet: number;
}
```

Then `Goggles of Night` could be modeled honestly as a passive bundle:

- `grant_sense(darkvision, 60 ft)` for creatures without darkvision
- `modify_sense_range(darkvision, +60 ft)` for creatures that already have it

If the system wants invalid double-application to be impossible, the final design may need a more precise combined atom like:

```ts
{
  kind: "grant_or_extend_sense";
  sense: SenseKind;
  minimumRangeFeet: number;
  extendExistingByFeet: number;
}
```

But the minimum new pressure exposed by this item is: existing darkvision range must be modifiable.
