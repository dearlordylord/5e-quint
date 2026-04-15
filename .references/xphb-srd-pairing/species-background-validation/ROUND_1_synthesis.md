# Round 1 Species and Background Synthesis

Purpose:

- aggregate the species and background validation pass against `TAXONOMY_atoms_graph.md`;
- determine whether origin-side pressure confirms or discharges `v3`'s recorded residue and primary `v4` candidate;
- decide whether species / background pressure justifies `TAXONOMY_atoms_graph.md`.

## Short Answer

`v3` holds at the top level across all 13 origin-side units. The pass is mostly confirmatory for `v3`'s new grant atoms and is architecturally quiet in most respects — except for two important cross-stream validations:

- **Typed scaling split is now justified for `v4`**. Dragonborn Breath Weapon's tier-scaled dice count (1d10 → 4d10 across character levels 5/11/17) is a second independent stream of pressure after the class-feature pass's three scaling shapes. The typed split should be promoted.
- **Scope-First Nested Selection is strongly anchored**. Seven independent data points across feats (Magic Initiate), class features (Wizard Spellcasting), and five species (Dragonborn, Elf, Gnome, Tiefling, Goliath). The pattern subgraph is stable.

No new top-level node or edge family is forced.

## Group Verdicts

### Group A — simple-ancestry species

Species: `Dwarf`, `Halfling`, `Human`, `Orc`.

Result:

- `v3` holds;
- `grant_sense`, `grant_resistance`, `grant_proficiency`, `modify_roll_advantage` all validated with origin-side data points;
- `modify_roll_reroll` gets its second independent data point (Halfling Luck, forced-keep variant) after Savage Attacker (keep-higher variant);
- 0-HP reversal pattern gets its second data point (Orc Relentless Endurance) after Barbarian Relentless Rage;
- meta-level grant recorded (Human Versatile grants an origin feat);
- narrow subtype pressure on `modify_roll_reroll` (keep-higher vs forced-keep).

### Group B — lineage / scope-selection species

Species: `Dragonborn`, `Elf`, `Gnome`, `Tiefling`, `Goliath`.

Result:

- `v3` holds;
- **key finding**: typed scaling split second-stream data point (Dragonborn Breath Weapon dice-count scaling). Promote to `v4`.
- Scope-First Nested Selection validated five more times. Combined with Magic Initiate and Wizard Spellcasting, seven independent data points. Pattern anchored.
- `grant_spell_access` validated four more times (Elf, Gnome, Tiefling lineages; Dragonborn ancestry governs damage/resistance rather than spells).
- `grant_resistance` validated twice more (Dragonborn, Tiefling).
- Cross-Rule Rewrite within species blocks (Drow Darkvision range, Wood Elf Speed) — existing pattern confirmed.

### Group C — backgrounds

Backgrounds: `Acolyte`, `Criminal`, `Sage`, `Soldier`.

Result:

- `v3` holds;
- **uniform five-part shape** across all four SRD backgrounds: ability bumps + origin feat + two skill profs + tool prof + equipment choice;
- dense validation for `grant_proficiency` (12+ data points);
- meta-level grant reinforced (each background grants an origin feat — two-source pattern with Human Versatile);
- pre-scoped Scope-First Nested Selection observation (Acolyte's pre-scoped Cleric Magic Initiate; Sage's pre-scoped Wizard Magic Initiate) as a narrow background-authored variant of the player-scoped pattern.

## What Round 1 Strengthened

### 1. `v3`'s grant atoms are ubiquitously validated

Every atom `v3` added in the grant family got at least two independent origin-side data points:

- `grant_sense` — seven species;
- `grant_resistance` — three species (Dwarf, Dragonborn, Tiefling);
- `grant_proficiency` — every background plus Human and Elf;
- `grant_spell_access` — four species lineages.

These are now among the most-validated atoms in the graph.

### 2. Typed scaling split crosses the "second independent stream" bar

Prior pressure from class features (Bardic Inspiration die-size, Sneak Attack dice-count, Extra Attack attack-count) was all internal to one source kind.

Dragonborn Breath Weapon's dice-count scaling is a **second independent stream**. The shape is identical to Sneak Attack's (dice count increases at specific character-level thresholds) but the source is origin-side, not class-side.

Per the outcome rule set in the class-feature synthesis, this is enough to justify drafting `TAXONOMY_atoms_graph.md`.

### 3. Scope-First Nested Selection is architecturally central

Seven independent data points:

- feats: Magic Initiate;
- class features: Wizard Spellcasting;
- species: Dragonborn Draconic Ancestry, Elven Lineage, Gnomish Lineage, Fiendish Legacy, Giant Ancestry.

Plus the background-authored variant (Acolyte, Sage). The pattern subgraph (R) is now among the best-evidenced.

### 4. `modify_roll_reroll` split is working

Second independent data point (Halfling Luck). Narrow subtype pressure (keep-higher vs forced-keep) recorded but deferred — neither subtype is mechanically distinct enough to warrant separate atoms.

### 5. Meta-level grant as a recurring cross-origin pattern

Two-source pattern (Human Versatile + every SRD background). A species or background grants another first-class unit (a feat). The graph's `grant` atom handles this, but the authoring-level inclusion is worth recording.

## What Still Leaks (Recorded, Not Promoted)

### A. `modify_max_hp` with per-level growth (Dwarven Toughness)

Dwarven Toughness increases HP max by 1 at character creation and by 1 at each level-up. This is per-level scaling of a stat modification. The atom `modify_max_hp` exists; the growth cadence is character-progression metadata. No atom change needed.

### B. Heroic Inspiration as a narrative/meta state

Human Resourceful grants Heroic Inspiration on long rest. Heroic Inspiration is currently unrepresented as a first-class state at the atom level. Single-species pressure; defer naming.

### C. Alternate rest-completion path (Elf Trance)

Trance rewrites the long-rest duration requirement from 8 hours to 4 hours in meditation. Cross-rule composition with rest rules. Existing subgraph H covers; narrow note.

### D. Pre-scoped Scope-First Nested Selection (backgrounds)

Backgrounds author the outer scope of Magic Initiate. Narrow variant of the pattern. Record without promoting.

## Research Conclusion

`v3` holds at the top level. The species and background pass reinforces the `v3` atoms broadly, discharges several "single-group" recordings, and crosses the promotion threshold for the typed scaling split.

Next actions:

1. Run the item-property validation pass to close out source-root coverage before drafting `v4`;
2. Draft `TAXONOMY_atoms_graph.md` promoting the typed scaling split. Candidate change:
   - retain: `scale_numeric_bonus`, `scale_target_count`;
   - add: `scale_die_count`, `scale_die_size`, `scale_attack_count`;
   - retire `scale_damage` as a grouping label (same treatment `v3` gave to `modify_roll`).
3. After `v4`, refresh `TAXONOMY_graph_representation.md` to `v1` with updated atom names and updated example subgraphs;
4. Only then resume schema design.

The item-property pass is expected to be confirmatory and to not introduce new atoms, given item properties are almost entirely cross-rule composition — a pattern already strongly named.
