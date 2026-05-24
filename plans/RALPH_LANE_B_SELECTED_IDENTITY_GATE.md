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
      "status": "ready-for-implementation-after-light-research",
      "title": "Run and document lane B verification"
    },
    {
      "number": 18,
      "id": "B18-RECURSIVE-NEXT-BATCH",
      "status": "blocked",
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
| 17 | B17-END-TO-END-UNIT-VERIFICATION - Run and document lane B verification | ready-for-implementation-after-light-research | B15,B16 | Unit coverage and typecheck. |
| 18 | B18-RECURSIVE-NEXT-BATCH - Mine next selected-identity batch | blocked | B17 | Must append >=12 tasks or prove exhaustion. |
| 19 | L12G-FOLLOWUP-ACID-ARROW-RAW-CORPUS-RECONCILIATION - Reconcile Acid Arrow RAW corpus | blocked | owner RAW decision | Resolve the local SRD damage-timing contradiction before modeling Acid Arrow executable behavior. |
| 20 | L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE - Repair Acid Arrow Surface damage shape | blocked | L12G-FOLLOWUP-ACID-ARROW-RAW-CORPUS-RECONCILIATION | Make the approved Acid Arrow damage timing, miss branch, delayed damage, and slot scaling executable in Surface content/schema. |
| 21 | L12G-FOLLOWUP-ACID-ARROW-DELAYED-RUNTIME-SUPPORT - Promote Acid Arrow delayed runtime support | blocked | L12G-FOLLOWUP-ACID-ARROW-RAW-CORPUS-RECONCILIATION,L12G-FOLLOWUP-ACID-ARROW-SURFACE-DAMAGE-SHAPE | Add promoted Quint/runtime parity for the approved Acid Arrow behavior. |

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

Status: `ready-for-implementation-after-light-research`

Output: run unit-profile write/check, checker self-test when changed, focused
tests added by this lane, `pnpm typecheck` when TypeScript changed, and
`git diff --check`.

Acceptance: generated artifacts are fresh and this plan records only durable
findings.

### Task 18 - B18-RECURSIVE-NEXT-BATCH - Mine next selected-identity batch

Status: `blocked`

Output: append at least 12 new atomic tasks for any remaining selected-identity
or metric-honesty gaps. If fewer than 12 remain, split by Unit group only when
that produces real independent work.

Acceptance: do not mark done unless at least 12 new runnable tasks were added
or the generated gap report proves exhaustion.

### Task 19 - L12G-FOLLOWUP-ACID-ARROW-RAW-CORPUS-RECONCILIATION - Reconcile Acid Arrow RAW corpus

Status: `blocked`

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

## Verification

- `pnpm unit-profile-coverage:check -- --write`
- `pnpm unit-profile-coverage:check`
- `pnpm unit-profile-coverage:check:self-test` when checker code changes
- Focused tests added by the task
- `pnpm typecheck` when TypeScript changes
- `git diff --check`

## Findings

- Current generated support claims are closed for Level 1 and Level 1-2, but
  selected-identity evidence is not yet a hard denominator layer.
