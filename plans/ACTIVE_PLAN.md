# Active Plan: Level 1-4 Ultra-Golden Gate

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L14G-01-LEVEL4-ASI-CATALOG-SOURCE",
      "status": "done",
      "title": "Close level-4 Ability Score Improvement catalog/source gaps"
    },
    {
      "number": 2,
      "id": "L14G-02-LEVEL4-PROGRESSION-DELTA-AUDIT",
      "status": "done",
      "title": "Audit level-4 class-table progression deltas"
    },
    {
      "number": 3,
      "id": "L14G-03-MONK-SLOW-FALL-TRIAGE",
      "status": "done",
      "title": "Classify or promote Monk Slow Fall"
    },
    {
      "number": 4,
      "id": "L14G-04-MCP-LEVEL14-SCENARIO-GATE",
      "status": "done",
      "title": "Add level-1-4 MCP scenario evidence"
    },
    {
      "number": 5,
      "id": "L14G-05-GATE-CONSOLIDATION",
      "status": "done",
      "title": "Regenerate and close the level 1-4 ultra-golden gate"
    },
    {
      "number": 6,
      "id": "L14G-03A-MONK-SLOW-FALL-RUNTIME",
      "status": "done",
      "title": "Promote Monk Slow Fall falling Reaction reduction"
    },
    {
      "number": 7,
      "id": "L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT",
      "status": "done",
      "title": "Audit every mechanically relevant level-4 reachable Unit"
    },
    {
      "number": 8,
      "id": "L14G-LANE-A-ASI-CATALOG-ADMISSION-UNITS",
      "status": "ready-for-implementation",
      "title": "Run Lane A ASI catalog-admission Unit tasks"
    },
    {
      "number": 9,
      "id": "L14G-LANE-B-FEAT-SPECIES-CATALOG-UNITS",
      "status": "ready-for-research",
      "title": "Run Lane B feat and species catalog Unit tasks"
    },
    {
      "number": 10,
      "id": "L14G-LANE-C-CHARACTER-SHEET-EVIDENCE-UNITS",
      "status": "ready-for-implementation",
      "title": "Run Lane C Character Sheet evidence Unit tasks"
    },
    {
      "number": 11,
      "id": "L14G-LANE-D-PARTIAL-PROFILE-PROJECTION-UNITS",
      "status": "ready-for-research",
      "title": "Run Lane D partial-profile and projection Unit tasks"
    }
  ]
}
-->

## Current State

The level 1-3 ultra-golden gate remains complete. The checker now also passes
the level-1-4 scope:

- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md` reports the level-4
  class-feature rows.
- `plans/unit-profile-coverage/LEVEL1_4_FULL_SUPPORT.md` exists and reports
  support completeness as pass: strict target closure `210/210`, selected
  identity readiness `169/169`, and SRD-authored product readiness with zero
  authored-readiness blockers.
- `plans/unit-profile-coverage/ULTRA_GOLDEN_GATE.md` reports the aggregate gate
  as pass; `level-1-4` is `4/4` layers complete.
- MCP scenario evidence for `level-1-4` covers `mcp-workflow-discovery`,
  `character-creation`, `character-sheet`, and `battle` through
  `create-level-four-wizard-asi-and-battle-handoff`.

The level-4 inventory work that originally split from the MCP scenario lane is
now landed:

- Missing no-matrix level-4 class feature rows for Fighter, Paladin, Warlock,
  and Monk are closed.
- Existing installed ASI rows are closed as `closed-selection-grant-container`;
  selected downstream feat Units or Character Sheet facts own executable
  behavior.
- Spell-level-3 remains outside level 1-4 and belongs to the character-level-5
  frontier for full casters.
- Slow Fall triage resolved the boundary as a split: table/spatial owns fall
  distance, landing geometry, raw fall-damage derivation, and the
  falling-into-liquid check as a separate Reaction procedure; battle runtime
  should own selected `monk_slow_fall` Reaction spend, `5 * Monk level`
  fall-damage reduction, and the coupled no-fall-damage/Falling-Prone
  prevention result.

The serial consolidation lane is also complete. Fresh checker write passes left
the generated Unit-profile and rules-kernel coverage artifacts unchanged, and
the generated gate outputs report no pass-blocking residuals for level 1-4.

Post-consolidation breadth review is now complete. `L14G-06` wrote
`plans/unit-profile-coverage/L14G_06_LEVEL4_REACHABLE_UNIT_FULL_AUDIT.md`,
reconciled the generated level-1-4 accounting surface, and preserved the
generated closure facts: strict runtime support is `147/210`, strict target
closure is `210/210`, candidate Unit ids before exclusions are `237`, SRD
pressure with no Unit matrix row is `14`, and the non-supported frontier is
`63`.

The audit found no new pass-blocking generated gate failure. The follow-up work
is now split into four Ralph launch files with one task per Unit, 29 tasks
total:

- Lane A: 8 class-specific level-4 ASI catalog-admission Units, all
  ready-for-implementation.
- Lane B: 8 feat/species catalog Units, 1 ready-for-implementation and 7
  ready-for-research.
- Lane C: 9 Character Sheet evidence Units, all ready-for-implementation.
- Lane D: the original partial-profile/projection Unit tasks are complete;
  Druid Wild Shape's remaining battle-runtime follow-up is split into five
  concrete Beast Spells and Stat Block action-shape tasks in the lane file.

Completed scope-construction tasks were intentionally removed from the Ralph
task index. The live queue is the four lane files listed below; this document
is the coordination rollup, not the launch source for per-Unit agents.

## Source Of Truth

Read these before starting a task in this queue:

- `CLAUDE.md`
- `plans/unit-profile-coverage/README.md`
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`
- `plans/unit-profile-coverage/LEVEL1_4_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/L14G_06_LEVEL4_REACHABLE_UNIT_FULL_AUDIT.md`
- `plans/unit-profile-coverage/ULTRA_GOLDEN_GATE.md`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `plans/unit-profile-coverage/level1-4-full-support.json`
- `plans/unit-profile-coverage/ultra-golden-gate.json`
- `plans/unit-profile-coverage/mcp-scenario-evidence.json`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `plans/unit-profile-coverage/unit-matrix.json`
- `plans/unit-profile-coverage/UNIT_REPORT.md`
- `plans/rules-kernel-coverage/REPORT.md`
- `plans/LEVEL1_2_FULL_SUPPORT_BACKLOG.md`
- `plans/RALPH_L14G_LANE_A_ASI_CATALOG_ADMISSION_UNITS.md`
- `plans/RALPH_L14G_LANE_B_FEAT_SPECIES_CATALOG_UNITS.md`
- `plans/RALPH_L14G_LANE_C_CHARACTER_SHEET_EVIDENCE_UNITS.md`
- `plans/RALPH_L14G_LANE_D_PARTIAL_PROFILE_PROJECTION_UNITS.md`
- `.references/srd-5.2.1/Classes/`
- `.references/srd-5.2.1/Feats.md`
- `.references/srd-5.2.1/Equipment.md`
- `.references/srd-5.2.1/Character-Origins.md`
- `UBIQUITOUS_LANGUAGE.md`

For rule-bearing work, read the relevant local SRD anchors under
`.references/srd-5.2.1/` and check `UBIQUITOUS_LANGUAGE.md` before
implementation. Do not browse external rules sources for SRD meaning.

## Gate Shape

The level 1-4 gate uses the same four-layer ultra-golden shape as level 1-3:

| Layer | Current level-1-4 result | Meaning |
| --- | --- | --- |
| Support completeness | pass | The generated strict report has no open strict rows, selected-identity blockers, or SRD-authored product-readiness blockers. |
| QNT/generator readiness | pass | Every scoped reducer-semantic obligation is covered, and scoped semantic-core QNT owners are generation-subset-clean with no run-block blocker. |
| MBT/parity evidence | pass | Every scoped reducer-semantic obligation has at least one rules-kernel parity witness. |
| MCP scenario evidence | pass | The level-1-4 MCP scenario manifest has checker-owned evidence for discovery, character creation, Character Sheet, and battle flows. |

