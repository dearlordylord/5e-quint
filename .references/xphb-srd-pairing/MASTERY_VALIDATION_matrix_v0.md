# Mastery Validation Matrix v0

Purpose:

- widen validation beyond the 20-spell sample and the two item-side samples;
- test `TAXONOMY_atoms_graph.md` and `TAXONOMY_graph_representation.md` against the closed set of 2024 weapon masteries;
- directly stress the known weak spot "exact attack-roll rider composition" flagged at the bottom of `TAXONOMY_atoms_graph.md`;
- exercise the `mastery_root` source atom, which has had no prior atom-level validation.

This pass is intentionally narrow. The full mastery set is only eight units, so Round 1 covers the whole catalog in a single round.

## Why This Sample

Weapon masteries are the cleanest local pressure source for attack-roll riders:

- they attach directly to an attack resolution;
- they are uniformly short, procedure-heavy, and closed-vocabulary;
- they expose on-hit, on-miss, save-initiated, and action-economy rider shapes side by side;
- they come with explicit once-per-turn fences and non-stacking rules;
- they pressure whether advantage/disadvantage, ability-modifier-locked scaling, and window reassignment need typed atoms.

If the graph is holding, masteries should fit as composition of existing atoms with at most one new reusable subgraph. If the graph is not holding, masteries should force a new top-level node or edge family.

## Canonical Sample

1. `Cleave`
2. `Graze`
3. `Nick`
4. `Push`
5. `Sap`
6. `Slow`
7. `Topple`
8. `Vex`

Source text: `.references/srd-5.2.1/Equipment.md`, section "Mastery Properties".

## Grouping For Review

### Group A: pure on-hit riders

- `Push`
- `Sap`
- `Slow`
- `Vex`

Shape: "if you hit a creature" triggers a single rider effect with no resource cost and at most a short duration. Tests the on-hit rider surface and rider-expiry semantics.

### Group B: action-economy riders

- `Cleave`
- `Nick`

Shape: rewrites the attack action's shape rather than adding a simple rider. Tests whether conditional extra attacks, window reassignment, and per-turn fences fit without a new family.

### Group C: miss rider and save rider

- `Graze`
- `Topple`

Shape: one rider keyed to a miss, one rider that opens a save gate on hit. Tests `on_miss_window`, `save_gate` with an item-rooted DC formula, and `branches_on_save`.

## Validation Questions

For each mastery, check:

1. which existing v2 nodes and edges actually fit?
2. does it force any new top-level node or edge family?
3. does it force or strengthen a reusable subgraph beyond what `TAXONOMY_graph_representation.md` already names?
4. is the rider expiry correctly representable with current lifecycle atoms, or does it expose a gap ("ends on first trigger or at turn boundary, whichever first")?
5. does it expose non-stacking / capped-aggregate semantics that the graph has not yet named?
6. does it pressure a typed distinction between numeric roll bonuses and advantage/disadvantage?
7. does the DC formula for any save-initiating rider fit into current resolution atoms?

## Expected Pressure Areas

- on-hit rider subgraph as a first-class reusable composition
- on-miss rider coverage
- advantage/disadvantage typed roll modification versus numeric bonus
- one-shot rider expiry with mixed terminating conditions
- non-stacking / capped aggregate effects
- per-turn use fences
- item-rooted save DCs instead of caster-rooted save DCs
- window reassignment where a mastery moves an attack from bonus action to action context

## Outcome Rule

If this pass exposes only:

- better composition of existing atoms;
- one or two narrow subgraph additions in the graph representation;
- typed refinements to existing effect atoms;

then the graph is still holding and `TAXONOMY_atoms_graph.md` is not justified.

If this pass exposes a genuinely missing node or edge family, record it explicitly before considering a `v3` draft.
