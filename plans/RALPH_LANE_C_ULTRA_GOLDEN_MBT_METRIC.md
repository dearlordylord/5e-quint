# Ralph Lane C - Ultra-Golden MBT Metric

Purpose: make the stronger "ultra-golden" claim measurable without changing
the existing level 1/2 support claim. This lane owns aggregate gates and focused
MBT/scenario evidence for already-supported behavior. It must not implement new
SRD feature support or rewrite battle semantics.

Hard workload rule: this lane is underloaded if it completes before at least 15
tasks land. The recursive task must append at least 12 new atomic runnable tasks
or prove from checker-owned artifacts that no metric or MBT evidence work
remains.

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "C1-ULTRA-GOLDEN-DEFINITION-GATE",
      "status": "done",
      "title": "Define the ultra-golden aggregate gate"
    },
    {
      "number": 2,
      "id": "C2-LEVEL12-QNT-MBT-JOIN-REPORT",
      "status": "done",
      "title": "Report level 1-2 support to QNT/MBT evidence join"
    },
    {
      "number": 3,
      "id": "C3-MCP-LEVEL12-SCENARIO-GATE",
      "status": "done",
      "title": "Gate level 1-2 MCP scenario evidence"
    },
    {
      "number": 4,
      "id": "C4-SELECTED-IDENTITY-EVIDENCE-AUDIT",
      "status": "done",
      "title": "Audit selected-identity evidence against supported Units"
    },
    {
      "number": 5,
      "id": "C5-UNIT-PROFILE-RULES-KERNEL-GAP-REPORT",
      "status": "done",
      "title": "Report supported profile rules-kernel gaps"
    },
    {
      "number": 6,
      "id": "C6-MBT-WITNESS-KIND-NORMALIZATION",
      "status": "done",
      "title": "Normalize MBT/runtime witness kinds in the metric"
    },
    {
      "number": 7,
      "id": "C7-SPELL-PROCEDURE-MBT-EVIDENCE-GATE",
      "status": "done",
      "title": "Gate spell procedure MBT evidence for supported profiles"
    },
    {
      "number": 8,
      "id": "C8-FEATURE-PROCEDURE-MBT-EVIDENCE-GATE",
      "status": "done",
      "title": "Gate feature procedure MBT evidence for supported profiles"
    },
    {
      "number": 9,
      "id": "C9-CHARACTER-CREATION-MCP-EVIDENCE",
      "status": "done",
      "title": "Add character-creation MCP evidence rows"
    },
    {
      "number": 10,
      "id": "C10-CHARACTER-SHEET-MCP-EVIDENCE",
      "status": "done",
      "title": "Add character-sheet MCP evidence rows"
    },
    {
      "number": 11,
      "id": "C11-BATTLE-MCP-EVIDENCE",
      "status": "done",
      "title": "Add battle MCP evidence rows"
    },
    {
      "number": 12,
      "id": "C12-LEVEL12-ULTRA-GOLDEN-SUMMARY",
      "status": "done",
      "title": "Publish level 1-2 ultra-golden summary"
    },
    {
      "number": 13,
      "id": "C13-MBT-CONTEXT-BUDGET-CHECK",
      "status": "done",
      "title": "Check MBT plan context budget and stale references"
    },
    {
      "number": 14,
      "id": "C14-RUST-MIGRATION-QUEUE-DRY",
      "status": "done",
      "title": "Dry the Rust migration queue entrypoints"
    },
    {
      "number": 15,
      "id": "C15-ULTRA-GOLDEN-CHECKER-REGRESSION",
      "status": "done",
      "title": "Add ultra-golden checker regression coverage"
    },
    {
      "number": 16,
      "id": "C16-END-TO-END-ULTRA-GOLDEN-VERIFY",
      "status": "done",
      "title": "Verify ultra-golden gate and focused MCP/MBT checks"
    },
    {
      "number": 17,
      "id": "C17-RECURSIVE-NEXT-BATCH",
      "status": "done",
      "title": "Mine next ultra-golden metric or MBT batch"
    },
    {
      "number": 18,
      "id": "C18-GENERATOR-READINESS-COMMAND-OPTION",
      "status": "done",
      "title": "Classify Command option generator readiness"
    },
    {
      "number": 19,
      "id": "C19-GENERATOR-READINESS-SANCTUARY",
      "status": "done",
      "title": "Classify Sanctuary targeting generator readiness"
    },
    {
      "number": 20,
      "id": "C20-GENERATOR-READINESS-AFTER-HIT-RIDERS",
      "status": "done",
      "title": "Classify after-hit damage rider generator readiness"
    },
    {
      "number": 21,
      "id": "C21-GENERATOR-READINESS-SPELL-ATTACK-SEQUENCES",
      "status": "done",
      "title": "Classify chained spell attack generator readiness"
    },
    {
      "number": 22,
      "id": "C22-GENERATOR-READINESS-CONDITION-IMMUNITY-THP",
      "status": "done",
      "title": "Classify condition-immunity temporary-hit-point generator readiness"
    },
    {
      "number": 23,
      "id": "C23-GENERATOR-READINESS-CREATURE-TYPE-PROTECTION",
      "status": "done",
      "title": "Classify creature-type protection generator readiness"
    },
    {
      "number": 24,
      "id": "C24-GENERATOR-READINESS-MAKE-STABLE",
      "status": "done",
      "title": "Classify Make Stable generator readiness"
    },
    {
      "number": 25,
      "id": "C25-GENERATOR-READINESS-MARKED-DAMAGE-RIDER",
      "status": "done",
      "title": "Classify marked damage rider generator readiness"
    },
    {
      "number": 26,
      "id": "C26-GENERATOR-READINESS-REACTION-CASTING-TIME",
      "status": "done",
      "title": "Classify reaction casting-time generator readiness"
    },
    {
      "number": 27,
      "id": "C27-GENERATOR-READINESS-ROLL-MODIFIERS",
      "status": "ready-for-research",
      "title": "Classify roll modifier active-effect generator readiness"
    },
    {
      "number": 28,
      "id": "C28-GENERATOR-READINESS-SAVE-GATED-SPELLS",
      "status": "ready-for-research",
      "title": "Classify save-gated condition generator readiness"
    },
    {
      "number": 29,
      "id": "C29-GENERATOR-READINESS-SCALAR-BUFFS",
      "status": "ready-for-research",
      "title": "Classify scalar buff active-effect generator readiness"
    },
    {
      "number": 30,
      "id": "C30-GENERATOR-READINESS-SLEEP-REPEAT-SAVE",
      "status": "ready-for-research",
      "title": "Classify Sleep repeat-save generator readiness"
    },
    {
      "number": 31,
      "id": "C31-GENERATOR-READINESS-WEAPON-HOSTED-RIDERS",
      "status": "ready-for-research",
      "title": "Classify weapon-hosted spell rider generator readiness"
    },
    {
      "number": 32,
      "id": "C32-GENERATOR-READINESS-INDEPENDENT-ATTACK-SEQUENCE",
      "status": "ready-for-research",
      "title": "Classify independent spell attack generator readiness"
    },
    {
      "number": 33,
      "id": "C33-GENERATOR-READINESS-SAVE-GATED-ATTACK-ADVANTAGE",
      "status": "ready-for-research",
      "title": "Classify save-gated attack-advantage generator readiness"
    },
    {
      "number": 34,
      "id": "C34-GENERATOR-READINESS-BATCH-VERIFY",
      "status": "ready-for-research",
      "title": "Verify generator-readiness classification batch"
    }
  ]
}
-->

