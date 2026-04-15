# Round 1 Group B

Grounding: local `spells-xphb.json` entries for the five spells, read against `TAXONOMY_atoms_graph.md`.

## `Counterspell`

- Atoms used: `spell_root`, `respond`, `reaction_window`, `spell_slot`, `suppress`, `restore`.
- Relations used: `opens_window`, `requires`, `suppresses`, `consumes`.
- What leaks into prose: the spell is keyed to a creature "in the process of casting" a spell, not to a generic reaction window; the trigger is component-sensitive (`V/S/M`); the interrupted spell's action/bonus action/reaction is wasted; and the slot refund is conditional on the target spell having used a slot.
- Verdict: strengthens `respond`, `opens_window`, `requires`, and `suppress`. It also falsifies the idea that a generic `reaction_window` is enough. The taxonomy is missing a more exact interrupt atom, something like `spell_cast_window` or `cast_interrupt_window`, and it has no clean relation for resource refund beyond a vague `restore`.

## `Dispel Magic`

- Atoms used: `spell_root`, `choose`, `target`, `suppress`.
- Relations used: `requires`, `branches_on_completion`, `suppresses`, `modifies`.
- What leaks into prose: the target can be a creature, object, or magical effect; the spell distinguishes ongoing spells by level bands; level 4+ spells require an ability check with your spellcasting ability; the DC is `10 + spell level`; higher-slot casting auto-ends lower spells.
- Verdict: strengthens `choose` and `suppress`, but it exposes a real hole. The current taxonomy has no `ability_check` atom or relation, so the spell cannot be described cleanly without prose residue. `branches_on_completion` is too coarse to carry the level-check logic by itself.

## `Find Familiar`

- Atoms used: `spell_root`, `create_companion`, `grant`, `persist`, `dismiss`, `replace`, `deliver_touch_spell`, `telepathic_link`, `companion`.
- Relations used: `grants`, `attaches_to`, `persists_until`, `releases`, `replaces`, `prompts`.
- What leaks into prose: the familiar acts independently but obeys commands; it rolls its own initiative; it cannot attack; it can be temporarily dismissed to a pocket dimension; it can reappear; only one familiar can exist at a time; recasting while one exists changes its form instead of creating a second one; and the creature type shifts to Celestial/Fey/Fiend.
- Verdict: strongly supports decomposing the spell into companion creation, telepathic link, touch delivery, dismissal, and replacement behavior. It also shows the taxonomy still lacks ownership/control and stateful companion lifecycle. If the graph claims `create_companion` is enough, that is false.

## `Fly`

- Atoms used: `spell_root`, `grant`, `persist`, `concentrate`, `expire`.
- Relations used: `requires`, `grants`, `persists_until`, `modifies`.
- What leaks into prose: the target must be willing and touched; the granted movement is specifically a `Fly Speed` of 60 feet; the target can hover; when the spell ends, the target falls if still aloft unless it can stop the fall; and higher-slot casting adds targets.
- Verdict: this falsifies the current effect bucket set. The taxonomy has no movement/speed atom family, no `hover`, and no `fall` behavior. `modify_range` is the wrong mental model here. The spell does not fit the current effect vocabulary without inventing prose escapes.

## `Glyph of Warding`

- Atoms used: `spell_root`, `store`, `release`, `prepare`, `choose`, `persist`, `break`, `complete`, `stored_spell`.
- Relations used: `attaches_to`, `stores`, `opens_window`, `branches_on_completion`, `requires`, `prompts`, `releases`.
- What leaks into prose: the glyph must be tied to a surface or closable object; moving it more than 10 feet breaks it; you choose the trigger and can refine it with creature-type and password conditions; the glyph branches into explosive rune vs spell glyph; the stored spell has no immediate effect when cast into the glyph; and concentration spells stored in it last until the end of their full duration.
- Verdict: strengthens `store`, `release`, `attaches_to`, and `branches_on_completion`. It also shows the current resource atom `stored_spell_slot` is wrong in spirit: the spell stores a prepared spell, not a slot. This is a taxonomy bug, not a wording quirk. `trigger` / `anchored` behavior also needs more explicit structure than the current draft provides.

## Cross-Spell Findings

- `Counterspell` and `Dispel Magic` together show that the taxonomy needs an explicit `ability_check` / `spellcast_interrupt` path; reaction wording alone is too generic.
- `Fly` proves the current effect atoms do not cover movement grants, hover, or falling; the graph is missing a real movement/speed subtree.
- `Glyph of Warding` falsifies the name `stored_spell_slot`; the thing being stored is a spell, not a slot.
- `Find Familiar` shows companion rules are not just `create_companion`; ownership, command, dismissal, and replacement behavior are part of the core shape.
- The current taxonomy is still a pressure map, not a finished graph. `branches_on_completion` exists, but it is too blunt to cover the different branch types seen here.
- None of these five spells support the idea that the six families are an irreducible ontology. They are still useful bundles, but they are not yet the lower-level graph.

Edited file:
- `.references/xphb-srd-pairing/spell-validation/ROUND_1_group_B.md`
