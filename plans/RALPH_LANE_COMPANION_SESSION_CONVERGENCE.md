# Ralph Lane: Companion Session Review Convergence

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "CSC-T01-OWNER-KEYED-COMPANIONS",
      "status": "done",
      "title": "Key battle companions by owner; delete the synthetic companion-state id space"
    },
    {
      "number": 2,
      "id": "CSC-T02-PROTOCOL-TAG-UNION",
      "status": "done",
      "title": "Reduce the durable companion protocol to a tag union with one derivation table"
    },
    {
      "number": 3,
      "id": "CSC-T03-SETTLEMENT-OUTCOME",
      "status": "done",
      "title": "Make battle state carry the full settle-able companion outcome; drop session companionAdmission"
    },
    {
      "number": 4,
      "id": "CSC-T04-DEAD-BATTLE-LONG-REST-LANE",
      "status": "done",
      "title": "Delete the unreachable battle-state long-rest companion lane; decide castFindFamiliar wiring"
    },
    {
      "number": 5,
      "id": "CSC-T05-COMPANION-REST-ASSUMPTION",
      "status": "done",
      "title": "Record the companion rest-participation assumption; align sheet long-rest THP/HP"
    },
    {
      "number": 6,
      "id": "CSC-T06-RECAST-SEMANTICS",
      "status": "done",
      "title": "Record recast assumptions; one recast semantic across sheet and battle layers"
    },
    {
      "number": 7,
      "id": "CSC-T07-FORM-VOCAB-HOIST-CREATION-MOVE",
      "status": "done",
      "title": "Hoist the familiar-form vocabulary; move out-of-battle creation into character-sheet-runtime"
    },
    {
      "number": 8,
      "id": "CSC-T08-CREATION-HP-SURFACE",
      "status": "blocked",
      "title": "Remove caller-minted companion HP/THP from the MCP creation operation"
    },
    {
      "number": 9,
      "id": "CSC-T09-FORM-CATALOG-REFERENCE",
      "status": "blocked",
      "title": "Replace the first-match familiar-form-catalog scan with an executable uniqueness boundary"
    },
    {
      "number": 10,
      "id": "CSC-T10-SMALL-FINDINGS-BATCH",
      "status": "blocked",
      "title": "Close the small review findings (narrowing, dead exports, duplicate rules, id constructor, durable-id uniqueness owner)"
    },
    {
      "number": 11,
      "id": "CSC-T11-CONVERGENCE-CLOSEOUT",
      "status": "blocked",
      "title": "Reviewer-loop convergence and L13COMP plan-doc closeout"
    },
    {
      "number": 12,
      "id": "CSC-T12-R0-LONG-REST-COMPANION-RESTORE",
      "status": "done",
      "title": "Restore the merge-dropped Long Rest companion expiration and the sheet companion tests"
    },
    {
      "number": 13,
      "id": "CSC-T13-R3LITE-ALIAS-FAMILY-DELETION",
      "status": "blocked",
      "title": "Delete the FindFamiliar type-alias family; keep rule-source module names (ADR 0005)"
    },
    {
      "number": 14,
      "id": "CSC-T14-R4A-FORMS-SHIM-DELETION",
      "status": "blocked",
      "title": "Delete the battle-runtime find-familiar-forms compatibility re-export shim"
    },
    {
      "number": 15,
      "id": "CSC-T15-R2-PROTOCOL-TAG-HOIST",
      "status": "blocked",
      "title": "Hoist the companion protocol tag to a shared-algebras leaf; battle state carries the tag"
    },
    {
      "number": 16,
      "id": "CSC-T16-R1-SINGLE-SETTLEMENT-OPERATION",
      "status": "blocked",
      "title": "One settlement operation for character battle handoff; move companion handoff into its own module"
    }
  ]
}
-->

