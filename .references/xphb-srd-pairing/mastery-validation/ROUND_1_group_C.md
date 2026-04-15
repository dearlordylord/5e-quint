# Round 1 Group C

Masteries:

- `Graze`
- `Topple`

Grounding:

- `xphb-srd-pairing/MASTERY_VALIDATION_matrix_v0.md`
- `xphb-srd-pairing/TAXONOMY_atoms_graph.md`
- `xphb-srd-pairing/TAXONOMY_graph_representation.md`
- `.references/srd-5.2.1/Equipment.md` section "Mastery Properties"

## Short Verdict

Group C fits `v2` cleanly. The two masteries exercise the `on_miss_window` atom and the `save_gate` + `branches_on_save` pair with an item-rooted DC, which are all already present in the atom graph. No new top-level family is forced.

The group does expose two narrow observations:

- `on_miss_window` is validated as real first-class coverage, not just a spell-only timing atom;
- save DC formulas are **attack-rooted** here, not caster-rooted — the DC uses the attacker's ability modifier and proficiency bonus. The graph can represent this via edge direction and attachment, but the DC-source variation deserves an explicit note.

## `Graze`

- Nodes that fit:
  - `mastery_root`
  - `attack_roll`
  - `on_miss_window`
  - `target`
  - `damage`
  - `scale_numeric_bonus`
- Edges that fit:
  - `roots`
  - `opens_window`
  - `attaches_to`
  - `grants`
  - `modifies`
- What leaks:
  - the damage is typed to the weapon's damage type, which is borrowed from the weapon, not from the mastery — the graph allows this through attachment but does not explicitly name "borrows damage type from the rooting weapon";
  - the scaling lock — "the damage can be increased only by increasing the ability modifier" — is a policy constraint on future modifications, not a new effect. It reads as a restriction on `scale_numeric_bonus`, specifically forbidding other scaling paths (no crit double, no weapon enhancement, no spell-like bonus damage) from applying.
- Ownership:
  - no item-owned resource;
  - the miss rider is attacker-scoped, its damage is target-scoped.
- Verdict:
  - first real on-miss rider in the workspace's validation sample;
  - confirms `on_miss_window` is not vestigial;
  - scaling lock is a subtle constraint, not a new atom — worth noting alongside typed scaling in `v2`.

## `Topple`

- Nodes that fit:
  - `mastery_root`
  - `attack_roll`
  - `on_hit_window`
  - `target`
  - `save_gate`
  - `apply_condition`
- Edges that fit:
  - `roots`
  - `opens_window`
  - `attaches_to`
  - `grants`
  - `branches_on_save`
- What leaks:
  - the DC is computed as `8 + ability modifier used to make the attack roll + your Proficiency Bonus`. This is an **attack-rooted** DC, not a caster-rooted spell DC. The graph supports multiple DC sources through attachment, but the distinction between "caster DC", "attack-rooted DC", and "item-rooted DC" is not yet named explicitly;
  - the success branch is empty — only the failure branch applies `Prone`. This is fine under `branches_on_save` but shows that branches can be asymmetric and that one branch may have no effect at all;
  - `Prone` is a condition with its own downstream consequences — the graph hands this off cleanly to `apply_condition` without trying to re-enumerate Prone's own mechanics.
- Ownership:
  - no item-owned resource;
  - save outcome is target-owned;
  - DC is attacker-rooted.
- Verdict:
  - fits the existing on-hit + save-gate shape;
  - the attack-rooted DC is the only real pressure, and it is a typed-DC observation rather than a missing atom.

## Cross-Mastery Findings

1. Both masteries fit `v2` cleanly and reuse existing resolution atoms.
2. `Graze` is the first mastery in this pass to use `on_miss_window`. It validates that the atom is genuinely needed rather than spell-only.
3. `Topple` validates that `save_gate` plus `branches_on_save` works equally well when the DC is attack-rooted instead of caster-rooted.
4. Neither mastery forces a new top-level node or edge family.
5. Residue is limited to two typed observations worth recording:
   - a scaling lock on future modifications (Graze);
   - typed DC source variation (Topple).

## New Node / Edge Family

Group C does **not** force any new top-level node or edge family.

Recorded narrower pressures:

- `on_miss_window` is validated as a real first-class timing atom;
- save DC source (caster-rooted vs attack-rooted vs item-rooted) is a typed observation, not a missing atom;
- a scaling lock restricting which bonuses can modify a damage figure is a constraint pattern worth noting but not an atom.
