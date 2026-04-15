# Round 3 Group A

Spells:

- `Aid`
- `Alarm`
- `Antimagic Field`
- `Banishment`
- `Bless`

This round re-checks Group A against `TAXONOMY_atoms_graph_v2.md` and the shared `SPELL_VALIDATION_matrix_v0.md` sample. The residue is now narrow enough to stop iterating on this group: no spell here forces a new major family, and the remaining gaps are mostly typed edge cases, not a missing architecture.

## `Aid`

- Fixed from round 2:
  - `heal` and `modify_max_hp` are now both present, so the spell no longer has to be forced through a single max-HP change bucket.
  - the cap on affected creatures is still legible through existing selection atoms, instead of requiring a new family.
- Still unresolved:
  - slot-based target scaling is still not named directly in the graph.
  - the spell still wants a clearer distinction between cap selection and scaling policy.
- Probably not worth atomizing further:
  - this looks like parameterization of `choose` plus existing scaling atoms, not a new spell shape.

## `Alarm`

- Fixed from round 2:
  - `alert` is now a real atom, and `respond` no longer has to carry the whole spell by itself.
  - the spell now reads as a trigger/alert ward rather than a storage/release ward.
- Still unresolved:
  - the intrusion detector and the wake-up rider are still blended too much.
  - the exemption list is still prose-level setup, not graph structure.
- Probably not worth atomizing further:
  - the remaining residue is real, but it looks like internal policy on top of `alert`, not a separate spell family.

## `Antimagic Field`

- Fixed from round 2:
  - `suppress`, `block_targeting`, and `block_travel` now cover the coarse shutdown shape cleanly.
  - the spell no longer needs to collapse into a generic prohibition bucket.
- Still unresolved:
  - the resume / restoration side of magical shutdown is still implicit.
  - the field's broader state-transition bookkeeping remains coarse.
- Probably not worth atomizing further:
  - the remaining gap is outcome bookkeeping, not a new atom family.

## `Banishment`

- Fixed from round 2:
  - `save_gate` plus `transport_exile` still carry the core spell shape.
  - the spell is no longer pretending to be plain movement.
- Still unresolved:
  - the demiplane / home-plane split is still only partly explicit.
  - return-on-expiry remains less precise than the cast-time branch.
- Probably not worth atomizing further:
  - the residual problem is branch outcome typing, not a missing top-level concept.

## `Bless`

- Fixed from round 2:
  - `modify_roll` is still the right coarse atom for the buff.
  - the spell now sits more naturally beside the other scaling buffs instead of being forced into HP or AC language.
- Still unresolved:
  - target-cap scaling is still not named directly.
  - additive die bonuses still need careful reading inside `modify_roll`.
- Probably not worth atomizing further:
  - this is a scaling refinement, not a new spell family.

## Cross-Spell Findings

1. `Aid` and `Bless` now confirm that scaling is not one thing. HP, max HP, target count, and roll bonuses need to stay distinct, but this group does not force more than that.
2. `Alarm` is still the clearest pressure point for trigger vs alert structure, but the residue is now small enough that it reads like a refinement of `alert`, not a new architecture branch.
3. `Antimagic Field` and `Banishment` validate the coarse shutdown and exile atoms, while the remaining loss is outcome bookkeeping.
4. None of the five spells requires a new major atom family beyond what `v2` already introduced.
5. Group A is therefore done as a validation pass; any further refinement should happen only if the same residue reappears in later groups.
