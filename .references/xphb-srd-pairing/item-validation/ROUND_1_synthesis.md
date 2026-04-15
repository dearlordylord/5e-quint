# Round 1 Item Synthesis

Purpose:

- aggregate the first item-side validation pass against `TAXONOMY_atoms_graph.md` and `TAXONOMY_graph_representation.md`;
- determine whether the current taxonomy survives attunement, stored-spell, charge, and item-owned-casting pressure;
- decide whether item pressure forces a taxonomy revision.

## Short Answer

The current taxonomy survives the first item-side validation pass.

This sample does **not** force a new top-level node family or edge family.

What it does force is a sharper read of ownership and resource shape:

- attunement capacity is creature-side;
- occupancy / wear state is wearer-side;
- charges, daily uses, stored spells, and absorbed spell energy can be item-side;
- item-rooted casting is not the same as stored-spell payload ownership.

So the item result is:

- `v2` is still structurally good enough;
- the main remaining work is refinement, not replacement.

## Group Verdicts

### Group A

- `Attunement`
- `Wearing and Wielding Items`
- `Pearl of Power`

Result:

- no new top-level family forced;
- validates attunement lifecycle, occupancy/eligibility gating, and item-owned once-per-dawn use state.

### Group B

- `Ring of Spell Storing`
- `Spell Scroll`
- `Rod of Absorption`

Result:

- no new top-level family forced;
- validates stored-spell payloads, consumable one-shot spell release, and item-owned absorbed-energy reservoirs.

### Group C

- `Staff of Healing`
- `Staff of Power`
- `Wand of Fireballs`

Result:

- no new top-level family forced;
- validates item-owned charge pools, recharge cleanup, mixed passive bonuses, and charge-backed spell release.

### Group D

- `Wand of Magic Missiles`
- `Wand of Web`
- `Instrument of the Bards`

Result:

- no new top-level family forced;
- validates charge pools versus per-spell daily `use_count` patterns and confirms that item-rooted casting is not automatically stored-spell ownership.

## What The Item Pass Strengthened

### 1. Ownership matters more than family labels

The most useful item-side distinction is not a new family split.
It is ownership.

The sample repeatedly separates:

- creature-owned capacity (`attunement_slot`, character spell slots);
- item-owned state (`charge`, daily use locks, stored payloads, absorbed energy);
- wearer-owned occupancy and fit constraints.

That is a graph and ownership result, not a new family ontology.

### 2. Item-rooted casting comes in at least three distinct shapes

The sample separates:

- attached spell menus released from an item via charges or uses;
- stored spell payloads kept in the item until later release;
- absorbed spell energy converted later into spell-slot-equivalent capacity.

These are not the same thing, even though all of them involve an item and spells.

### 3. Attunement remains a gate, not the whole state model

Attunement is important, but the sample keeps showing that it is:

- a lifecycle gate;
- a capability unlock;
- not a replacement for item-local resource modeling.

### 4. The graph representation was worth adding

`TAXONOMY_graph_representation.md` helped because the item pass was really about reusable subgraphs:

- attunement lifecycle;
- store/release;
- charge-backed release;
- daily use locks;
- break / cleanup outcomes.

That is a better fit for the item data than broad family prose alone.

## What Still Leaks

The sample still exposes real refinement pressure:

### A. Resource typing is still a little too coarse

`charge`, `use_count`, and `spell_slot` are useful, but item validation still exposes finer distinctions:

- stored spell payload capacity;
- absorbed spell-energy reservoir;
- per-spell daily availability;
- recharge cadence.

That does **not** yet justify a new top-level family.
It does justify a more exact item-resource refinement pass later.

### B. Stored payload metadata is still undernamed

`Ring of Spell Storing` keeps original-caster metadata on the stored spell:

- slot level;
- save DC;
- spell attack bonus;
- casting ability.

The current graph can hang that off `stored_spell`, but it does not name the metadata explicitly.

### C. Timing vocabulary is still coarse on item activation

The item sample keeps leaking:

- `Magic action` versus generic `action_window`;
- dawn recharge / next-dawn reset cadence;
- reaction-timed item interruption in `Rod of Absorption`.

Those are timing refinements, not evidence that the graph is broken.

## Current Research Conclusion

This item pass does not justify `TAXONOMY_atoms_graph.md`.

The correct next move is narrower:

1. keep `TAXONOMY_atoms_graph.md` stable;
2. keep `TAXONOMY_graph_representation.md` as the explicit graphable layer;
3. record item-side ownership conclusions in the canonical notes;
4. only draft `v3` if a broader item or spell sample exposes structural dishonesty rather than resource/timing refinement pressure.
