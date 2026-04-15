# Round 3 Group C

Spells:

- `Haste`
- `Hold Person`
- `Hunter's Mark`
- `Invisibility`
- `Magic Weapon`

## Round 3 Judgment

This group is now narrow enough to stop iterating for taxonomy purposes.

`v2` fixed the important round-2 misses, and what remains is mostly subtype residue, not new graph structure. The remaining gaps are still real, but they read as refinements inside existing atoms rather than evidence that the atom graph itself is wrong.

## `Haste`

- Fixed from round 2:
  - `modify_speed`, `modify_ac`, `grant_extra_action`, and `restrict_action_set` still fit;
  - the spell is no longer pretending to be a generic buff.
- Still unresolved:
  - Dexterity-save advantage is still not named as a dedicated rider;
  - lethargy on spell end is still prose-heavy;
  - the "one attack only" restriction still sits inside the broader action grant shape.
- Probably not worth atomizing further:
  - these look like rider specializations on top of `save_gate`, `grant_extra_action`, and `restrict_action_set`, not a missing top-level family.

## `Hold Person`

- Fixed from round 2:
  - `repeat_save` and `self_break` now capture the retry loop and success exit cleanly;
  - the spell no longer needs a fake duration-only reading.
- Still unresolved:
  - humanoid-only target legality is still implicit;
  - the legal-target filter is not a separate atom in the current graph.
- Probably not worth atomizing further:
  - this residue is better treated as target-gate metadata on `target` / `requires`, not as a new family.

## `Hunter's Mark`

- Fixed from round 2:
  - `mark_target` and `transfer_mark` now model the mark as a lifecycle object;
  - the death-triggered relocation path is no longer prose-only.
- Still unresolved:
  - the extra damage on hit is still just `damage` rather than a mark-specific damage rider;
  - the Perception/Survival rider for finding the target still leaks.
- Probably not worth atomizing further:
  - the residue is narrow enough to stay inside `mark`, `damage`, and `choose`/search handling without inventing a new family.

## `Invisibility`

- Fixed from round 2:
  - `self_break` covers attack, damage, and spell-cast breakage much better than `v0`;
  - the spell now reads as a breakable state, not just a timed buff.
- Still unresolved:
  - the object-target variant is still only partly modeled by `target` / `object`;
  - trigger-based ending still lacks a sharper typed branch.
- Probably not worth atomizing further:
  - this looks like a variant/lifecycle refinement within the existing invisibility shape, not a new atom.

## `Magic Weapon`

- Fixed from round 2:
  - `alter_item_kind` now gives the spell a real item rewrite hook;
  - it is no longer forcing the model to pretend this is just a numeric buff.
- Still unresolved:
  - the attack bonus itself still sits in `modify_roll` rather than a weapon-bonus subtype;
  - slot scaling is still implicit.
- Probably not worth atomizing further:
  - the remaining residue is a weapon-bonus refinement, not evidence that the taxonomy needs another root.

## Cross-Spell Findings

1. `v2` is a real improvement over `v1` for this group, but the leftover gaps are now narrow and local rather than structural.
2. `repeat_save`, `self_break`, `mark_target`, `transfer_mark`, and `alter_item_kind` were the right additions because they separate lifecycle and rewrite behavior without forcing new broad buckets.
3. `Haste` and `Hold Person` now read as subtype pressure on existing atoms, not as failures of the atom graph.
4. `Hunter's Mark`, `Invisibility`, and `Magic Weapon` still carry residue, but it is mostly rider- or variant-level detail.
5. For this group, the taxonomy is good enough to stop iterating: the next value is broader spell coverage, not more atom splits.

## File Edited

- `.references/xphb-srd-pairing/spell-validation/ROUND_3_group_C.md`
