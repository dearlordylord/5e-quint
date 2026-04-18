# Wand of Fireballs

## Verdict

The unit fits the existing `magic_item` + `activation` surface honestly for its deterministic mechanics:

- `charge_pool` resource with cap 7
- `holding_item` activation gate
- `grant_spell_access` with `charge_cast` for `fireball` at levels 3-5
- fixed `dcOverride` of 15
- `dawn` recharge of `1d6 + 1`
- `last_charge_roll` destruction on empty

## Surface gap

### Attunement eligibility predicate

`MagicItemRecord.requiresAttunement` is only a boolean, so the item can say that attunement is required but not who is eligible to attune.

- Classification: `surface_widening`
- Pressure: an attunement eligibility qualifier on magic items
- Evidence: "Rare (Requires Attunement by a Spellcaster)"

An honest widening would add an optional attunement eligibility restriction on `MagicItemRecord`, rather than overloading the activation gate or pretending the item has unrestricted attunement.
