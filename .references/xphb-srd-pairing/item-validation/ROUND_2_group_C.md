# Round 2 Group C

Grounding: local `items.json` entries for the reprinted XDMG versions of `Boots of Speed`, `Cape of the Mountebank`, and `Helm of Teleportation`, read against `TAXONOMY_atoms_graph_v2.md` and `TAXONOMY_graph_representation_v0.md`.

## Short Verdict

Group C holds against the current graph. All three items fit as wearable, activated, item-owned mobility utilities. The residue is resource timing and cooldown bookkeeping, not a missing top-level family.

## `Boots of Speed`

- Nodes that fit:
  - `magic_item_root`
  - `attune`
  - `item`
  - `activate`
  - `bonus_action_window`
  - `modify_speed`
  - `deny_opportunity_attack`
  - `persist`
  - `expire`
  - `use_count`
- Edges that fit:
  - `requires`
  - `attaches_to`
  - `opens_window`
  - `grants`
  - `consumes`
  - `persists_until`
- What leaks into prose:
  - the item has a cumulative 10-minute budget, not just a one-shot activation
  - the doubled speed and opportunity-attack disadvantage are runtime projections of the worn state, not separate item payloads
  - the long-rest lockout is cooldown bookkeeping, not a new state family
- Ownership:
  - the item owns the active/inactive mode and the accumulated use budget
  - the wearer only supplies the live mobility projection while the property is on
- Verdict:
  - this is a clean fit for the existing `modify_speed` plus item-resource shape
  - no new node family is forced

## `Cape of the Mountebank`

- Nodes that fit:
  - `magic_item_root`
  - `activate`
  - `action_window`
  - `transport_exile`
  - `location`
  - `item`
  - `persist`
  - `expire`
  - `use_count`
- Edges that fit:
  - `attaches_to`
  - `opens_window`
  - `grants`
  - `consumes`
  - `persists_until`
- What leaks into prose:
  - the cape does not store a spell payload; it grants a daily cast of `dimension door`
  - the smoke is an aftereffect of the teleport, not item-local state
  - the lightly obscured origin space is environmental fallout that can ride on the transport outcome
- Ownership:
  - the item owns the once-per-day availability
  - the teleport destination and smoke outcome are downstream effects, not durable item state
- Verdict:
  - this validates item-driven spellcasting without a stored-spell reservoir
  - no new node family is forced

## `Helm of Teleportation`

- Nodes that fit:
  - `magic_item_root`
  - `attune`
  - `item`
  - `activate`
  - `action_window`
  - `charge`
  - `transport_exile`
  - `use_count`
  - `expire`
- Edges that fit:
  - `requires`
  - `attaches_to`
  - `opens_window`
  - `consumes`
  - `grants`
  - `persists_until`
- What leaks into prose:
  - the helmet owns a finite charge pool plus a dawn recharge cadence
  - the `teleport` spell is attached to the item, but not stored as an item payload
  - the item only needs resource-state bookkeeping; the actual teleport logic stays in the spell projection
- Ownership:
  - the item owns the 3-charge reservoir and recharge state
  - the cast effect is runtime projection, not a persistent item resource
- Verdict:
  - this is another clean item-owned resource fit
  - no new node family is forced

## Cross-Item Findings

1. The group splits into two reusable shapes: `Boots of Speed` is a toggled mobility modifier with a cumulative timer, while `Cape of the Mountebank` and `Helm of Teleportation` are item-driven spellcasters with finite availability.
2. `Cape of the Mountebank` and `Helm of Teleportation` confirm that `attachedSpells` can be a projection of item-granted casting without implying a `stored_spell` reservoir.
3. All three items own their availability state on the item side. None pushes state onto the wearer beyond the live effect projection.
4. The only real pressure is cooldown/rate-limiting shape:
   - cumulative minutes used
   - once-per-dawn availability
   - bounded charges with dawn recharge
   These look like refinements of existing resource/lifecycle nodes, not a new branch.

## New Family Check

Group C does **not** force a new node or edge family.

It does reinforce a reusable subgraph for wearable activation:

- `magic_item_root`
- `attune` / `item`
- `activate`
- item-local resource spend (`use_count` or `charge`)
- effect projection (`modify_speed` or `transport_exile`)

That subgraph is still expressible with the current atoms and edge kinds.

Edited file:
- `.references/xphb-srd-pairing/item-validation/ROUND_2_group_C.md`
