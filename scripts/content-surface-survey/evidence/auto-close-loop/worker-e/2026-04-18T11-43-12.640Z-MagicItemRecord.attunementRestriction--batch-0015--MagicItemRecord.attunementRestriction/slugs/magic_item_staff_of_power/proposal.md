`Staff of Power` fits the existing `magic_item` top-level kind and would otherwise be a `composite` magic item:

- a passive held-item part for the quarterstaff's `+2` attack and damage bonuses,
- a passive held-item part for `+2` AC, saving throws, and spell attack rolls,
- an activation part for charge-based spellcasting with dawn recharge.

I stopped before authoring because three core mechanics do not fit the current surface honestly.

## Surface gaps

1. Remaining-charge-based damage for `Retributive Strike`

- RAW: "you take Force damage equal to 16 times the number of charges in the staff" and "each other creature in the area ... takes Force damage equal to 4 times the number of charges in the staff."
- The current `DiceAmount` surface can express `resource_spent` and `resource_spent_linear`, but not damage derived from the current remaining count of a `charge_pool`.
- This is a surface widening, not a new atom: the damage atom already exists.

Suggested widening:

- Add a `DiceAmount` variant for charge-pool-state-derived amounts, e.g. `resource_remaining_linear`, or an equivalent activation-side binding that lets a phase read the current remaining charges from its consumed `charge_pool`.

2. Area payload that explicitly excludes the bearer

- RAW: "Each other creature in the area makes a DC 17 Dexterity saving throw."
- The current area attachment can target an area from `self`, but it cannot say "all creatures in the area except the source creature."
- Modeling the save as a normal area `save_gate` would incorrectly include the wielder in the save branch, while RAW gives the wielder a separate 50% avoidance branch and, on failure to avoid, a different damage formula.

Suggested widening:

- Add an area-side exclusion filter, e.g. "other creatures in area" / "exclude_source".

3. Last-charge resolution that can partially depower the item or restore charges

- RAW: "If you expend the last charge, roll 1d20. On a 1, the staff retains its +2 bonus to attack rolls and damage rolls but loses all other properties. On a 20, the staff regains 1d8 + 2 charges."
- Existing `ItemDestructionPolicy` only handles `none`, deterministic empty, or `last_charge_roll` that destroys the item.
- `Staff of Power` needs a richer last-charge resolution that can:
  - suppress only some item parts,
  - preserve other parts,
  - or restore charges after empty.

Suggested widening:

- Replace or extend `ItemDestructionPolicy.last_charge_roll` with a richer last-charge outcome subgraph / variant that can branch into partial property loss and resource restoration.

## Why I did not author a partial record

The passive bonuses and spellcasting half do fit, but omitting `Retributive Strike` scaling/exclusion semantics and the last-charge behavior would produce a materially false trace for the unit as a whole. Per the task guardrails, no placeholder `.dhall` was authored.
