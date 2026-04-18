## Wand of Fireballs

Outcome: `surface_widening`

The item's core charge-cast mechanics already fit the existing `magic_item` + `activation` surface:

- `charge_pool` resource with cap 7
- `grant_spell_access` with `charge_cast` for `fireball`
- fixed `dcOverride` of 15
- `dawn` recharge (`1d6 + 1`)
- `last_charge_roll` destruction (`d20`, destroy on `1`)

Two deterministic rules are still not representable honestly in the current surface:

1. Activated-item holding gate

RAW evidence:
> "While holding it, you can expend no more than 3 charges to cast Fireball from it."

Problem:

- `EquipmentPredicate.holding_item` exists, but only on `PassiveMechanics`.
- `ActivatedAbilityMechanics` has no equivalent condition / requirement field.
- Authoring this as a plain activation would falsely imply the cast is available without holding the wand.

Needed widening:

- Add an activation-side predicate or requirement field reusable by class features / species traits / feats / magic items.
- Minimal pressure case here is `holding_item`.

2. Qualified attunement requirement

RAW evidence:
> "Rare (Requires Attunement by a Spellcaster)"

Problem:

- `MagicItemRecord` only carries `requiresAttunement: boolean`.
- The "by a spellcaster" qualifier is deterministic and mechanical, not flavor.
- Encoding only `requiresAttunement = true` loses a real eligibility gate.

Needed widening:

- Add a typed attunement qualifier on `MagicItemRecord`, e.g. a closed attuner predicate that can express `spellcaster`.

Because those gates are part of the item's real mechanics, I did not author `content/magic_item_wand_of_fireballs.dhall`.
