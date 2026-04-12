### Task 6 - CHAR7 - Level Advancement And Multiclass Continuation

Status: ready-for-implementation-after-light-research.

Depends on: CHAR1, CHAR3, CHAR5.

Blocks: none.

Next action:

- Implement an ordered level-up input over the existing `CharacterDraft` / `CharacterSheet` boundary instead of introducing a separate advanced-character product.
- Reuse `creature.qnt` as the semantic source for XP thresholds, ASI/feat cadence, multiclass legality, HP growth, hit-die growth, and caster-level/slot behavior; update lower layers if the TS side needs new support rather than copying those tables into a new TS module.
- Keep `deriveCharacterSheetNumbers` and the existing sheet-to-runtime projections as the single TS derivation path once a sheet is finalized.
- Make higher-level starts replay legal level-up transitions; a final-sheet-only multiclass prerequisite check is insufficient because later ASIs cannot retroactively legalize an earlier multiclass entry.
- Model the full ordered advancement choice surface rather than only class totals: each gained class level, score-changing feat/ASI choices, and level-19 Epic Boon choices where they affect legality or downstream derivation.
- Align repo-owned traceability helpers to SRD 5.2.1 before depending on them; level 19 is an Epic Boon feature, not an Ability Score Improvement.

Acceptance criteria:

- Creation and advancement use the same owned character domain.
- Advancement updates HP, hit dice, proficiency-sensitive values, features, and slot structures through one derivation path.
- Higher-level starts do not require bespoke runtime bootstrapping.

Research closeout:

- RAW check completed against `.references/srd-5.2.1/Character-Creation.md` multiclassing and higher-level-start text, plus `UBIQUITOUS_LANGUAGE.md`.
- `creature.qnt` already owns the reusable advancement semantics this task needs: XP thresholds (`pXpForLevel`), ASI levels (`ASI_LEVELS` / `pIsASILevel` / `pApplyASI`), multiclass prerequisite helpers, first-level HP, level-up HP, class-level aggregation, and multiclass caster-level/slot helpers.
- The landed TS character layer already has the downstream projection path this task should feed: `deriveCharacterSheetNumbers`, class-resource derivation, and battle-init projection from finalized `CharacterSheet`.
- Therefore CHAR7 should not ship a standalone TS advancement rules engine. The implementation should add the minimal ordered advancement input needed to reuse the existing sheet finalization/projection flow and to preserve parity with Quint-owned semantics.
- Higher-level starts must preserve the ordered advancement history needed to verify each multiclass entry when it happened. Terminal validation against only the final post-ASI ability scores is too weak and would admit illegal builds.

Verification:

- Read `.references/srd-5.2.1/Character-Creation.md` for multiclass prerequisites, level advancement, and higher-level starts.
- Read representative SRD 5.2.1 class tables plus `Feats.md` to confirm that level 19 grants Epic Boon rather than Ability Score Improvement and that level-gated feat choices must be recorded when they change legality or projections.
- Read `UBIQUITOUS_LANGUAGE.md` to confirm advancement remains on the owned `CharacterDraft` / `CharacterSheet` boundary and runtime facts remain projections.
- Inspected the current TS and Quint ownership surfaces (`packages/core/src/character-domain.ts`, `packages/core/src/character-sheet-derived.ts`, `packages/core/src/features/class-tables.ts`, `packages/core/src/machine-spells.ts`, `creature.qnt`) plus both Ralph implementation worktrees and review reports.
- Did not run MBT because CHAR7 closeout in this merge is research/plan-only and the repo guidance forbids battle MBT for research tasks.

Plan Impact:

- Status: applied
- Affected tasks:
  - `CHAR7`: keep the task open and tighten the implementation handoff around ordered advancement choices, feat/ASI recording, and SRD-accurate Epic Boon handling.
  - `POST3`: no status change; formal advancement should consume the same ordered-transition model discovered here.
