`Scarab of Protection` does not fit the current authored surface honestly.

Why it fails:

- The item has two always-on passive benefits and one reactive charge-spend ability:
  - `Defense`: `+1 AC` while on your person.
  - `Spell Resistance`: Advantage on saving throws against spells.
  - `Preservation`: when you fail a qualifying saving throw, you can use your Reaction and expend 1 charge to make it succeed instead.
- `MagicItemMechanics` is currently a single-family choice: `PassiveMechanics | ActivatedAbilityMechanics`. This item needs both at once.
- The passive `Spell Resistance` rider cannot be expressed honestly with current `modify_roll_advantage`, because that atom can narrow saving throws by ability, but not by save provenance/source such as "against spells".
- The reactive `Preservation` rider cannot be expressed honestly with current non-spell families:
  - there is no magic-item triggered-reaction family;
  - there is no trigger variant for "you fail a saving throw";
  - there is no source filter for "Necromancy spell" or "harmful effect originating from an Undead";
  - there is no effect/result shape for "turn the failed save into a successful one".

Recommended widenings:

1. Structural widening: allow a magic item to compose passive and reactive/activated mechanics in one record.
   - Candidate shape: a `MagicItemMechanics` bundle/list, or a new mixed family that carries `passiveGrants` plus one or more activated/reaction abilities.
   - Evidence: "This beetle-shaped medallion provides three benefits while it is on your person."

2. Surface widening: add save-source filtering to `modify_roll_advantage` / `modify_roll_numeric`.
   - Candidate variant: `saveSourceFilter`, with cases such as `against_spells`, and possibly a richer source predicate later.
   - Evidence: "You have Advantage on saving throws against spells."

3. Surface widening: add a non-spell triggered-reaction ability shape.
   - Candidate: extend activated abilities with an optional trigger grammar, or add a shared `triggered_reaction` family usable by magic items.
   - Evidence: "If you fail a saving throw ... you can take a Reaction ..."

4. Surface widening: add trigger/source predicates for failed saves.
   - Candidate trigger pieces:
     - `failed_saving_throw`
     - source filter for `spell_school = necromancy`
     - source filter for `originating_creature_type = undead`
   - Evidence: "If you fail a saving throw against a Necromancy spell or a harmful effect originating from an Undead ..."

5. Atom or surface widening: add a result-override effect for save outcomes.
   - Candidate atom: `override_save_outcome` / `turn_failed_save_into_success`.
   - This is not the same as generic advantage or numeric bonus; it rewrites an already-resolved failure.
   - Evidence: "... turn the failed save into a successful one."

What already fits:

- `Defense` would fit existing `modify_ac +1`.
- The 12-charge pool and deterministic destruction on empty would fit existing `charge_pool` and `permanent_on_empty`.

Why no partial encoding was authored:

- Encoding only `Defense` or only the passive subset would produce a materially misleading trace for a legendary item whose distinctive mechanic is the reactive save reversal.
- The protocol explicitly prefers no trace over a dishonest one.
