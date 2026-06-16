# Ralph Lane: Level 4 Reachable Unit Full Audit

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT",
      "status": "ready-for-implementation",
      "title": "Audit every mechanically relevant level-4 reachable Unit"
    }
  ]
}
-->

## Lane Scope

This is a research/audit lane for the level 1-4 ultra-golden effort after the
initial gate passed. It must not assume that a green generated gate means every
SRD level-4-reachable Unit is authored, installed, supported, or correctly
closed. The lane owns a full source-backed audit of every Unit or Unit-shaped
mechanical fact a character can carry, select, prepare, equip, or project by
character level 4.

This is not a milestone summary. The required output is an exhaustive audit
artifact that is ready to split into concrete Ralph planning lanes.

## Source Artifacts

- `plans/ACTIVE_PLAN.md`
- `plans/LEVEL1_2_FULL_SUPPORT_BACKLOG.md`
- `plans/unit-profile-coverage/README.md`
- `plans/unit-profile-coverage/SRD_UNIT_INVENTORY.md`
- `plans/unit-profile-coverage/LEVEL1_2_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/LEVEL1_3_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/LEVEL1_4_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/UNIT_REPORT.md`
- `plans/unit-profile-coverage/srd-unit-inventory.json`
- `plans/unit-profile-coverage/unit-matrix.json`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `plans/unit-profile-coverage/level1-4-full-support.json`
- `plans/unit-profile-coverage/ultra-golden-gate.json`
- `packages/surface/src/surface/unit-catalog.ts`
- `packages/surface/content/`
- `.references/srd-5.2.1/Classes/`
- `.references/srd-5.2.1/Feats.md`
- `.references/srd-5.2.1/Equipment.md`
- `.references/srd-5.2.1/Character-Origins.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `UBIQUITOUS_LANGUAGE.md`

## Current Seed Signals

These are starting points only. The audit must recompute them from the current
generated artifacts instead of preserving stale numbers.

- `LEVEL1_4_FULL_SUPPORT.md` currently reports strict runtime/profile support
  `147/210`, strict target closure `210/210`, candidate Unit ids before
  exclusions `237`, SRD pressure with no Unit matrix row `14`, and
  non-supported frontier `63`.
- The level-4 ASI source files exist for all 12 SRD classes, but the current
  Unit matrix marks only Fighter, Paladin, Warlock, and Wizard ASI rows as
  installed. Barbarian, Bard, Cleric, Druid, Monk, Ranger, Rogue, and Sorcerer
  ASI rows are authored Surface records but `not-in-unit-catalog`.
- `ranger_hunters_lore` currently appears as SRD level-3 class-feature pressure
  with no Unit matrix row, so the audit must decide whether it is a missed
  level-4-reachable mechanical row or a correctly excluded table-only fact.
- Spell-level-3 remains outside character level 4, but level 4 can still alter
  cantrip/prepared-spell selection capacity. The audit must prove the resulting
  spell Unit pressure is already represented or explicitly outside this lane.

## Lane Rules

- Run the Ralph task-base check before research.
- Use local SRD only for RAW meaning.
- Treat Unit in the project sense: an authored or candidate mechanical identity
  that may appear in Surface content, catalog admission, retained character
  state, Character Sheet projection, battle handoff, battle runtime support,
  selected Unit identity evidence, or Unit profile coverage.
- Do not limit the audit to class-table milestones. Include character-state,
  battle-state, game-mechanical, feat, skill/proficiency, spell-access,
  equipment/loadout, species/background, class, and subclass pressure reachable
  by a level-4 character.
- Do not count a row as out of scope merely because it is currently unsupported.
  A row is outside implementation pressure only when the audit proves it is
  pure table/presentation/social/exploration adjudication, later-level-only,
  non-executable class-container data, companion-worktree owned, or otherwise
  closed by an explicit durable owner boundary.
- Preserve authored identity only at Surface/catalog/selection boundaries.
  Runtime planning must use typed facts, support profiles, and state/procedure
  shape rather than class, feature, feat, spell, or item names.

### Task 1 - L14G-06-LEVEL4-REACHABLE-UNIT-FULL-AUDIT

Status: `ready-for-implementation`

Expected size: one focused audit lane. If the audit discovers large
implementation work, split that work into new Ralph lane files instead of
implementing it here.

Output:

- Write `plans/unit-profile-coverage/L14G_06_LEVEL4_REACHABLE_UNIT_FULL_AUDIT.md`.
- Reconcile the audit with the current generated level-1-4 denominator:
  candidate Unit ids before exclusions, companion-worktree exclusions, SRD
  pressure with no Unit matrix row, non-executable class containers, strict
  executable denominator, non-supported frontier, diagnostic product-readiness
  rows, and SRD-authored product-readiness rows.
- Enumerate every level-4-reachable row, not just the blockers:
  - all 12 SRD class feature-grant chains through level 4;
  - all level-4 Ability Score Improvement feature records and catalog
    admission states;
  - every SRD feat selectable or retained by a level-4 character, including
    origin feats already retained from background selection and feats opened by
    the level-4 ASI/feat-choice container;
  - skill, tool, language, Weapon Mastery, Armor Training, saving throw,
    Expertise, proficiency, and other durable character-state facts;
  - spell-access facts, prepared/cantrip count deltas, Pact Magic facts, and a
    source-backed statement that character level 4 introduces no new spell
    level if that remains true;
  - spell Unit identities already reachable by level 4 through cantrips,
    spell-level-1, and spell-level-2 access, including no-matrix and
    table-only dispositions;
  - equipment/loadout Unit refs and any level-4 feat/class path that can add or
    alter equipment proficiency, mastery, or durable loadout state;
  - species/background/origin feat Units still retained by a level-4
    CharacterBuild;
  - companion/familiar rows and any other explicitly excluded worktree owners.
- For each row, record at least:
  - local SRD source anchor;
  - candidate Unit id or explanation why the fact is not a Unit;
  - level band or reachability path;
  - Unit kind or fact kind;
  - whether it touches character state, Character Sheet projection, Character
    Battle handoff, battle runtime state, selected Unit identity, or only table
    adjudication;
  - Surface source status;
  - Unit catalog admission status;
  - Unit matrix row status;
  - current claim/disposition;
  - current evidence owner, if any;
  - whether the row is complete, intentionally closed, later-level-only,
    duplicate/non-runtime data, or needs a concrete follow-up lane.
- Include explicit summary tables for:
  - authored-but-not-installed SRD rows;
  - SRD pressure with no Unit matrix row;
  - unsupported/profile-subset rows whose closure is not pure table-only;
  - diagnostic product-readiness rows in `owner-evidence-required` or
    `partial-battle-runtime`;
  - all level-4 ASI rows, with installed vs not-installed status;
  - feat-choice consequences that are currently hidden behind
    `selection-grant-container`;
  - spell and equipment rows that are confirmed to have no new level-4
    identity pressure.
- Split every real residual into a Ralph-formatted follow-up lane file with
  owner, source artifacts, expected output, acceptance, and verification. Use
  concrete task names; do not leave residuals as prose-only TODOs.
- Update `plans/ACTIVE_PLAN.md` with the audit result and any new follow-up
  lanes.

Acceptance:

- The audit proves its denominator by reconciling to
  `plans/unit-profile-coverage/level1-4-full-support.json` and
  `plans/unit-profile-coverage/unit-matrix.json`. If generated counts changed,
  cite the new counts instead of preserving stale numbers.
- Every level-4-reachable mechanical row is represented by an audit row or by
  an explicit "not a Unit" row with a source-backed reason.
- No category named by this lane has only a generic milestone statement. Empty
  categories must have an explicit source-backed `none` row.
- The audit distinguishes authored Surface source, Unit catalog admission, Unit
  matrix/profile classification, runtime support, selected-identity evidence,
  and MCP/user-flow evidence.
- Any pure table-facing exclusion names the table-owned fact and explains why no
  character state, Character Sheet state, battle handoff state, battle runtime
  state, or selected Unit identity evidence should own it.
- Any row that is battle-related, character-state-related, game-mechanical, or
  non-only-table-facing is either already supported/closed by durable evidence
  or split into a concrete follow-up lane.
- No generated coverage artifact is hand-edited.

Verification:

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

Plan Impact:

- This task is expected to update `plans/ACTIVE_PLAN.md`.
- If the audit discovers implementation or catalog work, add separate
  Ralph-formatted lane files instead of broadening this audit lane.
