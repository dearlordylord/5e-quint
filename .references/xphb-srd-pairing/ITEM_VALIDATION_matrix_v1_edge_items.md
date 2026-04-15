# Item Validation Matrix v1: Edge Items

Purpose:

- widen item-side validation beyond the first pass;
- test `TAXONOMY_atoms_graph_v2.md` and `TAXONOMY_graph_representation_v0.md` against edge-case items that pressure:
  - reaction windows
  - passive rewrites and suppression
  - long-duration toggles
  - extradimensional container behavior
  - item-driven spellcasting without stored payloads

This pass is intentionally about structural seams, not catalog coverage.

## Canonical Sample

1. `Ring of Spell Turning`
2. `Ring of Evasion`
3. `Cloak of Displacement`
4. `Shield of Missile Attraction`
5. `Boots of Speed`
6. `Cape of the Mountebank`
7. `Helm of Teleportation`
8. `Gem of Seeing`
9. `Amulet of Proof against Detection and Location`
10. `Mantle of Spell Resistance`
11. `Broom of Flying`
12. `Bag of Holding`

## Grouping For Review

### Group A: reaction and spell-defense items

- `Ring of Spell Turning`
- `Ring of Evasion`
- `Mantle of Spell Resistance`

### Group B: passive suppression and target rewrites

- `Cloak of Displacement`
- `Shield of Missile Attraction`
- `Amulet of Proof against Detection and Location`

### Group C: activated mobility / utility spell items

- `Boots of Speed`
- `Cape of the Mountebank`
- `Helm of Teleportation`

### Group D: perception / container / movement-object items

- `Gem of Seeing`
- `Broom of Flying`
- `Bag of Holding`

## Validation Questions

For each item, check:

1. which existing nodes and edges actually fit?
2. does it pressure new reusable subgraphs, or only better composition of old ones?
3. does it show that passive item properties need stronger lifecycle / suppression treatment?
4. does it force a more explicit “item prompt / prepare / commit” shape for reaction items?
5. does it force new attachment / container / transport concepts?

## Expected Pressure Areas

- reaction-timed success replacement
- spell deflection and retargeting
- passive disadvantage / resistance / targeting blocks
- suppression until start-of-turn or while speed is 0
- toggled long-duration item modes
- extradimensional storage and rupture outcomes
- item-driven movement objects and remote command

## Outcome Rule

If this pass still exposes only:

- refinement of timing,
- refinement of lifecycle,
- refinement of ownership,
- refinement of edge composition,

then the graph is holding.

If it exposes a missing reusable subgraph, record that directly before any `v3` draft is considered.