Every Ralph task prompt must include its task-base check: compare the declared
base ref and `HEAD`, then verify the declared Base SHA is an ancestor of
`HEAD`. If the ancestor check fails, stop and report the branch-base mismatch.
Do not use this lane plan as authority to rebase a task worktree.

Reviewer loop: RAW traceability, ubiquitous-language/domain-language,
architecture/connascence, and code review. Repeat until no reasonable findings
remain.

## Context Budget

Read only:

- this plan;
- `AGENTS.md`;
- `docs/adr/0001-forest-of-qnt-slices.md` decision/consequences only;
- `plans/QNT_COVERAGE_PROGRAM.md`;
- `plans/rules-kernel-coverage/README.md`;
- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`;
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`;
- relevant checker scripts and package-local tests for the current task.

Do not read historical Ralph lane transcripts. If context is missing, derive it
from checker-owned JSON/JSONL artifacts instead of old work logs.

## Boundaries

Lane C owns:

- aggregate ultra-golden metric/report/checker work;
- focused MCP scenario coverage for already-supported level 1/2 SRD flows;
- focused MBT witness accounting for already-modeled obligations;
- context-budget cleanup for MBT/rules-kernel plans.

Lane C must not:

- add or change SRD runtime feature behavior;
- change Unit support admission policy;
- split QNT semantic cores owned by Lane A or B;
- run battle MBT for exploratory questions.

