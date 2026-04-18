# Proposal: Staff of the Woodlands

## Outcome

`surface_widening`

## What fits today

The current surface can encode a substantial subset honestly:

- `MagicItemMechanics.composite`
- attunement restriction `class_list = ["druid"]`
- passive held-item quarterstaff bonuses:
  - `modify_roll_numeric` with `weaponFilter.kind = "specific_item"`
  - `modify_damage_numeric` with `weaponFilter.kind = "specific_item"`
- charge-pool spellcasting table via `grant_spell_access`
- dawn recharge
- existing `last_charge_roll` lifecycle shape

That authored subset is present in `content/magic_item_staff_of_the_woodlands.dhall` and traces cleanly.

## Remaining surface gaps

### 1. Spell-attack-only roll narrowing

The item grants `+2` to spell attack rolls while holding it. The current
surface only exposes `RollKind = "attack_roll"`, which would also catch
weapon attacks and double-count the staff's own quarterstaff bonus if used
here.

Needed widening:

- either `RollKind.spell_attack_roll`
- or a narrower attack filter on `modify_roll_numeric`

Evidence:

> "While holding it, you have a +2 bonus to spell attack rolls."

### 2. Tree Form needs item/object attachment + revert semantics

`alter_item_kind` exists, but the surface has no honest way to target the
staff-as-item / planted tree-as-object, then later revert it while touching
the transformed object. Current `Attachment` only offers `self`, `target`,
`area`, and `mark`.

Needed widening:

- `Attachment.item` or `Attachment.object`
- likely a touching/using-transformed-object gate for the revert activation

Evidence:

> "You can take a Magic action to plant one end of the staff in earth in an unoccupied space and expend 1 charge to transform the staff into a healthy tree."

> "While touching the tree and using a Magic action, you return the staff to its normal form."

### 3. Fall rider on reversion

When the tree reverts, creatures in it fall. The v4 taxonomy already names
`fall_on_end`, but the current TS surface does not expose that effect atom.

Needed widening:

- `EffectAtom.fall_on_end` (surface catch-up to v4)

Evidence:

> "Any creature in the tree falls when the tree reverts to a staff."

### 4. Last-charge failure is disenchantment, not destruction

The current lifecycle only supports `last_charge_roll` as destruction. This
item instead remains as a mundane Quarterstaff.

Needed widening:

- an item lifecycle variant for "loses properties / becomes nonmagical"

Evidence:

> "If you expend the last charge, roll 1d20. On a 1, the staff loses its properties and becomes a nonmagical Quarterstaff."

## Why this is not `clean`

The trace is accurate for the encoded subset, but three real mechanics are
still omitted:

- the `+2` spell attack roll bonus
- the entire Tree Form / revert mode
- the nonmagical-on-last-charge failure mode

That makes this a surface gap, not a fully clean encoding.