## Parallel Ralph Lanes

Use four parallel Ralph agents at most. Each active lane file has its own
`ralph-task-index` block and should be launched as a separate Ralph source.
Agents should finish at least one task from their lane before taking the next
task in that same lane.

| Lane | Ralph source file | Task | Size | Status | Independence |
| --- | --- | --- | ---: | --- | --- |
| 1 | `plans/RALPH_L14G_LANE_A_ASI_CATALOG_ADMISSION_UNITS.md` | 8 ASI catalog-admission Unit tasks | ~1-2 days | ready-for-implementation | Strongly coupled by one selection-grant-container invariant; one generic fix may close multiple per-Unit tasks. |
| 2 | `plans/RALPH_L14G_LANE_B_FEAT_SPECIES_CATALOG_UNITS.md` | 5 feat Units and 3 species Units | ~2 days | mixed | Catalog and character-creation research; Human depends conceptually on Magic Initiate Druid and Skilled. |
| 3 | `plans/RALPH_L14G_LANE_C_CHARACTER_SHEET_EVIDENCE_UNITS.md` | 9 Character Sheet evidence Unit tasks | ~1-2 days | ready-for-implementation | Shared checker/evidence-reference fix may close multiple rows without adding runtime adapters. |
| 4 | `plans/RALPH_L14G_LANE_D_PARTIAL_PROFILE_PROJECTION_UNITS.md` | Completed partial-profile closure plus 5 Wild Shape runtime follow-ups | ~2 days | mixed | Beast Spells is separate from Stat Block action-shape work; multi-damage and trait-Advantage slices are implementation-ready, while rider and non-Attack action slices need focused research. |

The per-lane files above are the Ralph launch sources for parallel runs. Each
file has its own `ralph-task-index` block; research tasks may add their own
smaller implementation follow-ups. This `ACTIVE_PLAN.md` remains the
coordination rollup and serial fallback, not the recommended source for
launching parallel agents.

## Work Shape

Each lane is sized for about two days of forward work. Lanes run in parallel;
tasks inside a lane are sequential only when a task depends on a shared
research or checker fix from an earlier task in the same file.

| Lane | Day 1 | Day 2 |
| --- | --- | --- |
| Lane 1 - ASI catalog admission | Read the eight class anchors, inspect installed Fighter/Paladin/Warlock/Wizard ASI patterns, implement the shared class-grant/catalog admission fix, and close at least one per-Unit task explicitly. | Regenerate coverage, mark every closed sibling task in the lane file, and run the shared verifier. |
| Lane 2 - feat/species catalog | Install Magic Initiate Druid if the existing Magic Initiate list model still fits, then research Skilled and Human together because Human's Versatile path needs real Origin feat identities. | Continue through Grappler, Fighting Style feats, Gnome, and Halfling; split any runtime-heavy battle behavior into smaller follow-up tasks instead of broad unsupported blobs. |
| Lane 3 - Character Sheet evidence | Fix the shared checker/evidence-reference handling or direct evidence anchors, then close the first imported-symbol evidence row. | Apply the same evidence pattern across the remaining eight Unit rows, regenerate inventory, and avoid adding duplicate runtime adapters. |
| Lane 4 - partial profile/projection | Completed the original Wild Shape, Monk's Focus, Metamagic, and Rogue closure work. | Execute the new Wild Shape Beast Spells and Stat Block action-shape follow-ups from the lane file; keep generic object use and non-battle persistence outside this lane unless their owners are promoted. |

## DAG / Queue Order

