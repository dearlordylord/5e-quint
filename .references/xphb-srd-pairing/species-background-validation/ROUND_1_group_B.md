# Round 1 Group B — Lineage / Scope-Selection Species

Species:

- `Dragonborn`
- `Elf`
- `Gnome`
- `Tiefling`
- `Goliath`

Grounding:

- `xphb-srd-pairing/SPECIES_BACKGROUND_VALIDATION_matrix_v0.md`
- `xphb-srd-pairing/TAXONOMY_atoms_graph_v3.md`
- `xphb-srd-pairing/TAXONOMY_graph_representation_v0.md`
- `.references/srd-5.2.1/Character-Origins.md`

## Short Verdict

Group B is the architecturally most informative group in the origin-side pass. Two major findings:

- **Dragonborn Breath Weapon provides a second independent stream of pressure for the typed scaling split** (dice-count scaling at character-level tiers: 1d10 → 2d10 → 3d10 → 4d10). Combined with class-feature Sneak Attack, this crosses the "two independent streams" bar and justifies promoting the typed scaling split to `TAXONOMY_atoms_graph_v4.md`.
- **Scope-First Nested Selection is strongly validated** across four species (Elven Lineage, Fiendish Legacy, Gnomish Lineage, Goliath Giant Ancestry). Every case follows the same pattern: pick sublist at character creation, gain level-1 benefit, unlock level-3 and level-5 spells scoped to that sublist, sometimes with tier-gated reveal. The subgraph named from Magic Initiate and Wizard Spellcasting is confirmed.

No new top-level node or edge family is forced.

## `Dragonborn`

- Nodes that fit:
  - `species_trait_root`
  - `choose` (Draconic Ancestor at creation — Scope-First Nested Selection outer scope)
  - `activate`
  - `action_window` (Breath Weapon replaces an attack from the Attack action)
  - `area` (15-ft cone OR 30-ft line)
  - `save_gate` (Dex save, DC 8 + Con mod + PB)
  - `branches_on_save`
  - `damage` (type set by ancestry choice)
  - `use_count` (per-PB)
  - `rest_window` (long rest)
  - `grant_resistance` (damage type set by ancestry)
  - `grant_sense` (Darkvision 60 ft)
  - **scaling**: `scale_die_count` (1d10 → 2d10 → 3d10 → 4d10 tiered by character level 5/11/17)
  - `activate` + `bonus_action_window` (Draconic Flight at level 5+)
  - `duration_window` (Draconic Flight: 10 minutes)
  - `grant_hover` (Fly Speed = Speed; closely tracks existing atom)
- Multi-trait structure:
  - **Draconic Ancestry** → scope selection setting damage type for Breath Weapon and Damage Resistance.
  - **Breath Weapon** → activated AoE save-for-half with tier-scaled dice count and shape choice each use.
  - **Damage Resistance** → type-scoped `grant_resistance` dependent on ancestry choice.
  - **Darkvision** → persistent `grant_sense` at 60 ft.
  - **Draconic Flight** → bonus-action activation granting flight for 10 minutes, once per long rest, unlocked at character level 5.
- What leaks:
  - **tier-gated feature unlock** (Draconic Flight at level 5) is character-progression metadata, not a runtime atom. Fine.
  - **ancestry-scoped downstream effects**: damage type and resistance both key on the Draconic Ancestry choice. The graph handles this via parameterization on the outer `choose` result. The Scope-First Nested Selection pattern (subgraph R) now validated.
  - **dice-count scaling across tiers** matches Sneak Attack's dice-count scaling. Same shape: scale a damage roll's dice count by character level. `v3`'s single `scale_damage` is now pressured by two independent streams (class features + origin).
  - **shape choice each cast** (15-ft cone OR 30-ft line) is an options-menu expenditure of one use.
- Verdict:
  - fits `v3` at the top level;
  - **key `v4` evidence**: second independent stream for typed scaling split;
  - reinforces Scope-First Nested Selection pattern.

## `Elf`

- Nodes that fit:
  - `species_trait_root`
  - `grant_sense` (Darkvision 60 ft, may scale via Drow lineage to 120 ft)
  - `choose` (Elven Lineage — outer scope)
  - `grant_spell_access` (lineage-granted spells, scoped)
  - `modify_roll_advantage` (Fey Ancestry on Charmed save)
  - `grant_proficiency` (Keen Senses: one of Insight/Perception/Survival)
  - `persist` (Trance: no need to sleep)
  - `restrict_action_set` (Trance: immunity to sleep magic)
