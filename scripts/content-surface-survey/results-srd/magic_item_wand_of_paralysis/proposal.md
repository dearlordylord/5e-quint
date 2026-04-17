`Wand of Paralysis` fits the existing `magic_item` + `activation` family in broad shape:

- charge pool
- action-based activation
- timed disabling effect with a repeat save
- dawn recharge
- last-charge destruction roll

The current surface cannot encode it honestly because the save DC is a fixed `15`.

Required widenings:

1. `DcSource.fixed`
Evidence:
`The target must succeed on a DC 15 Constitution saving throw or have the Paralyzed condition for 1 minute.`

Why:
`DcSource` currently only supports:

- `caster_spell_save_dc`
- `weapon_attack_dc`
- `innate_dc` (`base + ability mod + PB`)

None of those can represent a magic item with a hard-coded DC. Encoding the wand as `innate_dc` would be false, because the DC does not derive from the wielder's ability or proficiency.

Secondary surface gaps surfaced by this unit:

2. Activation-cost variant for `Magic action`
Evidence:
`While holding it, you can take a Magic action to expend 1 charge ...`

Why:
`ClassFeatureActivationCost.action` collapses all actions together. For magic items, the rules text distinguishes the `Magic` action from a generic action. The current surface can only approximate this as `{ kind = "action" }`.

3. Attunement qualifier metadata
Evidence:
`Rare (Requires Attunement by a Spellcaster)`

Why:
`MagicItemRecord.requiresAttunement` is only a boolean. It cannot represent the restriction that only a spellcaster can attune to the item. This is the same shape gap already seen on class-qualified attunement items.

Suggested classification:

- `surface_widening`

Why not `structural_widening`:

- the unit still belongs to the existing `magic_item` record kind
- the existing `activation` family is the right mechanics family
- no new top-level family or atom is forced

