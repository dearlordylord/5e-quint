# Ralph Lane B - Selected Identity Gate

Purpose: make the Unit-profile metric harder to lie to by requiring supported
SRD Units to prove selected authored identity reaches the relevant runtime or
creation entrypoint. This lane owns metric honesty, not new spell mechanics.

Hard workload rule: this lane is underloaded if it completes before at least 15
tasks land. The recursive task must append at least 12 new atomic runnable tasks
or prove that every supported/profile-subset-supported Unit has selected
identity evidence or an explicit non-applicable classification.

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "B1-SELECTED-IDENTITY-GAP-REPORT",
      "status": "done",
      "title": "Generate selected-identity gap report"
    },
    {
      "number": 2,
      "id": "B2-EVIDENCE-SCHEMA-CHECK",
      "status": "done",
      "title": "Tighten selected-identity evidence validation"
    },
    {
      "number": 3,
      "id": "B3-HARD-GATE-SELF-TEST",
      "status": "done",
      "title": "Add hard-gate self-test for missing identity evidence"
    },
    {
      "number": 4,
      "id": "B4-CLASS-FEATURE-IDENTITY-BATCH-1",
      "status": "done",
      "title": "Backfill class-feature identity evidence batch 1"
    },
    {
      "number": 5,
      "id": "B5-CLASS-FEATURE-IDENTITY-BATCH-2",
      "status": "done",
      "title": "Backfill class-feature identity evidence batch 2"
    },
    {
      "number": 6,
      "id": "B6-CLASS-FEATURE-IDENTITY-BATCH-3",
      "status": "done",
      "title": "Backfill class-feature identity evidence batch 3"
    },
    {
      "number": 7,
      "id": "B7-FEAT-IDENTITY-BATCH",
      "status": "done",
      "title": "Backfill feat identity evidence"
    },
    {
      "number": 8,
      "id": "B8-LEVEL1-SPELL-IDENTITY-BATCH",
      "status": "done",
      "title": "Backfill level-1 spell identity evidence"
    },
    {
      "number": 9,
      "id": "B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH",
      "status": "done",
      "title": "Backfill level-2 damage spell identity evidence"
    },
    {
      "number": 10,
      "id": "B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH",
      "status": "done",
      "title": "Backfill level-2 control spell identity evidence"
    },
    {
      "number": 11,
      "id": "B11-LEVEL2-MOBILITY-SPELL-IDENTITY-BATCH",
      "status": "done",
      "title": "Backfill level-2 mobility spell identity evidence"
    },
    {
      "number": 12,
      "id": "B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH",
      "status": "done",
      "title": "Backfill level-2 protection spell identity evidence"
    },
    {
      "number": 13,
      "id": "B13-PROFILE-SUBSET-IDENTITY-DISPOSITIONS",
      "status": "done",
      "title": "Classify subset-supported identity expectations"
    },
    {
      "number": 14,
      "id": "B14-FULL-SUPPORT-REPORT-PROJECTION",
      "status": "done",
      "title": "Project selected-identity gate into full-support reports"
    },
    {
      "number": 15,
      "id": "B15-UNIT-REPORT-HONESTY-PASS",
      "status": "done",
      "title": "Refresh Unit report wording and metrics"
    },
    {
      "number": 16,
      "id": "B16-MCP-SCENARIO-IDENTITY-SMOKE",
      "status": "done",
      "title": "Add MCP selected-identity smoke coverage"
    },
    {
      "number": 17,
      "id": "B17-END-TO-END-UNIT-VERIFICATION",
      "status": "done",
      "title": "Run and document lane B verification"
    },
    {
      "number": 18,
      "id": "B18-RECURSIVE-NEXT-BATCH",
      "status": "done",
      "title": "Mine next selected-identity batch"
    },
    {
      "number": 19,
      "id": "L12G-FOLLOWUP-ACID-ARROW-RAW-CORPUS-RECONCILIATION",
      "status": "blocked",
      "title": "Reconcile Acid Arrow RAW corpus"
    },
    {
      "number": 20,
      "id": "L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE",
      "status": "blocked",
      "title": "Repair Acid Arrow Surface damage shape"
    },
    {
      "number": 21,
      "id": "L12G-FOLLOWUP-ACID-ARROW-DELAYED-RUNTIME-SUPPORT",
      "status": "blocked",
      "title": "Promote Acid Arrow delayed runtime support"
    },
    {
      "number": 22,
      "id": "B19-ANTIMAGIC-FIELD-IDENTITY-WITNESS",
      "status": "done",
      "title": "Backfill Antimagic Field selected identity witness"
    },
    {
      "number": 23,
      "id": "B20-COUNTERSPELL-IDENTITY-WITNESS",
      "status": "ready-for-research",
      "title": "Backfill Counterspell selected identity witness"
    },
    {
      "number": 24,
      "id": "B21-DISPEL-MAGIC-IDENTITY-WITNESS",
      "status": "ready-for-research",
      "title": "Backfill Dispel Magic selected identity witness"
    },
    {
      "number": 25,
      "id": "B22-FIND-FAMILIAR-IDENTITY-WITNESS",
      "status": "ready-for-research",
      "title": "Backfill Find Familiar selected identity witness"
    },
    {
      "number": 26,
      "id": "B23-FIREBALL-IDENTITY-WITNESS",
      "status": "ready-for-research",
      "title": "Backfill Fireball selected identity witness"
    },
    {
      "number": 27,
      "id": "B24-LIGHTNING-BOLT-IDENTITY-WITNESS",
      "status": "ready-for-research",
      "title": "Backfill Lightning Bolt selected identity witness"
    },
    {
      "number": 28,
      "id": "B25-SHINING-SMITE-IDENTITY-WITNESS",
      "status": "ready-for-research",
      "title": "Backfill Shining Smite selected identity witness"
    },
    {
      "number": 29,
      "id": "B26-DEFERRED-IDENTITY-GAP-SEMANTICS",
      "status": "ready-for-research",
      "title": "Clarify deferred selected identity gap semantics"
    },
    {
      "number": 30,
      "id": "B27-CREATURE-SIZE-RULES-KERNEL-MAPPING",
      "status": "ready-for-research",
      "title": "Map creature size change profile to rules-kernel obligations"
    },
    {
      "number": 31,
      "id": "B28-WIZARD-SPELLBOOK-LEARNING-RULES-KERNEL-MAPPING",
      "status": "ready-for-research",
      "title": "Map Wizard spellbook learning profile to rules-kernel obligations"
    },
    {
      "number": 32,
      "id": "B29-LEVITATED-CREATURE-RULES-KERNEL-MAPPING",
      "status": "ready-for-research",
      "title": "Map levitated creature profile to rules-kernel obligations"
    },
    {
      "number": 33,
      "id": "B30-CLASS-FEATURE-PREPARED-SPELL-ACCESS-RULES-KERNEL-MAPPING",
      "status": "ready-for-research",
      "title": "Map class feature prepared spell access profile to rules-kernel obligations"
    },
    {
      "number": 34,
      "id": "B31-DRUID-CIRCLE-LAND-SPELL-ACCESS-RULES-KERNEL-MAPPING",
      "status": "ready-for-research",
      "title": "Map Druid Circle Land spell access profile to rules-kernel obligations"
    },
    {
      "number": 35,
      "id": "B32-DRAGONS-BREATH-CATALOG-ADMISSION",
      "status": "ready-for-research",
      "title": "Repair Dragon's Breath catalog admission"
    },
    {
      "number": 36,
      "id": "B33-RAY-OF-ENFEEBLEMENT-CATALOG-ADMISSION",
      "status": "ready-for-research",
      "title": "Repair Ray of Enfeeblement catalog admission"
    }
  ]
}
-->

