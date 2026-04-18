## Potion of Gaseous Form

Outcome: `surface_widening`

This unit fits the existing top-level kind and family boundary as a `magic_item` with `activation`-style use, but the current surface cannot represent its mechanics honestly.

### Why it does not fit cleanly

The item does not grant spell access. Drinking the potion immediately applies the effect of an existing spell with item-specific overrides:

- fixed duration of 1 hour;
- no Concentration required;
- the drinker may end the effect as a Bonus Action.

The current surface has `grant_spell_access`, but that means "you may cast this spell." That is not what this item does. Authoring it that way would produce a misleading trace.

The current surface also has no reusable way for a non-spell unit to say "apply spell X's authored mechanics, but with these lifecycle overrides."

### Narrowest widening

Add a new variant on an existing surface type for spell-effect reuse from non-spell activations. For example:

- an `EffectAtom` variant such as `apply_spell_effect_reference`, or
- an `ActivationPhase.direct` payload variant that references a spell id plus bounded overrides.

Required override pressure from this item:

- `spellId = "gaseous_form"`
- duration override to `1 hour`
- concentration override to disabled
- optional early manual end with `bonus_action`

### Evidence

> "When you drink this potion, you gain the effect of the Gaseous Form spell for 1 hour (no Concentration required) or until you end the effect as a Bonus Action."

### Why this is `surface_widening`, not `atom_widening`

The missing concept is not a new v4 mechanics atom. The gap is a missing authored-surface shape for reusing an existing spell effect with bounded lifecycle overrides from a magic item activation.