| # | Task | Status | Depends on | Notes |
| ---: | --- | --- | --- | --- |
| 1 | L14G-01-LEVEL4-ASI-CATALOG-SOURCE | done | none | ASI source/catalog gaps closed without adding per-class runtime behavior. |
| 2 | L14G-02-LEVEL4-PROGRESSION-DELTA-AUDIT | done | none | Audit artifact added at `plans/unit-profile-coverage/L14G_02_LEVEL4_PROGRESSION_DELTA_AUDIT.md`; no new follow-up tasks discovered. |
| 3 | L14G-03-MONK-SLOW-FALL-TRIAGE | done | none | Boundary decided as split; see `plans/unit-profile-coverage/L14G_03_MONK_SLOW_FALL_TRIAGE.md`. |
| 4 | L14G-04-MCP-LEVEL14-SCENARIO-GATE | done | none | Checked MCP evidence added for all four level-1-4 required flows. |
| 6 | L14G-03A-MONK-SLOW-FALL-RUNTIME | done | L14G-03 | Selected Monk falling Reaction damage-reduction slice implemented. |
| 5 | L14G-05-GATE-CONSOLIDATION | done | Tasks 1-4 and L14G-03A | Generated coverage is fresh; level-1-4 ultra-golden remains pass with no pass-blocking residuals. |
| 7 | L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT | done | L14G-05 | Audit artifact added and 29 per-Unit follow-up tasks split into four lane files. |
| 8 | L14G-LANE-A-ASI-CATALOG-ADMISSION-UNITS | ready-for-implementation | L14G-06 | Eight per-Unit ASI catalog-admission tasks. |
| 9 | L14G-LANE-B-FEAT-SPECIES-CATALOG-UNITS | ready-for-research | L14G-06 | Eight per-Unit feat/species catalog tasks; Human depends conceptually on Magic Initiate Druid and Skilled. |
| 10 | L14G-LANE-C-CHARACTER-SHEET-EVIDENCE-UNITS | ready-for-implementation | L14G-06 | Nine per-Unit Character Sheet evidence tasks. |
| 11 | L14G-LANE-D-PARTIAL-PROFILE-PROJECTION-UNITS | ready-for-research | L14G-06 | Four per-Unit partial-profile/projection tasks. |

## Task Details

### Task 1 - L14G-01-LEVEL4-ASI-CATALOG-SOURCE

Status: `done`

Output:

- Author missing SRD Surface records for `fighter_ability_score_improvement_l4`,
  `paladin_ability_score_improvement_l4`, and
  `warlock_ability_score_improvement_l4`, or document a precise reason if a
  record should remain absent.
- Ensure SRD class records retain level-4 ASI feature grants through the same
  source shape used for existing class feature grants.
- Add or update Unit claim rows so ASI remains a `selection-grant-container`
  closure rather than duplicated per-class runtime behavior.

Acceptance:

- The level-4 ASI rows derive from one generic feat-choice/advancement owner.
- The SRD inventory no longer reports those three ASI rows as no-matrix
  level-4 class-feature pressure.
- No runtime code dispatches on class-specific ASI authored identity.

### Task 2 - L14G-02-LEVEL4-PROGRESSION-DELTA-AUDIT

Status: `done`

Output:

- Compare every SRD class table's level-3 to level-4 progression facts:
  prepared spell counts, cantrip counts, spell-slot counts, Pact Magic counts,
  Weapon Mastery counts, class resources, and other table-owned deltas.
- Decide which deltas are already covered by existing character-creation,
  Character Sheet, or battle handoff owners and which need task rows.

Acceptance:

- The audit names source facts, not authored identity as runtime dispatch.
- Existing generic progression owners are reused where possible.
- Any new implementation task has a concrete owner and evidence target.

Result:

- Audit artifact: `plans/unit-profile-coverage/L14G_02_LEVEL4_PROGRESSION_DELTA_AUDIT.md`.
- No new implementation follow-up task was discovered. Existing `L14G-01`
  remains the owner for missing Fighter, Paladin, and Warlock ASI source/catalog
  records; existing `L14G-03` remains the owner for Monk Slow Fall triage.

### Task 3 - L14G-03-MONK-SLOW-FALL-TRIAGE

Status: `done`

Output:

- Boundary decision recorded in
  `plans/unit-profile-coverage/L14G_03_MONK_SLOW_FALL_TRIAGE.md`.
- Decision: split. Table/spatial owns fall distance, landing geometry, raw
  fall-damage derivation, and falling-into-liquid adjudication as a separate
  Reaction procedure. Battle runtime should own selected Slow Fall Reaction
  spend, fall-damage reduction by `5 * Monk level`, and coupled Falling-Prone
  prevention when reduced damage is zero.