Every Ralph prompt must include:

> Before starting, run `git log --oneline -1 master` and verify your HEAD
> matches. If not, run `git rebase master`.

Reviewer loop: RAW traceability, ubiquitous-language/domain-language,
architecture/connascence, and code review. Repeat until no reasonable findings
remain.

## Boundaries

Lane B owns:

- `scripts/unit-profile-coverage-*.cjs`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `plans/unit-profile-coverage/unit-matrix.json`
- `plans/unit-profile-coverage/UNIT_REPORT.md`
- focused MCP or runtime selected-identity tests when needed for evidence

Lane B must not:

- add new reducer mechanics;
- modify QNT generator-readiness status;
- use selected-identity evidence as a substitute for reusable rules-kernel MBT.

## DAG / Queue Order

| # | Task | Status | Depends | Notes |
|---:|---|---|---|---|
| 1 | B1-SELECTED-IDENTITY-GAP-REPORT - Generate selected-identity gap report | done | none | Generated matrix view `selectedIdentityReplayGaps` and `UNIT_REPORT.md` table. |
| 2 | B2-EVIDENCE-SCHEMA-CHECK - Tighten selected-identity evidence validation | done | none | Validate rows before hard gate. |
| 3 | B3-HARD-GATE-SELF-TEST - Add hard-gate self-test for missing identity evidence | done | none | Proves checker can fail on missing selected-identity evidence. |
| 4 | B4-CLASS-FEATURE-IDENTITY-BATCH-1 - Backfill class-feature identity evidence batch 1 | done | none | Barbarian/Bard/Cleric/Druid. |
| 5 | B5-CLASS-FEATURE-IDENTITY-BATCH-2 - Backfill class-feature identity evidence batch 2 | done | none | Monk/Ranger/Paladin. |
| 6 | B6-CLASS-FEATURE-IDENTITY-BATCH-3 - Backfill class-feature identity evidence batch 3 | done | none | Sorcerer/Warlock/Wizard. |
| 7 | B7-FEAT-IDENTITY-BATCH - Backfill feat identity evidence | done | none | Alert and Origin feat reachability. |
| 8 | B8-LEVEL1-SPELL-IDENTITY-BATCH - Backfill level-1 spell identity evidence | done | none | Remaining level-1 supported spell id was already covered by `light` selected-identity evidence. |
| 9 | B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH - Backfill level-2 damage spell identity evidence | done | none | Level-2 damage spell identity evidence added; Acid Arrow split to RAW/Surface/runtime follow-ups. |
| 10 | B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH - Backfill level-2 control spell identity evidence | done | none | Control/condition spells. |
| 11 | B11-LEVEL2-MOBILITY-SPELL-IDENTITY-BATCH - Backfill level-2 mobility spell identity evidence | done | none | Mobility/position spells. |
| 12 | B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH - Backfill level-2 protection spell identity evidence | done | none | Protection/restoration/buff spells. |
| 13 | B13-PROFILE-SUBSET-IDENTITY-DISPOSITIONS - Classify subset-supported identity expectations | done | none | Explicit non-applicable rows. |
| 14 | B14-FULL-SUPPORT-REPORT-PROJECTION - Project selected-identity gate into full-support reports | done | B1-B13 | Report-level metric. |
| 15 | B15-UNIT-REPORT-HONESTY-PASS - Refresh Unit report wording and metrics | done | B14 | Generated denominator audit for Unit/profile-fact group counts. |
| 16 | B16-MCP-SCENARIO-IDENTITY-SMOKE - Add MCP selected-identity smoke coverage | done | B14 | One narrow smoke scenario. |
| 17 | B17-END-TO-END-UNIT-VERIFICATION - Run and document lane B verification | done | B15,B16 | Unit coverage and typecheck. |
| 18 | B18-RECURSIVE-NEXT-BATCH - Mine next selected-identity batch | done | none | Appended 15 runnable follow-up tasks from generated selected-identity and metric-honesty gaps. |
| 19 | L12G-FOLLOWUP-ACID-ARROW-RAW-CORPUS-RECONCILIATION - Reconcile Acid Arrow RAW corpus | blocked | none | Owner-decision blocker: resolve the local SRD damage-timing contradiction before modeling Acid Arrow executable behavior. |
| 20 | L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE - Repair Acid Arrow Surface damage shape | blocked | L12G-FOLLOWUP-ACID-ARROW-RAW-CORPUS-RECONCILIATION | Make the approved Acid Arrow damage timing, miss branch, delayed damage, and slot scaling executable in Surface content/schema. |
| 21 | L12G-FOLLOWUP-ACID-ARROW-DELAYED-RUNTIME-SUPPORT - Promote Acid Arrow delayed runtime support | blocked | L12G-FOLLOWUP-ACID-ARROW-RAW-CORPUS-RECONCILIATION,L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE | Add promoted Quint/runtime parity for the approved Acid Arrow behavior. |
| 22 | B19-ANTIMAGIC-FIELD-IDENTITY-WITNESS - Backfill Antimagic Field selected identity witness | done | none | Added selected-identity MBT evidence for `antimagic_field`; generated selected-identity gaps no longer list it. |
| 23 | B20-COUNTERSPELL-IDENTITY-WITNESS - Backfill Counterspell selected identity witness | ready-for-research | none | Gap row: `counterspell`, supported-profile `spell.reaction-counterspell`, installed Surface record. |
| 24 | B21-DISPEL-MAGIC-IDENTITY-WITNESS - Backfill Dispel Magic selected identity witness | ready-for-research | none | Gap row: `dispel_magic`, profile-subset-supported `spell.invocation-ongoing-spell-ending`, installed Surface record. |
| 25 | B22-FIND-FAMILIAR-IDENTITY-WITNESS - Backfill Find Familiar selected identity witness | ready-for-research | none | Gap row: `find_familiar`, profile-subset-supported `spell.find-familiar-lifecycle`, installed Surface record. |
| 26 | B23-FIREBALL-IDENTITY-WITNESS - Backfill Fireball selected identity witness | ready-for-research | none | Gap row: `fireball`, profile-subset-supported `spell.invocation-damage-save-or-attack`, installed Surface record. |
| 27 | B24-LIGHTNING-BOLT-IDENTITY-WITNESS - Backfill Lightning Bolt selected identity witness | ready-for-research | none | Gap row: `lightning_bolt`, supported-profile `spell.invocation-damage-save-or-attack`, installed Surface record. |
| 28 | B25-SHINING-SMITE-IDENTITY-WITNESS - Backfill Shining Smite selected identity witness | ready-for-research | none | Gap row: `shining_smite`, supported-profile `spell.invocation-after-hit-damage-illumination`, installed Surface record. |
| 29 | B26-DEFERRED-IDENTITY-GAP-SEMANTICS - Clarify deferred selected identity gap semantics | ready-for-research | none | Gap rows: `mind_spike` and `thaumaturgy` have deferred-portion non-applicable dispositions but still appear as selected identity gaps; decide whether the generated view needs a separate deferred-visible bucket or whole-claim non-applicable classification. |
| 30 | B27-CREATURE-SIZE-RULES-KERNEL-MAPPING - Map creature size change profile to rules-kernel obligations | ready-for-research | none | Metric-honesty gap: `spell.invocation-creature-size-change` is unmapped in `rulesKernelProfileJoin`. |
| 31 | B28-WIZARD-SPELLBOOK-LEARNING-RULES-KERNEL-MAPPING - Map Wizard spellbook learning profile to rules-kernel obligations | ready-for-research | none | Metric-honesty gap: `character-creation.wizard-spellbook-learning-choice` is unmapped in `rulesKernelProfileJoin`. |
| 32 | B29-LEVITATED-CREATURE-RULES-KERNEL-MAPPING - Map levitated creature profile to rules-kernel obligations | ready-for-research | none | Metric-honesty gap: `spell.invocation-levitated-creature` is unmapped in `rulesKernelProfileJoin`. |
| 33 | B30-CLASS-FEATURE-PREPARED-SPELL-ACCESS-RULES-KERNEL-MAPPING - Map class feature prepared spell access profile to rules-kernel obligations | ready-for-research | none | Metric-honesty gap: `character-sheet.class-feature-prepared-spell-access` is unmapped in `rulesKernelProfileJoin`. |
| 34 | B31-DRUID-CIRCLE-LAND-SPELL-ACCESS-RULES-KERNEL-MAPPING - Map Druid Circle Land spell access profile to rules-kernel obligations | ready-for-research | none | Metric-honesty gap: `character-sheet.druid-circle-land-spell-access` is unmapped and leaves `druid_circle_of_the_land_spells` uncovered in `rulesKernelSupportedUnitCoverage`. |
| 35 | B32-DRAGONS-BREATH-CATALOG-ADMISSION - Repair Dragon's Breath catalog admission | ready-for-research | none | Metric-honesty gap: `dragons_breath` is supported-profile but remains `not-in-unit-catalog`; repair the catalog boundary without treating support as admission. |
| 36 | B33-RAY-OF-ENFEEBLEMENT-CATALOG-ADMISSION - Repair Ray of Enfeeblement catalog admission | ready-for-research | none | Metric-honesty gap: `ray_of_enfeeblement` is supported-profile but remains `not-in-unit-catalog`; repair the catalog boundary without treating support as admission. |

