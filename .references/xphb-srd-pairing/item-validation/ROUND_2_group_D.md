# Round 2 Group D

Grounding: local `items.json` records for the 2024/XDMG versions of `Gem of Seeing`, `Broom of Flying`, and `Bag of Holding`, read against `TAXONOMY_atoms_graph.md` and `TAXONOMY_graph_representation.md`.

## Short Verdict

Group D fits the current graph vocabulary.
It does not force a new node family or edge family.

The pressure is on composition of existing shapes:

- `activate` plus item-local timing;
- `charge` plus timed sensory release;
- `grant_hover` / `modify_speed` plus object movement;
- `store` / `release` plus container rupture and cleanup.

## `Gem of Seeing`

Local item record:

- `reqAttune`: true
- `charges`: `3`
- `recharge`: dawn, `1d3`
- action text: expend `1` charge for `10` minutes of `truesight` out to `120` feet when peering through the gem

Nodes that fit:

- `magic_item_root`
- `attune`
- `action_window`
- `charge`
- `release`
- `persist`
- `expire`

Edges that fit:

- `requires`
- `opens_window`
- `consumes`
- `grants`
- `persists_until`

What leaks:

- the truesight is a creature-side sensory projection, not an item-owned payload;
- the 10-minute duration is lifecycle prose, not a new structural kind;
- dawn recharge is ordinary charge lifecycle.

Owns state/resource?

- Yes: the item owns a charge pool.
- No: it does not own stored payload state.

## `Broom of Flying`

Local item record:

- `reqAttune`: true
- `Magic` action to make the broom hover beneath you when you stand astride it
- fly speed `50` feet; `30` feet while carrying over `200` pounds
- stops hovering when you land or are no longer riding it
- `Magic` action plus command word to send it alone to a familiar destination within `1` mile
- returns when you take a `Magic` action and use a command word if the broom is still within `1` mile

Nodes that fit:

- `magic_item_root`
- `attune`
- `activate`
- `action_window`
- `choose`
- `grant_hover`
- `modify_speed`
- `move`
- `persist`
- `expire`

Edges that fit:

- `requires`
- `opens_window`
- `grants`
- `modifies`
- `returns_to`

What leaks:

- the command word and familiar-location clause are gating prose, not a new legality family;
- the remote travel reads as object-local movement, not a persistent resource loop;
- the item does not own a pool, recharge, or stored payload.

Owns state/resource?

- No durable resource.
- It owns a transient mode (`hover` / remote travel), not a consumable reservoir.
- Any riding or occupancy state is creature-side, not broom-side.

## `Bag of Holding`

Local item record:

- no attunement;
- holds up to `500` pounds and `64` cubic feet;
- retrieving an item requires an action;
- overloaded, pierced, or torn -> destroyed and contents scattered in the Astral Plane;
- turned inside out -> contents spill out, then the bag must be righted before reuse;
- breathing creatures inside survive `10` minutes divided by the number inside;
- nesting the bag inside another extradimensional space destroys both items and opens an Astral Plane gate.

Nodes that fit:

- `magic_item_root`
- `item`
- `object`
- `location`
- `store`
- `release`
- `break`
- `self_break`
- `transport_exile`
- `persist`
- `expire`

Edges that fit:

- `roots`
- `stores`
- `releases`
- `branches_on_completion`
- `persists_until`

What leaks:

- capacity is a container constraint, not a general resource meter;
- the air supply is a timed environmental consequence, not a separate pool family;
- Astral scattering and gate-opening are break outcomes, not a new structural branch;
- inside-out mode is reversible container posture, not a new state machine.

Owns state/resource?

- Yes: the bag owns container capacity, air time, and posture/reuse state.
- No: it does not own spell payload state or attunement.

## Cross-Item Findings

- `Gem of Seeing` is the only explicit charge pool in the group; it validates item-owned sensory release, not storage.
- `Broom of Flying` is a movement object with command-driven relocation; it needs activation plus movement composition, not `store`.
- `Bag of Holding` is the storage outlier, but it still reuses the existing `store` / `release` / `break` shape rather than forcing a new family.
- The group splits cleanly into three ownership modes: item-owned charge, transient movement mode, and container capacity / air handling.
- None of the items needs a `stored_spell` payload or a new payload family.

## New Node / Edge Family Check

This group does not force a new node family, edge family, or reusable subgraph.

At most, it confirms that the existing container shape can cover physical contents as well as spell payloads, and that `activate` / `grants` / `modifies` can cover the gem and broom without a new structural primitive.

Edited file:

- `.references/xphb-srd-pairing/item-validation/ROUND_2_group_D.md`
