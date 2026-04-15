# Round 1 Group B

Grounding: local `items.json` entries for `Ring of Spell Storing`, `Spell Scroll`, and `Rod of Absorption`, read against `TAXONOMY_atoms_graph.md` and `TAXONOMY_graph_representation.md`.

## Short Verdict

This group mostly validates the existing item-side graph. `Ring of Spell Storing` and `Rod of Absorption` both confirm that items can own durable resource state, but neither one forces a new top-level node family. `Spell Scroll` is the weak case: it is a one-shot encoded spell, not a persistent storage object.

## `Ring of Spell Storing`

- Nodes that fit: `magic_item_root`, `attune`, `item`, `store`, `release`, `stored_spell`, `spell_slot`.
- Edges that fit: `requires` for attunement, `attaches_to` for the ring-item link, `stores` for the payload, `releases` for later casting, and `consumes` for the slot levels committed into the ring.
- What fits cleanly: this is the exact `store / release` subgraph already sketched in `TAXONOMY_graph_representation.md`. The ring has bounded capacity, keeps the payload until use, and then frees capacity again.
- What leaks: the spell keeps the original caster's slot level, save DC, attack bonus, and spellcasting ability. The current graph can hang that off `stored_spell`, but it does not name that metadata as a separate concern.
- Does the item own state/resource? Yes. The ring owns a durable, bounded reservoir of spell levels. Attunement gates access, but the stored state is on the ring itself.

## `Spell Scroll`

- Nodes that fit: `magic_item_root` or `item_property_root`, `stored_spell`, `release`, and a one-shot `use_count`-like consumable shape.
- Edges that fit: `releases` for casting the scroll, `consumes` for the scroll being destroyed, and `requires` for the spell-list / ability-check gate.
- What fits cleanly: the scroll is a single encoded spell that is released once and then crumbles. That is still the same broad `store / release` idea, but with almost no persistent state.
- What leaks: the copy-into-spellbook rider is a secondary procedure, not a stateful item loop. The item does not track a reusable pool, and the fixed scroll DC / attack bonus are item-driven casting details rather than item-owned state.
- Does the item own state/resource? Not durably. It owns one consumable payload and then disappears.

## `Rod of Absorption`

- Nodes that fit: `magic_item_root`, `attune`, `item`, `respond`, `reaction_window`, `suppress`, `store`, `release`, `spell_slot`.
- Edges that fit: `opens_window` for the reaction, `requires` for holding / attunement, `suppresses` for canceling the incoming spell, `stores` for the absorbed energy, and `releases` or `transfers_to` for converting stored energy into casting capacity.
- What fits cleanly: the rod is clearly item-owned state. It remembers total absorbed levels, current stored levels, and later turns that reservoir into spell slots for the wielder.
- What leaks: the stored object is spell energy, not a spell payload. `TAXONOMY_atoms_graph.md` has `charge` and `spell_slot`, but neither one perfectly names the rod's cumulative energy reservoir.
- Does the item own state/resource? Yes. This is the strongest stateful item in the group: it owns a long-lived energy pool, not just a transient cast.

## Cross-Item Findings

- `Ring of Spell Storing` and `Rod of Absorption` both validate item-local resource ownership; `Spell Scroll` does not.
- `store / release` is still the right core pairing, but the group shows two different payload shapes: stored spell content versus stored spell energy.
- Attunement is only a gate. It matters for the ring and rod, but it does not explain the state model by itself.
- `Spell Scroll` stays on the edge of the graph because it is consumable and mostly stateless. Its behavior is better treated as item-driven spellcasting than as a persistent resource loop.

## New Family Check

This group does **not** force a new top-level node or edge family.

The residue is narrower: `Rod of Absorption` pressures finer resource typing than the current `charge` / `spell_slot` / `use_count` trio gives us, and `Ring of Spell Storing` pressures payload metadata on `stored_spell`. Those are refinement pressures, not a new graph family.

Edited file:
- `.references/xphb-srd-pairing/item-validation/ROUND_1_group_B.md`
