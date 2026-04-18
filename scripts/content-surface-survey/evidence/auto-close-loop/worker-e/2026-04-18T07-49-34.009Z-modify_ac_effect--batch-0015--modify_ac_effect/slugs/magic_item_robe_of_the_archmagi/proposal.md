`Robe of the Archmagi` fits the existing `magic_item` top-level kind and the `passive` mechanics family, but it does not fit the current authored surface honestly.

Why it is not clean:

1. `War Mage` needs a new atom.
Evidence:
`Your spell save DC and spell attack bonus each increase by 2.`

The `spell_attack_bonus` half fits today as `modify_roll_numeric` on `["spell_attack_roll"]`, but there is no existing effect atom for a passive increase to the wielder's spell save DC. `grant_spell_access.dcOverride` only affects casts made through that grant, not the character's full spellcasting. This is an `atom_widening`.

Suggested widening:

- New atom: `modify_spell_save_dc`
  - Shape: signed numeric delta, parallel to existing passive spell-attack bonus handling.
  - Why: the robe modifies the wearer's global spell save DC, not a single granted spell.

2. `Armor` needs an existing AC-formula shape to be usable from passive magic-item grants.
Evidence:
`If you aren't wearing armor, your base Armor Class is 15 plus your Dexterity modifier.`

The surface already has the AC-formula concept as ongoing-operation `modify_ac_set_base` for spells like Mage Armor, but passive magic items can only carry `EffectAtom[]`, and `EffectAtom` has no passive AC-formula replacement variant. This is a `surface_widening`, not a new atom family.

Suggested widening:

- New variant on passive-capable effect surface:
  - reuse the existing `modify_ac_set_base` shape, or
  - add an equivalent `EffectAtom` variant for base-AC replacement.
  - Gate it with the existing `condition = { kind = "unarmored" }`.

3. `Magic Resistance` needs source filtering on saving-throw advantage.
Evidence:
`You have Advantage on saving throws against spells and other magical effects.`

`modify_roll_advantage` can express advantage on saving throws, but it cannot narrow that advantage to only magical sources. Encoding plain advantage on all saving throws would overstate the rule. This is another `surface_widening`.

Suggested widening:

- New filter on `modify_roll_advantage` for save-source scope, e.g. magical-only / spell-or-magical-effect.

Verdict:

- Outcome: `atom_widening`
- Reason: one required mechanic (`+2 spell save DC`) has no honest atom today, and the other two clauses also need surface widening.