## Task Details

### Task 1 - B1-SELECTED-IDENTITY-GAP-REPORT - Generate selected-identity gap report

Status: `done`

Output: add a generated or checker-owned view that lists supported and
profile-subset-supported Units lacking selected-identity evidence. Use it to
drive later tasks. Do not hand-maintain the list in prose.

Acceptance: `pnpm unit-profile-coverage:check -- --write` and check pass.

Result: `unit-matrix.json` owns the `selectedIdentityReplayGaps` view, and
`UNIT_REPORT.md` renders it as "Selected Identity Replay Gaps".

### Task 2 - B2-EVIDENCE-SCHEMA-CHECK - Tighten selected-identity evidence validation

Status: `done`

Output: validate selected-identity evidence rows for real Unit ids, real source
test paths, and recognized evidence tags. Missing optional fields must not have
multiple meanings.

Acceptance: checker self-test covers malformed rows.

### Task 3 - B3-HARD-GATE-SELF-TEST - Add hard-gate self-test for missing identity evidence

Status: `done`

Output: add a self-test fixture proving the checker fails when a supported
executable Unit has neither selected-identity evidence nor an explicit
non-applicable disposition.

Acceptance: `pnpm unit-profile-coverage:check:self-test` passes.

Result: checker self-test covers a supported executable Unit with missing
`selected-identity-mbt` evidence and accepts the explicit
`selectedIdentityEvidenceDisposition: not-applicable` classification.

