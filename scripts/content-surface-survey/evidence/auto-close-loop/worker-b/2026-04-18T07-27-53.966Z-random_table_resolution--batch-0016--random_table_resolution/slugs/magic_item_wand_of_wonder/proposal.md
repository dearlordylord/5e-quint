`Wand of Wonder` fits the existing top-level chassis as a `magic_item` with `activation` mechanics, a `charge_pool`, dawn recharge, last-charge destruction, and a `random_table` activation phase.

It does not fit honestly in the current authored surface, so no `content/magic_item_wand_of_wonder.dhall` was written.

Why it fails:

- The table includes non-spell area states that are not represented by any current effect atom:
  - `36–40`: "Heavy rain falls for 1 minute ... the area of effect is Lightly Obscured."
  - `41–45`: "A cloud of 600 oversized butterflies ... the area of effect is Heavily Obscured."
- The table includes an uncontrolled random creature spawn:
  - `56–60`: "A magically formed creature appears ... The creature isn't under your control, acts as it normally would, and disappears after 1 hour or when it drops to 0 Hit Points."
- The table modifies how granted spells are cast from the item:
  - "That location becomes the point of origin of a spell or other magical effect ..."
  - "If a spell's maximum range is normally less than 120 feet, it becomes 120 feet when cast from the wand."
- The item also has a table-wide target-randomization rider the current surface cannot express:
  - "If an effect has multiple possible subjects, the GM determines randomly which among them are affected."

Proposed widenings:

1. `new_atom`: `apply_obscurement`
   - Needed to model area states like Lightly Obscured / Heavily Obscured with a duration.
   - Evidence:
     - "the area of effect is Lightly Obscured"
     - "the area of effect is Heavily Obscured"

2. `new_variant`: `grant_spell_access.rangeOverride`
   - Needed for item-granted casts that change a reused spell's maximum range when cast through the item.
   - Evidence:
     - "If a spell's maximum range is normally less than 120 feet, it becomes 120 feet when cast from the wand."

3. `new_variant`: `grant_spell_access.originOverride`
   - Needed for item-granted casts that re-anchor the spell's point of origin to a chosen point rather than the caster.
   - Evidence:
     - "That location becomes the point of origin of a spell or other magical effect ..."

4. `new_variant`: uncontrolled spawned-creature branch under activation/random-table resolution
   - The current spawned-creature surface assumes a control contract; this branch explicitly denies control.
   - Evidence:
     - "The creature isn't under your control, acts as it normally would, and disappears after 1 hour or when it drops to 0 Hit Points."

Notes:

- Some individual rows could be encoded in isolation with existing atoms or existing spell records (`Darkness`, `Faerie Fire`, `Fireball`, `Slow`, `Stinking Cloud`, `Gust of Wind`, `Lightning Bolt`, `Invisibility`, `Polymorph`), but the item as a whole cannot be encoded honestly without the widenings above.
- The "GM determines randomly" clause is partly caller-/DM-owned, but it still blocks an honest fully-authored unit because the surface has no way to mark that random subject selection behavior on the affected rows.