- Multi-trait structure:
  - **Darkvision** → persistent `grant_sense`, 60 ft base. Drow lineage extends to 120 ft.
  - **Elven Lineage** → Scope-First Nested Selection: pick Drow / High Elf / Wood Elf, gain level-1 benefit, learn higher-level spell at character levels 3 and 5 scoped to that lineage. Each cast-without-slot per long rest (`use_count` + `rest_window` once per). INT/WIS/CHA spellcasting ability chosen at lineage selection.
  - **Fey Ancestry** → condition-scoped `modify_roll_advantage` on Charmed save.
  - **Keen Senses** → `grant_proficiency` with choose-one skill.
  - **Trance** → alternate rest rule + sleep-magic immunity. Cross-rule composition with rest rules.
- What leaks:
  - **tier-gated lineage reveal** (level 3 spell, level 5 spell) is character-progression scaling on top of the scope selection.
  - **Drow lineage's Darkvision range override** is a cross-trait rewrite: the lineage modifies the range of another trait (Darkvision from 60 to 120). Parallel to Nick / Extra Attack cross-rule rewrites but within the same species trait block.
  - **Wood Elf lineage Speed 35** is a numeric override of the base Speed. Cross-trait rewrite again.
  - **Trance** is an interesting cross-rule composition with rest rules — alternate rest-completion path.
- Verdict:
  - fits `v3`;
  - Scope-First Nested Selection validated directly;
  - Cross-Rule Rewrite validated within the species block (Drow Darkvision range, Wood Elf Speed).

## `Gnome`

