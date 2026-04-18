## Robe of the Archmagi

Outcome: `surface_widening`

The unit fits the existing `magic_item` top-level kind and `composite` mechanics family honestly:

- passive part gated by `wearing_item` + `unarmored` for the base-AC formula
- passive part gated by `wearing_item` for `modify_save_dc` +2 and `modify_roll_numeric` on `spell_attack_roll` +2
- record-level attunement gate via `attunementRestriction = class_list [sorcerer, warlock, wizard]`

The blocker is the Magic Resistance rider:

> "You have Advantage on saving throws against spells and other magical effects."

Current `EffectAtom.modify_roll_advantage` can narrow by:

- roll kind
- attacker creature type
- skill
- saving-throw ability
- count / expiry

It cannot narrow a saving-throw bonus by **effect source** or **magicality**. Encoding this as plain advantage on all saving throws would be false, because the robe does not help against nonmagical saves.

### Proposed widening

- kind: `new_variant`
- target: `EffectAtom.modify_roll_advantage`
- addition: an optional save/effect-source filter for magical origins, e.g. a closed field such as `sourceFilter = { kind = "spell_or_magical_effect" }`

### Why this is surface, not atom, widening

The underlying v4 atom is still `modify_roll_advantage`; the missing piece is a refinement on when it applies. No new top-level family or new effect atom is forced by this item.
