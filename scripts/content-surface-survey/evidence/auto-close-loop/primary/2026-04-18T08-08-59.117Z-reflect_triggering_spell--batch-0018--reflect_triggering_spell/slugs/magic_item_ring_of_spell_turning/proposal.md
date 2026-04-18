## Ring of Spell Turning

Outcome: `surface_widening`

The existing `magic_item` kind and `composite` magic-item mechanics family are sufficient in principle:

- a passive component for the ongoing save rider while worn
- a triggered-reaction component for the spell reflection after a qualifying successful save

What is missing is not a new top-level family or a new v4 atom. The missing pieces are surface variants that let the current families express the rule honestly.

### Missing surface shapes

1. Spell-scoped saving-throw rider on `modify_roll_advantage`

Current `EffectAtom.modify_roll_advantage` can narrow by:

- `attackerTypeFilter`
- `skillFilter`
- `saveAbilityFilter`
- `count`
- `expiresOn`

It cannot say "advantage on saving throws against spells" without lying and broadening the item to all saving throws.

Evidence:

> "While wearing this ring, you have Advantage on saving throws against spells."

Suggested widening:

- add a save-source filter variant on `modify_roll_advantage`, e.g. a field that can narrow `saving_throw` riders to spells

2. Reaction trigger for "after you succeed on a saving throw against a qualifying spell"

Current `ReactionTrigger` covers:

- hit by attack roll
- targeted by named spell
- creature casts spell
- any_of

It cannot express the ring's trigger, which depends on all of:

- you succeeded on the save
- the triggering effect was a spell
- spell level 7 or lower
- the spell targeted only you
- the spell did not create an area of effect

The existing `reflect_triggering_spell` atom already models the resolution payload once the reaction window opens. The gap is opening that window honestly.

Evidence:

> "If you succeed on the save for a spell of level 7 or lower, the spell has no effect on you. If that spell targeted only you and didn't create an area of effect, you can take a Reaction to deflect the spell back at the spell's caster; the caster must make a saving throw against the spell using their own spell save DC."

Suggested widening:

- add a `ReactionTrigger` variant for successful spell-save reflection, with fields for:
  - `maxSpellLevel`
  - `targetedOnlySelf`
  - `requiresNoAreaOfEffect`

### Honest fit after widening

After those two widenings, the unit would fit as:

- `MagicItemRecord`
- `mechanics.family = "composite"`
- passive part:
  - `condition = { kind = "wearing_item" }`
  - grant `modify_roll_advantage` on `saving_throw`, narrowed to spells
- triggered-reaction part:
  - `condition = { kind = "wearing_item" }`
  - `activationCost = { kind = "reaction", trigger = ... }`
  - `phases = [ direct self -> negate_triggering_spell?, reflect_triggering_spell ]`

### Notes

The text also says the triggering spell "has no effect on you" on a successful qualifying save before the optional deflection clause. That still fits the existing effect vocabulary via `negate_triggering_spell`; the blocker is the missing trigger shape, not the payload.