Date: 2026-06-10. This lane converges the companion session admission slice
(PR #6, branch `codex/l13comp-session-admission-design`) after its
architecture/domain review. Each task below embeds the review finding it
closes — claim, evidence, and a researched direction — so tasks are
self-contained. The findings are directions, not scripts: where a task names
a "researched direction" the implementer may land a different shape if it
preserves the same domain invariant and the task output records why.

**This lane runs on the PR branch, not master.** Declared base ref:
`codex/l13comp-session-admission-design`. The runner provides the exact Base
SHA (the commit introducing this plan, or a later branch commit). Tasks must
never rebase onto or merge `master`; master has moved past this branch
(e.g. `633213b18` duplicates this branch's `mcp-acceptance-scenarios.ts`
Adrenaline Rush hunk — that is expected and merges clean; PR-level merge is
owner-owned).

**Second review round (2026-06-11).** After the `origin/master` merge
`e5d9ccea6`, a post-merge architecture review added tasks 12–16 to this lane
(review record: `plans/COMPANION_SESSION_ARCH_REVIEW_FOLLOWUPS.md`; naming
decision: `docs/adr/0005-battle-companion-rule-source-module-naming.md`).
Task 12 is a regression fix — that merge silently dropped the Long Rest
companion expiration and the entire sheet-side companion test suite — and
runs before T08. Tasks 15–16 are approved refactors and run after T10 so the
heavily shared files move once. **This index is the authoritative status
ledger for tasks 12–16**; the review-record file does not track status.
Another master merge is expected before PR merge (qfw-lane-a-r7); after any
master merge, run the sheet companion suite as the merge-loss canary (Task
12's restored tests are that canary).

## Context Budget

Read only what the current task needs:

- This plan's task section, plus the referenced finding evidence files at the
  cited regions.
- `plans/COMPANION_SESSION_ADMISSION_AND_REAPPEARANCE_PLAN.md` — the design
  doc this branch implements; tasks must keep it truthful.
- For tasks 12–16: `plans/COMPANION_SESSION_ARCH_REVIEW_FOLLOWUPS.md` (review
  record/background) and `docs/adr/0005-battle-companion-rule-source-module-naming.md`
  (naming decision Task 13 implements). Task bodies below are self-contained;
  read the record only when background is needed.
- RAW anchors: `.references/srd-5.2.1/Spells/Descriptions-E-L.md` (Find
  Familiar, line ~296), `.references/srd-5.2.1/Classes/Warlock.md` (Pact of
  the Chain), `.references/srd-5.2.1/Classes/Druid.md` (Wild Companion, line
  ~124), `.references/srd-5.2.1/Playing-the-Game.md` (Temporary Hit Points,
  Long Rest). `UBIQUITOUS_LANGUAGE.md` "Controlled Creatures And Companions".
- Do not read `battle-reducer.ts` beyond the cited regions; do not read other
  packages' MBT corpora.

Pre-researched facts tasks may rely on without re-deriving (re-verify only if
a task's change invalidates them):

- Dependency edges: `character-sheet-runtime` depends on
  `shared`/`shared-algebras`/`surface`/`character-creation-runtime` and NOT
  on `battle-runtime`. `character-battle-runtime` depends on both sheet and
  battle runtimes. `battle-runtime` depends on `shared`/`shared-algebras`/`surface`.
- `characterSpellcasting` (`packages/character-battle-runtime/src/battle-character-build-projection.ts`)
  reads only `build` + `unitLibrary` + optional `spellSlots` — no battle state.
- Exactly one Surface spell record carries `familiar_form_catalog` mechanics:
  `packages/surface/content/find_familiar.dhall` (+ generated json).
- All 39 shipped stat-block `hp` payloads are `kind: "literal"`; no
  dice-formula HP exists in the catalog today.
- MCP sessions are in-memory only (`packages/mcp/src/session-store.ts` Maps;
  no disk persistence), so stored-sheet shape changes need parsers updated but
  no data migration.
- `castFindFamiliar` and `applyCompanionLongRestDisappearance` are exported
  from `packages/battle-runtime/src/index.ts` but have **zero production
  consumers** (tests only). In-battle Find Familiar casting is not wired into
  act discovery; only dismiss/reappear/pact-attack/touch-delivery are.
- The companion MBT witness
  (`packages/battle-runtime/battle-runtime-find-familiar-companion-lifecycle.mbt.qnt`)
  is a self-contained literal projection witness (no imports, `qLastResult: str`
  protocol). Battle-side TS refactors touch only the driver glue in
  `src/find-familiar-companion-lifecycle.mbt.test.ts`.
- ASSUMPTIONS.md currently ends at A45; new entries start at A46.
  ASSUMPTIONS.md is owner-curated: tasks draft entries and flag them HITL;
  the owner may veto/reword in PR review.

## Lane Rules

- Before each task: `git log --oneline -1 <declared-base-ref>`,
  `git log --oneline -1 HEAD`,
  `git merge-base --is-ancestor <declared-base-sha> HEAD`. On failure stop
  and report; branch repair belongs to the runner/decider. Never rebase.
- One sequential lane: tasks share files
  (`companion-state.ts`, `find-familiar-lifecycle.ts`,
  `character-battle-runtime/src/index.ts`, `character-sheet-runtime/src/index.ts`,
  mcp tools). Do not parallelize tasks from this lane.
- **MBT is a global mutex** (CLAUDE.md "MBT runs are expensive"). Before any
  MBT-bearing test run: `ps aux | grep vitest | grep -v grep`,
  `ps aux | grep quint_evaluator | grep -v grep`; kill zombie evaluators.
  Run only the two focused companion MBT files when battle behavior changes:
  `pnpm --filter @dnd/battle-runtime exec vitest run src/find-familiar-companion-lifecycle.mbt.test.ts src/find-familiar-selected-identity.mbt.test.ts`.
  Reproduce MBT failures with the reported `QUINT_SEED` before fixing.
- Spec-first for behavior changes: update
  `packages/battle-runtime/battle-runtime-find-familiar.qnt` (and its proofs
  in `battle-runtime-core-combat-tests.qnt`) before or with the TS change.
  Witness drivers import leaves only; never grow the driver closure.
- Preserve `KERNEL-COVERAGE` / `UNIT-PROFILE-COVERAGE` marker comments; move
  them with the code that owns them.
- No authored-identity dispatch in reducers; routes validate by parsed shape
  and support profiles (the branch already does this — keep it that way).
- Typed failures (`Either`/discriminated unions) for domain/runtime failures;
  assertions only for already-proven invariants.

## Verification (every task)

- Reviewer-loop convergence per CLAUDE.md (RAW/ubiquitous-language where rule
  meaning is touched, architecture/connascence, code review) until no
  reasonable findings remain; record rejected notes with reasons in the task
  output.
- `pnpm --filter @dnd/battle-runtime typecheck`,
  `pnpm --filter @dnd/character-sheet-runtime typecheck`,
  `pnpm --filter @dnd/character-battle-runtime typecheck`,
  `pnpm --filter @dnd/mcp typecheck` (subset touched by the task is fine,
  full set at T11).
- Focused tests for the touched packages
  (`pnpm --filter <pkg> test -- src/index.test.ts` style), the two companion
  MBT files when battle behavior changed (MBT-mutex protocol), and
  `pnpm --filter @dnd/battle-runtime test:qnt-proofs` when `.qnt` proofs
  changed.
- `pnpm unit-profile-coverage:check` when coverage-marked files move.
- `git diff --check`.

## DAG / Queue Order

| # | Task | Status | Depends on | Why this order |
| ---: | --- | --- | --- | --- |
| 1 | CSC-T01-OWNER-KEYED-COMPANIONS | done | none | Foundation: every later battle-side task reads/writes the companions map; do the key model first so nothing is built on the synthetic id space. |
| 2 | CSC-T02-PROTOCOL-TAG-UNION | done | T01 | Shrinks the protocol vocabulary T03's settlement must write. |
| 3 | CSC-T03-SETTLEMENT-OUTCOME | done | T02 | The core domain rework; consumes T01's key model and T02's protocol shape. |
| 4 | CSC-T04-DEAD-BATTLE-LONG-REST-LANE | done | T03 | Whether battle `expiration` survives depends on T03's settlement projection. |
| 5 | CSC-T05-COMPANION-REST-ASSUMPTION | done | T04 | HITL; sheet-side counterpart of T04's deletion. |
| 6 | CSC-T06-RECAST-SEMANTICS | done | T05 | HITL; depends on T03's outcome union for the battle half. |
| 7 | CSC-T07-FORM-VOCAB-HOIST-CREATION-MOVE | done | T06 | Package move lands after semantics settle, so code moves once. |
| 12 | CSC-T12-R0-LONG-REST-COMPANION-RESTORE | ready-for-implementation | none | Regression fix first: restores a direct-RAW rule the master merge dropped, plus the canary tests every later task (and the next master merge) needs. |
| 13 | CSC-T13-R3LITE-ALIAS-FAMILY-DELETION | blocked | T12 | Trivial battle-runtime-only cleanup; sequenced early to get the dual vocabulary out of files later tasks read. |
| 14 | CSC-T14-R4A-FORMS-SHIM-DELETION | blocked | T13 | Same-session-sized battle-runtime cleanup; touches imports in files T13 just edited. |
| 8 | CSC-T08-CREATION-HP-SURFACE | blocked | T14 | Edits the creation op wherever T07 left it; runs after the cheap cleanups so the queue front stays unblocked. |
| 9 | CSC-T09-FORM-CATALOG-REFERENCE | blocked | T08 | Touches admission eligibility helpers T07 may have relocated. |
| 10 | CSC-T10-SMALL-FINDINGS-BATCH | blocked | T09 | Sweep of remaining small findings in now-stable files; now also owns the durable-id uniqueness decision (R4b). |
| 15 | CSC-T15-R2-PROTOCOL-TAG-HOIST | blocked | T10 | Owner-approved refactor; reshapes protocol threading and deletes the settlement inverse mapping before T16 moves the code. |
| 16 | CSC-T16-R1-SINGLE-SETTLEMENT-OPERATION | blocked | T15 | Code moves once, in its post-T15 final shape (the T07 rationale). |
| 11 | CSC-T11-CONVERGENCE-CLOSEOUT | blocked | T16 | Full-gate run + plan-doc truth update over the whole lane, tasks 1–16. |

## Task Details

### Task 1 - CSC-T01-OWNER-KEYED-COMPANIONS

Status: `done` · Mode: AFK

**Outcome (wire-shape decision).** `BattleState.companions` is now
`ReadonlyMap<CombatantId, BattleCompanionState>` keyed by the owner (new
`BattleCompanions` alias, documented one-per-owner with the widening path). The
synthetic id space is gone: `BattleCompanionStateId`, both prefix constructors,
`companionStateIdFor`, `absentCompanionDisplayId`, `setRetainedAbsentCompanion`,
and `presentCompanionCombatantId` are deleted; `BattleCompanionEntry` is now
`{ ownerId, companion }` and present consumers read `companion.combatantId`
directly. Table-facing id decision: the redundant `companionId` field was
**removed** from the `companionLifecycle` subject and the two companion
reappearance holes — the owner `actorId`/`ownerId` is the universal handle
(one-per-owner is structural, no in-battle recast can swap the familiar, and no
single id type covers present + disappeared + battle-only companions). The
absent snapshot drops its redundant `companionId` and is now exactly
`BattleCompanionAbsentState` (durable identity already lives in
`identity.durableCompanionId`); the present snapshot keeps `companionId`
(the live combatant). The `companionManifestationFromBattle` cast is gone. The
witness `.mbt.qnt` files are unmodified; only the TS driver glue changed.
Verification: battle-runtime/character-battle-runtime/mcp typecheck green; full
non-MBT battle-runtime failing set identical to base (3 pre-existing
`unit-profile-admission-*` failures unrelated to companions); both companion MBT
files pass; character-battle-runtime 77 and mcp 93 unit tests green.

**Finding (review F5, state design).**
`packages/battle-runtime/src/companion-state.ts` introduced
`BattleCompanionStateId = string` / `BattleCompanionDurableId = string`
(unbranded) and keys `BattleState.companions` by prefix strings
(`` `retained:${durableId}` `` / `` `battle:${combatantId}` ``, `:238`,`:244`),
with a third "display id" convention in `absentCompanionDisplayId`. Observed
costs already in the branch: the wrong alias compiles in the codec
(`battle-reducer/battle-codecs.ts:138` types `durableCompanionId` with
`BattleCompanionStateIdSchema`); an `as CombatantId` cast justified only by a
comment (`character-battle-runtime/src/index.ts`,
`companionManifestationFromBattle` present branch); `ReadonlyMap<infer K, …>`
conditional-type gymnastics instead of a named type
(`battle-reducer/damage-apply.ts:816`, `battle-reducer/api-lifecycle.ts`);
and every consumer must remember
`presentCompanionCombatantId(entry.companionId, companion)`.
Meanwhile `setCompanionByStateId` (`companion-state.ts:195` region) and
`permanentlyDismissFindFamiliar` (`find-familiar-lifecycle.ts:900-904`)
already filter by `ownerId` — the map is de-facto one-companion-per-owner.

**Researched direction.** Key `BattleState.companions` by the owner
`CombatantId`. The present state already carries `combatantId`; durable
identity already lives in `identity.durableCompanionId`. The synthetic id
space, both prefix constructors, the display-id ambiguity, the cast, and the
codec confusion all disappear, and one-companion-per-owner becomes
structural. The plan doc explicitly defers multi-companion support, so
widening later (e.g. map to a small per-owner collection) is the documented
path — note that in the code where the key type is declared.

Watch items found in research:

- Subject/hole payloads carry a companion id today
  (`battle-subjects.ts:621` `companionLifecycle` subject;
  `battle-reducer.ts:4399,:4407` reappearance holes). Decide what the
  table-facing id becomes (owner id + durable id are the honest facts;
  present combatants also have their combatant id). Keep the wire vocabulary
  consistent across subjects, holes, snapshots, and codecs.
- The MBT witness is self-contained; only the TS driver glue
  (`src/find-familiar-companion-lifecycle.mbt.test.ts:363` region) needs
  mechanical updates. If the witness's asserted projection strings would
  change, stop and reconsider the wire shape rather than editing the witness
  to match an accident.
- ~12 production files touch the map (grep
  `companionEntries|findCompanionEntryByOwner|setCompanion|BattleCompanionStateId`):
  companion-state, find-familiar-lifecycle, find-familiar-state,
  find-familiar-companion-subjects, battle-subjects, battle-reducer,
  battle-codecs, battle-discovery, damage-apply, api-lifecycle, dispatcher,
  battle-runtime index, character-battle-runtime index.
- If owner-keying hits a genuine wall (it should not), the fallback is:
  brand both id types and replace prefix strings with a discriminated key
  type. Record the wall in the task output before falling back.

Output: refactored battle-runtime + character-battle-runtime with no
behavior change; `BattleCompanionStateId`, `retainedCompanionStateId`,
`battleOnlyCompanionStateId`, `companionStateIdFor`,
`absentCompanionDisplayId` deleted (or replaced by the fallback shape).

Acceptance: typecheck green across touched packages; battle-runtime and
character-battle-runtime test suites green; the two companion MBT files green
under the mutex protocol with the witness `.mbt.qnt` files unmodified; grep
shows no `retained:`/`battle:` prefix construction; the
`companionManifestationFromBattle` cast is gone; no behavior diff.

### Task 2 - CSC-T02-PROTOCOL-TAG-UNION

Status: `done` · Mode: AFK

**Outcome.** `CharacterSheetRetainedCompanionProtocol` is now `{ tag }` over the
three-literal `RETAINED_COMPANION_PROTOCOL_TAGS` (derived per repo convention).
A single `retainedCompanionProtocolFacts(protocol)` table
(`as const satisfies Record<Tag, CharacterSheetRetainedCompanionProtocolFacts>`)
derives initiative/attack/dismissal/expiration; the one production reader
(`character-battle-runtime` admission `expiration`) consults it. The three
per-variant protocol types and the ~120-line cross-field
`parseStoredRetainedCompanionProtocol` (plus its attack/expiration helpers)
collapsed to a tag parse; the contradiction-rejection parser test became an
unknown-tag rejection test. Constructors return `{ tag }`; the tag-guards return
boolean (their literal comparisons stay compile-time-protected by the tag
union). Tag/behavior contradiction is now unrepresentable. Verification:
sheet/character-battle/mcp typecheck + suites green (95/77/93); the only
initiative/attack/dismissal protocol constants in the repo are the facts type
and the derivation table in one file. Pre-existing duplicate attack-exception
tag guards across sheet and battle are left for T10.

**Finding (review F6, state-space minimality).** Each
`CharacterSheetRetainedCompanionProtocol` variant
(`character-sheet-runtime/src/index.ts:344-372` region) pins
`initiative`/`attack`/`dismissal`/`expiration` to single literal values, so
the fields carry zero information beyond the tag. Production readers confirm
it: one read of `protocol.expiration`
(`character-battle-runtime/src/index.ts:447`) and three `protocol.tag`
guards; `initiative`, `attack`, `dismissal` have no production reader. The
stored format can represent contradictions the TS type cannot, paid for by
~80 lines of cross-field re-validation in
`parseStoredRetainedCompanionProtocol` and contradiction-rejection tests.

**Researched direction.** Make the protocol a three-literal tag union
(derive the type from a `const` array per repo convention). Provide one
derivation table (e.g. `retainedCompanionProtocolFacts(tag)`) for consumers
that need the facts — today only `expiration` is consumed. Persist only the
tag; `parseStoredRetainedCompanionProtocol` becomes a tag parse. Sessions are
in-memory, so no migration. Keep the variant names' domain meaning
(ordinary / attack-exception / owner-long-rest familiar-like, one-at-a-time);
do not collapse them into booleans.

Output: simplified protocol type + derivation table; updated constructors in
character-battle-runtime (`ordinaryFamiliarLikeProtocol` etc. become tags);
updated parser and tests.

Acceptance: sheet + character-battle + mcp typecheck/tests green; grep shows
no stored `initiative: "own"`/`dismissal:`/`attack:` protocol constants
outside the derivation table; contradictory-protocol parser tests replaced by
unknown-tag rejection tests.

### Task 3 - CSC-T03-SETTLEMENT-OUTCOME

Status: `done` · Mode: AFK implementation, HITL review point flagged below

**Outcome.** QNT-first: added the `DismissedForeverFindFamiliar({ owner, identity })`
terminal state to the lifecycle union in `battle-runtime-model.qnt`;
`permanentlyDismissFindFamiliarLifecycle` now maps present/dismissed/disappeared
to it (retaining owner+identity), idempotent for the tombstone, and the
`forever` proof in `battle-runtime-core-combat-tests.qnt` asserts the tombstone
instead of `NoFindFamiliar`. TS mirror: `BattleCompanionDismissedForeverState`;
`permanentlyDismissFindFamiliar` writes the tombstone via `setCompanion` instead
of deleting the entry; discovery offers no acts for it and the snapshot filters
it out (it is a settlement-only tombstone, not a live companion). Settlement
(`applyBattleCompanionHandoffToCharacterSheet`) now reads battle state alone:
no entry → Sheet kept; battle-only → deferred to L13COMP-03 (documented in the
plan doc); `dismissedForever` (retained) → slot cleared; present/temporarily-
dismissed/disappeared → manifestation written with the protocol **derived from
battle facts** (`retainedCompanionProtocolFromBattle`, closing the F4 recast
divergence). The session-level `companionAdmission` copy is gone: the
`InBattleCharacterSession.companionAdmission` field, the
`CharacterSheetCompanionBattleAdmissionState` type, `companionAdmissionStateForCharacter`,
`battleCompanionHandoffIdentityIssue`, and the character-tool-output schema
field are all deleted. The forward admission path
(`companionAdmissionManifestation`, the `companionAdmissions` start_battle tool
input) is retained — it is admission, not the redundant session copy F1/F2
flagged.

**HITL decisions (owner-resolved 2026-06-10):** (a) recast over a
`dismissedForever` retained companion inherits the durable identity — recorded
for A47/T06 and the out-of-battle recast path; in-battle casting is unwired and
`castFindFamiliar` is deleted in T04, so the QNT cast-over-tombstone path stays
the existing leaf behavior. (b) battle-created (battle-only) familiars do not
settle as new durable companions yet — deferred to L13COMP-03, with the
settlement outcome shaped to slot in (reads on `battleOnly` vs
`retainedBetweenBattles`); recorded in the L13COMP-03 plan-doc section.

Verification: four-package typecheck; battle-runtime find-familiar tests fixed
(tombstone assertions); character-battle 77 / character-sheet 95 / mcp 94;
`test:qnt-proofs` 42 modules green (core-combat-tests 117s); companion MBT 6
green with witnesses unmodified (neither witness exercises permanent dismissal,
so the tombstone never reaches their projections; driver glue made tombstone-
type-safe). New distinct tests: dismissed-forever → slot cleared (mcp), never-
admitted → slot untouched (mcp), ordinary protocol round-trip asserted at
settlement.

**Findings (review F1+F2+F4-battle-half).**

- `InBattleCharacterSession.companionAdmission`
  (`packages/mcp/src/session-store.ts:50`) duplicates a fact derivable from
  `BattleState.companions` identity except in one case: permanent dismissal
  **deletes** the map entry
  (`find-familiar-lifecycle.ts:900-904`), so settlement cannot distinguish
  "never admitted" from "dismissed forever" without the session copy. That
  is the no-redundant-state rule violated to patch information the lower
  layer discards.
- The redundant copy creates a latent dead-end:
  `applyBattleCompanionHandoffToCharacterSheet`
  (`character-battle-runtime/src/index.ts:477,:488,:503`) errors on
  `battleOnly` identity + `admitted` state. Unreachable today only because
  in-battle casting is unwired (`castFindFamiliar` has no production
  consumer); the moment L13COMP-03 wires Pact/Wild-Companion Magic-action
  casts, "dismiss forever, then legally recast" becomes a settlement error,
  and battle-created familiars silently evaporate at settlement while their
  costs persist.
- In-battle recast resets battle-side `expiration` while settlement keeps
  the sheet protocol untouched (`{...sheetCompanion.companion, manifestation}`),
  so battle-side protocol facts have no path back to the sheet.

**Researched direction.** Make battle state alone carry the full settle-able
outcome; delete `companionAdmission` from the session.

- Replace entry deletion on permanent dismissal with a closed terminal state
  retaining identity (e.g. absent status `dismissedForever`). Settlement then
  reads: present/temporarilyDismissed/disappearedAtZeroHitPoints → write
  manifestation; dismissedForever (retained identity) → clear the sheet slot;
  no entry → owner never had a battle companion, sheet untouched.
- Spec-first: the QNT slice (`battle-runtime-find-familiar.qnt`) currently
  maps permanent dismissal to `NoFindFamiliar`, which conflates "never had
  one" with "dismissed forever" exactly the way the TS map deletion does.
  Add the terminal state to the lifecycle union in `battle-runtime-model.qnt`
  + slice + proofs first.
- Settlement should derive the durable protocol facts it writes from battle
  facts (`formAccess` + `expiration` — with T02's tag union this is a small
  total mapping), instead of assuming the sheet protocol is still true. That
  closes the recast-divergence half of F4 and is the hook L13COMP-03 needs
  for battle-created familiars to settle as durable companions later.
- Drop the `admission` parameter from
  `applyBattleCompanionHandoffToCharacterSheet`; remove
  `companionAdmissionStateForCharacter` (`start-battle-tool.ts:350`) and the
  session field; update `finalizeCharacterSessionsFromBattle`
  (`battle-handoff.ts:47`) and mcp tests/scenarios.

**HITL decision points** (flag in PR/task output; recommended defaults given
so implementation is not blocked): (a) does an in-battle recast over a
`dismissedForever` retained companion inherit the durable identity
(recommended: yes — RAW one-familiar-per-owner makes the durable slot "the
owner's one companion slot") — only relevant to spec/QNT now since casting is
unwired; (b) do battle-only companions of character-origin owners settle as
new durable companions (recommended: defer to L13COMP-03, but leave the
outcome union shaped so it slots in — document the deferral in the L13COMP
plan doc instead of silently dropping them).

Output: QNT lifecycle terminal state + proofs; battle-runtime tombstone
behavior; settlement reading battle alone and writing derived protocol;
session field and its glue deleted; updated tests across battle-runtime,
character-battle-runtime, mcp.

Acceptance: grep shows no `companionAdmission` anywhere; handoff identity
tests rewritten for the battle-derived outcome (including
dismissed-forever → slot cleared, and never-admitted → slot untouched, as
distinct test cases); qnt-proofs lane green; companion MBT files green under
mutex; mcp server tests + acceptance scenarios green.

### Task 4 - CSC-T04-DEAD-BATTLE-LONG-REST-LANE

Status: `done` · Mode: AFK (one HITL flag)

**Outcome.** Deleted the unreachable battle-state long-rest lane: the TS
`applyCompanionLongRestDisappearance` + `CompanionLongRestDisappearanceTrigger`
+ the private `companionDisappearsAtLongRest` helper, its barrel export, and its
test; the QNT `ownerLongRestFindFamiliarLifecycle` /
`allOwnersLongRestFindFamiliarLifecycle` defs and their proof block
(`test_retained_find_familiar_long_rest_disappearance_respects_expiration`). A
Long Rest cannot mutate a live `BattleState` (rests are out-of-battle); the
sheet's `companionAfterLongRest` owns Wild Companion expiration. Battle-side
`expiration` survives because T03's settlement derives the durable protocol from
it (`retainedCompanionProtocolFromBattle`).

**castFindFamiliar decision (HITL, owner-resolved): KEEP.** Owner decision 3
originally said "delete," premised on it being dead/tests-only. Research found
that premise contradicted: `castFindFamiliar` is the load-bearing
implementation-under-test for **both** companion MBT witnesses
(`find-familiar-companion-lifecycle` and `find-familiar-selected-identity`),
which verify cast, recast/form-adoption (RAW "adopt a new form"), dismissal, and
touch delivery. Deleting it would tear down both flagship parity drivers and the
witnesses the lane mandates stay green/unmodified. Surfaced via AskUserQuestion;
owner chose **keep it (record exception)**. Recorded here and pointed to in the
L13COMP-03 plan-doc section (it is intentionally not wired into discovery;
L13COMP-03 wires it with the Magic-action gates Pact/Wild-Companion RAW
requires).

Verification: battle-runtime TS typecheck + QNT typecheck green; `quint test
battle-runtime-core-combat-tests.qnt` green (105s, the only proof module
touched); battle-runtime non-MBT failing set unchanged from base (3 pre-existing
`unit-profile-admission-*` failures, unrelated). Companion MBT unaffected (no
battle-behavior change; witnesses unmodified) — green in T03.

**Finding (review F3-battle-half + dead exports).**
`applyCompanionLongRestDisappearance` + `CompanionLongRestDisappearanceTrigger`
(`find-familiar-lifecycle.ts:1138` region) have no production caller (tests +
barrel export only) and model a Long Rest mutating a live `BattleState`,
which cannot occur: rests are out-of-battle and the sheet's
`companionAfterLongRest` already owns expiration for every manifestation.
The QNT mirrors `ownerLongRestFindFamiliarLifecycle` /
`allOwnersLongRestFindFamiliarLifecycle` and their proofs formalize the same
unreachable lane. `castFindFamiliar` (`find-familiar-lifecycle.ts:220`) is
likewise an export with no production consumer.

**Researched direction.** Delete the battle long-rest lane: the TS function,
its trigger type, its tests, the barrel export, the two QNT defs and their
proof runs. Battle-side `expiration` survives **only if** T03 made
settlement consume it (expected); if T03 ended up not consuming it, delete
the field and its admission threading too — the rule then lives solely in the
sheet protocol. Dead-code rule: deleted code is recoverable from git history;
do not keep it "for future use".

**HITL flag:** `castFindFamiliar` keep-or-delete. Recommended: delete now
(recoverable; L13COMP-03 re-adds it wired into discovery with the Magic-action
gates Pact/Wild-Companion RAW requires — note the 1-hour/Ritual casting time
means ordinary casting must never be a battle act). If the owner prefers to
keep it pending L13COMP-03, record that as an explicit exception in the task
output and leave a pointer in the L13COMP plan doc.

Acceptance: greps show no `applyCompanionLongRestDisappearance` /
`ownerLongRestFindFamiliarLifecycle` / `allOwnersLongRestFindFamiliarLifecycle`;
qnt-proofs lane green; battle-runtime tests green; the castFindFamiliar
decision recorded.

### Task 5 - CSC-T05-COMPANION-REST-ASSUMPTION

Status: `done` · Mode: HITL (assumption), AFK (implementation)

**Outcome.** Owner decision 1 (resolved 2026-06-10): RAW-literal — the owner's
Long Rest does not touch a surviving companion; HP and THP both persist. Landed
ASSUMPTIONS.md **A46** to that effect (owner-curated; wording subject to owner
revision in PR). Aligned `companionAfterLongRest`: it now removes a surviving
companion only for the Wild Companion (owner-long-rest) protocol (direct SRD
Druid Wild Companion) and otherwise returns the companion unchanged; the prior
`retainedCompanionManifestationAfterLongRest` Temporary-Hit-Point-clearing
transform (the F3 half-behavior: cleared THP without restoring HP) is deleted.
The discriminating test now uses a 1/2-HP companion with 1 THP and asserts it
stays 1/1 after the owner's Long Rest — distinguishing no-participation (1/1)
from shared-rest heal (2/0) and the old half-behavior (1/0). Verification:
character-sheet-runtime typecheck + 95 tests green.

**Finding (review F3-sheet-half, RAW traceability).**
`companionAfterLongRest` / `retainedCompanionManifestationAfterLongRest`
(`character-sheet-runtime/src/index.ts:2830,:2847`) clear the companion's
THP on the **owner's** Long Rest but do not restore HP. RAW ties THP expiry
to the creature that finishes the rest; companion rest participation is
unmodeled, so "loses THP but doesn't heal" matches neither coherent reading.
No ASSUMPTIONS.md entry exists (the branch's own plan promised one). The
test at `index.test.ts:580` cannot discriminate because the cat fixture is
already at full HP (2/2). Wild Companion *disappearing* on the owner's Long
Rest is direct RAW and stays.

**Direction.** Draft ASSUMPTIONS.md A46 ("companion participation in the
owner's Long Rest") presenting the options with a recommendation, get owner
sign-off (HITL), then align the code and add a discriminating test (companion
below max HP, with THP). The two coherent options: (1) RAW-literal — the
owner's rest does not affect the companion; THP and HP both persist
(recommended: smallest deviation from RAW silence); (2) shared rest — the
companion finishes a Long Rest with its owner: regain all HP and lose THP.
Whichever is chosen, the half-participation currently implemented goes away.

Acceptance: A46 landed (owner-approved wording); sheet behavior matches it;
a test pins the chosen semantics with a fixture that distinguishes
heal/no-heal and THP-keep/clear; sheet tests green.

### Task 6 - CSC-T06-RECAST-SEMANTICS

Status: `done` · Mode: HITL (assumptions), AFK (implementation)

**Outcome.** Owner decision 2 (resolved 2026-06-10): preserve+clamp. Landed
ASSUMPTIONS.md **A47**: recasting an existing retained one-at-a-time companion
continues the durable identity, adopts the newly selected form, carries current
Hit Points clamped to the new form's maximum, keeps Temporary Hit Points, and
uses fresh form Hit Points/no Temporary Hit Points only when recasting after
0-HP disappearance. The out-of-battle creation path now reads the existing
Character Sheet companion: occupied-slot recasts reject a different durable
`companionId`, write the existing durable id, and derive Hit Points from the
existing manifestation; empty-slot creation keeps the prior full-HP minting
path. Tests cover recast-over-embodied, recast-over-temporarily-dismissed,
recast-over-disappeared-at-0, and replacement-id rejection. The in-battle
`castFindFamiliar` form-adoption path was already preserve+clamp and remains
unchanged; focused battle-runtime recast tests stayed green. Verification:
RAW/ubiquitous-language check against SRD 5.2.1 Find Familiar + Druid Wild
Companion and `UBIQUITOUS_LANGUAGE.md` "Controlled Creatures And Companions";
character-battle-runtime typecheck + 81 tests green; character-sheet-runtime
typecheck + full package test command green (120 tests); mcp typecheck + 94
tests green; focused battle-runtime recast tests green; `git diff --check`
green. Reviewer-loop notes: no reasonable RAW/domain/connascence/code-review
findings remained after tightening the occupied-slot path to write the existing
durable id rather than the caller value.

**Finding (review F4, RAW traceability + cross-layer consistency).**
Recasting over an existing companion has two different semantics by layer:
in-battle `castFindFamiliar` preserves HP across form adoption
(`hitPointsForFindFamiliarCast`, `find-familiar-lifecycle.ts:725`), resets
expiration, keeps identity; out-of-battle creation
(`createRetainedFamiliarLikeCompanion` → `replaceCharacterSheetCompanion`)
mints fresh full stat-block HP, a new protocol from the route, and lets the
caller change `companionId` (identity discontinuity is caller-chosen). RAW is
silent on HP carryover for "adopt a new eligible form", on HP after a 0-HP
recast ("It reappears after you cast this spell again"), and on whether the
Wild Companion rider ("when you cast the spell **in this way**") survives an
ordinary recast.

**Direction.** Draft ASSUMPTIONS.md A47 covering: HP carryover on
form-adoption recast (the in-battle implementation's preserve-and-clamp is a
reasonable recommendation), HP on recast after 0-HP disappearance
(recommendation: fresh form HP — the familiar re-forms), identity continuity
(recommendation: the durable slot persists; recast updates it in place, and
the out-of-battle operation should stop accepting a caller-supplied
replacement `companionId` when the slot is occupied — derive continuity
instead), and expiration/protocol carryover (the protocol follows the
casting route used, which T03's settlement-derivation already encodes for the
battle half). After sign-off, align the out-of-battle path with the same
semantics and add tests for recast-over-embodied, recast-over-dismissed, and
recast-over-disappeared.

Acceptance: A47 landed; one recast semantic across layers, tested at both;
sheet/character-battle/mcp tests green.

### Task 7 - CSC-T07-FORM-VOCAB-HOIST-CREATION-MOVE

Status: `done` · Mode: AFK

**Outcome.** Familiar-form vocabulary now lives at the Surface structural-reader
boundary (`packages/surface/src/surface/find-familiar-forms.ts`), with
`@dnd/battle-runtime` retaining only a compatibility re-export. The sheet layer
uses the same `PactOfTheChainFindFamiliarFormSelection` shape as Surface and
battle; the `specialForm`/`pactOfTheChainSpecialForm` translation helpers are
deleted. `createRetainedFamiliarLikeCompanion` and its out-of-battle route/cost
validation moved into `character-sheet-runtime`; `character-battle-runtime` now
only admits/settles already-retained sheet companion facts. The MCP delegator
imports the creation operation from sheet-runtime and narrows tool-supplied Pact
special form ids at the boundary. `spendCharacterSheetSpellSlot` is private
again.

Verification: base check against `3ed43a403` green; RAW/ubiquitous-language
review found no new rule semantics beyond moving the existing creation boundary;
architecture/connascence review removed the duplicate form tag and stale
creation helper block. Green gates:
`pnpm --filter @dnd/surface typecheck`,
`pnpm --filter @dnd/battle-runtime typecheck`,
`pnpm --filter @dnd/character-sheet-runtime typecheck`,
`pnpm --filter @dnd/character-battle-runtime typecheck`,
`pnpm --filter @dnd/mcp typecheck`,
`pnpm unit-profile-coverage:check`,
`pnpm --filter @dnd/character-sheet-runtime test -- src/index.test.ts`,
`pnpm --filter @dnd/character-battle-runtime exec vitest run src/index.test.ts`,
`pnpm --filter @dnd/mcp test -- src/server.test.ts`,
`pnpm --filter @dnd/battle-runtime exec vitest run src/battle-runtime-find-familiar-and-pact.test.ts src/find-familiar-lifecycle.test.ts`,
and
`pnpm --filter @dnd/surface exec vitest run src/surface/stat-block-catalog.test.ts src/surface/unit-catalog.test.ts`.
The broader `pnpm --filter @dnd/surface test` run still has an unrelated
Wizard spellcasting fixture expectation mismatch in
`src/surface/character-creation-records.test.ts`; the moved familiar-form
reader's catalog tests passed.

**Findings (review F7+F8, boundary placement + duplicated vocabulary).**
Out-of-battle creation lives in `character-battle-runtime`
(`createRetainedFamiliarLikeCompanion`, `index.ts:264`) against the branch
plan's own boundary ("character-sheet-runtime owns durable companion
parsing, construction… out-of-battle source-cost settlement"; the MCP
delegator should target "a character-sheet-runtime typed operation"), and
`spendCharacterSheetSpellSlot` was exported to support it. Cause: the
familiar-form vocabulary lives in battle-runtime, which sheet-runtime cannot
import. The sheet layer therefore re-states it weakened:
`CHARACTER_SHEET_COMPANION_CREATURE_TYPE_OVERRIDES` drops
`satisfies ReadonlyArray<CreatureType>`;
`CharacterSheetCompanionFormSelection.formId` is bare `string` where battle
has `FindFamiliarNormalFormRef["formId"]`; `specialForm` ↔
`pactOfTheChainSpecialForm` needs translation helpers in both directions.

**Researched direction.** The form vocabulary
(`find-familiar-forms.ts`: eligibility/resolution/refs/override choices) is
derived entirely from Surface record shapes + `StatBlockCatalog` — no battle
state. Candidate homes, in preference order: (a) `@dnd/surface` — the
package ownership table gives surface "structural readers", and
`PACT_OF_THE_CHAIN_SPECIAL_FORM_REFS` is authored catalog identity, which is
an allowed surface boundary; (b) a small shared leaf in `@dnd/shared-algebras`
if surface's build/codegen layout makes (a) awkward. After the hoist: both
runtimes consume one vocabulary (sheet's duplicated array/union and the
translation helpers are deleted), move `createRetainedFamiliarLikeCompanion`
+ its source-route validation into `character-sheet-runtime`, re-privatize
`spendCharacterSheetSpellSlot`, and repoint the MCP delegator
(`character-tools.ts`). `characterSpellcasting` reads only
build/unitLibrary/spellSlots, so it can move (or be re-exposed) wherever the
creation routes need it; prefer moving the projection over duplicating it.
Preserve `UNIT-PROFILE-COVERAGE`/`KERNEL-COVERAGE` markers with the moved
code and re-run the coverage check.

Acceptance: dependency direction unchanged (sheet-runtime still does not
import battle-runtime); one creature-type-override array and one form
selection union exist repo-wide (grep); creation lives in sheet-runtime; mcp
delegator compiles against it; `pnpm unit-profile-coverage:check` green; all
four package suites green.

### Task 8 - CSC-T08-CREATION-HP-SURFACE

Status: `blocked` · Mode: AFK

**Finding (review F9, absurdity check).** The MCP creation op accepts
arbitrary `currentHp`/`tempHp`
(`character-tool-input.ts:204-205`); `retainedCompanionCreationHitPoints`
checks only positivity, never the stat-block maximum, and the caller value
wins even when literal HP exists. `currentHp: 999999, tempHp: 50` on a Cat
parses and persists; THP at creation has no source.

**Researched direction.** All 39 shipped stat-block HP payloads are
`kind: "literal"`, so there is no current need for a rolled-HP table fact.
Remove `currentHp` and `tempHp` from the operation schema and the creation
input; creation always uses the resolved form's literal HP with zero THP;
keep a typed rejection for a future non-literal stat block ("requires
literal Stat Block HP") so widening fails loudly rather than silently — if
non-literal HP content lands later, that rejection is the signal to add an
explicit rolled-HP witness then (note this in the code at the rejection
site). Settlement-written HP is already bounded by battle combat rules and
is unaffected.

Acceptance: schema fields gone; server tests updated (including a rejection
test removed/replaced as appropriate); mcp + character-battle (or sheet,
post-T07) suites green.

### Task 9 - CSC-T09-FORM-CATALOG-REFERENCE

Status: `blocked` · Mode: AFK

**Finding (review F10, "first" trigger word).**
`retainedFamiliarLikeFormEligibility` (`character-battle-runtime/src/index.ts:1214`,
or its post-T07 home) re-derives admission eligibility by scanning the whole
unit library for any spell with a familiar form catalog and taking the
first match — and the match predicate returns `true` unconditionally for
`challengeRatingZeroBeast`/`specialForm` selections, so the chosen
eligibility is iteration-order-dependent the moment a second
familiar-form-catalog spell exists.

**Researched direction.** Exactly one Surface spell carries
`familiar_form_catalog` today (`find_familiar.dhall`). Options, by
preference: (a) make uniqueness executable — resolve "the familiar form
catalog" through a helper that returns a typed issue when zero or multiple
catalogs exist (fails loudly on widening, no order dependence); (b) persist
the small form-catalog facts the admission actually needs in the durable
proof at creation time, so admission stops re-deriving. Option (a) is the
smaller change; (b) removes the re-derivation entirely but grows the stored
shape — pick after looking at what reappearance/recast actually consume from
eligibility post-T03/T06.

Acceptance: no first-match scan remains (grep `.find(` in the eligibility
helper); a test covers the multiple-catalog rejection (synthetic second
catalog fixture) or the persisted-facts path; suites green.

### Task 10 - CSC-T10-SMALL-FINDINGS-BATCH

Status: `blocked` · Mode: AFK

Close the remaining review findings (F11 batch), each small and local:

- **Admission caller-fact narrowing:** `companionAdmissionManifestation`
  (`character-battle-runtime/src/index.ts:541`) runtime-checks three
  interdependent optionals and `admitCharacterSheetCompanionToBattle`
  (`:420`) re-checks `companionCombatantId` because the inner narrowing is
  discarded. Keep wire-level optionality at the tool schema; give the typed
  core per-manifestation caller-fact shapes so each fact is checked once.
  Replace the `Parameters<typeof admitCompanionToBattle>[0][…]` introspection
  types with named exported types from battle-runtime.
- **Route rule enforced twice:** `retainedCompanionProtocolIssue`
  (`character-sheet-runtime/src/index.ts:1528`) enforces
  owner-long-rest → fey generically, duplicating the creation route's
  `fixedCreatureTypeOverrideChoiceId` and wrongly rejecting any future
  non-fey long-rest companion. Move the fey rule to the route that owns it;
  if the specialForm → attack-exception cross-check stays as an executable
  invariant, name its RAW anchor (Pact of the Chain) at the check site.
- **Id constructor as boundary:** `characterSheetRetainedCompanionId`
  (`:317`) brands any string; non-emptiness is re-checked at three sites.
  Make the constructor total (Either or a parse helper) and let the brand
  carry the fact.
- **Typed-path revalidation:** `replaceCharacterSheetCompanion` (`:1486`)
  re-runs `companionFromInput` on an already-typed value, including a branch
  that narrows to `never`. Split the unknown-input parse path from the typed
  path per the repo's `f`/`fRaw` pattern.
- **Dead export:** `RetainedCompanionFormSelectionToolInput`
  (`character-tool-input.ts:260`) has no consumer; delete (its
  conditional-type formulation goes with it).
- **Misc:** unused first parameter of `presentCompanionCombatantId` (if T01
  left it alive); duplicated spell-slot branch in
  `spendRetainedCompanionCreationSourceCost`; entry/snapshot
  `combatantId`/`companionId` rename noise if any survived T01.
- **Durable companion id uniqueness owner (added 2026-06-11, arch-review
  R4b):** ids are caller-minted (`character-tools.ts:317` brands the raw tool
  string); the only cross-companion uniqueness check is at battle admission
  (`find-familiar-lifecycle.ts` `companionDurableIdentityInUse`), so two
  characters with coincidentally equal companion ids both parse at creation
  and fail only at `start_battle` with a confusing admission error. Options:
  (1) recommended/default — session-store uniqueness: the MCP creation
  operation rejects a durable companion id already used by a different
  character's retained companion (typed rejection + server test); (2)
  server-minted ids (wire change); (3) document caller-owned collision risk.
  HITL: flag the choice in the task output; proceed with (1) if unanswered —
  the owner may veto in PR review.
- **Do not dedupe the protocol constructors here** (arch-review R4c):
  `ordinaryFamiliarLikeProtocol`/`pactFamiliarLikeProtocol`/
  `ownerLongRestExpiringFamiliarLikeProtocol` are duplicated across
  `companions.ts:823–833` and `character-battle-runtime/src/index.ts:438–448`,
  but Task 15 absorbs them into the shared-algebras leaf. Dedupe in T10 only
  if Task 15 has been rejected by the time T10 runs.

Several of these may already be dissolved by T01–T07; verify each against
HEAD before editing and record "already closed by Tnn" where true.

Acceptance: each bullet either closed with a citation or recorded as
already-dissolved; suites + typechecks green.

### Task 11 - CSC-T11-CONVERGENCE-CLOSEOUT

Status: `blocked` · Mode: AFK

Run the full gate set and make the documentation truthful:

- Full verification: typechecks for shared-algebras, battle-runtime,
  character-sheet-runtime, character-battle-runtime, mcp; their test suites
  (including the restored `character-sheet-runtime/src/companions.test.ts`
  from T12); the two companion MBT files plus
  `character-battle-settlement.mbt.test.ts` (mutex protocol);
  `test:qnt-proofs`; `pnpm unit-profile-coverage:check`;
  `node scripts/audit-character-sheet-runtime-split.mjs`; `git diff --check`.
- Reviewer-loop convergence over the whole lane diff (RAW traceability,
  ubiquitous language, architecture/connascence, code review) until no
  reasonable findings remain; document rejected notes with reasons.
- Update `plans/COMPANION_SESSION_ADMISSION_AND_REAPPEARANCE_PLAN.md`:
  L13COMP-01 status reflects the landed design (settlement outcome model,
  no session-level admission copy, creation in sheet-runtime), and the
  L13COMP-03 row records the explicit deferrals from T03/T04 (battle-created
  familiar settlement; wired Magic-action casting with its admission gates).
- Confirm `plans/COMPANION_SESSION_ARCH_REVIEW_FOLLOWUPS.md` and
  `docs/adr/0005-battle-companion-rule-source-module-naming.md` match what
  tasks 12–16 actually landed (e.g. the T16 error-code decision, the T10
  durable-id decision).
- Confirm ASSUMPTIONS.md A46/A47 wording matches the implemented behavior —
  in particular that T12 restored the A46 semantics exactly.

Acceptance: all gates green in one run from a clean tree; plan docs, ADR, and
assumptions match the code; lane summary in the task output lists each review
finding F1–F11 and arch-review item R0–R4 with its closing task/commit.

### Task 12 - CSC-T12-R0-LONG-REST-COMPANION-RESTORE

Status: `done` · Mode: AFK · Regression fix (arch-review
R0)

**Finding (regression introduced by merge `e5d9ccea6`).** The origin/master
merge (parents `64bd4ec90` = T07, `bb28c152e` = master) adopted master's
split of the sheet runtime (`84198a859` dissolved `index.ts`/`index.test.ts`
into per-module files) and silently dropped two things this branch had
landed:

- `companionAfterLongRest` — present at `1b0d227c5`
  (`packages/character-sheet-runtime/src/index.ts:2781` call inside
  `completeLongRest`, `:2861` definition). At HEAD, `completeLongRest`
  (`packages/character-sheet-runtime/src/rests.ts:214`) spreads `...sheet`
  on both return paths with no companion transform: a Wild Companion
  familiar no longer disappears when its owner finishes a Long Rest — direct
  SRD RAW (Druid Wild Companion), the behavior T05 landed under A46.
  `retainedCompanionProtocolFacts(...).expiration` has exactly one
  production reader left (admission threading,
  `character-battle-runtime/src/index.ts:321`); the rule executes nowhere.
- The entire sheet-side companion test block — 48 companion references at
  `1b0d227c5` `index.test.ts` (~lines 322–590: `retainedCompanionInput` /
  `retainedCompanionProtocolInput` fixtures plus eight tests); zero
  companion references in any `character-sheet-runtime` test at HEAD. The
  866-line `companions.ts` has no direct test file.

**Direction.** Restore with better locality than before:

1. Reintroduce `companionAfterLongRest(companion): CharacterSheetCompanion`
   in `packages/character-sheet-runtime/src/companions.ts` with the A46
   comment from the `1b0d227c5` version (owner's Long Rest leaves a
   surviving companion untouched — HP and Temporary Hit Points persist; only
   the owner-long-rest protocol's companion is removed, via
   `isOwnerLongRestRetainedCompanionProtocol` /
   `retainedCompanionProtocolFacts(...).expiration`). Export from
   `companions.ts` for intra-package use; do **not** add it to the
   `index.ts` barrel (keeps `scripts/audit-character-sheet-runtime-split.mjs`
   EXPECTED_EXPORTS untouched).
2. In `completeLongRest` (`rests.ts`): compute
   `const companion = companionAfterLongRest(sheet.companion)` once before
   the spellcasting branch and include `companion` in **both** return-path
   spreads (the T06 shape).
3. Recover the test block from
   `git show 1b0d227c5:packages/character-sheet-runtime/src/index.test.ts`
   (region ~322–590) into a new
   `packages/character-sheet-runtime/src/companions.test.ts`, adapted to the
   post-split module layout. The eight tests: empty-slot create/parse;
   retained companion with resolved form proof; reject zero current HP;
   reject empty durable id; reject protocol hybrids (parameterized:
   special-form without attack-exception; owner-long-rest without Fey
   override); reject unknown stored protocol tag; owner-long-rest companion
   removed on Long Rest; surviving companion HP/THP unchanged on Long Rest
   (A46 — the discriminating 1/2-HP + 1-THP fixture asserting 1/1 after).

**RAW anchors (re-read before implementing):**
`.references/srd-5.2.1/Classes/Druid.md` Wild Companion;
`.references/srd-5.2.1/Playing-the-Game.md` Temporary Hit Points, Long Rest;
`ASSUMPTIONS.md` A46/A47; `UBIQUITOUS_LANGUAGE.md` "Controlled Creatures And
Companions".

Acceptance: `completeLongRest` removes a retained companion iff its
protocol's expiration fact is `ownerFinishedLongRest`, on both return paths;
all other companions round-trip unchanged (HP and THP). `companions.test.ts`
exists with the eight tests green;
`pnpm --filter @dnd/character-sheet-runtime test` + typecheck green; task
output cites the grep showing `companionAfterLongRest` called from
`rests.ts`; `node scripts/audit-character-sheet-runtime-split.mjs` green (no
new barrel exports).

### Task 13 - CSC-T13-R3LITE-ALIAS-FAMILY-DELETION

Status: `blocked` (depends on Task 12) · Mode: AFK · Arch-review R3-lite

**Finding.** `find-familiar-lifecycle.ts:82–100` defines a type-alias family
(`FindFamiliarState = BattleCompanionState` and siblings:
Present/TemporarilyDismissed/DisappearedAtZeroHitPoints/Absent states,
`Snapshot`, `Placement`, `StoredForm`, `SelectedForm`, `HitPoints`,
`CurrentHitPoints`), and `companion-state.ts:99` defines the reverse alias
`FindFamiliarDisappearedAtZeroHitPointsState`. Verified usage: ~6 internal
sites in the lifecycle module, 2 barrel re-exports in
`battle-runtime/src/index.ts`, zero consumers in character-battle-runtime,
mcp, or app. Two names for one concept.

The larger rename (module/profile to `companion-lifecycle`) was **rejected**
— see `docs/adr/0005-battle-companion-rule-source-module-naming.md`: the
battle mechanics are Find Familiar SRD text; the QNT slice, both witnesses,
and the `spell.find-familiar-lifecycle` coverage profile
(`plans/unit-profile-coverage/profiles.jsonl` pins the paths) name that rule
source. Do not rename or split files in this task.

**Direction.** Delete the alias block and the reverse alias; replace the ~9
use sites and the barrel re-exports with the `BattleCompanion*` names. Keep
the genuinely distinct operation-input types (`FindFamiliarCastInput`,
`WildCompanionCastInput`, `FindFamiliarReappearanceInput`,
`FindFamiliarOwnerInput`, `FindFamiliarLifecycleInputBase`) — authored-route
inputs, not duplicate state vocabulary.

Acceptance: grep shows none of the deleted alias names repo-wide;
battle-runtime typecheck green; focused tests green
(`pnpm --filter @dnd/battle-runtime exec vitest run src/find-familiar-lifecycle.test.ts src/battle-runtime-find-familiar-and-pact.test.ts`);
`profiles.jsonl`, evidence files, and coverage marker comments unchanged.

### Task 14 - CSC-T14-R4A-FORMS-SHIM-DELETION

Status: `blocked` (depends on Task 13) · Mode: AFK · Arch-review R4a

**Finding.** `packages/battle-runtime/src/find-familiar-forms.ts` (21 lines)
is a pure pass-through re-export of
`@dnd/surface/surface/find-familiar-forms`, left by T07 as a "compatibility"
shim — which contradicts the repo's no-external-consumers rule.
`character-sheet-runtime` and `mcp` already import the surface module
directly.

**Direction.** Delete the shim; repoint the internal importers
(`companion-state.ts:9`, `find-familiar-state.ts:5`,
`find-familiar-lifecycle.ts:66,70`, `character-battle-resources.ts:41`,
`battle-reducer/battle-codecs.ts:81–82`) to
`@dnd/surface/surface/find-familiar-forms`. For the barrel re-export
(`battle-runtime/src/index.ts:125` region): grep which consumers import the
form vocabulary via `@dnd/battle-runtime`; prefer repointing them to surface
and dropping the barrel re-export so the vocabulary has one import home.

Acceptance: shim file deleted; grep shows no import of
`battle-runtime/src/find-familiar-forms` (relative or via barrel);
battle-runtime + affected package typechecks and focused suites green.

### Task 15 - CSC-T15-R2-PROTOCOL-TAG-HOIST

Status: `blocked` (depends on Task 10) · Mode: AFK · Arch-review R2,
owner-approved 2026-06-11

**Finding (connascence of algorithm).** The durable companion protocol tag is
projected into battle as two facts and reconstructed by a hand-maintained
inverse mapping: forward, `battleFormAccessForSheetCompanion`
(`character-battle-runtime/src/index.ts:725`) derives `formAccess` from the
protocol tag and admission threads
`retainedCompanionProtocolFacts(...).expiration` (`:321`); inverse,
`retainedCompanionProtocolFromBattle` (`:424`) reconstructs the tag from
`formAccess` + `expiration` at settlement, assuming
`formAccess === "pactOfTheChain"` implies the attack-exception protocol. The
first protocol that reuses Pact form access without the attack exception (or
any fourth protocol, e.g. Find Steed) silently mislabels the settled Sheet
protocol instead of failing to compile.

Pre-verified facts (2026-06-11; re-verify only if an earlier task changed
them):

- Battle-side `expiration` is pure freight: every TS read
  (`find-familiar-lifecycle.ts:472–1095`,
  `battle-reducer/damage-apply.ts:793`) and every QNT read
  (`battle-runtime-find-familiar.qnt`) copies it through transitions;
  nothing branches on it since T04 deleted the battle long-rest lane.
- The Pact attack exception does **not** read companion protocol facts: the
  gate is `combatantHasPactOfTheChainFindFamiliar`
  (`find-familiar-pact-chain.ts:107`), reading the owner's
  `invocationSpellAccesses`. **Keep that gate where it is** — moving it to
  protocol facts would be a rule-semantics change outside this lane.
- Neither companion MBT witness mentions `expiration` (witness `.qnt` files
  stay unmodified; driver glue has no expiration mapping). No MCP test
  asserts it; `BattleCompanionExpirationSchema`
  (`battle-reducer/battle-codecs.ts:141`) is internal state codec only.

**Direction.**

1. New leaf `packages/shared-algebras/companion-protocol-algebra.ts`
   (matches the package's domain-named algebra convention; sheet, battle,
   and bridge already depend on `@dnd/shared-algebras`): the
   `RETAINED_COMPANION_PROTOCOL_TAGS` const array, derived tag type, facts
   type + table (moved from
   `character-sheet-runtime/src/sheet-types.ts:190–242`), the three protocol
   constructors (absorbing the duplicates in `companions.ts:823–833` and
   `character-battle-runtime/src/index.ts:438–448`), the tag guards, and a
   new `formCatalog: "findFamiliar" | "pactOfTheChain"` column so the
   form-family derivation is table-driven. Protocol tags are rule
   vocabulary, not authored catalog identity — shared-algebras, not surface.
2. **QNT-first:** replace `FindFamiliarExpiration` with a three-tag
   `FindFamiliarProtocol` in `battle-runtime-model.qnt:92–127` (all
   lifecycle variants); thread through `battle-runtime-find-familiar.qnt`
   (mechanical — the field is freight) and the proofs in
   `battle-runtime-core-combat-tests.qnt`.
3. TS battle: `BattleCompanionProtocolState` carries `protocol` (the tag)
   instead of `expiration`; delete `BattleCompanionExpiration`; casts choose
   tags (`castWildCompanion` → owner-long-rest, `castFindFamiliar` →
   ordinary); update threading sites mechanically; codec schema becomes a
   literal-union tag schema.
4. Bridge: admission threads `protocol: companion.protocol.tag`; settlement
   **copies** the tag back; delete `retainedCompanionProtocolFromBattle` and
   the duplicated constructors; derive the stored-form family from the facts
   table.
5. Sheet: `CharacterSheetRetainedCompanionProtocol` re-points to the leaf
   tag type; update the `scripts/audit-character-sheet-runtime-split.mjs`
   EXPECTED_EXPORTS allowlist for any barrel names that move.

Notes: battle-only cast familiars now carry a protocol tag from birth — the
hook the deferred L13COMP-03 battle-only settlement needs. The facts table's
`attack`/`dismissal`/`initiative` columns deliberately stay despite having
no executable consumer today; they become load-bearing when a protocol
actually differs.

Acceptance: one tags/facts/constructors definition site repo-wide (grep); no
`retainedCompanionProtocolFromBattle`, no `BattleCompanionExpiration`;
witness `.qnt` files unmodified; both companion MBT files green under the
mutex protocol; touched proof modules green (`quint test
battle-runtime-core-combat-tests.qnt` or the full `test:qnt-proofs` lane);
typecheck + focused suites green for shared-algebras, battle-runtime,
character-sheet-runtime, character-battle-runtime, mcp;
`pnpm unit-profile-coverage:check` and the sheet split audit green.

### Task 16 - CSC-T16-R1-SINGLE-SETTLEMENT-OPERATION

Status: `blocked` (depends on Task 15) · Mode: AFK · Arch-review R1

**Finding (caller-sequencing connascence; CLAUDE.md "replace caller
sequencing requirements with one operation").** Settlement of one domain
event is exposed as two operations the caller must sequence:
`applyBattleHandoffToCharacterSheet`
(`character-battle-runtime/src/index.ts:190`) then
`applyBattleCompanionHandoffToCharacterSheet` (`:362`) on the result. The
ordering knowledge lives in the sole production caller,
`packages/mcp/src/battle-handoff.ts:34,47`. A future settlement caller that
forgets the second call silently keeps a stale durable companion on the
sheet. The deferred L13COMP-03 battle-only settlement belongs behind this
same seam.

**Direction.**

1. One exported operation in `character-battle-runtime`:
   `settleCharacterSheetFromBattle({ sheet, state, combatant, unitLibrary,
   statBlockCatalog })` performing creature handoff then companion handoff
   internally; the two existing functions become private helpers.
2. Move the companion admission/settlement section (post-T15 location of the
   `index.ts:294–825` region) into a module, e.g. `companion-handoff.ts`,
   matching the package's existing layout; `index.ts` stays the barrel.
   Preserve any `KERNEL-COVERAGE`/`UNIT-PROFILE-COVERAGE` markers with the
   moved code.
3. Update `mcp/src/battle-handoff.ts` to the single call. No MCP test
   asserts the `CHARACTER_SESSION_HANDOFF_INVALID` /
   `COMPANION_SESSION_HANDOFF_INVALID` split (verified by grep), so collapse
   to one error code with the issue message and record the wire change in
   the task output; if review wants the phase distinction kept, add a phase
   discriminant to `CharacterSheetBattleHandoffIssue` instead of a second
   exported operation.
4. Rewrite test call sites against the combined operation: 22 usages in
   `character-battle-runtime/src/index.test.ts`, 9 in
   `character-battle-settlement.mbt.test.ts` (driver glue only — the
   settlement witness `.qnt` stays unmodified; a state with no battle
   companion makes companion handoff a no-op, so creature-only expectations
   carry over mechanically). If a half must stay exported as the settlement
   MBT's implementation-under-test, record that as an explicit exception per
   the T04 `castFindFamiliar` precedent; otherwise privatize both.

Acceptance: one exported settlement operation; grep shows no production
caller of the two halves; `pnpm --filter @dnd/character-battle-runtime`
typecheck + unit suite green; `pnpm --filter @dnd/mcp` typecheck +
`server.test.ts` green; `character-battle-settlement.mbt.test.ts` green
under the MBT mutex protocol; `pnpm unit-profile-coverage:check` green if
marked code moved.
