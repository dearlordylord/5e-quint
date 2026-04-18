# Hat of Many Spells

Outcome: `surface_widening`

## Why it stops

`magic_item` is the correct top-level record kind, and the item would otherwise fit a `composite` mechanics shape with:

- a passive held-item property for the spellcasting-focus clause
- an activated property for **Unknown Spell**

The problem is that the current surface cannot encode the activated property honestly.

## Primary blocker

The existing surface can only author spell access as a named spell via `grant_spell_access.spellId`. Hat of Many Spells does not grant a named spell. It lets the bearer choose any qualifying Wizard spell they do not know, then attempts to cast that chosen spell.

Relevant text:

> "While holding the hat, you can try to cast a level 1+ spell you don't know. The spell must be on the Wizard spell list, it must be of a level you can cast, and it can't have Material components costing more than 1,000 GP."

This needs a new surface variant for filtered, caller-chosen spell access rather than a fixed `spellId`.

## Secondary blocker

The item's cooldown is branch-contingent:

- you spend the spell slot before the check
- the once-per-short-or-long-rest lockout happens only on success

Relevant text:

> "Once you decide on the spell, you must expend a spell slot of the spell's level. Then, to determine whether you cast the spell, make an Intelligence (Arcana) check..."

> "On a successful check, you cast the spell using its normal casting time, and you can't use this property again until you finish a Short or Long Rest."

Current activated-item mechanics consume their declared item resource at activation time. They cannot represent "cooldown only if this branch succeeds".

## Additional surface pressure

The activation cost is also delegated to the chosen spell:

> "On a successful check, you cast the spell using its normal casting time."

Current item activations require a fixed `activationCost` on the item itself, not "whatever the chosen spell's casting time is".

## Additional atom pressure

The passive focus property also lacks a current effect atom:

> "While holding the hat, you can use it as a Spellcasting Focus for your Wizard spells."

That is not expressible with the current passive atoms.

## Random-table note

If the primary success path were representable, the failure table would still need follow-up review. Some rows likely fit existing atoms/subgraphs (`apply_condition`, `spawned_creature`, `random_table`), but others may need extra widening depending on how strictly the authored surface wants to model object creation, temporary portals, and caller-chosen random magic items.

That is secondary. The unit already fails honest authoring on the main property above, so no `.dhall` or generated JSON was produced.
