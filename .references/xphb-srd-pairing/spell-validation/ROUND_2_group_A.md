# Round 2 Group A

Spells:

- `Aid`
- `Alarm`
- `Antimagic Field`
- `Banishment`
- `Bless`

## `Aid`

- Round 1 failure fixed:
  - `v1` finally gives this spell both `heal` and `modify_max_hp`, so it no longer has to be forced through max-HP change alone.
- Still remaining:
  - the target-count cap is still only implicit in `choose` / `target`;
  - slot scaling is still prose-level multiplicity, not a named graph edge.
- New problems:
  - none beyond the same scaling omission.

## `Alarm`

- Round 1 failure fixed:
  - `v1` no longer reads like a store/release spell by default; the trigger/alert interpretation is now the right direction.
- Still remaining:
  - the taxonomy still lacks a first-class `trigger` or `alert` atom;
  - `respond` is still too coarse for intrusion detection plus the separate wake-up rider;
  - the exemption list is still only captured as setup prose, not graph structure.
- New problems:
  - none.

## `Antimagic Field`

- Round 1 failure fixed:
  - `suppress` is now a real atom, and `block_targeting` / `block_travel` are enough to stop this from collapsing into generic prohibition.
- Still remaining:
  - the graph still treats magical shutdown as a coarse suppression shape rather than a structured state transition with explicit resume bookkeeping.
- New problems:
  - none.

## `Banishment`

- Round 1 failure fixed:
  - `save_gate` plus `transport_exile` are enough to stop this from collapsing into plain movement.
- Still remaining:
  - the demiplane vs home-plane branch is still only partly explicit;
  - the return-on-expiry logic still wants sharper outcome typing than `branches_on_completion` alone.
- New problems:
  - none.

## `Bless`

- Round 1 failure fixed:
  - `modify_roll` now covers the core buff shape better than `v0` did.
- Still remaining:
  - the target cap and slot-based target scaling are still not named in the graph;
  - `modify_roll` still has to carry additive die bonuses without flattening them into generic numeric adjustment.
- New problems:
  - none.

## Cross-Spell Findings

1. `Aid` and `Bless` both fit `v1` better than `v0`, but they still expose missing scale semantics. Current HP, max HP, and target-cap scaling are not the same thing.
2. `Alarm` remains the strongest evidence that the graph needs a real trigger/alert concept. `respond` is too blunt.
3. `Antimagic Field` and `Banishment` now have the right coarse atoms, but the outcome bookkeeping is still too lossy for a final taxonomy.
4. `save_gate` is a real improvement over round 1, but `Banishment` shows that save resolution is only part of the shape. The branch outcome still needs explicit typing.
5. Group A does not introduce a new major family, but it does confirm that `v1` is still a coarse taxonomy, not a finished graph.

## File Edited

- `.references/xphb-srd-pairing/spell-validation/ROUND_2_group_A.md`
