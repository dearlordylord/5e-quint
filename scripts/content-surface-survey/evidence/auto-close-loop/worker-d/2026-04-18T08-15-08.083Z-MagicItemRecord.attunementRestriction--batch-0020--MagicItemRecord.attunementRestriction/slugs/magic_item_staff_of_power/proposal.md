# Staff of Power

Outcome: `structural_widening`

## Why it does not fit cleanly

`Staff of Power` combines:

- passive held-item bonuses:
  - `+2` attack rolls with the staff
  - `+2` damage rolls with the staff
  - `+2` AC
  - `+2` saving throws
  - `+2` spell attack rolls
- one charge-based spellcasting activation
- one separate activated ability, `Retributive Strike`
- one shared 20-charge pool used by both activated modes
- one shared dawn recharge rule
- one shared last-charge mishap rule

The current `MagicItemMechanics.composite` can combine multiple parts, but each `activation` part carries its own:

- `resource`
- `resetCadence`

That works for items with one activation plus passive grants. It does **not** honestly model a single item with multiple activated abilities sharing the same charge pool and recharge state.

If I split `Staff of Power` into:

- passive part
- spellcasting activation part
- Retributive Strike activation part

then the two activation parts would each need their own `charge_pool`, which duplicates state and changes the rule.

If I force everything into one activation part, the surface has no honest way to say "choose either cast one of these spells or perform Retributive Strike" while keeping those as distinct activations with different downstream effects.

## Additional gaps surfaced by this item

Even after the shared-resource issue, this item exposes a second surface gap:

- the current destruction lifecycle only models destruction on last charge exhaustion

`Staff of Power` instead has a three-way last-charge outcome:

- on `1`: item is degraded, not destroyed
- on `20`: item immediately regains charges
- otherwise: neither destruction nor recharge

That is not representable with the current record-level `ItemDestructionPolicy`.

## Evidence from the unit text

Shared resource across multiple activated modes:

> This staff has 20 charges

> While holding the staff, you can cast one of the spells on the following table from it

> Retributive Strike. You can take a Magic action to break the staff

Shared recharge and last-charge state:

> The staff regains 2d8 + 4 expended charges daily at dawn.

> If you expend the last charge, roll 1d20. On a 1, the staff retains its +2 bonus to attack rolls and damage rolls but loses all other properties. On a 20, the staff regains 1d8 + 2 charges.

## Proposed widening

1. Add a shared-resource magic-item activation bundle or equivalent subgraph.
   This should let one magic item expose multiple activated modes that all consume the same `charge_pool` and share one recharge policy.

2. Widen last-charge lifecycle outcomes beyond destruction.
   The item needs a post-empty outcome that can degrade some properties, preserve others, and optionally restore charges on a specific roll result.
