## Rod of Alertness

Verdict: `structural_widening`

### What fits already

- `Alertness` fits the existing passive magic-item shape:
  - `condition = holding_item`
  - `modify_roll_advantage` on `initiative`
  - `modify_roll_advantage` on `ability_check` with `skillFilter = perception`
- `Spells` fits existing `grant_spell_access` entries on a magic-item composite.

### What does not fit honestly

`Protective Aura` is not a one-shot activation and not a simple passive grant. It is an activated, temporary field planted at a location:

- activation starts with a `Magic action`
- the rod becomes an anchored source in the environment
- the effect persists for 10 minutes
- creatures qualify based on being inside the bright-light zone
- benefits are restricted to `you and your allies`, not all creatures in the area
- the effect can end early when someone uses a Magic action to pull the rod up

The current magic-item surface has:

- `passive`
- `activation`
- `triggered_reaction`
- `composite`

but no reusable non-spell ongoing-field family for items.

### Narrowest honest widening

1. Add a magic-item component family parallel to spell `ongoing_effect`.
   It needs:
   - an activated start
   - an attachment or anchor point for the planted rod
   - persistent operations for creatures qualifying inside the field

2. Add an ally-side filter on area effects.
   Current area attachments can target creatures in an area, but not `you and your allies` specifically.

3. Add an early-end trigger for removing an anchored item with an action.
   Existing duration triggers do not cover:
   - "a creature takes a Magic action to pull the rod from the ground"

### Why I did not author a partial file

I could have encoded the held Alertness rider and granted spells, but that would omit one of the item's three named properties and produce a misleadingly incomplete trace. Under this protocol, that is worse than stopping at the widening proposal.
