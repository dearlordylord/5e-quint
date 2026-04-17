`Ring of Animal Influence` fits `MagicItemRecord` with `mechanics.family = "activation"` for its charge pool, dawn recharge, and cast-from-item behavior, but it is not `clean`.

Missing surface variants:

- `grant_spell_access` needs an item-level spellcasting override so a magic item can say its spells use a fixed save DC rather than the wearer's normal spellcasting stats.
- `grant_spell_access` also needs a per-access restriction/override so an item-granted spell can alter the granted spell's target domain without inventing a separate spell id.

Why this is `surface_widening`, not `atom_widening`:

- The underlying mechanics are still existing v4 atoms: `charge_pool`, `grant_spell_access`, and dawn recharge.
- The gap is in the authored surface shape for qualifiers on a granted spell access, not a brand-new taxonomy atom.

Evidence from the unit text:

- `"cast one of the following spells (save DC 13) from it"`
- `"Fear (affects Beasts only)"`
