## Why this does not fit cleanly

`Figurine of Wondrous Power` does not fit the current `magic_item` surface honestly.

The primary blocker is structural: the item's core behavior is "take a Magic action, create a controllable creature for a bounded duration, then revert." The surface already has that shape only for spell families (`spawned_creature`, `reanimated_creature`, `templated_multi_spawn`). `MagicItemMechanics` is limited to `passive | activation`, and `ActivatedAbilityMechanics` only runs `ActivationPhase`; it has no way to produce a companion / stat block / control package.

The entry is also an umbrella record over multiple distinct figurines rather than one item with one rarity and one behavior. The SRD text includes Bronze Griffon, Ebony Fly, Golden Lions, Ivory Goats, Marble Elephant, Obsidian Steed, Onyx Dog, Serpentine Owl, and Silver Raven, each with different rarity, duration, recharge cadence, creature form, and extra riders. A single `MagicItemRecord` cannot honestly encode `rarity varies` plus those mutually distinct sub-items.

## Narrowest widening forced

`structural_widening` is the narrowest honest classification.

`surface_widening` is too small because the missing piece is not just one field or enum case; the unit needs a spell-like spawned-creature payload family under `magic_item`, or a shared non-spell companion-summon family reusable by items.

`atom_widening` is too large because the needed atoms already exist in the taxonomy and tracer (`create_companion`, `command_companion`). The problem is that the current top-level `magic_item` mechanics graph cannot legally use them.

## Suggested reshape

Add a `spawned_creature`-style branch to `MagicItemMechanics`, or lift companion creation/control into a shared family reusable by both spells and magic items.

Add a way to represent an umbrella item with a closed roster of named sub-items, or split this SRD entry into one record per concrete figurine instead of one record for the whole family.

## Evidence from the unit text

"If you take a Magic action to throw the figurine ... the figurine becomes a living creature specified in the figurine's description."

"The creature is Friendly to you and your allies. It understands your languages, obeys your commands, and takes its turn immediately after you on your Initiative count."

"The creature exists for a duration specific to each figurine."

"Bronze Griffon (Rare) ... Obsidian Steed (Very Rare) ... Silver Raven (Uncommon)."