### Task 4 - B4-CLASS-FEATURE-IDENTITY-BATCH-1 - Backfill class-feature identity evidence batch 1

Status: `done`

Output: cover Barbarian, Bard, Cleric, and Druid supported class-feature Units
currently missing selected identity evidence. Prefer existing focused runtime
tests; add narrow tests only when no real reachability witness exists.

Acceptance: gap report count decreases and no new runtime behavior is invented.

Result: selected-identity evidence now covers `barbarian_danger_sense`,
`bard_expertise`, `bard_jack_of_all_trades`, `cleric_channel_divinity`,
`cleric_life_domain_spells`, `druid_circle_of_the_land_spells`,
`druid_wild_companion`, and `druid_wild_shape`.

### Task 5 - B5-CLASS-FEATURE-IDENTITY-BATCH-2 - Backfill class-feature identity evidence batch 2

Status: `done`

Output: cover Monk, Ranger, and Paladin supported class-feature Units currently
missing selected identity evidence.

Acceptance: gap report count decreases; profile-subset rows keep explicit
subset rationale.

Result: selected-identity evidence now covers `monk_monks_focus`,
`monk_unarmored_movement`, `monk_uncanny_metabolism`,
`paladin_fighting_style`, `paladin_oath_of_devotion_spells`,
`paladin_paladins_smite`, `ranger_deft_explorer`, `ranger_favored_enemy`, and
`ranger_fighting_style`.

### Task 6 - B6-CLASS-FEATURE-IDENTITY-BATCH-3 - Backfill class-feature identity evidence batch 3

Status: `done`

Output: cover Sorcerer, Warlock, and Wizard supported class-feature Units
currently missing selected identity evidence.

Acceptance: gap report count decreases; spell-slot/access state is not
duplicated.

Result: selected-identity evidence now covers `sorcerer_draconic_spells`,
`sorcerer_font_of_magic`, `sorcerer_metamagic`, `warlock_fiend_spells`,
`warlock_magical_cunning`, `warlock_pact_magic`, `wizard_evocation_savant`,
and `wizard_scholar`.

