# Round 1 Group B

Feats:

- `Magic Initiate`
- `Boon of Spell Recall`

Grounding:

- `xphb-srd-pairing/FEAT_VALIDATION_matrix_v0.md`
- `xphb-srd-pairing/TAXONOMY_atoms_graph.md`
- `xphb-srd-pairing/TAXONOMY_graph_representation.md`
- `.references/srd-5.2.1/Feats.md`

## Short Verdict

Group B is the narrowest group in the pass but exposes one genuinely new shape: **probabilistic resource refund as a post-cast rider**. The atom graph has `consumes` (cost) and `release` (retrieval) but no atom or composition pattern that cleanly expresses "consume happened, then conditionally reverse it with a chance based on a local roll."

Magic Initiate, by contrast, fits `v2` as composition plus one minor gap (feat-granted prepared spell list extension) that shares shape with the proficiency-grant gap from Group A.

## `Magic Initiate`

- Nodes that fit:
  - `feat_root`
  - `grant`
  - `choose`
  - `spell_slot`
  - `rest_window`
- Edges that fit:
  - `roots`
  - `grants`
  - `opens_window`
- What leaks:
  - **two cantrips grant**: the feat attaches two spells to the caster's known/prepared list. The graph has no `grant_spell_access` effect atom. The procedural side (`grant`) fires, but the granted thing has no typed effect atom.
  - **always-prepared level-1 spell**: same gap, with the additional note that "always prepared" implies the graph needs to distinguish "granted to the known list" from "granted as always-prepared." This is spellcasting-class bookkeeping detail.
  - **one free cast per long rest**: this looks like an item-like `use_count` of 1 with `rest_window` (long rest) as the reset boundary. It fits `use_count` but is creature-scoped rather than item-scoped, which the atom inventory does not distinguish today. The same resource shape is just instantiated on a different owner.
  - **spellcasting ability choice**: the creature chooses INT/WIS/CHA at feat selection. This is feat-authored configuration; no runtime atom needed.
  - **level-up replacement hook**: "whenever you gain a new level, you can replace one of the spells" is character-progression metadata, not a runtime atom target.
  - **repeatability with different list**: authoring constraint, not runtime.
  - **scope-first nested selection**: the three benefits (two cantrips + level-1 spell + later level-up swap) are all scoped to the single spell list selected at feat selection. Structurally: pick sublist L once (locked in), then every subsequent selection (cantrips, spell, swaps) is constrained to L. This is the same compositional pattern later surfaced for Wizard Spellcasting's learned-vs-prepared two-layer. It parallels `choose` chained with a scope-setting earlier `choose`, and deserves naming in the graph representation. Mutual exclusivity on repeat ("different spell list each time") is authoring-time metadata that constrains *which* L is picked on later feat instances, not a runtime atom.
- Ownership:
  - creature-owned granted spell list;
  - creature-owned once-per-long-rest free-cast counter;
  - no item involvement.
- Verdict:
  - fits `v2` structurally;
  - exposes a `grant_spell_access` effect atom gap, parallel to the `grant_proficiency` and `grant_sense` gaps in Group A — all three are "grant this capability" effects where the capability itself is not named;
  - confirms `use_count` + `rest_window` composition also works for creature-side, not only item-side, resource shapes.

## `Boon of Spell Recall`

- Nodes that fit:
  - `feat_root`
  - `respond`
  - `spell_cast_window`
  - `spell_slot`
  - `post_roll_window`
  - `restore`
- Edges that fit:
  - `roots`
  - `opens_window`
  - `branches_on_completion`
- What leaks:
  - **trigger**: "whenever you cast a spell with a level 1–4 spell slot." The graph has `spell_cast_window` which fits the trigger point.
  - **dice roll**: "roll 1d4." The graph has no atom for "feat-owned anonymous roll whose result branches outcome." `post_roll_window` comes close if we treat the 1d4 as a roll the feat makes, but the existing atom is attached to attack / save / ability rolls, not to arbitrary rule-owned dice.
  - **branch**: "If the number you roll is the same as the slot's level, the slot isn't expended." This is the novel part:
    - the normal cast consumed a `spell_slot`;
    - the rider conditionally reverses that consumption;
    - the graph has `consumes`, `release`, `store`, `restore`, but no atom that names "conditional refund of a just-consumed resource."
  - the shape resembles `restore` semantically, but `restore` in `v2` is about restoring suppressed effects (see `suppress` / `restore`), not about un-consuming a resource.
  - level gating ("1–4 spell slots only") is a trigger-side filter, not a new atom.
- Ownership:
  - creature-owned rider, no reset cadence beyond the single cast event;
  - no daily quota — the rider applies on every qualifying cast.
- Verdict:
  - fits `v2` at the top level via `feat_root` → `respond` (or `activate`) → `spell_cast_window` → branch on 1d4 result;
  - but the **"conditional refund of a just-consumed resource"** composition pattern is genuinely new relative to prior validation streams;
  - the likely atom additions are either:
    - a new `refund` procedure atom that names the reversal, or
    - a new relation edge `refunds` parallel to `consumes` / `restores`;
  - either way this is a composition gap, not a missing family.

## Cross-Feat Findings

1. Magic Initiate exposes a `grant_spell_access` gap in the same family as Group A's `grant_proficiency` and `grant_sense` gaps. The three together suggest a pattern: **several specific "grant X" effect atoms are missing where the granted capability is a durable character capability rather than a runtime status**.
2. Boon of Spell Recall exposes a novel composition — **probabilistic resource refund** — that is not cleanly expressed in `v2` today. This is the clearest atom-level pressure from the feat pass so far.
3. Resource ownership continues to look uniform across creatures and items: `use_count` + `rest_window` works for both Magic Initiate's free cast (creature-side) and for Pearl of Power (item-side).
4. The two feats in this group do not share structure with each other, which is a good proof that Group B captures a real structural variety.

## New Node / Edge Family

Group B does **not** force a new top-level family.

It exposes two narrow additions to record:

- `grant_spell_access` as a candidate effect atom, paralleling Group A's `grant_proficiency` and `grant_sense`;
- a `refund` procedure atom or `refunds` relation edge for probabilistic resource refund, currently unexpressed in `v2`.