## Verification

Run as applicable:

- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check`
- focused MCP tests changed by the task
- focused package-local MBT or QNT tests changed by the task
- `git diff --check`

If an MBT run is needed, follow the repo MBT protocol in `AGENTS.md`.

## Tasks

### Task 1 - C1-ULTRA-GOLDEN-DEFINITION-GATE - Define the ultra-golden aggregate gate

Status: `done`

Input: existing level 1 and level 1-2 support reports plus rules-kernel
coverage reports.

Output: a checker-owned definition that distinguishes support completeness,
QNT/generator readiness, MBT/parity evidence, and MCP scenario evidence.

Acceptance: metric output cannot report "ultra-golden 100%" unless each layer
is explicitly complete.

### Task 2 - C2-LEVEL12-QNT-MBT-JOIN-REPORT - Report level 1-2 support to QNT/MBT evidence join

Status: `done`

Output: generated report joining level 1-2 supported profiles to
rules-kernel obligations, QNT owners, and parity witnesses.

Acceptance: open gaps are explicit rows, not hidden percentages.

### Task 3 - C3-MCP-LEVEL12-SCENARIO-GATE - Gate level 1-2 MCP scenario evidence

Status: `done`

Output: MCP scenario evidence is represented as its own layer and checked by a
focused package-local test command.

Acceptance: MCP evidence failure cannot be mistaken for support-profile failure.

### Task 4 - C4-SELECTED-IDENTITY-EVIDENCE-AUDIT - Audit selected-identity evidence against supported Units

Status: `done`

Output: audit rows for supported Units whose selected-identity evidence exists
but lacks an ultra-golden join to QNT/MBT or MCP evidence.

Acceptance: no authored identity dispatch is introduced.

### Task 5 - C5-UNIT-PROFILE-RULES-KERNEL-GAP-REPORT - Report supported profile rules-kernel gaps

Status: `done`

Output: supported profile rows missing rules-kernel obligation joins are
reported with owning follow-up task ids.

Acceptance: `unit-profile-coverage:check` and `rules-kernel-coverage:check`
remain green.

### Task 6 - C6-MBT-WITNESS-KIND-NORMALIZATION - Normalize MBT/runtime witness kinds in the metric

Status: `done`

Output: documented and checked witness-kind vocabulary distinguishing focused
MBT, deterministic QNT replay, runtime test, and MCP scenario evidence.

Acceptance: invalid witness kind fails the checker.

### Task 7 - C7-SPELL-PROCEDURE-MBT-EVIDENCE-GATE - Gate spell procedure MBT evidence for supported profiles

Status: `done`

Output: spell procedure supported profiles have explicit QNT/MBT evidence rows
or gap rows.

Acceptance: no new spell behavior; checker/report only.

### Task 8 - C8-FEATURE-PROCEDURE-MBT-EVIDENCE-GATE - Gate feature procedure MBT evidence for supported profiles

Status: `done`

Output: unit-feature supported profiles have explicit QNT/MBT evidence rows or
gap rows.

Acceptance: coordinates with Lane A output without duplicating its work.

### Task 9 - C9-CHARACTER-CREATION-MCP-EVIDENCE - Add character-creation MCP evidence rows

Status: `done`

Output: character creation evidence rows for level 1-2 SRD flows.

Acceptance: focused MCP test green.

### Task 10 - C10-CHARACTER-SHEET-MCP-EVIDENCE - Add character-sheet MCP evidence rows

Status: `done`

Output: character sheet evidence rows for level 1-2 SRD flows.

Acceptance: focused MCP test green.

### Task 11 - C11-BATTLE-MCP-EVIDENCE - Add battle MCP evidence rows

Status: `done`

Output: battle MCP evidence rows for level 1-2 SRD flows.

Acceptance: focused MCP test green; slow tests get explicit timeout if needed.

### Task 12 - C12-LEVEL12-ULTRA-GOLDEN-SUMMARY - Publish level 1-2 ultra-golden summary

Status: `done`

Output: concise generated summary of level 1-2 support, QNT/generator,
MBT/parity, and MCP layers.

Acceptance: summary cannot hide non-complete layers behind a single percent.

### Task 13 - C13-MBT-CONTEXT-BUDGET-CHECK - Check MBT plan context budget and stale references

Status: `done`

Input: QNT/MBT planning docs referenced by active Ralph lanes.

Output: remove obsolete references and keep durable context in a compact source
of truth.

Acceptance: no active task requires reading stale lane histories.

### Task 14 - C14-RUST-MIGRATION-QUEUE-DRY - Dry the Rust migration queue entrypoints

Status: `done`

Input: `plans/QNT_COVERAGE_PROGRAM.md` and rules-kernel readiness artifacts.

Output: one compact source of truth for Rust migration/generator readiness
entrypoints, with stale duplicated MBT plans deleted or redirected.

Acceptance: Ralph task context stays bounded.

Result:

- Centralized Rust migration and generator-readiness entrypoints in
  `plans/QNT_COVERAGE_PROGRAM.md`.
- Redirected stale historical QNT/QMBT plans to checked artifacts and active
  Ralph lane plans instead of leaving them as runnable queues.

### Task 15 - C15-ULTRA-GOLDEN-CHECKER-REGRESSION - Add ultra-golden checker regression coverage

Status: `done`

Output: checker self-test proving incomplete layers are reported as incomplete.

Acceptance: regression fails before the new gate and passes after.

Result:

- Added a checker self-test fixture proving incomplete ultra-golden scopes report
  support completeness, QNT/generator readiness, MBT/parity evidence, and MCP
  scenario evidence as blocked while an adjacent complete scope still passes.

### Task 16 - C16-END-TO-END-ULTRA-GOLDEN-VERIFY - Verify ultra-golden gate and focused MCP/MBT checks

Status: `done`

Output: run the focused commands required by changed checker/test files and
record only durable findings.

Acceptance: checker green; changed focused tests green.

Result:

- Verified the ultra-golden checker self-test, MCP scenario evidence tests, unit
  profile coverage gate, and rules-kernel coverage gate are green at the Task 16
  integration point.
- No source, generated, runtime, Quint, or MBT behavior changes were needed for
  this verification-only task.

### Task 17 - C17-RECURSIVE-NEXT-BATCH - Mine next ultra-golden metric or MBT batch

Status: `done`

Input: current metric reports and checker-owned artifacts after C16.

Output: append at least 12 new atomic runnable tasks or prove from generated
reports that no ultra-golden metric/MBT work remains.

Acceptance: plan has new runnable tasks or a concise durable closure note.

Result:

- Mined the checker-owned C17 artifacts. `ULTRA_GOLDEN_GATE.md` and
  `LEVEL1_2_ULTRA_GOLDEN_SUMMARY.md` show support completeness,
  MBT/parity evidence, and MCP scenario evidence passing for level 1 and
  level 1-2, while QNT/generator readiness remains blocked with 27 scoped
  rows.
- The remaining scoped blockers are 11 `fixture-bound` rows that already point
  to Lane A/B follow-up tasks, plus 16 `not-assessed` generator-readiness rows
  with owner paths but no readiness classification. The next Lane C work is
  therefore metric/readiness classification, not new SRD runtime support or a
  new MBT evidence batch.
- Appended C18-C33: 16 atomic classification tasks over the 16 unassessed
  scoped obligations, plus C34 as the batch verification task.

### Task 18 - C18-GENERATOR-READINESS-COMMAND-OPTION - Classify Command option generator readiness

Status: `done`

Input:
`plans/unit-profile-coverage/ultra-golden-gate.json`,
`plans/rules-kernel-coverage/generator-readiness.jsonl`,
`plans/rules-kernel-coverage/qnt-owner-roles.jsonl`,
`packages/battle-runtime/battle-runtime-command-choice.qnt`, and
`packages/battle-runtime/battle-runtime-ground-command.qnt`.

Output: classify `BATTLE.COMMAND.OPTION_AND_NEXT_TURN` in
`generator-readiness.jsonl` with semantic-core/proof-only owners, generator
subset tokens, blocker tokens, and follow-up task ids if extraction is needed.

Acceptance: `pnpm rules-kernel-coverage:check` remains green and the row is no
longer `not-assessed`.

### Task 19 - C19-GENERATOR-READINESS-SANCTUARY - Classify Sanctuary targeting generator readiness

Status: `done`

Input:
`plans/unit-profile-coverage/ultra-golden-gate.json`,
`plans/rules-kernel-coverage/generator-readiness.jsonl`,
`plans/rules-kernel-coverage/qnt-owner-roles.jsonl`, and
`packages/battle-runtime/battle-runtime-sanctuary.qnt`.

Output: classify `BATTLE.SANCTUARY.TARGETING_INTERDICTION` in
`generator-readiness.jsonl` with owner roles, subset tokens, blocker tokens, and
follow-up task ids if extraction is needed.

Acceptance: `pnpm rules-kernel-coverage:check` remains green and the row is no
longer `not-assessed`.

### Task 20 - C20-GENERATOR-READINESS-AFTER-HIT-RIDERS - Classify after-hit damage rider generator readiness

Status: `done`

Input:
`plans/unit-profile-coverage/ultra-golden-gate.json`,
`plans/rules-kernel-coverage/generator-readiness.jsonl`,
`plans/rules-kernel-coverage/qnt-owner-roles.jsonl`,
`packages/battle-runtime/battle-runtime-concentration.qnt`,
`packages/battle-runtime/battle-runtime-spell-invocation.qnt`, and
`packages/battle-runtime/battle-runtime-weapon-hit-spell-riders.qnt`.

Output: classify `BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS` in
`generator-readiness.jsonl`, preserving the distinction between reusable
semantic cores and fixture or bridge-only owners.

Acceptance: `pnpm rules-kernel-coverage:check` remains green and the row is no
longer `not-assessed`.

### Task 21 - C21-GENERATOR-READINESS-SPELL-ATTACK-SEQUENCES - Classify chained spell attack generator readiness

Status: `done`

Input:
`plans/unit-profile-coverage/ultra-golden-gate.json`,
`plans/rules-kernel-coverage/generator-readiness.jsonl`,
`plans/rules-kernel-coverage/qnt-owner-roles.jsonl`,
`packages/battle-runtime/battle-runtime-chained-spell-attack.qnt`,
`packages/battle-runtime/battle-runtime-spell-attack.qnt`, and
`packages/battle-runtime/battle-runtime-spell-invocation.qnt`.

Output: classify `BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE` in
`generator-readiness.jsonl`, preserving any distinction between spell-attack
core semantics and invocation bridge owners.

Acceptance: `pnpm rules-kernel-coverage:check` remains green and the row is no
longer `not-assessed`.

### Task 22 - C22-GENERATOR-READINESS-CONDITION-IMMUNITY-THP - Classify condition-immunity temporary-hit-point generator readiness

Status: `done`

Input:
`plans/unit-profile-coverage/ultra-golden-gate.json`,
`plans/rules-kernel-coverage/generator-readiness.jsonl`,
`plans/rules-kernel-coverage/qnt-owner-roles.jsonl`,
`packages/battle-runtime/battle-runtime-concentration.qnt`,
`packages/battle-runtime/battle-runtime-restoration-and-buffs.qnt`, and
`packages/battle-runtime/battle-runtime-timed-effects.qnt`.

Output: classify
`BATTLE.SPELL.CONDITION_IMMUNITY_TURN_START_TEMPORARY_HIT_POINTS` in
`generator-readiness.jsonl` with checked generator subset and blocker tokens.

Acceptance: `pnpm rules-kernel-coverage:check` remains green and the row is no
longer `not-assessed`.

### Task 23 - C23-GENERATOR-READINESS-CREATURE-TYPE-PROTECTION - Classify creature-type protection generator readiness

Status: `done`

Input:
`plans/unit-profile-coverage/ultra-golden-gate.json`,
`plans/rules-kernel-coverage/generator-readiness.jsonl`,
`plans/rules-kernel-coverage/qnt-owner-roles.jsonl`, and
`packages/battle-runtime/battle-runtime-creature-type-protection.qnt`.

Output: classify
`BATTLE.SPELL.CREATURE_TYPE_PROTECTION_AND_CONDITION_PREVENTION` in
`generator-readiness.jsonl`.

Acceptance: `pnpm rules-kernel-coverage:check` remains green and the row is no
longer `not-assessed`.

### Task 24 - C24-GENERATOR-READINESS-MAKE-STABLE - Classify Make Stable generator readiness

Status: `done`

Input:
`plans/unit-profile-coverage/ultra-golden-gate.json`,
`plans/rules-kernel-coverage/generator-readiness.jsonl`,
`plans/rules-kernel-coverage/qnt-owner-roles.jsonl`, and
`packages/battle-runtime/battle-runtime-hit-points.qnt`.

Output: classify `BATTLE.SPELL.MAKE_STABLE_LIFECYCLE` in
`generator-readiness.jsonl`.

Acceptance: `pnpm rules-kernel-coverage:check` remains green and the row is no
longer `not-assessed`.

### Task 25 - C25-GENERATOR-READINESS-MARKED-DAMAGE-RIDER - Classify marked damage rider generator readiness

Status: `done`

Input:
`plans/unit-profile-coverage/ultra-golden-gate.json`,
`plans/rules-kernel-coverage/generator-readiness.jsonl`,
`plans/rules-kernel-coverage/qnt-owner-roles.jsonl`,
`packages/battle-runtime/battle-runtime-concentration.qnt`,
`packages/battle-runtime/battle-runtime-marked-riders.qnt`, and
`packages/battle-runtime/battle-runtime-marked-spells.qnt`.

Output: classify `BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER` in
`generator-readiness.jsonl`.

Acceptance: `pnpm rules-kernel-coverage:check` remains green and the row is no
longer `not-assessed`.

### Task 26 - C26-GENERATOR-READINESS-REACTION-CASTING-TIME - Classify reaction casting-time generator readiness

Status: `done`

Input:
`plans/unit-profile-coverage/ultra-golden-gate.json`,
`plans/rules-kernel-coverage/generator-readiness.jsonl`,
`plans/rules-kernel-coverage/qnt-owner-roles.jsonl`,
`packages/battle-runtime/battle-runtime-reaction-window.qnt`, and
`packages/battle-runtime/battle-runtime-spell-invocation.qnt`.

Output: classify `BATTLE.SPELL.REACTION_CASTING_TIME` in
`generator-readiness.jsonl`.

Acceptance: `pnpm rules-kernel-coverage:check` remains green and the row is no
longer `not-assessed`.

### Task 27 - C27-GENERATOR-READINESS-ROLL-MODIFIERS - Classify roll modifier active-effect generator readiness

Status: `ready-for-research`

Input:
`plans/unit-profile-coverage/ultra-golden-gate.json`,
`plans/rules-kernel-coverage/generator-readiness.jsonl`,
`plans/rules-kernel-coverage/qnt-owner-roles.jsonl`,
`packages/battle-runtime/battle-runtime-roll-modifier-choice.qnt`, and
`packages/battle-runtime/battle-runtime-thaumaturgy.qnt`.

Output: classify `BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS` in
`generator-readiness.jsonl`.

Acceptance: `pnpm rules-kernel-coverage:check` remains green and the row is no
longer `not-assessed`.

### Task 28 - C28-GENERATOR-READINESS-SAVE-GATED-SPELLS - Classify save-gated condition generator readiness

Status: `ready-for-research`

Input:
`plans/unit-profile-coverage/ultra-golden-gate.json`,
`plans/rules-kernel-coverage/generator-readiness.jsonl`,
`plans/rules-kernel-coverage/qnt-owner-roles.jsonl`,
`packages/battle-runtime/battle-runtime-save-gated-spell.qnt`,
`packages/battle-runtime/battle-runtime-sleep-hideous-laughter.qnt`, and
`packages/battle-runtime/battle-runtime-spell-attack.qnt`.

Output: classify `BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE` in
`generator-readiness.jsonl`, preserving any distinction between save-gate core
semantics and Sleep/Hideous Laughter lifecycle fixtures.

Acceptance: `pnpm rules-kernel-coverage:check` remains green and the row is no
longer `not-assessed`.

### Task 29 - C29-GENERATOR-READINESS-SCALAR-BUFFS - Classify scalar buff active-effect generator readiness

Status: `ready-for-research`

Input:
`plans/unit-profile-coverage/ultra-golden-gate.json`,
`plans/rules-kernel-coverage/generator-readiness.jsonl`,
`plans/rules-kernel-coverage/qnt-owner-roles.jsonl`, and
`packages/battle-runtime/battle-runtime-restoration-and-buffs.qnt`.

Output: classify `BATTLE.SPELL.SCALAR_BUFF_ACTIVE_EFFECTS` in
`generator-readiness.jsonl`.

Acceptance: `pnpm rules-kernel-coverage:check` remains green and the row is no
longer `not-assessed`.

### Task 30 - C30-GENERATOR-READINESS-SLEEP-REPEAT-SAVE - Classify Sleep repeat-save generator readiness

Status: `ready-for-research`

Input:
`plans/unit-profile-coverage/ultra-golden-gate.json`,
`plans/rules-kernel-coverage/generator-readiness.jsonl`,
`plans/rules-kernel-coverage/qnt-owner-roles.jsonl`, and
`packages/battle-runtime/battle-runtime-sleep-hideous-laughter.qnt`.

Output: classify `BATTLE.SPELL.SLEEP_REPEAT_SAVE_LIFECYCLE` in
`generator-readiness.jsonl`.

Acceptance: `pnpm rules-kernel-coverage:check` remains green and the row is no
longer `not-assessed`.

### Task 31 - C31-GENERATOR-READINESS-WEAPON-HOSTED-RIDERS - Classify weapon-hosted spell rider generator readiness

Status: `ready-for-research`

Input:
`plans/unit-profile-coverage/ultra-golden-gate.json`,
`plans/rules-kernel-coverage/generator-readiness.jsonl`,
`plans/rules-kernel-coverage/qnt-owner-roles.jsonl`,
`packages/battle-runtime/battle-runtime-light.qnt`,
`packages/battle-runtime/battle-runtime-spell-invocation.qnt`,
`packages/battle-runtime/battle-runtime-weapon-attacks.qnt`, and
`packages/battle-runtime/battle-runtime-weapon-hit-spell-riders.qnt`.

Output: classify `BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS` in
`generator-readiness.jsonl`.

Acceptance: `pnpm rules-kernel-coverage:check` remains green and the row is no
longer `not-assessed`.

### Task 32 - C32-GENERATOR-READINESS-INDEPENDENT-ATTACK-SEQUENCE - Classify independent spell attack generator readiness

Status: `ready-for-research`

Input:
`plans/unit-profile-coverage/ultra-golden-gate.json`,
`plans/rules-kernel-coverage/generator-readiness.jsonl`,
`plans/rules-kernel-coverage/qnt-owner-roles.jsonl`,
`packages/battle-runtime/battle-runtime-spell-attack.qnt`, and
`packages/battle-runtime/battle-runtime-spell-invocation.qnt`.

Output: classify `BATTLE.SPELL.INDEPENDENT_ATTACK_SEQUENCE` in
`generator-readiness.jsonl`, preserving any distinction between reusable
multi-attack sequence semantics and invocation fixture ownership.

Acceptance: `pnpm rules-kernel-coverage:check` remains green and the row is no
longer `not-assessed`.

### Task 33 - C33-GENERATOR-READINESS-SAVE-GATED-ATTACK-ADVANTAGE - Classify save-gated attack-advantage generator readiness

Status: `ready-for-research`

Input:
`plans/unit-profile-coverage/ultra-golden-gate.json`,
`plans/rules-kernel-coverage/generator-readiness.jsonl`,
`plans/rules-kernel-coverage/qnt-owner-roles.jsonl`,
`packages/battle-runtime/battle-runtime-save-gated-spell.qnt`, and
`packages/battle-runtime/battle-runtime-spell-attack.qnt`.

Output: classify `BATTLE.SPELL.SAVE_GATED_ATTACK_ROLL_ADVANTAGE` in
`generator-readiness.jsonl`, preserving any distinction between save-gate core
semantics and attack-roll advantage projection fixtures.

Acceptance: `pnpm rules-kernel-coverage:check` remains green and the row is no
longer `not-assessed`.

### Task 34 - C34-GENERATOR-READINESS-BATCH-VERIFY - Verify generator-readiness classification batch

Status: `ready-for-research`

Input: C18-C33 results, `plans/unit-profile-coverage/ULTRA_GOLDEN_GATE.md`,
`plans/unit-profile-coverage/LEVEL1_2_ULTRA_GOLDEN_SUMMARY.md`,
`plans/rules-kernel-coverage/generator-readiness.jsonl`, and
`plans/rules-kernel-coverage/REPORT.md`.

Output: refresh and verify checker-owned reports after the generator-readiness
classification batch. If the ultra-golden gate is still blocked, record only
durable blockers with owning follow-up tasks; do not implement runtime feature
support in this verification task.

Acceptance: `pnpm unit-profile-coverage:check && pnpm rules-kernel-coverage:check`
green; Task 34 result records whether QNT/generator readiness is complete or
which non-C-lane follow-up remains.