### Task 7 - B7-FEAT-IDENTITY-BATCH - Backfill feat identity evidence

Status: `done`

Output: cover Alert and SRD Origin feat reachability through catalog admission,
character creation, and any runtime handoff they already own.

Acceptance: evidence proves identity reaches the typed owner; no runtime code
branches on authored feat id for mechanics.

Result: selected-identity evidence now covers `alert` through SRD Origin feat
selection, Character Creation build refs, and the existing Character Battle
Initiative Proficiency handoff.

### Task 8 - B8-LEVEL1-SPELL-IDENTITY-BATCH - Backfill level-1 spell identity evidence

Status: `done`

Output: cover any remaining level-1 supported spell Units in the selected
identity gap report.

Acceptance: no level-1 supported spell remains missing identity evidence.

Result: no remaining level-1 supported spell Unit is missing selected-identity
evidence; `light` is covered by the existing level-1 spatial witness replay.

### Task 9 - B9-LEVEL2-DAMAGE-SPELL-IDENTITY-BATCH - Backfill level-2 damage spell identity evidence

Status: `done`

Output: cover level-2 damage/attack spell Units such as Acid Arrow, Flame
Blade, Flaming Sphere, Heat Metal, Scorching Ray, Shatter, Moonbeam, Spiritual
Weapon, Dragon's Breath, and Ray of Enfeeblement where missing.

Acceptance: gap report count decreases; evidence points to existing reducer or
selected-identity tests.

Result: selected-identity evidence now covers `dragons_breath`, `flame_blade`,
`flaming_sphere`, `heat_metal`, `moonbeam`, `ray_of_enfeeblement`,
`scorching_ray`, `shatter`, and `spiritual_weapon`; the selected-identity gap
report dropped from 43 to 34 rows. Acid Arrow remains out of this evidence batch
because the local SRD damage timing is contradictory and now has executable
follow-up tasks for RAW reconciliation, Surface shape repair, and runtime
support.

### Task 10 - B10-LEVEL2-CONTROL-SPELL-IDENTITY-BATCH - Backfill level-2 control spell identity evidence

Status: `done`

Output: cover level-2 control/condition spell Units such as Calm Emotions,
Darkness, Enthrall, Gust of Wind, Levitate, Spike Growth, Web, Charm Person, and
See Invisibility where missing.

Acceptance: gap report count decreases; table-owned adjudication remains
classified, not modeled as reducer state.

Result: selected-identity replay evidence added for `calm_emotions`,
`charm_person`, `darkness`, `enthrall`, `gust_of_wind`, `invisibility`,
`levitate`, `see_invisibility`, `spike_growth`, and `web`; the selected-identity
gap report dropped from 34 to 24 rows.

### Task 11 - B11-LEVEL2-MOBILITY-SPELL-IDENTITY-BATCH - Backfill level-2 mobility spell identity evidence

Status: `done`

Output: cover supported mobility/position spell Units such as Alter Self,
Invisibility, Misty Step, Fly, and Spider Climb where missing.

Acceptance: gap report count decreases; no geometry derivation is added.

Result: selected-identity replay evidence added for `alter_self`, `fly`,
`misty_step`, and `spider_climb`; `invisibility` was already covered by Task
10. The selected-identity gap report dropped from 24 to 20 rows.

### Task 12 - B12-LEVEL2-PROTECTION-SPELL-IDENTITY-BATCH - Backfill level-2 protection spell identity evidence

Status: `done`

Output: cover supported protection/restoration/buff spell Units such as Aid,
Barkskin, Blur, Enhance Ability, Enlarge/Reduce, Magic Weapon, Mirror Image,
Pass without Trace, Prayer of Healing, Warding Bond, and Continual Flame where
missing.

Acceptance: gap report count decreases; runtime-detached parts stay explicit.

### Task 13 - B13-PROFILE-SUBSET-IDENTITY-DISPOSITIONS - Classify subset-supported identity expectations

Status: `done`

Output: for profile-subset-supported Units where selected-identity evidence is
not meaningful for the closed/outside-runtime portion, add explicit
non-applicable disposition data instead of silently counting them green.

Acceptance: full-support reports distinguish "has selected identity witness"
from "identity witness not applicable to closed portion".

Result: profile-subset-supported deferred mechanics can now declare
`deferredMechanicsSelectedIdentityDisposition`, and generated full-support
reports distinguish `witness-present` from
`missing-witness-deferred-not-applicable` in selected-identity replay
accounting.

### Task 14 - B14-FULL-SUPPORT-REPORT-PROJECTION - Project selected-identity gate into full-support reports

Status: `done`

Output: update `LEVEL1_FULL_SUPPORT.md` and `LEVEL1_2_FULL_SUPPORT.md` so their
claim gate includes selected-identity readiness as a separate layer on top of
strict runtime/profile and authored product readiness.

Acceptance: generated JSON exposes counts; prose does not flatten the layers
into a single misleading 100%.

Result: full-support JSON now exposes `selectedIdentityReadiness` counts and
blocker rows, and the generated Level 1 / Level 1-2 reports render selected
identity readiness as its own claim-gate layer separate from strict closure and
SRD authored product readiness.

