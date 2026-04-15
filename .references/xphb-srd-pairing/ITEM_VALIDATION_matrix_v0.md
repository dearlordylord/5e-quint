# Item Validation Matrix v0

Purpose:

- widen validation beyond the 20-spell sample;
- test `TAXONOMY_atoms_graph.md` and `TAXONOMY_graph_representation.md` against item-side pressure that the spell loop did not fully cover;
- focus on the exact weak spots already identified:
  - attunement
  - stored spells
  - charges
  - item-owned casting
  - item-owned resource state

## Why This Sample

The current pairing workspace already knows that the PHB book corpus only exposes magic-item procedures cleanly.

That is not enough for architecture.

The sample below deliberately adds concrete local item entries from `items.json` because item-side extension pressure lives in actual item records, not only in the PHB procedure text.

## Canonical Sample

1. `Attunement`
2. `Wearing and Wielding Items`
3. `Pearl of Power`
4. `Ring of Spell Storing`
5. `Spell Scroll`
6. `Staff of Healing`
7. `Staff of Power`
8. `Wand of Fireballs`
9. `Wand of Magic Missiles`
10. `Wand of Web`
11. `Rod of Absorption`
12. `Instrument of the Bards`

## Validation Questions

For each unit, check:

1. what graph nodes does it clearly instantiate?
2. what edges are actually needed?
3. does it force any new node or relation not already present in `v2`?
4. does it show that the item owns spell/resource state rather than merely granting access to character state?
5. does it pressure attunement or legality as first-class, or do those still look emergent from the graph?

## Grouping For Review

### Group A: base procedures

- `Attunement`
- `Wearing and Wielding Items`
- `Pearl of Power`

### Group B: stored or embedded spells

- `Ring of Spell Storing`
- `Spell Scroll`
- `Rod of Absorption`

### Group C: charge-driven implements

- `Staff of Healing`
- `Staff of Power`
- `Wand of Fireballs`

### Group D: mixed activation / utility items

- `Wand of Magic Missiles`
- `Wand of Web`
- `Instrument of the Bards`

## Expected Pressure Areas

- attunement lifecycle and attunement-slot consumption
- item-local stored-spell capacity
- item-local charges and recharge
- item-driven spell release using item-owned metadata
- item-rooted activation windows versus character spellcasting windows
- whether item-owned spellcasting should reuse the spell graph or attach as an item subgraph

## Immediate Outcome Rule

If the sample exposes only:

- better subgraph composition,
- item-local state ownership,
- more exact edges,

then the next move is probably `TAXONOMY_atoms_graph.md` only if the residue is still structural.

If the sample exposes a genuinely missing node/edge family, record that explicitly before any schema work resumes.
