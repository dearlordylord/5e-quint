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
      "status": "ready-for-implementation",
      "title": "Audit every mechanically relevant level-4 reachable Unit"
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

Post-consolidation breadth review reopened one planning question: a passing
level-1-4 gate is not the same as proof that every SRD level-4-reachable
mechanical Unit is authored, installed, supported, or correctly closed. The
current generated report exposes a broader accounting surface: strict runtime
support is `147/210`, strict target closure is `210/210`, candidate Unit ids
before exclusions are `237`, SRD pressure with no Unit matrix row is `14`, and
the non-supported frontier is `63`. `L14G-06` owns the full source-backed audit
of those rows before any next golden-gate planning lanes are split.

Completed scope-construction tasks were intentionally removed from the Ralph
task index. The live queue now starts at `L14G-01` plus the reopened `L14G-06`
audit lane; the deleted completed work was the level-4 inventory scope, the
level-1-4 strict full-support report, and the level-1-4 ultra-golden aggregate
scope.

## Source Of Truth

Read these before starting a task in this queue:

- `CLAUDE.md`
- `plans/unit-profile-coverage/README.md`
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`
- `plans/unit-profile-coverage/LEVEL1_4_FULL_SUPPORT.md`
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

Use four parallel Ralph agents at most. The active implementation/research
lanes are independent enough to launch together after normal branch-base
checks; the consolidation lane is serial after their outputs land.

| Lane | Ralph source file | Task | Size | Status | Independence |
| --- | --- | --- | ---: | --- | --- |
| A | `plans/RALPH_L14G_01_ASI_CATALOG_SOURCE.md` | L14G-01-LEVEL4-ASI-CATALOG-SOURCE | ~1 day | done | Source/catalog lane added the missing Fighter, Paladin, and Warlock ASI records plus checker-readable closure evidence. |
| B | `plans/RALPH_L14G_02_PROGRESSION_DELTA_AUDIT.md` | L14G-02-LEVEL4-PROGRESSION-DELTA-AUDIT | ~1 day | done | Audit lane found no new implementation follow-up; existing ASI and Slow Fall lanes remain the correct owners. |
| C | `plans/RALPH_L14G_03_MONK_SLOW_FALL_TRIAGE.md` | L14G-03-MONK-SLOW-FALL-TRIAGE | ~1 day | done | RAW/domain decision lane for Slow Fall. It spawned the follow-up runtime slice below. |
| C2 | `plans/RALPH_L14G_03_MONK_SLOW_FALL_TRIAGE.md` | L14G-03A-MONK-SLOW-FALL-RUNTIME | ~1 day | done | Promoted Slow Fall as a selected Monk falling Reaction damage-reduction slice without duplicating table/spatial falling state. |
| D | `plans/RALPH_L14G_04_MCP_LEVEL14_SCENARIO_GATE.md` | L14G-04-MCP-LEVEL14-SCENARIO-GATE | ~1.5-2 days | done | Added MCP scenario evidence for level-4 advancement, sheet durability, and battle handoff. |
| E | `plans/RALPH_L14G_05_GATE_CONSOLIDATION.md` | L14G-05-GATE-CONSOLIDATION | ~0.5 day | done | Serial lane after A-D regenerated coverage, reviewed residuals, and updated this plan. |
| F | `plans/RALPH_L14G_06_LEVEL4_REACHABLE_UNIT_FULL_AUDIT.md` | L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT | ~1-2 days | ready-for-implementation | Full audit lane reopened after gate consolidation. It must account for every level-4-reachable battle, character-state, game-mechanical, non-only-table-facing Unit or Unit-shaped fact before splitting next golden-gate lanes. |

The per-lane files above are the Ralph launch sources for parallel runs. Each
file has its own `ralph-task-index` block; completed research lanes may add
their own implementation follow-ups. This `ACTIVE_PLAN.md` remains the
coordination rollup and serial fallback, not the recommended source for
launching parallel agents.

## Work Shape

The split is intentionally coarser than half-day tasks. ASI source records and
claims stay together because splitting them would create checker churn without
reducing risk. MCP stays one larger lane because scenario design and evidence
updates need to converge in one artifact.

| Task | Day 1 | Day 2 |
| --- | --- | --- |
| L14G-01-LEVEL4-ASI-CATALOG-SOURCE | Read existing ASI records/class records, author missing Fighter/Paladin/Warlock records, add class feature-grant refs, and add/update Unit claims. | Usually not needed; use spillover for regeneration, reviewer-loop fixes, and closing generated no-matrix rows. |
| L14G-02-LEVEL4-PROGRESSION-DELTA-AUDIT | Extract level-3 to level-4 table deltas from all 12 local SRD class files and map each delta to an existing owner if one exists. | Usually not needed; use spillover to write the audit artifact and split uncovered deltas into concrete follow-up task rows. |
| L14G-03-MONK-SLOW-FALL-TRIAGE | Completed: Slow Fall is a split between table-owned falling adjudication and promoted battle-runtime Reaction damage reduction. | Follow-up `L14G-03A-MONK-SLOW-FALL-RUNTIME` owns implementation. |
| L14G-03A-MONK-SLOW-FALL-RUNTIME | Author the missing Slow Fall Surface record/class grant, widen the existing reaction roll/damage-reduction support family with a fall-specific modifier, and add QNT/runtime/identity evidence. Keep the falling-into-liquid Reaction check out of scope unless a generic fall owner coordinates the shared Reaction resource. | Usually not needed; use spillover only for reviewer-loop fixes or focused MBT reproduction. |
| L14G-04-MCP-LEVEL14-SCENARIO-GATE | Trace the existing MCP level-3 scenario pattern and design the level-4 advancement/ASI/sheet/handoff scenario using returned holes. | Implement the scenario, update MCP evidence manifest rows, regenerate the ultra-golden gate, and verify level-1 through level-1-3 evidence remains valid. |
| L14G-05-GATE-CONSOLIDATION | Re-run all generated reports after lanes 1-4, inspect remaining level-1-4 residuals, update this plan, and close or split residual blockers. | Not expected. |
| L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT | Reconcile every level-4-reachable Unit or Unit-shaped mechanical fact against SRD anchors, Surface source, catalog admission, Unit matrix status, profile claims, selected-identity evidence, and owner boundaries. | Split concrete follow-up Ralph lanes for any authored-but-not-installed, no-matrix, unsupported-but-mechanical, diagnostic-readiness, feat-choice, spell-access, equipment, skill/proficiency, or character/battle-state residual. |

## DAG / Queue Order

| # | Task | Status | Depends on | Notes |
| ---: | --- | --- | --- | --- |
| 1 | L14G-01-LEVEL4-ASI-CATALOG-SOURCE | done | none | ASI source/catalog gaps closed without adding per-class runtime behavior. |
| 2 | L14G-02-LEVEL4-PROGRESSION-DELTA-AUDIT | done | none | Audit artifact added at `plans/unit-profile-coverage/L14G_02_LEVEL4_PROGRESSION_DELTA_AUDIT.md`; no new follow-up tasks discovered. |
| 3 | L14G-03-MONK-SLOW-FALL-TRIAGE | done | none | Boundary decided as split; see `plans/unit-profile-coverage/L14G_03_MONK_SLOW_FALL_TRIAGE.md`. |
| 4 | L14G-04-MCP-LEVEL14-SCENARIO-GATE | done | none | Checked MCP evidence added for all four level-1-4 required flows. |
| 6 | L14G-03A-MONK-SLOW-FALL-RUNTIME | done | L14G-03 | Selected Monk falling Reaction damage-reduction slice implemented. |
| 5 | L14G-05-GATE-CONSOLIDATION | done | Tasks 1-4 and L14G-03A | Generated coverage is fresh; level-1-4 ultra-golden remains pass with no pass-blocking residuals. |
| 7 | L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT | ready-for-implementation | L14G-05 | Full source-backed breadth audit before next golden-gate planning. |

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

Status: `ready-for-implementation`

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
