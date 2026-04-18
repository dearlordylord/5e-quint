## Hat of Many Spells

Outcome: `surface_widening`

The item fits the existing top-level `magic_item` kind and could in principle be a `composite` magic item with:

- a passive held-item part for the Spellcasting Focus property
- an activated part for Unknown Spell

I did not author `content/magic_item_hat_of_many_spells.dhall` because the current surface cannot encode the main activated property honestly.

### Why it blocks

The core `Unknown Spell` property requires three missing surface shapes at once:

1. The activation spends the wielder's own spell slot, not an item `use_count` or `charge_pool`.
2. The activation chooses an arbitrary qualifying Wizard-list spell rather than a fixed `spellId`.
3. On success, the chosen spell is cast using that spell's normal casting time, which means the activation does not have a fixed surface `activationCost`.

Those are surface-shape gaps, not new v4 atoms. The existing families already have `ability_check_gate`, `random_table`, conditions, transport, and companion creation, but the magic-item activation envelope cannot truthfully express this procedure.

### Required widenings

1. `ActivationResource` needs a new variant for consuming the wielder's spell slot.

Evidence:
> "you must expend a spell slot of the spell's level"

Why:
Current non-spell activations can only consume `use_count` or `charge_pool`. This item spends the character's own spellcasting resource instead.

2. `grant_spell_access` (or a sibling surface shape) needs a way to express a constrained arbitrary spell choice from a class spell list.

Evidence:
> "you can try to cast a level 1+ spell you don't know. The spell must be on the Wizard spell list, it must be of a level you can cast, and it can't have Material components costing more than 1,000 GP."

Why:
Current `grant_spell_access` requires a fixed `spellId`. This item does not grant one named spell; it opens a filtered choice over many Wizard spells.

3. Activated non-spell abilities need a way to defer to the chosen spell's own casting time after a gate succeeds.

Evidence:
> "On a successful check, you cast the spell using its normal casting time"

Why:
`ActivatedAbilityMechanics` requires a fixed `activationCost` up front. This property's cost depends on which spell was chosen and whether that spell normally takes an Action, Bonus Action, Reaction, or minutes to cast.

### Secondary gaps not chosen as the main blocker

- The failure table includes several branches that are only partially representable today, especially object/item creation and a portal whose destination is GM-chosen.
- The Spellcasting Focus rider is mostly caller-facing and not the main blocker for classification.

### Why this is not `structural_widening`

The top-level record kind and family already exist:

- `magic_item`
- `composite`
- `activation`

The failure is narrower than that. The item needs new variants inside existing surface types, so `surface_widening` is the honest classification.