Acceptance:

- The decision cites local RAW and `UBIQUITOUS_LANGUAGE.md`.
- The follow-up identifies the QNT owner, runtime reducer owner, support
  profile widening, selected-identity evidence shape, and focused parity
  target before implementation starts.

### Task 6 - L14G-03A-MONK-SLOW-FALL-RUNTIME

Status: `done`

Output:

- Author the missing SRD `monk_slow_fall` Surface Unit and Monk class grant.
- Widen `unit-feature.reaction-roll-or-damage-reduction` with a fall-specific
  modifier rather than reusing attack-damage reduction.
- Extend the `creatureFalls` Reaction and landing/fall-damage reducer path to
  spend the selected Monk's Reaction and reduce caller-supplied fall damage by
  `5 * Monk level`.
- Keep the Falling hazard's falling-into-liquid Reaction check out of scope
  unless a generic fall owner coordinates the shared Reaction resource.
- Add QNT, deterministic runtime tests, selected-identity evidence, and Unit
  coverage claims.

Acceptance:

- Runtime support uses parsed Surface shape and selected Unit refs, not Monk or
  Slow Fall authored-identity dispatch.
- No duplicated fall distance, falling position, landing geometry, or raw fall
  damage state is added to battle or Character Sheet state.
- Reduced fall damage and Falling-Prone prevention are resolved at one landing
  boundary.

Verification:

- `pnpm --filter @dnd/battle-runtime exec vitest run src/slow-fall-reaction.test.ts src/unit-profile-admission-martial-action-features.test.ts`
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

### Task 4 - L14G-04-MCP-LEVEL14-SCENARIO-GATE

Status: `done`

Output:

- Add MCP scenario evidence for a supported SRD level-4 character advancement
  path.
- Exercise returned level-4 choice/finalization holes, including ASI or another
  qualifying feat choice.
- Read back durable Character Sheet state after finalization.
- Hand off to battle when level-4 facts affect battle state, and record checked
  evidence in `plans/unit-profile-coverage/mcp-scenario-evidence.json`.

Acceptance:

- `ULTRA_GOLDEN_GATE.md` shows level-1-4 MCP scenario evidence as `4/4`.
- The scenario uses returned hole ids and option ids rather than hard-coded
  authored identity in runtime behavior.
- Existing level 1, 1-2, and 1-3 MCP evidence remains valid.

### Task 5 - L14G-05-GATE-CONSOLIDATION

Status: `done`

Depends on:

- L14G-01-LEVEL4-ASI-CATALOG-SOURCE
- L14G-02-LEVEL4-PROGRESSION-DELTA-AUDIT
- L14G-03-MONK-SLOW-FALL-TRIAGE
- L14G-03A-MONK-SLOW-FALL-RUNTIME, unless explicitly deferred by the decider
- L14G-04-MCP-LEVEL14-SCENARIO-GATE

Output:

- Regenerate all generated coverage artifacts.
- Update this plan statuses.
- Summarize every remaining level-1-4 residual as pass, precise owner boundary,
  later-level-only, or concrete follow-up task.

Acceptance:

- `ULTRA_GOLDEN_GATE.md` reports level-1-4 with no stale or hand-maintained
  blocker text.
- Any residual that prevents a pass is named by generated checker output.

Result:

- `pnpm unit-profile-coverage:check --write` and
  `pnpm rules-kernel-coverage:check -- --write` completed without generated
  artifact diffs.
- `plans/unit-profile-coverage/ULTRA_GOLDEN_GATE.md` reports level 1, level
  1-2, level 1-3, and level 1-4 as pass across all four layers.
- `plans/unit-profile-coverage/LEVEL1_4_FULL_SUPPORT.md` reports strict target
  closure `210/210`, selected identity readiness `169/169`, and SRD-authored
  product readiness `84/84`, with zero gate blockers.
