# Round 1 Group C

Features:

- `Unarmored Defense` (Barbarian, Level 1)
- `Feral Instinct` (Barbarian, Level 7)
- `Danger Sense` (Barbarian, Level 2)
- `Spellcasting` (Wizard, Level 1)

Grounding:

- `xphb-srd-pairing/CLASS_FEATURE_VALIDATION_matrix_v0.md`
- `xphb-srd-pairing/TAXONOMY_atoms_graph.md`
- `xphb-srd-pairing/TAXONOMY_graph_representation.md`
- `.references/srd-5.2.1/Classes/Barbarian.md`, `Wizard.md`

## Short Verdict

Group C is the single strongest group for validating `v3`'s new atoms:

- **`initiative_window`** gets its second independent data point (Feral Instinct after Alert). The atom survives.
- **`modify_roll_advantage`** gets its third data point (Danger Sense after Sap / Vex). The typed split keeps earning its keep.
- **`grant_spell_access`** gets its first strong data point (Spellcasting). Prior pressure was from Magic Initiate. Class-level spellcasting is the most architecturally significant instance.
- **AC formula override** (Unarmored Defense) is a cross-rule rewrite of the baseline AC calculation. It does not force a new atom but deserves a pattern note.

No new top-level node or edge family is forced. `v3` holds.

## `Unarmored Defense`

- Nodes that fit:
  - `class_feature_root`
  - `grant`
  - `modify_ac`
  - `self`
  - `persist`
- Edges that fit:
  - `roots`
  - `grants`
  - `attaches_to`
- What leaks:
  - **formula override, not bonus**: the feature replaces the baseline AC calculation (`10 + Dex mod`) with a class-specific calculation (`10 + Dex mod + Con mod` for Barbarian). This is a rewrite of the calculation rule rather than a numeric adjustment. `modify_ac` covers the effect but does not explicitly distinguish "set AC to formula X" from "add N to AC."
  - **gated on worn state**: "while you aren't wearing any armor." The graph handles this via attachment prerequisites.
  - **shield allowed**: "you can use a Shield and still gain this benefit" is a narrow exception to the usual no-armor implication. The shield's AC bonus stacks with the class formula. This is a cross-rule composition: the class rule removes armor requirement but preserves shield benefits.
- Ownership:
  - creature-owned passive conditional on armor state.
- Verdict:
  - fits `v3` as `grant` + `modify_ac` + `persists_until` (wearing armor);
  - records **AC formula override** as a cross-rule rewrite pattern, similar to Nick's window reassignment and Two-Weapon Fighting's damage modification;
  - no new atom; pattern addition to graph representation.

## `Feral Instinct`

- Nodes that fit:
  - `class_feature_root`
  - `grant`
  - `modify_roll_advantage`
  - `initiative_window`
  - `self`
  - `persist`
- Edges that fit:
  - `roots`
  - `grants`
  - `attaches_to`
- What leaks:
  - **nothing material**. This is the cleanest possible validation case for `initiative_window` + `modify_roll_advantage` together. The feature text is literally "you have Advantage on Initiative rolls."
- Ownership:
  - creature-owned always-on.
- Verdict:
  - **key `v3` validation**: second independent data point for `initiative_window` after Alert. The atom stays.
  - validates `modify_roll_advantage` with a class-level always-on grant, not just as a rider.

## `Danger Sense`

- Nodes that fit:
  - `class_feature_root`
  - `grant`
  - `modify_roll_advantage`
  - `save_gate` (scope of the advantage)
  - `self`
  - `persist`
  - `suppress` (when Incapacitated)
- Edges that fit:
  - `roots`
  - `grants`
  - `attaches_to`
  - `suppresses`
- What leaks:
  - **save-type-scoped advantage**: the advantage applies only to Dexterity saving throws, not to all saves. The graph's `modify_roll_advantage` covers the effect but does not explicitly scope by save type. Fine at the atom level; the scoping is the attachment's business.
  - **state-gated suppression**: "unless you have the Incapacitated condition" is a passive suppression trigger. `suppress` covers this, similar to Cloak of Displacement's conditional suppression.
- Ownership:
  - creature-owned always-on with state-gated suppression.