### Task 15 - B15-UNIT-REPORT-HONESTY-PASS - Refresh Unit report wording and metrics

Status: `done`

Output: revise `UNIT_REPORT.md` wording so background/feat/spell/class-feature
groups are counted by Units and profile facts, not by arbitrary prose weight.

Acceptance: generated report makes denominator semantics explicit.

Result: `unit-matrix.json` now includes `unitGroupDenominatorAudit`, and
`UNIT_REPORT.md` renders explicit background/feat/spell/class-feature
denominators for installed Units, executable Units, supported/profile-subset
Units, profile facts, and selected-identity replay witnesses.

### Task 16 - B16-MCP-SCENARIO-IDENTITY-SMOKE - Add MCP selected-identity smoke coverage

Status: `done`

Output: add one focused MCP acceptance smoke that creates a supported SRD level
1-2 character and proves selected Unit identity reaches battle or sheet output.

Acceptance: MCP typecheck and focused test pass.

Result: MCP vertical acceptance now creates a level-1 Wizard with selected
`light`, starts a battle, fills the Light object target hole, and proves the
selected spell identity reaches emitted battle light output.

### Task 17 - B17-END-TO-END-UNIT-VERIFICATION - Run and document lane B verification

Status: `done`

Output: run unit-profile write/check, checker self-test when changed, focused
tests added by this lane, `pnpm typecheck` when TypeScript changed, and
`git diff --check`.

Acceptance: generated artifacts are fresh and this plan records only durable
findings.

### Task 18 - B18-RECURSIVE-NEXT-BATCH - Mine next selected-identity batch

Status: `done`

Output: append at least 12 new atomic tasks for any remaining selected-identity
or metric-honesty gaps. If fewer than 12 remain, split by Unit group only when
that produces real independent work.

Acceptance: do not mark done unless at least 12 new runnable tasks were added
or the generated gap report proves exhaustion.

Result: generated matrix review found 9 selected-identity replay gap rows
(`antimagic_field`, `counterspell`, `dispel_magic`, `find_familiar`,
`fireball`, `lightning_bolt`, `mind_spike`, `shining_smite`, and
`thaumaturgy`), 5 unmapped rules-kernel profiles, 1 rules-kernel supported Unit
join gap, and 2 supported-profile Units not admitted to the Unit catalog.
Appended 15 runnable follow-up tasks: 7 selected-identity witness tasks, 1
deferred selected-identity metric-semantics task, 5 rules-kernel mapping tasks,
and 2 catalog-admission repair tasks.

Verification completed:
- `jq '.selectedIdentityReplayGaps.rowCount' plans/unit-profile-coverage/unit-matrix.json`
  returned `9`.
- `jq -r '.selectedIdentityReplayGaps.rows[] | [.unitId, .selectedIdentity.status, .support.tag] | @tsv' plans/unit-profile-coverage/unit-matrix.json`
  returned `antimagic_field`, `counterspell`, `dispel_magic`,
  `find_familiar`, `fireball`, `lightning_bolt`, `mind_spike`,
  `shining_smite`, and `thaumaturgy`.
- `jq -r '.rulesKernelProfileJoin.profiles[] | select(.joinStatus != "covered") | [.profileId, .profileKind, .joinStatus] | @tsv' plans/unit-profile-coverage/unit-matrix.json`
  returned `spell.invocation-creature-size-change`,
  `character-creation.wizard-spellbook-learning-choice`,
  `spell.invocation-levitated-creature`,
  `character-sheet.class-feature-prepared-spell-access`, and
  `character-sheet.druid-circle-land-spell-access`, all `unmapped`.
- `jq -r '.rulesKernelProfileJoin.supportedUnitJoin.units[] | select(.joinStatus != "covered") | [.unitId, .joinStatus, ([.profiles[] | .profileId + ":" + .joinStatus] | join(","))] | @tsv' plans/unit-profile-coverage/unit-matrix.json`
  returned `druid_circle_of_the_land_spells` joined only through unmapped
  `character-sheet.druid-circle-land-spell-access`.
- `jq -r '.units[] | select((.claim.tag == "supported-profile" or .claim.tag == "profile-subset-supported") and (.catalogAdmission.status != "installed")) | [.unitId, .claim.tag, .catalogAdmission.status] | @tsv' plans/unit-profile-coverage/unit-matrix.json`
  returned `dragons_breath` and `ray_of_enfeeblement`, both
  `supported-profile` and `not-in-unit-catalog`.

### Task 19 - L12G-FOLLOWUP-ACID-ARROW-RAW-CORPUS-RECONCILIATION - Reconcile Acid Arrow RAW corpus

Status: `blocked`

Blocker Type: `owner-decision`

Blocker Detail: owner must approve an Acid Arrow RAW corpus correction or an
`ASSUMPTIONS.md` entry that resolves the local damage-timing contradiction.

Output: resolve the local SRD Acid Arrow damage contradiction by either
correcting the local corpus or adding an owner-approved `ASSUMPTIONS.md` entry
that explicitly identifies whether initial hit damage exists, how miss-only half
damage is derived, which damage occurs at the end of the target's next turn, and
how slot scaling applies.

