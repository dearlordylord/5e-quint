# Companion Session Architecture Review — Record (R0–R4)

Date: 2026-06-11. Post-merge architecture review of branch
`codex/l13comp-session-admission-design` at `e5d9ccea6`.

**This file is a review record, not a task ledger.** All execution moved into
`plans/RALPH_LANE_COMPANION_SESSION_CONVERGENCE.md` as lane tasks 12–16 on
2026-06-11; that lane's `ralph-task-index` is the authoritative status for
this work. Full findings, evidence, directions, and acceptance criteria live
in the lane task bodies. Earlier full-text versions of the R-task plans are
recoverable from this file's git history (commit `e265546e9`).

## Findings and dispositions

- **R0 — regression: the `origin/master` merge `e5d9ccea6` dropped
  `companionAfterLongRest` (Wild Companion Long Rest disappearance, direct
  SRD RAW / A46) and the entire sheet-side companion test suite** (48
  companion test references at `1b0d227c5`, zero at HEAD). → Lane **Task 12**
  (`CSC-T12-R0-LONG-REST-COMPANION-RESTORE`), queued first.
- **R1 — settlement is two half-operations the caller must sequence**
  (`mcp/battle-handoff.ts:34,47`). One `settleCharacterSheetFromBattle`
  operation; companion handoff section moves to its own module. Task 16 also
  collapsed MCP settlement failure reporting to the single
  `CHARACTER_SESSION_HANDOFF_INVALID` code because callers now invoke one
  settlement operation. → Lane **Task 16**
  (`CSC-T16-R1-SINGLE-SETTLEMENT-OPERATION`), after Task 15.
- **R2 — battle state stores a lossy projection of the durable protocol
  (`formAccess` + `expiration`) and settlement inverts it by hand.**
  Owner-approved 2026-06-11: hoist the protocol tags/facts table to a
  `shared-algebras` leaf; battle carries the tag; settlement copies it.
  Exploration verified: battle-side `expiration` is pure freight in TS and
  QNT; the Pact attack gate reads owner invocation access, not companion
  protocol (and must stay there); neither MBT witness nor any MCP test
  mentions `expiration`. → Lane **Task 15**
  (`CSC-T15-R2-PROTOCOL-TAG-HOIST`), after T10. Supersedes R4c.
- **R3 — the generic-companion rename stopped halfway.** Split decision:
  the `FindFamiliar* = BattleCompanion*` type-alias family (~9 internal
  sites, zero external consumers) is deleted (**R3-lite** → Lane **Task 13**,
  `CSC-T13-R3LITE-ALIAS-FAMILY-DELETION`); the module/profile rename was
  **rejected** — battle companion mechanics are Find Familiar SRD text and
  the QNT slice, witnesses, and `spell.find-familiar-lifecycle` coverage
  profile pin the rule-source name. Decision and revisit trigger recorded in
  `docs/adr/0005-battle-companion-rule-source-module-naming.md`.
- **R4 — housekeeping.**
  - R4a: delete the `battle-runtime/src/find-familiar-forms.ts`
    compatibility re-export shim. → Lane **Task 14**
    (`CSC-T14-R4A-FORMS-SHIM-DELETION`).
  - R4b: durable companion id uniqueness has no owner (caller-minted ids,
    uniqueness checked only at battle admission). → Folded into lane
    **Task 10** (`CSC-T10-SMALL-FINDINGS-BATCH`) with a recorded default
    (session-store uniqueness) and a HITL flag. Task 10 landed that default:
    MCP rejects a durable companion id already retained by a different
    character in the session store.
  - R4c: protocol-constructor duplication across `companions.ts` and
    `character-battle-runtime/index.ts`. → **Superseded by Task 15**; do in
    T10 only if Task 15 is rejected.

## Review notes kept for the closeout (Task 11)

- The protocol facts table's `attack`/`dismissal`/`initiative` columns have
  no executable consumer today; the Pact attack exception gates on the
  owner's `invocationSpellAccesses` (`find-familiar-pact-chain.ts:107`), a
  defensible RAW reading (the exception attaches to the Warlock, not the
  familiar instance). Deliberately left as-is; the columns become
  load-bearing when a protocol actually differs (Find Steed).
- A further `origin/master` merge is expected before PR merge
  (qfw-lane-a-r7). After any master merge, run the sheet companion suite as
  the merge-loss canary — Task 12's restored tests are that canary.
- Candidates considered and rejected during the review (with reasons, for
  future reviewers): merging the three manifestation type families (the
  durable/battle split is the plan's load-bearing seam; deletion test fails);
  indexing the familiar form catalog for performance (one catalog exists;
  T09 owns the correctness half).
