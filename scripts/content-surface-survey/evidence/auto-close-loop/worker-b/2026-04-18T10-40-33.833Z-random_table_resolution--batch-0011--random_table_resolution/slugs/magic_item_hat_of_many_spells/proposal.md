`Hat of Many Spells` fits the existing `magic_item` source kind, but it does not fit the current authored surface honestly enough to author `content/magic_item_hat_of_many_spells.dhall`.

Why it stops:

- The core property is not "cast one named granted spell." It is "attempt to cast any level-appropriate Wizard-list spell you do not know," which the current `grant_spell_access` surface cannot express. `grant_spell_access` requires a concrete `spellId`; there is no closed variant for a filtered spell-list grant such as "any Wizard spell of level 1+ that you can cast and whose costly Materials are <= 1000 GP."
- Success and failure branch into different procedures. On a success, the chosen spell is cast using its own normal casting time. On a failure, the item resolves a separate random-effect program. The current `ability_check_gate` phase can branch only to `EffectAtom` payloads (`onPass` / `onFail?`), not to nested activation phases or a follow-up `random_table`.
- The failure table itself includes several surface gaps even if the outer branch shape existed:
  - random spell cast from a closed table, including spell-specific mode restrictions like `Invisibility` cast on yourself and `Enlarge/Reduce` forced to enlarge vs reduce;
  - uncontrolled / hostile creature appearance from a random table result;
  - nonmagical object creation from a random table result;
  - a temporary two-way portal whose destination is GM-chosen.

Recommended widening classification: `surface_widening`.

Suggested surface additions:

1. `grant_spell_access` widening for filtered list access
   - A new variant that grants cast access to a spell selected at activation time from a constrained list/filter, rather than one fixed `spellId`.
   - Needed because the item does not name a fixed spell.

2. `ability_check_gate` branch-to-procedure widening
   - Allow `onPass` / `onFail` to continue into nested `ActivationPhase[]` or a named follow-up phase id, not just an `EffectAtom`.
   - Needed because success casts a spell procedure while failure resolves a random table procedure.

3. Random-table outcome support for spell-cast / object-creation / uncontrolled-spawn branches
   - Existing `random_table` can branch into nested phases, but the current surface lacks honest payloads for several branch outcomes used here.

Evidence from the unit text:

- "While holding the hat, you can try to cast a level 1+ spell you don't know. The spell must be on the Wizard spell list, it must be of a level you can cast..."
- "On a successful check, you cast the spell using its normal casting time..."
- "On a failed check, you fail to cast the spell and a random effect occurs instead, determined by rolling on the following table."
