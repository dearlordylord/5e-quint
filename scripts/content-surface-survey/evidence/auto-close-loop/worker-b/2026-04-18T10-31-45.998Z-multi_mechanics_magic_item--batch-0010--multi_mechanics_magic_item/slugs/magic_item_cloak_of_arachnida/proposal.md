# Proposal: magic_item_cloak_of_arachnida — structural_widening

## Why this does not fit honestly

`Cloak of Arachnida` combines two different mechanics families in one item:

- passive always-on benefits while worn:
  - Poison resistance
  - Climb Speed equal to Speed
  - web-movement / web-immunity rider
- a separately limited activated spell rider:
  - cast `Web`
  - fixed save DC 13
  - doubled area
  - refreshes at dawn

The current surface allows only:

- `MagicItemMechanics = PassiveMechanics | ActivatedAbilityMechanics`

That means a magic item can currently be **either** passive **or** activated, but not both at once. No single existing family can represent this item without dropping real mechanics or lying about when they apply.

This is the primary blocker, so the correct classification is `structural_widening`.

## Gap 1 — mixed passive + activated item mechanics

Type of gap: `structural_widening`

The item needs one passive stream and one separate activated stream.

Proposed widening:

- `new_subgraph`: `multi_mechanics_magic_item`

Justification:

- Many SRD items are bundles of independent mechanics rather than a single family.
- Here, the passive benefits are not activated, and the `Web` cast is not always-on.
- Modeling the whole item as `passive` would falsely make `Web` always available with no once-per-dawn limit.
- Modeling the whole item as `activation` would falsely imply Poison Resistance / Climb Speed are activated uses rather than persistent benefits.

Evidence:

> "While wearing it, you gain the following benefits."
>
> "Poison Resistance. You have Resistance to Poison damage."
>
> "Spider Climb. You have a Climb Speed equal to your Speed..."
>
> "Web. You can cast Web ... Once used, this property can't be used again until the next dawn."

## Gap 2 — granted-spell overrides on item-cast spells

Type of gap: `surface_widening`

Even if the mixed-mechanics item shape existed, the `Web` rider still needs cast overrides that the current `grant_spell_access` surface cannot express:

- fixed save DC 13
- modified spell geometry: "fills twice its normal area"

Proposed widening:

- `new_variant`: `grant_spell_access_overrides`

Suggested fields:

- `saveDcOverride: number`
- `spellParameterOverrides` or similarly-scoped payload for spell-specific cast modifications

Justification:

- Existing `grant_spell_access` only says *which spell* and *what resource mode*.
- It cannot say that the item-cast version uses a fixed DC rather than the caster's normal spell save DC.
- It also cannot alter a spell's authored parameters for casts from this item.

Evidence:

> "Web. You can cast Web (save DC 13). The web created by the spell fills twice its normal area."

## Gap 3 — web-specific traversal / immunity rider

Type of gap: `atom_widening`

The cloak gives a deterministic mobility rule around webs that is not representable by the current atom set:

- cannot be caught in webs
- can move through webs as if they were Difficult Terrain

This is not covered by:

- `grant_speed`
- `grant_condition_immunity` (there is no "webbed" condition)
- `block_travel` / `block_targeting`
- any current difficult-terrain or terrain-immunity atom in `types.ts`

Proposed widening:

- `new_atom`: `ignore_web_restrictions`

Justification:

- The benefit is narrower than generic movement speed and narrower than generic condition immunity.
- The item changes how a specific environmental / spell-created obstacle affects the wearer.
- This is deterministic core mechanics, not DM agenda.

Evidence:

> "Spider Walk. You can't be caught in webs of any sort and can move through webs as if they were Difficult Terrain."

## Notes on partial fit

Some parts of the item already fit cleanly in the current surface:

- Poison Resistance → `grant_resistance` with `poison`
- Climb Speed equal to Speed → `grant_speed` with `speedKind = "climb"` and `feet = { kind = "walk_speed" }`

There is also direct local precedent for treating the vertical-surface / ceiling text as out-of-scope geometry while still encoding the linked climb speed:

- `content/spider_climb.dhall`
- `content/magic_item_slippers_of_spider_climbing.dhall`

Those clean sub-parts do not change the top-level verdict, because the whole item still cannot be represented honestly as one existing `MagicItemMechanics` family.