Acceptance: owner-approved RAW corpus correction or `ASSUMPTIONS.md` entry makes
the initial/later/miss damage relationship modelable without inference from
contradictory prose.

### Task 20 - L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE - Repair Acid Arrow Surface damage shape

Status: `blocked`

Output: after RAW reconciliation, replace Acid Arrow's lossy mechanics with a
lossless SRD Surface shape for the approved damage timing, miss branch,
end-of-target-next-turn damage, and slot scaling without storing miss damage as
an independently fixed approximation.

Acceptance: Acid Arrow Dhall/JSON content, and schema/tracer support if needed,
represent the approved initial/later/miss damage relationships as executable
facts that battle-runtime can project without duplicating or reinterpreting
spell damage state.

### Task 21 - L12G-FOLLOWUP-ACID-ARROW-DELAYED-RUNTIME-SUPPORT - Promote Acid Arrow delayed runtime support

Status: `blocked`

Output: after RAW reconciliation and Surface repair, promote Acid Arrow as a
level-2 prepared Spell Invocation that spends the Magic Action and Spell Slot,
resolves a ranged Spell Attack, applies only approved immediate hit or miss
damage, stores approved delayed Acid damage for the end of the target's next
turn where sourced, scales approved damage amounts by slot level, and cleans up
the Spell Effect occurrence.

Acceptance: supported-profile Unit claim, deterministic admission/projection
evidence, focused runtime tests, and promoted Quint/runtime parity cover the
approved Acid Arrow hit, miss, delayed target-turn damage, slot scaling,
resource spending, and cleanup behavior.

### Task 22 - B19-ANTIMAGIC-FIELD-IDENTITY-WITNESS - Backfill Antimagic Field selected identity witness

Status: `done`

Output: add checker-readable `selected-identity-mbt` evidence, or a stricter
explicit non-applicable classification if research proves the replay boundary
cannot bind selected Unit identity, for `antimagic_field`.

Acceptance: `selectedIdentityReplayGaps` no longer reports
`antimagic_field` as a plain missing witness; any non-applicable disposition
names the runtime owner for the non-replayed portion.

Result: `antimagic_field` now has checker-readable `selected-identity-mbt`
evidence tied to `antimagic-field-ongoing-suppression.mbt.test.ts`, with
deterministic replay rows for ordinary suppression, artifact/deity exclusion,
and concentration-end restoration. The generated selected-identity gap report no
longer lists `antimagic_field`.

### Task 23 - B20-COUNTERSPELL-IDENTITY-WITNESS - Backfill Counterspell selected identity witness

Status: `ready-for-research`

Output: prove selected `counterspell` identity reaches the reaction spell owner
or add the narrow selected-identity smoke needed to make that handoff
checker-readable.

Acceptance: `counterspell` has `selected-identity-mbt` evidence tied to a real
test path, and the evidence does not substitute for the reusable
`spell.reaction-counterspell` rules-kernel proof.

### Task 24 - B21-DISPEL-MAGIC-IDENTITY-WITNESS - Backfill Dispel Magic selected identity witness

Status: `ready-for-research`

Output: prove selected `dispel_magic` identity reaches the ongoing-spell ending
entrypoint, or explicitly classify the non-replayed table-owned portion without
claiming reducer support.

Acceptance: `selectedIdentityReplayGaps` no longer reports `dispel_magic` as a
plain missing witness, and any added evidence references an existing or focused
test that exercises the selected Unit identity.

### Task 25 - B22-FIND-FAMILIAR-IDENTITY-WITNESS - Backfill Find Familiar selected identity witness

Status: `ready-for-research`

Output: prove selected `find_familiar` identity reaches the lifecycle owner
already claimed by `spell.find-familiar-lifecycle`, or classify exactly why the
closed portion is outside replay.

Acceptance: the generated selected-identity gap row for `find_familiar` is
cleared or converted to an explicit non-applicable state without adding
companion AI or table-routing mechanics.

### Task 26 - B23-FIREBALL-IDENTITY-WITNESS - Backfill Fireball selected identity witness

Status: `ready-for-research`

Output: prove selected `fireball` identity reaches the damage save-or-attack
runtime entrypoint through existing or focused promoted runtime coverage.

Acceptance: `fireball` has checker-readable `selected-identity-mbt` evidence,
and the evidence remains separate from generic
`spell.invocation-damage-save-or-attack` parity coverage.

### Task 27 - B24-LIGHTNING-BOLT-IDENTITY-WITNESS - Backfill Lightning Bolt selected identity witness

Status: `ready-for-research`

Output: prove selected `lightning_bolt` identity reaches the supported
damage-save runtime entrypoint.

Acceptance: `lightning_bolt` has checker-readable `selected-identity-mbt`
evidence tied to a focused or existing promoted runtime test.

### Task 28 - B25-SHINING-SMITE-IDENTITY-WITNESS - Backfill Shining Smite selected identity witness

Status: `ready-for-research`

Output: prove selected `shining_smite` identity reaches the after-hit damage
and illumination rider runtime entrypoint.

Acceptance: `shining_smite` has checker-readable `selected-identity-mbt`
evidence; no new smite reducer behavior is added unless a separate promoted
runtime task owns it.

