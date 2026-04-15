# Round 2 Group A

Items:

- `Ring of Spell Turning`
- `Ring of Evasion`
- `Mantle of Spell Resistance`

Grounding:

- `xphb-srd-pairing/ITEM_VALIDATION_matrix_v1_edge_items.md`
- `xphb-srd-pairing/TAXONOMY_atoms_graph.md`
- `xphb-srd-pairing/TAXONOMY_graph_representation.md`
- `5etools-src/data/items.json`

## Short Verdict

Group A fits the current graph cleanly. It reuses the existing `magic_item_root` / `attune` / worn-item attachment shape, plus the existing save-defense and reaction-redirection vocabulary. Only `Ring of Evasion` owns item-local runtime state through its charge pool and dawn recharge. No new node family is forced, and no reusable subgraph is newly required.

## `Ring of Spell Turning`

- Nodes that fit:
  - `magic_item_root`
  - `attune`
  - `item`
  - `respond`
  - `reaction_window`
  - `prepare`
  - `prompt`
  - `commit`
  - `save_gate`
  - `modify_roll`
  - `replace`
  - `transfers_to`
  - `returns_to`
- Edges that fit:
  - `requires`
  - `attaches_to`
  - `opens_window`
  - `branches_on_save`
  - `commits`
  - `replaces`
  - `transfers_to`
  - `returns_to`
- What leaks:
  - the exact trigger wording differs by version, but both variants stay in the same shape: a worn passive save defense plus a possible spell redirection
  - the reflected spell reuses incoming spell metadata, so caster DC / attack bonus / ability are borrowed facts, not item-owned state
  - the item does not store payload, charges, or a persistent mode
- Ownership:
  - no item-owned resource
  - no item-owned payload state
  - the ring only owns the worn-state permission to apply the defense and, conditionally, the redirection
- Verdict:
  - the graph can express this as a passive spell-defense item with a reaction-time redirect
  - the legacy DMG text and the XDMG text differ in trigger details, but neither variant needs a new family

## `Ring of Evasion`

- Nodes that fit:
  - `magic_item_root`
  - `attune`
  - `item`
  - `respond`
  - `reaction_window`
  - `prepare`
  - `prompt`
  - `commit`
  - `save_gate`
  - `charge`
  - `use_count`
  - `replace`
- Edges that fit:
  - `requires`
  - `attaches_to`
  - `opens_window`
  - `prepares`
  - `prompts`
  - `commits`
  - `consumes`
  - `branches_on_save`
  - `replaces`
- What leaks:
  - the `1d3` dawn recharge is cadence metadata, not a new state family
  - the item is still just a worn reaction item; the save itself remains creature-side
  - the rule text is explicit about spending a charge, so the item owns the cost gate
- Ownership:
  - item-owned charge pool
  - item-owned recharge cadence
  - the creature owns the failed save event, which the item intercepts
- Verdict:
  - this is a clean item-resource case
  - it validates `charge` / `use_count` as item-local state without demanding a new graph family

## `Mantle of Spell Resistance`

- Nodes that fit:
  - `magic_item_root`
  - `attune`
  - `item`
  - `modify_roll`
  - `grant`
  - `persist`
- Edges that fit:
  - `requires`
  - `attaches_to`
  - `grants`
  - `persists_until`
- What leaks:
  - nothing beyond the normal worn-state boundary
  - there is no reaction, prompt, resource, or payload to model
- Ownership:
  - no item-owned state
  - no item-owned resource
  - the item only contributes a persistent save modifier while worn
- Verdict:
  - this is the simplest item in the group
  - it confirms that passive spell defense can remain a modifier-on-wear pattern, not a special system

## Cross-Item Findings

- All three items depend on being worn and, where relevant, attuned, so the shared backbone is still `magic_item_root` plus attachment-to-item lifecycle.
- `Ring of Evasion` is the only member that clearly owns runtime resource state. The other two only affect save resolution while worn.
- `Ring of Spell Turning` and `Mantle of Spell Resistance` both pressure passive spell-defense handling, but only `Ring of Spell Turning` adds a reaction-time redirection branch.
- The spell metadata used for redirection stays with the spell event, not the item. That is consistent with the taxonomy's ownership discipline.
- The group does not expose a missing attachment family, a missing resource family, or a new kind of item-local spell payload.

## New Node / Edge Family

Group A does **not** force any new node or edge family.

It also does **not** force a new reusable subgraph. The strongest composite here is already expressible as existing pieces:

- worn passive defense for `Mantle of Spell Resistance`
- save-triggered reaction defense for `Ring of Evasion`
- passive defense plus optional spell redirection for `Ring of Spell Turning`

That is a composition problem, not evidence that the graph is missing a new core shape.
