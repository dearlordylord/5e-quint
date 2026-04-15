# Round 2 Item Synthesis

Purpose:

- aggregate the edge-item validation pass against `TAXONOMY_atoms_graph_v2.md` and `TAXONOMY_graph_representation_v0.md`;
- determine whether reaction items, passive rewrite items, mobility toggles, and container items expose a missing reusable subgraph;
- decide whether item pressure now justifies `TAXONOMY_atoms_graph_v3.md`.

## Short Answer

This pass still does **not** justify `TAXONOMY_atoms_graph_v3.md`.

No edge-item group forced a new top-level node family or edge family.

What the pass did expose is one useful reusable graph refinement:

- a passive-projection subgraph for worn/held items with continuous effect, conditional suppression/restoration, and optional target rewrite.

That is a graph-composition result, not a new ontology branch.

## Group Verdicts

### Group A

- `Ring of Spell Turning`
- `Ring of Evasion`
- `Mantle of Spell Resistance`

Result:

- no new top-level family;
- validates save-defense items, reaction-time save replacement, and spell redirection without item-owned payload storage.

### Group B

- `Cloak of Displacement`
- `Shield of Missile Attraction`
- `Amulet of Proof against Detection and Location`

Result:

- no new top-level family;
- strongest pressure for a reusable passive-projection subgraph.

### Group C

- `Boots of Speed`
- `Cape of the Mountebank`
- `Helm of Teleportation`

Result:

- no new top-level family;
- validates wearable activation patterns, item-owned cooldowns, and attached-spell release without stored payloads.

### Group D

- `Gem of Seeing`
- `Broom of Flying`
- `Bag of Holding`

Result:

- no new top-level family;
- validates sensory release, movement-object activation, and physical container storage/break outcomes.

## What Round 2 Strengthened

### 1. Passive worn/held effects are compositional, but worth naming as a subgraph

The most important output of this pass is not a new atom.
It is a reusable pattern:

- wear/hold gate
- continuous effect projection
- conditional suppression/restoration
- optional rewrite of incoming targeting or outcome

That pattern covers:

- `Cloak of Displacement`
- `Shield of Missile Attraction`
- `Amulet of Proof against Detection and Location`
- parts of `Ring of Spell Turning`
- parts of `Mantle of Spell Resistance`

### 2. Reaction items still reuse the same decision pressure already seen in `Shield`

`Ring of Evasion` and `Ring of Spell Turning` do not force a new reaction family.

They strengthen the existing conclusion:

- available response windows;
- optional user take-up;
- commitment before resource consumption or redirect effect;

are still the right architectural pressure.

### 3. Attached spellcasting and stored payloads remain distinct

This pass keeps confirming a distinction already visible in round 1:

- `Cape of the Mountebank` and `Helm of Teleportation` grant casts from the item;
- `Ring of Spell Storing` stores payloads in the item;
- these should not be collapsed.

### 4. Containers still fit the existing graph

`Bag of Holding` looks exotic, but it still fits:

- `store`
- `release`
- `break`
- `transport_exile`

plus capacity and cleanup policy.

So the graph still survives even when the stored thing is physical contents rather than spell payload.

## What Still Leaks

This pass still exposes refinement pressure:

- exact passive-effect suppression state;
- target redirection versus simple targeting block;
- `Magic action` versus coarse `action_window`;
- cumulative duration budgets versus charge/use counters;
- container capacity and posture details;
- perception/scrying denial versus ordinary targeting denial.

None of those pressures yet requires a new top-level family.

## Current Research Conclusion

The correct next move is:

1. keep `TAXONOMY_atoms_graph_v2.md` stable;
2. enrich `TAXONOMY_graph_representation_v0.md` with the passive-projection subgraph;
3. continue widening validation rather than drafting `v3`;
4. only draft `v3` if a broader sample exposes structural dishonesty instead of better graph composition.