### Task 29 - B26-DEFERRED-IDENTITY-GAP-SEMANTICS - Clarify deferred selected identity gap semantics

Status: `ready-for-research`

Output: decide and implement the report/checker treatment for
`missing-witness-deferred-not-applicable` rows such as `mind_spike` and
`thaumaturgy`: either keep them visible in a separate deferred-visible bucket,
or move qualifying whole-claim cases to the existing not-applicable exclusion.

Acceptance: `UNIT_REPORT.md`, `unit-matrix.json`, and metric prose no longer
make deferred non-applicable rows look like ordinary missing replay witnesses.

### Task 30 - B27-CREATURE-SIZE-RULES-KERNEL-MAPPING - Map creature size change profile to rules-kernel obligations

Status: `ready-for-research`

Output: map `spell.invocation-creature-size-change` to the correct
rules-kernel obligation, or split the profile if the current name conflates
distinct rule owners.

Acceptance: `rulesKernelProfileJoinCoverage` no longer lists
`spell.invocation-creature-size-change` as unmapped, and any split preserves
single-source profile membership for affected Units.

### Task 31 - B28-WIZARD-SPELLBOOK-LEARNING-RULES-KERNEL-MAPPING - Map Wizard spellbook learning profile to rules-kernel obligations

Status: `ready-for-research`

Output: map `character-creation.wizard-spellbook-learning-choice` to a
character-creation or character-sheet rules-kernel obligation after checking the
Wizard spellbook SRD text and ubiquitous language.

Acceptance: `rulesKernelProfileJoinCoverage` no longer lists the Wizard
spellbook learning profile as unmapped, and selected spellbook facts are not
duplicated across creation and sheet owners.

### Task 32 - B29-LEVITATED-CREATURE-RULES-KERNEL-MAPPING - Map levitated creature profile to rules-kernel obligations

Status: `ready-for-research`

Output: map `spell.invocation-levitated-creature` to the existing movement,
condition, or table-caller rules-kernel obligation, or document the missing
obligation as a new follow-up if no durable owner exists.

Acceptance: `rulesKernelProfileJoinCoverage` no longer lists
`spell.invocation-levitated-creature` as unmapped unless a new blocked owner
task is added with concrete rationale.

### Task 33 - B30-CLASS-FEATURE-PREPARED-SPELL-ACCESS-RULES-KERNEL-MAPPING - Map class feature prepared spell access profile to rules-kernel obligations

Status: `ready-for-research`

Output: map `character-sheet.class-feature-prepared-spell-access` to the
character-sheet spell-access rules-kernel obligation after checking the
class-feature prepared-spell source shape.

Acceptance: `rulesKernelProfileJoinCoverage` no longer lists
`character-sheet.class-feature-prepared-spell-access` as unmapped, and the
mapping does not duplicate per-class spell access state.

### Task 34 - B31-DRUID-CIRCLE-LAND-SPELL-ACCESS-RULES-KERNEL-MAPPING - Map Druid Circle Land spell access profile to rules-kernel obligations

Status: `ready-for-research`

Output: map `character-sheet.druid-circle-land-spell-access` to a
rules-kernel obligation and confirm `druid_circle_of_the_land_spells` joins
through that profile.

Acceptance: both `rulesKernelProfileJoinCoverage` and
`rulesKernelSupportedUnitCoverage` clear the Druid Circle Land spell-access gap
without adding a parallel Druid-only spell-access state table.

### Task 35 - B32-DRAGONS-BREATH-CATALOG-ADMISSION - Repair Dragon's Breath catalog admission

Status: `ready-for-research`

Output: repair the Unit catalog/admission boundary for `dragons_breath`, which
is currently supported-profile but `not-in-unit-catalog`.

Acceptance: `dragons_breath` appears as installed in the Unit catalog/admission
view, with provenance and structured input kept distinct from runtime support
evidence.

### Task 36 - B33-RAY-OF-ENFEEBLEMENT-CATALOG-ADMISSION - Repair Ray of Enfeeblement catalog admission

Status: `ready-for-research`

Output: repair the Unit catalog/admission boundary for `ray_of_enfeeblement`,
which is currently supported-profile but `not-in-unit-catalog`.

Acceptance: `ray_of_enfeeblement` appears as installed in the Unit
catalog/admission view, with catalog admission not inferred from runtime
support alone.

## Verification

- Reviewer-loop convergence: after implementation, run RAW traceability,
  ubiquitous-language/domain-language, architecture/connascence, and code-review
  passes; fix every reasonable finding and repeat until no reasonable findings
  remain.
- RAW/ubiquitous-language check: before implementing any modeled rule, read the
  relevant `.references/srd-5.2.1/` passage and `UBIQUITOUS_LANGUAGE.md`, then
  verify the modeled behavior traces to that source text.
- `pnpm unit-profile-coverage:check -- --write`
- `pnpm unit-profile-coverage:check`
- `pnpm unit-profile-coverage:check:self-test` when checker code changes
- Focused tests added by the task
- `pnpm typecheck` when TypeScript changes
- `git diff --check`

## Findings

- Current generated support claims are closed for Level 1 and Level 1-2, but
  selected-identity evidence is not yet a hard denominator layer.
