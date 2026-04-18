## Staff of Fire

Outcome: `surface_widening`

The unit fits the existing `magic_item` top-level kind and `composite` mechanics family honestly:

- passive held rider: `grant_resistance` to `fire`
- activated held rider: `charge_pool` + `grant_spell_access` for `burning_hands`, `fireball`, and `wall_of_fire`
- recharge and destruction: existing `dawn` reset cadence and `last_charge_roll`

The remaining gap is the attunement restriction.

### Missing surface shape

- `new_variant`: `MagicItemRecord.attunementRestriction`

Why it is needed:

- `requiresAttunement: true` records that attunement is required, but not who is eligible to attune.
- The current surface therefore loses a real mechanical gate from the item header.

Evidence:

> Staff, Very Rare (Requires Attunement by a Druid, Sorcerer, Warlock, or Wizard)

Suggested shape:

```ts
type MagicItemAttunementRestriction =
  | { kind: "any" }
  | { kind: "class_list"; classes: ReadonlyNonEmptyArray<ClassName> }

type MagicItemRecord = UnitMetadata & {
  // ...
  requiresAttunement: boolean
  attunementRestriction?: MagicItemAttunementRestriction
}
```

This is a `surface_widening`, not an `atom_widening`: the missing concept is metadata/gating on an existing `magic_item` record shape, not a new v4 atom.
