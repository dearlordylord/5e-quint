# Round 1 Group C — Backgrounds

Backgrounds:

- `Acolyte`
- `Criminal`
- `Sage`
- `Soldier`

Grounding:

- `xphb-srd-pairing/SPECIES_BACKGROUND_VALIDATION_matrix_v0.md`
- `xphb-srd-pairing/TAXONOMY_atoms_graph.md`
- `xphb-srd-pairing/TAXONOMY_graph_representation.md`
- `.references/srd-5.2.1/Character-Origins.md`

## Short Verdict

Group C is the most structurally uniform group in the whole validation effort so far. All four SRD backgrounds share the same five-part shape:

1. Ability score bumps (character-creation only; out of scope for runtime mechanics);
2. One specified origin feat;
3. Two specified skill proficiencies;
4. One specified tool proficiency;
5. Equipment package choice.

Each part maps cleanly to existing `v3` atoms. No new top-level node, edge, or even subgraph is forced.

The most interesting observation is the **meta-level grant** (background grants an origin feat), which echoes Human Versatile from Group A. Now a two-data-point pattern worth recording in the graph representation.

## Uniform Shape

Rather than repeat the same per-background node list, the shape for every SRD background is:

- `background_trait_root`
- `grant_proficiency` × 2 (the two skills)
- `grant_proficiency` × 1 (the tool)
- `grant` of an origin feat (meta-level grant — pulls in the granted feat's entire subgraph)
- `choose` between equipment package and 50 GP
- Ability score adjustments (character-creation metadata, out of runtime scope)

Edges used: `roots`, `grants`.

## Per-Background Specifics

### `Acolyte`

- Meta-grant: `Magic Initiate (Cleric)` — forced Cleric list selection (not a free `choose`; the legacy is pre-scoped to Cleric).
- Skills: Insight, Religion.
- Tool: Calligrapher's Supplies.
- Equipment: A (gear pack) or B (50 GP).

What leaks:

- **pre-scoped Magic Initiate** is a variant of the Scope-First Nested Selection pattern where the outer scope is authored by the background rather than chosen by the player. This is a compression of `choose` + `grant`: the scope is fixed, and the inner selections (2 cantrips + 1 level-1 spell) still happen at character creation.

### `Criminal`

- Meta-grant: `Alert` (no sublist selection; Alert has no scopes).
- Skills: Sleight of Hand, Stealth.
- Tool: Thieves' Tools.
- Equipment: A or B.

What leaks:

- clean pass through the five-part shape with no special structure.

### `Sage`

- Meta-grant: `Magic Initiate (Wizard)` — forced Wizard list selection.
- Skills: Arcana, History.
- Tool: Calligrapher's Supplies.
- Equipment: A or B.

What leaks:

- same pre-scoped Magic Initiate observation as Acolyte, with a different forced list (Wizard instead of Cleric). Confirms the pattern.

### `Soldier`

- Meta-grant: `Savage Attacker` (no sublist).
- Skills: Athletics, Intimidation.
- Tool: choose one Gaming Set.
- Equipment: A or B (with a nested self-reference: the gear pack includes the Gaming Set chosen above).

What leaks:

- **forward-reference in equipment**: the equipment package includes "Gaming Set (same as above)" — a reference to a tool proficiency selection made earlier in this same background. This is a narrow authoring-time dependency, not a runtime mechanic. Fine.

## Cross-Background Findings

1. **Uniform five-part shape** confirms that backgrounds are a single composed subgraph, not a heterogeneous family. No new subgraph needed.
2. **Meta-level grant** is validated as a recurring pattern across origins: Human Versatile (species) and every SRD background all grant an origin feat. This is a two-data-source pattern and worth a short note in the graph representation.
3. **Pre-scoped Magic Initiate** (Acolyte, Sage) is a background-specific variant of Scope-First Nested Selection. Instead of letting the player pick the outer scope, the background authors it. Expressible via composition; no new atom.
4. **`grant_proficiency` dense validation**: three of the four backgrounds grant three proficiencies each (two skills + one tool), plus the origin-feat subgraph may add more. Across the four SRD backgrounds this is 12+ data points for `grant_proficiency`.
5. **Equipment choice** is a character-creation `choose` between A and B; once made, it populates the character sheet with items. No runtime atom implications.

## New Node / Edge Family

Group C does **not** force any new top-level node or edge family or even a new subgraph.

Pattern recordings (shared with Group A):

- meta-level grant (species / background grants a feat unit);
- pre-scoped Scope-First Nested Selection (background authors the outer scope instead of prompting the player).
