# Round 1 Group A

Feats:

- `Skilled`
- `Ability Score Improvement`
- `Defense`
- `Archery`
- `Boon of Truesight`

Grounding:

- `xphb-srd-pairing/FEAT_VALIDATION_matrix_v0.md`
- `xphb-srd-pairing/TAXONOMY_atoms_graph_v2.md`
- `xphb-srd-pairing/TAXONOMY_graph_representation_v0.md`
- `.references/srd-5.2.1/Feats.md`

## Short Verdict

Group A fits `v2` at the top level but exposes two real gaps in the effect-atom inventory:

- **sense grants** (Truesight, and by implication Darkvision / Blindsight) are not represented by any current effect atom;
- **proficiency grants** (Skilled) are not represented either.

Both gaps are narrow — they look like missing specific effect atoms, not new families. The rest of the group (Defense, Archery, ASI) fits existing atoms cleanly.

## `Skilled`

- Nodes that fit:
  - `feat_root`
  - `grant`
  - `choose`
- Edges that fit:
  - `roots`
  - `grants`
- What leaks:
  - **proficiency** is not an effect atom in `v2`. The graph has `grant` as a procedure and effect atoms for rolls, AC, movement, conditions, etc., but no `grant_proficiency` effect.
  - proficiency in a skill or tool affects downstream `ability_check` resolution, but the persistent grant itself has no atom target to point at.
- Ownership:
  - no runtime resource;
  - creature-owned training state persists for the life of the character.
- Verdict:
  - fits `v2` structurally but exposes a missing effect atom for proficiency grants;
  - `ability_check` already exists as a resolution atom, so the gap is specifically at the effect side where "what was granted" would be named.

## `Ability Score Improvement`

- Nodes that fit:
  - `feat_root`
  - `choose`
  - `grant`
- Edges that fit:
  - `roots`
  - `grants`
- What leaks:
  - ability score modifications are character-sheet-level, not runtime combat effects;
  - the graph has no `modify_ability_score` effect atom, because ability scores are not yet modeled as first-class state in the mechanics graph;
  - this is arguably out of scope for the mechanics graph at all — ability scores are input state to most rolls, not a downstream effect.
- Ownership:
  - creature-owned stat;
  - no runtime resource.
- Verdict:
  - fits `v2` as a structural no-op at the runtime level;
  - worth noting that many feats carry an ASI as a secondary benefit; this pattern will repeat in Grappler, all seven Epic Boons, and more. The graph can treat ASI as a pre-runtime character state modification and not model it as a runtime effect;
  - records the pattern without forcing an atom addition.

## `Defense`

- Nodes that fit:
  - `feat_root`
  - `grant`
  - `modify_ac`
  - `self`
- Edges that fit:
  - `roots`
  - `grants`
  - `attaches_to`
- What leaks:
  - the armor-state gating ("while wearing Light, Medium, or Heavy armor") is a prerequisite the graph can express but does not name as a "worn-state gate";
  - the shape is the same passive-projection-lite pattern already seen in items, but without wear/hold because the gate is the wearer's own armor choice.
- Ownership:
  - creature-owned passive modifier conditional on armor state.
- Verdict:
  - fits `v2` cleanly;
  - the gating is narrow prose, not a taxonomy gap.

## `Archery`

- Nodes that fit:
  - `feat_root`
  - `grant`
  - `modify_roll`
  - `attack_roll`
  - `self`
- Edges that fit:
  - `roots`
  - `grants`
  - `modifies`
- What leaks:
  - the weapon-type gating ("with Ranged weapons") is another narrow prose constraint;
  - `modify_roll` carries the +2 numeric bonus, consistent with how Bless and Shield of Faith are handled.
- Ownership:
  - creature-owned passive modifier conditional on weapon category.
- Verdict:
  - fits `v2` cleanly;
  - another validation point for `modify_roll` carrying a numeric bonus cleanly.

## `Boon of Truesight`

- Nodes that fit:
  - `feat_root`
  - `grant`
  - `persist`
  - `self`
- Edges that fit:
  - `roots`
  - `grants`
  - `attaches_to`
- What leaks:
  - **Truesight is a sense**, not any current effect atom. The graph has specific effect atoms for: damage, heal, hp changes, AC changes, roll changes, speed changes, range changes, hover, extra action, action-set restriction, condition application/removal, movement, transport/exile, targeting/travel blocks, effect negation, opportunity-attack denial, companion creation/command, telepathic link, touch-spell delivery, object creation, attack-proxy creation, mark, item alteration, and fall-on-end.
  - none of these name **granting a sense**.
  - parallel: `grant_hover` exists as a specific effect atom. That precedent says specific movement-like grants can be atoms. Sense grants should likely get equivalent treatment.
- Ownership:
  - creature-owned persistent grant, no resource cost, no reset.
- Verdict:
  - fits `v2` structurally via `grant` + `persist`, but **needs a `grant_sense` effect atom** (or explicit acknowledgment that senses are out of the mechanics graph);
  - this is the most concrete atom-level gap in Group A;
  - Darkvision, Blindsight, and Tremorsense all share this shape and will reappear in species traits.

## Cross-Feat Findings

1. Defense, Archery, and ASI all fit `v2` without pressure on new atoms — three passive numeric/stat modifications in different flavors.
2. Skilled exposes a missing `grant_proficiency` effect atom. Ability checks exist as a resolution atom, but the grant has no named target.
3. Boon of Truesight exposes a missing `grant_sense` effect atom. `grant_hover` is the precedent for adding specific grant effects.
4. All five feats are single-benefit or ASI-plus-one-benefit feats, so this group does not yet pressure multi-benefit feat composition.
5. The "worn-state gate" for Defense and "weapon-type gate" for Archery are narrow prerequisites the graph handles fine with attachment; neither pressures a new atom.

## New Node / Edge Family

Group A does **not** force a new top-level node or edge family.

It does expose two narrow effect-atom gaps that should be recorded:

- `grant_sense` (Truesight, Darkvision, Blindsight, Tremorsense);
- `grant_proficiency` (skill or tool training grants).

These are candidate atom additions to `TAXONOMY_atoms_graph_v2.md`, not new families. They parallel the existing `grant_hover` pattern.