- Verdict:
  - fits `v3` cleanly;
  - third independent data point for `modify_roll_advantage`;
  - second class-feature validation for `suppress` as a conditional passive shutdown (first was Unarmored Defense's armor gate).

## `Spellcasting` (Wizard)

- Nodes that fit:
  - `class_feature_root`
  - `grant_spell_access`
  - `grant_proficiency` (implicit: spellcasting ability proficiency; also spell preparation capability)
  - `spell_slot`
  - `use_count`
  - `rest_window` (long rest = slot refresh)
  - `choose` (prep selection)
  - `persist`
  - `self`
- Edges that fit:
  - `roots`
  - `grants`
  - `consumes`
  - `persists_until`
- Multi-benefit structure:
  - **Cantrips** — grants access to 3 wizard cantrips, modifiable on long rest, expanded at levels 4 and 10.
  - **Spellbook** — object-like store of level-1+ spells; starts with 6 level-1 spells; adds 2 per level; can copy in new spells by time and gold cost.
  - **Spell Slots** — resource table driven by class features table.
  - **Prepared Spells of Level 1+** — typed selection subset of spellbook, bounded by a per-level cap.
  - **Spellcasting Ability** — ability tied to casting; determines save DCs and attack bonuses.
  - **Spellcasting Focus** — item category that can substitute for material components.
- What leaks:
  - **the spellbook is an object-like container**: it holds spells with retrieval cost, and is itself a tiny object with weight, price, and an appearance. Structurally this is close to a magic item with `stores` / `releases` relations, but the spellbook is a creature-attached object that persists across rests and is not a magic item.
  - **two-layer selection**: learned-into-spellbook vs. prepared-from-spellbook. `grant_spell_access` covers the "have access" side; a second concept is needed for "prepared" as a subselection. The graph can express this as two chained selections, but it is architecturally important.
  - **level-gated cap expansion**: the prepared-list cap grows with level, which is just level-scaled `use_count`.
  - **copy-in cost**: the "copy a spell into the book" rule has a time cost (2 hours per spell level) and money cost (50 GP per spell level). This is DM-agenda territory more than mechanics, but it affects the legal state (which spells are in the book).
  - **cantrip replacement on long rest** is a per-rest choice window, expressible via `rest_window` + `choose`.
  - **always-prepared spells from other features** — "those spells otherwise count as Wizard spells for you" — is a cross-feature composition where later features add spells to the prepared list outside the prep cap.
- Ownership:
  - creature-owned spellbook object;
  - creature-owned prepared list;
  - creature-owned spell slots.
- Verdict:
  - fits `v3` as the densest single class-feature subgraph in the sample;
  - validates `grant_spell_access` as first-class atom with clear evidence;
  - pressures a distinction between **learned / in-spellbook** and **prepared** spell states that the current single `grant_spell_access` atom does not express. Worth recording as narrow subtype pressure but not promoting to a new atom (many casters only have "prepared" without a book layer; the book is wizard-specific).

## Cross-Feature Findings

1. All four features fit `v3` at the top level. No new top-level node or edge family is forced.
2. **`initiative_window` is confirmed** (Feral Instinct) with a clean class-feature data point. Atom stays.
3. **`modify_roll_advantage` is strongly validated** across three data points (Sap, Vex, now Danger Sense) with varied scope (target's next attack, attacker's next attack, self's Dex saves). Typed split holds.
4. **`grant_spell_access` is strongly validated** (Spellcasting) as the central class-level persistent spell grant. Atom stays.
5. **`suppress` as a state-gated passive shutdown** (Danger Sense's Incapacitated gate; also visible in Unarmored Defense's armor gate) is confirmed as a versatile atom.
6. **AC formula override** (Unarmored Defense) and **learned-vs-prepared distinction** (Spellcasting) are two narrow pattern observations. Neither forces a new atom.
7. **Cross-feature composition** across features in the same class (Unarmored Defense + Shield use; Spellcasting + always-prepared spells from later features) keeps pressuring cross-rule composition as a recurring pattern. This is consistent with Nick / Two-Weapon Fighting earlier.

## New Node / Edge Family

Group C does **not** force a new top-level node or edge family.

Candidate pattern recording:

- **AC formula override** — a cross-rule rewrite of the baseline calculation rule, distinct from a numeric adjustment. Adds to the existing Cross-Rule Composition subgraph.
- **Learned-vs-prepared two-layer selection** — a narrow wizard-specific pattern over `grant_spell_access`. Worth recording if other caster types (druid, cleric) also show a two-layer or spellbook-like structure; defer promotion.

`v3`'s new atoms stay, reinforced by second/third independent data points.
