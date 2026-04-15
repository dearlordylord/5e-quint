# Round 1 Group B

Masteries:

- `Cleave`
- `Nick`

Grounding:

- `xphb-srd-pairing/MASTERY_VALIDATION_matrix_v0.md`
- `xphb-srd-pairing/TAXONOMY_atoms_graph.md`
- `xphb-srd-pairing/TAXONOMY_graph_representation.md`
- `.references/srd-5.2.1/Equipment.md` section "Mastery Properties"

## Short Verdict

Group B is the most architecturally interesting group in this pass. Both masteries change the action-economy shape of the attack itself rather than riding on a hit outcome. Both still fit `v2` top-level atoms as composition, but both expose a narrow pressure that the graph representation does not yet name:

- conditional extra attack gated on hit (Cleave);
- window reassignment that moves an extra attack between action and bonus-action contexts (Nick);
- per-turn fence on a mastery-gated use (both).

None of these force a new top-level family. Both are better described as extensions of the existing on-hit rider subgraph plus a typed use-count.

## `Cleave`

- Nodes that fit:
  - `mastery_root`
  - `attack_roll`
  - `on_hit_window`
  - `target`
  - `use_count`
  - `turn_start_window`
- Edges that fit:
  - `roots`
  - `opens_window`
  - `attaches_to`
  - `grants`
  - `consumes`
  - `persists_until`
- What leaks:
  - the rider's "grant" is itself a second `attack_roll`, not a flat effect — this is a composition recursion that the graph does not visualize;
  - the second attack's target must be a creature "within 5 feet of the first that is also within your reach" — this is a target-selection constraint the graph currently leaves to prose;
  - the "don't add your ability modifier to that damage unless that modifier is negative" rule is a scoped suppression of the normal damage calculation that does not map to a single existing effect atom — it is a localized override on `damage` within the nested attack;
  - the "only once per turn" fence is represented well by `use_count` with `turn_start_window` reset, but the aggregate shape is "per-attacker-per-turn", not "per-target-per-turn".
- Ownership:
  - no item-owned resource;
  - the use fence is attacker-owned, reset at attacker's turn boundary;
  - the nested attack borrows the attacker's weapon and proficiency but uses modified damage composition.
- Verdict:
  - fits `v2` as composition of on-hit rider + nested `attack_roll` + suppressed damage modifier;
  - the damage-modifier suppression is the only real atom-level residue, and it looks like a subtype refinement of `damage`, not a new top-level effect family.

## `Nick`

- Nodes that fit:
  - `mastery_root`
  - `action_window`
  - `bonus_action_window`
  - `use_count`
  - `turn_start_window`
  - `replace`
- Edges that fit:
  - `roots`
  - `opens_window`
  - `replaces`
  - `consumes`
  - `persists_until`
- What leaks:
  - this mastery is a **window reassignment**: the Light property normally yields an extra attack in a `bonus_action_window`, and Nick rewrites it so that extra attack happens inside the `action_window` of the Attack action — the graph can express this with `replace` / `replaces`, but the specific pattern "rewrite the window of an existing effect from another rule" is not itself named;
  - the mastery is interaction with another named rule (the `Light` property), which is a cross-rule composition the graph so far has only seen faintly in stored-spell items;
  - the "only once per turn" fence is again `use_count` with `turn_start_window` reset, shared with Cleave.
- Ownership:
  - no item-owned resource;
  - the rewrite is attacker-owned;
  - the relationship between Nick and Light is a structural dependency across two rule units.
- Verdict:
  - fits `v2` as a `replace` acting on the window anchor of a different rule;
  - the most notable residue is that "window reassignment across rules" is a pattern worth recording, but it does not force a new atom.

## Cross-Mastery Findings

1. Both masteries instantiate a variant of the on-hit / action-economy rider pattern plus a per-turn use fence.
2. Both masteries confirm that `use_count` combined with `turn_start_window` as `persists_until` carries "once per turn" cleanly.
3. `Cleave` shows that a rider can itself **be** another attack, recursively. The graph represents this via another `attack_roll` node, but the composition is not yet visualized in the representation note.
4. `Cleave` also shows a scoped damage-modifier suppression ("don't add your ability modifier"). This is a subtype refinement on `damage`, not a new effect family.
5. `Nick` shows **cross-rule window reassignment**, where one mastery rewrites where another rule's extra attack lives. The graph's existing `replace` / `replaces` atoms carry this, but the pattern deserves a note in the graph representation.
6. Neither mastery exposes a new top-level node or edge family.

## New Node / Edge Family

Group B does **not** force any new top-level node or edge family.

Recorded narrower pressures:

- per-turn use fence (`use_count` + `turn_start_window`) is now validated across two independent masteries;
- nested attack-as-rider composition is a real shape worth noting in the graph representation;
- cross-rule window reassignment is another shape worth noting, pressured uniquely here by `Nick`.
