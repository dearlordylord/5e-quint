## Verdict

`Figurine of Wondrous Power` does not fit honestly as a single authored `MagicItemRecord` using the current `MagicItemMechanics` families.

The base shell fits the existing surface well:

- magic item collection with named variants
- activation by Magic action
- spawned creature payload
- timed duration
- elapsed-days cooldown on reuse

That is enough for simple variants such as Bronze Griffon or Marble Elephant.

## Why The Whole Unit Does Not Fit

Three variant mechanics break the current family shape:

1. Golden Lions require linked multi-companion activation.

Evidence:
> "These gold statuettes of lions are always created in pairs. You can use one figurine or both simultaneously."

Current gap:
- `MagicItemSpawnedCreatureMechanics` creates one companion.
- There is no magic-item analogue of a multi-spawn or linked-pair activation.

2. Goat of Traveling requires duration-time resource drain, not activation-time spend.

Evidence:
> "It has 24 charges, and each hour or portion thereof it spends in goat form costs 1 charge."
> "When it runs out of charges, it reverts to a figurine and can't be used again until 7 days have passed..."

Current gap:
- existing charge pools are spent when you activate or cast
- existing passive operations can repeat effects over time, but they do not drain an activation resource or trigger forced reversion on depletion

3. Some riders are gated on the creature form being active.

Evidence:
> "While in raven form, the figurine grants you the ability to cast Animal Messenger on it."

Current gap:
- the surface has equipment predicates like `holding_item` and `wearing_item`
- it does not have a predicate or host family for "while this spawned companion/form is active"

## Secondary Pressure

These are additional pressures, but they are not needed to justify the verdict:

- Goat of Terror combines mount-scoped aura fear, repeat saves, and temporary weapon creation from removable horns.
- Obsidian Steed has a 10% disobedience branch and a special transport-to-Hades failure case.

## Classification

`structural_widening`

Reason:
- the missing capability is not just one new atom on an otherwise-fitting payload
- the unit needs new composition around spawned companions, ongoing resource drain, and active-form state gating

## Files Intentionally Not Written

To avoid a misleading trace, these files were not created:

- `content/magic_item_figurine_of_wondrous_power.dhall`
- `content/magic_item_figurine_of_wondrous_power.json`
- `content/magic_item_figurine_of_wondrous_power.trace.md`