- Nodes that fit:
  - `species_trait_root`
  - `grant_sense` (Darkvision 60 ft)
  - `modify_roll_advantage` (Gnomish Cunning: INT/WIS/CHA saves)
  - `choose` (Gnomish Lineage — outer scope)
  - `grant_spell_access` (lineage-granted spells scoped)
  - `use_count` (Forest Gnome's *Speak with Animals* per-PB casts)
  - `rest_window` (long rest)
  - `create_object` (Rock Gnome's clockwork devices)
  - `duration_window` (8 hours per device)
  - `dismiss` (Rock Gnome's touch-to-dismantle)
- Multi-trait structure:
  - **Gnomish Cunning** → broad-scope `modify_roll_advantage` across INT, WIS, and CHA saves.
  - **Gnomish Lineage** → outer scope: Forest Gnome or Rock Gnome, with completely different inner subgraphs.
    - Forest Gnome: cantrip + always-prepared spell with per-PB free casts.
    - Rock Gnome: two cantrips + scheduled casting of Prestidigitation to create clockwork devices.
- What leaks:
  - **heterogeneous inner subgraphs per scope**: the two gnome lineages are not parallel in structure (unlike Elf lineages which have the same level-3/level-5 table shape). This confirms the Scope-First Nested Selection pattern admits heterogeneous inner subgraphs.
  - **clockwork devices** are player-created persistent objects with a fixed decay time (8 hours). `create_object` + `duration_window` handle this; the "up to 3 at a time" invariant is a non-stacking cap already known from Slow.
- Verdict:
  - fits `v3` cleanly;
  - Scope-First Nested Selection validated again with heterogeneous inner shapes.

## `Tiefling`

- Nodes that fit:
  - `species_trait_root`
  - `grant_sense` (Darkvision 60 ft)
  - `choose` (Fiendish Legacy — outer scope)
  - `grant_resistance` (type from legacy)
  - `grant_spell_access` (cantrip + higher-level spells scoped to legacy)
  - `use_count` + `rest_window` (once-per-long-rest free casts)
  - `grant_spell_access` (Thaumaturgy cantrip, always)
- Multi-trait structure:
  - **Darkvision** → `grant_sense`.
  - **Fiendish Legacy** → scope selection (Abyssal / Chthonic / Infernal) with tiered spells at character levels 3 and 5 keyed to the legacy.
  - **Otherworldly Presence** → always-known cantrip (Thaumaturgy) using legacy's spellcasting ability.
- What leaks:
  - identical scope-first structure to Elf.
  - **legacy-scoped spellcasting ability sharing**: the ability chosen for Fiendish Legacy is reused by Otherworldly Presence. The graph can express this via a reference back to the earlier `choose` result; no new atom needed.
- Verdict:
  - fits `v3` cleanly;
  - parallel to Elf — strong evidence that Scope-First Nested Selection is stable across species.

## `Goliath`

- Nodes that fit:
  - `species_trait_root`
  - `choose` (Giant Ancestry — outer scope with six option subgraphs)
  - varies by chosen ancestry:
    - Cloud's Jaunt → `activate` + `bonus_action_window` + teleport `move`
    - Fire's Burn → `on_hit_window` + `damage(Fire)`
    - Frost's Chill → `on_hit_window` + `damage(Cold)` + `modify_speed`
    - Hill's Tumble → `on_hit_window` + `apply_condition(Prone)` (Large or smaller)
    - Stone's Endurance → `respond` + `reaction_window` + reduce damage
    - Storm's Thunder → `respond` + `reaction_window` + `damage(Thunder)` at 60 ft
  - `use_count` (per-PB across all ancestry options)
  - `rest_window` (long rest)
  - `activate` + `bonus_action_window` (Large Form at level 5+)
  - `modify_roll_advantage` (Powerful Build: end Grappled; Large Form: Strength checks)
  - `modify_speed` (Large Form +10 ft)
  - `persist` + `duration_window` (Large Form 10 minutes)
- Multi-trait structure:
  - **Giant Ancestry** → options-menu scope selection with six distinct inner subgraphs. Every option consumes from the same per-PB pool. This is **Scope-First Nested Selection + Pool With Options Menu combined** — the outer choice sets the scope, the inner pool funds any of the chosen option's activations.

  Actually correction: the Giant Ancestry rule says "choose one of the following benefits — a supernatural boon from your ancestry; you can use the chosen benefit a number of times equal to your Proficiency Bonus." So the player picks ONE ancestry, and that ONE ancestry has the pool. Not a flat options menu. This is Scope-First Nested Selection only.
- What leaks:
  - **on-hit damage rider, on-damage reaction, bonus-action teleport, on-hit condition rider** — six distinct runtime shapes scoped by the ancestry choice. Every shape already has atom coverage.
  - **Large Form** → transformation-like effect with Advantage on Strength checks + Speed +10. Uses `persist` + `duration_window` + multiple persistent effect atoms.
- Verdict:
  - fits `v3` cleanly;
  - fifth validation of Scope-First Nested Selection pattern across species (Dragonborn, Elf, Gnome, Tiefling, Goliath).

## Cross-Species Findings

1. **Scope-First Nested Selection validated five times** in one pass (Dragonborn Draconic Ancestry, Elven Lineage, Gnomish Lineage, Fiendish Legacy, Giant Ancestry). Combined with Magic Initiate (feat) and Wizard Spellcasting (class feature), the pattern is now seven independent data points. Promote from "recording" to a well-anchored pattern in the graph representation.

2. **Typed scaling split gets its second cross-stream data point** (Dragonborn Breath Weapon dice-count scaling at character levels 5/11/17). Combined with class-feature Sneak Attack and Bardic Inspiration, three distinct scaling shapes are now visible across two independent source kinds (class features and species). **This crosses the "second independent stream" bar and justifies promoting the typed scaling split to `v4`.**

3. **`grant_sense` ubiquitous**. Every species except Halfling and Human grants Darkvision or similar. The atom is trivially validated; the narrow observation is that Darkvision range varies (60, 120 ft) and some sense grants are activation-gated rather than persistent (Stonecunning Tremorsense).

4. **`grant_spell_access` validated as the cross-species default** for lineage-granted spells. Combined with Wizard Spellcasting and Magic Initiate, the atom now has six+ independent data points across four source kinds.

5. **`grant_resistance` validated again** (Dragonborn ancestry-scoped resistance, Tiefling legacy-scoped resistance; Dwarf Poison from Group A). Three-source validation.

6. **Cross-Rule Rewrite within species blocks** (Drow Darkvision range, Wood Elf Speed) is a narrower form of cross-rule composition. Existing subgraphs cover it.

7. **Heterogeneous inner subgraphs under the same outer scope** (Gnomish Forest/Rock; Goliath six ancestries) confirm the Scope-First Nested Selection pattern admits arbitrary inner variety.

## New Node / Edge Family

Group B does **not** force any new top-level node or edge family.

Key promotions recorded for the synthesis step:

- **typed scaling split justified for `v4`**: cross-stream evidence now exists.
- **Scope-First Nested Selection anchored**: seven+ data points across feats, class features, species.