- `plans/rules-kernel-coverage/REPORT.md` reports zero open QNT/generator or
  parity obligations; the remaining six rules-kernel rows are boundary or
  unsupported-by-admission rows, not open blockers.
- No new Ralph follow-up lane was split from this consolidation pass.

### Task 7 - L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT

Status: `done`

Depends on:

- L14G-05-GATE-CONSOLIDATION

Output:

- Write
  `plans/unit-profile-coverage/L14G_06_LEVEL4_REACHABLE_UNIT_FULL_AUDIT.md`.
- Account for every Unit or Unit-shaped mechanical fact a character can carry,
  select, prepare, equip, retain, project, or execute by character level 4.
- Include all battle-related, character-state-related, game-mechanical, and
  non-only-table-facing rows: class features, subclass features, feats, skills,
  tools, languages, Weapon Mastery, Armor Training, spell-access facts,
  reachable spell Units, equipment/loadout refs, species/background/origin feat
  facts, companion exclusions, no-matrix pressure, and diagnostic readiness
  rows.
- Prove `none` for categories that level 4 does not actually advance, such as
  new spell levels or new equipment identities, instead of omitting those
  categories.
- Split every real residual into concrete Ralph-formatted follow-up lanes.

Acceptance:

- The audit reconciles to the generated level-1-4 counts in
  `level1-4-full-support.json` and `unit-matrix.json`.
- Every row distinguishes Surface authoring, Unit catalog admission, Unit
  matrix/profile classification, runtime support, selected-identity evidence,
  and MCP/user-flow evidence.
- Any pure table-facing exclusion names the table-owned fact and proves why no
  character state, Character Sheet state, battle handoff state, battle runtime
  state, or selected Unit identity evidence should own it.
- The lane does not implement runtime/catalog work directly; it prepares
  precise planning lanes for the next golden-gate pass.

Result:

- Audit artifact added at
  `plans/unit-profile-coverage/L14G_06_LEVEL4_REACHABLE_UNIT_FULL_AUDIT.md`.
- Reconciled the generated level-1-4 accounting surface: candidate Unit ids
  before exclusions `237`, companion exclusions `1`, no-matrix SRD pressure
  `14`, class-container exclusions `12`, strict denominator `210`, strict
  target closure `210/210`, and product readiness `619/632`.
- Closed `ranger_hunters_lore` as table/stat-block knowledge disclosure: do
  not duplicate creature Immunity, Resistance, or Vulnerability facts into
  Ranger feature state.
- Split every real residual found by the audit into 29 per-Unit Ralph tasks
  across four lane files.

### Active Lane Launch Files

These files are the launch sources for the remaining level-4 Golden Gate tail:

| Lane | File | Tasks | Status shape |
| --- | --- | ---: | --- |
| 1 | `plans/RALPH_L14G_LANE_A_ASI_CATALOG_ADMISSION_UNITS.md` | 8 | all ready-for-implementation |
| 2 | `plans/RALPH_L14G_LANE_B_FEAT_SPECIES_CATALOG_UNITS.md` | 8 | 1 ready-for-implementation, 7 ready-for-research |
| 3 | `plans/RALPH_L14G_LANE_C_CHARACTER_SHEET_EVIDENCE_UNITS.md` | 9 | all ready-for-implementation |
| 4 | `plans/RALPH_L14G_LANE_D_PARTIAL_PROFILE_PROJECTION_UNITS.md` | 4 | 1 ready-for-implementation, 3 ready-for-research |

Each lane file carries the unit ids, source anchors, acceptance criteria,
verification commands, and Ralph task statuses. Launch agents from these four
lane files only.

## Verification

Every implementation task in this plan must include:

- RAW and ubiquitous-language check against local SRD anchors and
  `UBIQUITOUS_LANGUAGE.md`.
- Reviewer-loop convergence: RAW traceability, ubiquitous-language/domain,
  architecture/connascence, and code-review passes until no reasonable findings
  remain.
- `pnpm unit-profile-coverage:check:self-test`
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check:self-test`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

Run `pnpm quality` for consolidation tasks, checker changes, package-script
changes, QNT changes, or TypeScript runtime changes.
