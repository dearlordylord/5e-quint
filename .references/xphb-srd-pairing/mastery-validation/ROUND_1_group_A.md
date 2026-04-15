# Round 1 Group A

Masteries:

- `Push`
- `Sap`
- `Slow`
- `Vex`

Grounding:

- `xphb-srd-pairing/MASTERY_VALIDATION_matrix_v0.md`
- `xphb-srd-pairing/TAXONOMY_atoms_graph_v2.md`
- `xphb-srd-pairing/TAXONOMY_graph_representation_v0.md`
- `.references/srd-5.2.1/Equipment.md` section "Mastery Properties"

## Short Verdict

Group A fits `v2` cleanly at the top level. All four are on-hit riders that reuse existing window, attachment, and effect atoms. No new top-level family is forced.

The group does expose two real but narrow pressures:

- rider expiry with mixed terminating conditions (Sap, Vex);
- non-stacking / capped-aggregate effect policy (Slow);
- typed distinction between numeric roll bonuses and advantage/disadvantage modification (Sap, Vex versus Bless-style `modify_roll`).

All three are composition or policy refinements, not evidence the graph is missing a core shape.

## `Push`

- Nodes that fit:
  - `mastery_root`
  - `attack_roll`
  - `on_hit_window`
  - `target`
  - `force_move`
- Edges that fit:
  - `roots`
  - `opens_window`
  - `attaches_to`
  - `grants`
- What leaks:
  - size legality (`Large or smaller`) is target-gate metadata that the graph can hang off `target` but does not name explicitly;
  - "straight away from yourself" is directional geometry that stays prose-level.
- Ownership:
  - no item-owned resource;
  - no creature-owned resource beyond the attack itself.
- Verdict:
  - clean on-hit rider;
  - maps 1:1 to existing atoms.

## `Sap`

- Nodes that fit:
  - `mastery_root`
  - `attack_roll`
  - `on_hit_window`
  - `target`
  - `modify_roll`
  - `expire`
- Edges that fit:
  - `roots`
  - `opens_window`
  - `attaches_to`
  - `grants`
  - `persists_until`
- What leaks:
  - `modify_roll` is undifferentiated between "numeric bonus" and "advantage/disadvantage" — Sap grants disadvantage on the target's next attack, not a numeric penalty;
  - rider expiry is a disjunction: ends at the target's next attack roll OR at the start of the attacker's next turn, whichever happens first — the current lifecycle atoms name these individually but the graph does not name "expire on first trigger or boundary, whichever first";
  - the "next attack roll" specifier is rider-consumption semantics that overlaps with `expire` but is not identical to `turn_start_window`.
- Ownership:
  - no item-owned resource;
  - rider state is per-target-creature-slot.
- Verdict:
  - graph can carry it as composition;
  - worth noting the advantage/disadvantage typing gap and the first-of-two-events expiry shape.

## `Slow`

- Nodes that fit:
  - `mastery_root`
  - `attack_roll`
  - `on_hit_window`
  - `target`
  - `modify_speed`
  - `turn_start_window`
  - `expire`
- Edges that fit:
  - `roots`
  - `opens_window`
  - `attaches_to`
  - `grants`
  - `persists_until`
- What leaks:
  - the non-stacking rule ("if the creature is hit more than once by weapons that have this property, the Speed reduction doesn't exceed 10 feet") is aggregate policy across multiple rider instances — the v2 graph does not name "non-stacking cap" or "mutually-exclusive effect bucket";
  - "only on damage-dealing hit" is a finer trigger than `on_hit_window` alone carries — it requires also `deals_damage` as a gate, which the graph currently leaves to prose.
- Ownership:
  - no item-owned resource;
  - rider state is per-target-creature-slot;
  - the non-stacking constraint is effect-bucket-scoped, not item-scoped.
- Verdict:
  - core shape fits the graph;
  - non-stacking cap is the most notable residue and is shared with future class-feature and spell work.

## `Vex`

- Nodes that fit:
  - `mastery_root`
  - `attack_roll`
  - `on_hit_window`
  - `target`
  - `modify_roll`
  - `turn_end_window`
  - `expire`
- Edges that fit:
  - `roots`
  - `opens_window`
  - `attaches_to`
  - `grants`
  - `persists_until`
- What leaks:
  - same advantage/disadvantage typing gap as `Sap`;
  - same first-of-two-events expiry shape: ends at the attacker's next attack roll against that creature OR at the end of the attacker's next turn, whichever first;
  - relation-scoped advantage ("against that creature") is a targeting scope the graph supports through `attaches_to` but does not name as a "directed relation between attacker and target" bucket.
- Ownership:
  - no item-owned resource;
  - rider state is attacker-scoped plus target-scoped.
- Verdict:
  - graph can carry it as composition;
  - pressures the same two narrow refinements Sap does.

## Cross-Mastery Findings

1. All four masteries fit `v2` without a new top-level node or edge family.
2. All four instantiate the same on-hit rider shape: `mastery_root` → `attack_roll` → `on_hit_window` → `attaches_to(target)` → `grants(effect)` → optional `persists_until(boundary)`.
3. `Sap` and `Vex` both pressure a typed distinction between numeric `modify_roll` and advantage/disadvantage `modify_roll` — the atom is present, but the subtype is not.
4. `Sap` and `Vex` both pressure a "first-of-two-events" expiry shape that is not individually a new atom but may deserve a named lifecycle pattern in the graph representation.
5. `Slow` pressures non-stacking / capped-aggregate effect policy. This is shared with future work (conditions like `Exhaustion` stacking rules, bardic inspiration stacking, multiple mark sources) and is the most architecturally significant residue from this group.
6. `Push` is the cleanest baseline: it maps 1:1 to existing atoms with no residue beyond prose-level geometry.

## New Node / Edge Family

Group A does **not** force any new top-level node or edge family.

It does pressure three narrower observations to record:

- on-hit rider subgraph is a worthwhile addition to the graph representation;
- advantage/disadvantage typing on `modify_roll` is worth noting but does not yet demand a new atom split;
- non-stacking / capped aggregate is a real gap that should be recorded as still-open pressure.
