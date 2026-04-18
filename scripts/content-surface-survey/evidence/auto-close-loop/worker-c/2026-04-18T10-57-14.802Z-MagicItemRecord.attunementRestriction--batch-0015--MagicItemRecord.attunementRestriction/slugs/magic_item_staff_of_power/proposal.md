`Staff of Power` fits the existing `magic_item` record and `composite` mechanics family for its held passive bonuses and charge-cast spell list, but it is not `clean`.

Omitted mechanics:

- Last-charge branch: "If you expend the last charge, roll 1d20. On a 1, the staff retains its +2 bonus to attack rolls and damage rolls but loses all other properties. On a 20, the staff regains 1d8 + 2 charges."
- Retributive Strike: "You can take a Magic action to break the staff ... releases its magic in an explosion ... You have a 50 percent chance to instantly travel to a random plane of existence, avoiding the explosion. If you fail to avoid the effect, you take Force damage equal to 16 times the number of charges in the staff. Each other creature in the area makes a DC 17 Dexterity saving throw ... takes Force damage equal to 4 times the number of charges in the staff ..."

Why these are surface widenings, not structural:

- The existing families already cover the broad shape: passive grants, charge-based spell access, and activated abilities.
- The missing pieces are more specific variants of existing surfaces:
  - a last-charge lifecycle branch that can partially strip properties and optionally restore charges;
  - a non-spell activation that consumes the item's remaining charge pool and lets downstream damage scale from that remaining pool;
  - an area attachment / target-selection variant for "each other creature in the area", so the wielder can be handled by a separate self branch without also being swept into the area save.

Suggested widenings:

1. `new_variant`: lifecycle / destruction branch on last-charge depletion
   - Needed for items that do not simply get destroyed on empty.
   - `Staff of Power` keeps some properties on a `1` and regains charges on a `20`.

2. `new_variant`: charge-pool remainder as an activation-consumable amount source
   - Existing `resource_spent` keys off charges spent in the activation, but `Retributive Strike` scales from charges currently in the staff when it is broken.
   - The activation also needs a way to consume the remaining pool, not just a fixed 1 use.

3. `new_variant`: area targeting that excludes the source / primary self branch
   - `Retributive Strike` affects "each other creature in the area" while the wielder gets a different resolution path.
   - Current `area` attachments have no way to express "all others, not self/source".
