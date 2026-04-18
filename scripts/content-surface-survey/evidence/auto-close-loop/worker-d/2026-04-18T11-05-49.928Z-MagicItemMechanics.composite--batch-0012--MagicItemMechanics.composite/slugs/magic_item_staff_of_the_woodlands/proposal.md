## Staff of the Woodlands

Outcome: `surface_widening`

The current magic-item surface can encode most of the item honestly:

- held passive weapon bonus with `specific_item` weapon filters
- held passive `spell_attack_roll` bonus
- druid-only attunement restriction
- charge-pool spellcasting table
- dawn recharge

Two parts do not fit the current authored surface.

### 1. Tree Form needs item-targeted transformation

The current `ActivationPhase` attachment grammar only supports `self`, `target`, `area`, and `mark`. `Tree Form` transforms the staff itself after you plant it in the ground; that is an item/object target, not the bearer.

Needed widening:

- add an item/object attachment target usable by activation phases so `alter_item_kind` can honestly target the staff rather than the wielder

Evidence:

> "You can take a Magic action to plant one end of the staff in earth in an unoccupied space and expend 1 charge to transform the staff into a healthy tree."

### 2. Tree Form revert needs the surfaced `fall_on_end` rider

The taxonomy includes `fall_on_end`, but `src/surface/types.ts` does not currently expose an effect variant for it. The revert clause is mechanical and deterministic, so omitting it is a surface gap rather than DM agenda.

Needed widening:

- add `fall_on_end` to `EffectAtom` and tracer support so the tree-form state can carry the "creatures in the tree fall when it reverts" cleanup

Evidence:

> "Any creature in the tree falls when the tree reverts to a staff."

### 3. Last-charge shutdown is not destruction

`ItemDestructionPolicy` can encode `none`, `last_charge_roll` destruction, and `permanent_on_empty`. This item does not get destroyed on a failed last-charge roll; it permanently loses its magic and remains as a mundane quarterstaff.

Needed widening:

- add a non-destructive last-charge shutdown variant, e.g. permanent magical deactivation / lose_properties_on_last_charge_roll

Evidence:

> "If you expend the last charge, roll 1d20. On a 1, the staff loses its properties and becomes a nonmagical Quarterstaff."

### Authored subset

The authored Dhall keeps the representable subset only:

- +2 attack rolls with the staff
- +2 damage rolls with the staff
- +2 spell attack rolls while holding it
- spell table via charge-cast grants
- 1d6 dawn recharge

This subset typechecks and traces cleanly, but the full unit is not `clean` because `Tree Form` and the non-destructive last-charge rider are omitted.
