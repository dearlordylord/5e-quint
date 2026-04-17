`Shield, +1, +2, or +3` is a `magic_item` with a `passive` mechanical core, but the current surface cannot encode it honestly.

Why it does not fit:

- The grant is conditional on `while holding this Shield`. `PassiveMechanics.condition` only supports `always`, `wearing_armor`, and `wielding_weapon`. A shield is neither covered by the current armor predicate nor by the weapon predicate.
- The SRD bundles three concrete variants into one unit: uncommon `+1`, rare `+2`, and very rare `+3`. `MagicItemRecord.rarity` is a single value and `modify_ac.delta` is a single fixed bonus. The current record shape cannot represent this one-entry rarity-to-bonus mapping without either splitting the unit into three records or inventing a false fixed bonus.

Suggested surface widenings:

1. Add an equipment gate for held shields.
   - Candidate shape: extend `EquipmentPredicate` with something like `{ kind: "holding_shield" }` or a more general held-item-kind predicate.
   - Evidence: "While holding this Shield, you have a bonus to Armor Class..."

2. Add a way to represent bundled magic-item variants inside one authored unit.
   - Candidate shape: a closed rarity-keyed variant map on `MagicItemRecord`, or a mechanics-level closed choice tied to rarity.
   - Evidence: "*Armor (Shield), Uncommon (+1), Rare (+2), or Very Rare (+3)*"

Without those widenings, any authored record would be misleading:

- unconditional passive `modify_ac` would omit the holding gate;
- picking one rarity/bonus would misrepresent the other two variants carried by this unit slug.
