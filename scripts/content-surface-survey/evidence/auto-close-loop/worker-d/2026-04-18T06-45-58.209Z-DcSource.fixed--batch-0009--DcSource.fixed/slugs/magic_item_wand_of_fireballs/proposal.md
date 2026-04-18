# Wand of Fireballs

`Wand of Fireballs` fits the existing `magic_item` + `activation` surface for its deterministic mechanics:

- `condition = holding_item`
- `activationCost = action`
- `resource = charge_pool` with cap 7
- `grant_spell_access` with `charge_cast` from `fireball` at levels 3-5
- `dcOverride = fixed 15`
- `resetCadence = dawn` with regain `1d6 + 1`
- `destruction = last_charge_roll`

## Surface gap

The current record shape cannot express the attunement eligibility rider:

> *Wand, Rare (Requires Attunement by a Spellcaster)*

`MagicItemRecord.requiresAttunement` is only a boolean. That records that the wand consumes an attunement slot, but it cannot state that only spellcasters may attune to it.

## Proposed widening

- Add an attunement restriction variant on `MagicItemRecord`, for example a closed eligibility field alongside `requiresAttunement`.

This is a `surface_widening`, not an atom widening: the traceable mechanics atoms already exist and the tracer succeeds.
