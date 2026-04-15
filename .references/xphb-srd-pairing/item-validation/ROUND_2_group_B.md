# Round 2 Group B

Grounding: local item text for `Cloak of Displacement`, `Shield of Missile Attraction`, and `Amulet of Proof against Detection and Location`, read against `TAXONOMY_atoms_graph.md` and `TAXONOMY_graph_representation.md`.

## Short Verdict

This group does not force a new top-level node or edge family. It does pressure the graph in a narrower way: passive item effects need explicit suppression/restoration timing, and `Shield of Missile Attraction` wants a target-redirection rewrite that is not the same thing as plain blocking. None of the three items owns a durable item-side resource; the lasting state is either a worn/held gating condition or a creature-side curse.

## `Cloak of Displacement`

- Nodes that fit: `magic_item_root`, `attune`, `item`, `modify_roll`, `suppress`, `restore`, `turn_start_window`.
- Edges that fit: `requires` for attunement, `attaches_to` for the cloak-item link, `modifies` for the attack-roll disadvantage, `suppresses` when the cloak is shut off by damage or speed 0, and `persists_until` for the restart at the start of the next turn.
- What fits cleanly: this is a passive self-protection effect with a real lifecycle. The effect turns on while worn, turns off when damaged, and comes back on a timing boundary.
- What leaks: the taxonomy has the right lifecycle atoms, but no explicit “passive effect state” bucket. The suppression here is not a stored resource; it is just the runtime status of the effect.
- Does the item own state/resource? No durable resource. It only carries a condition-like active/suppressed projection while worn.

## `Shield of Missile Attraction`

- Nodes that fit: `magic_item_root`, `attune`, `item`, `block_targeting`, `persist`, `break`.
- Edges that fit: `requires` for attunement, `attaches_to` for the shield-item link, `persists_until` for the curse, and a rewrite-style edge such as `replaces`/`transfers_to` for the curse’s target redirection.
- What fits cleanly: the curse is persistent and the attack redirection is clearly not a one-shot trigger. The item also shows that “defense” here is not only negation; it can rewrite who the attack lands on.
- What leaks: the resistance rider wants a damage-side modifier that the current atom list does not name directly, and the target-redirection clause is stronger than `block_targeting` alone. `block_targeting` can describe denial, but not the “target me instead” rewrite without help.
- Does the item own state/resource? No item-local resource. The curse is creature-side state that survives normal item handling until removed by *Remove Curse* or similar magic.

## `Amulet of Proof against Detection and Location`

- Nodes that fit: `magic_item_root`, `attune`, `item`, `block_targeting`, `suppress`.
- Edges that fit: `requires` for attunement, `attaches_to` for the amulet-item link, and `suppresses` for the immunity to divination targeting and magical scrying.
- What fits cleanly: this is the cleanest pure passive-block item in the group. It is just a worn-state protection rule with no payload, no activation, and no stored count.
- What leaks: `block_targeting` fits the “can’t be targeted by Divination spells” half well, but the “can’t be perceived through magical scrying sensors” half is more like blocked detection/perception than targeting. The graph does not yet separate those two passive denial modes.
- Does the item own state/resource? No. It is entirely a wear-gated prohibition.

## Cross-Item Findings

- All three items are passive while worn or held; none of them needs the `activate` / `respond` / `prepare` / `prompt` / `commit` stack.
- Only the shield introduces a persistent adverse state, and that state lives on the creature, not on the item.
- `Cloak of Displacement` is a good fit for `suppress` / `restore` timing on a passive item effect.
- `Amulet of Proof against Detection and Location` is a clean fit for passive blocking, but it also shows that targeting denial and scrying/perception denial are not identical.
- `Shield of Missile Attraction` is the outlier: it does not merely block; it rewrites the attack target. That is the strongest pressure in the group.

## New Family Check

This group does **not** force a new top-level node or edge family.

It does suggest a reusable passive-projection subgraph: worn/held gate -> continuous effect -> conditional suppression/restoration -> optional target rewrite. But that pressure is still compositional; the current graph can absorb it without introducing a new family.

Edited file:
- `.references/xphb-srd-pairing/item-validation/ROUND_2_group_B.md`
