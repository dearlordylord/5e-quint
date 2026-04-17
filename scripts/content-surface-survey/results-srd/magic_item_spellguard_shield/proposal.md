`Spellguard Shield` fits the existing `magic_item` + `passive` family structurally, but it does not fit honestly in the current surface.

RAW:

> "While holding this Shield, you have Advantage on saving throws against spells and other magical effects, and spell attack rolls have Disadvantage against you."

Why it fails today:

- `modify_roll_advantage` can target `saving_throw`, but it cannot narrow that rider to saves caused by `spells and other magical effects`.
- `modify_roll_advantage` can target `attack_roll`, but it cannot narrow that rider to `spell attack rolls` only.
- Encoding either rider without those filters would over-apply:
  - all saving throws, not just against magical sources;
  - all attack rolls against you, not just spell attacks.

Recommended surface widening:

1. Add a source-side narrowing field for roll modifiers that distinguishes magical-source rolls/effects.
   - Candidate shape: `sourceFilter` on `modify_roll_advantage` and `modify_roll_numeric`
   - Example variants: `"spell" | "magical_effect"`
2. Add an attack-kind narrowing field for attack-roll modifiers.
   - Candidate shape: `attackKindFilter` on `modify_roll_advantage`
   - Example variants: `"melee_spell_attack" | "ranged_spell_attack"` or a coarser `"spell_attack"`

Classification:

- `surface_widening`

Why not `atom_widening`:

- The underlying mechanics are still the existing v4 atom `modify_roll_advantage`.
- The gap is missing narrowing shape on an existing atom, not a new atom family.
