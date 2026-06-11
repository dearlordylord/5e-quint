# Companion Session Architecture Review Followups (R0–R4)

Date: 2026-06-11. Source: post-merge architecture review of branch
`codex/l13comp-session-admission-design` at `e5d9ccea6` (review candidates
R0–R4). R2 and R3 were design explorations; after exploration the owner
approved (2026-06-11) adding **R2** (protocol-tag hoist, after CSC-T10) and
**R3-lite** (alias-family deletion) to this plan. R3's full module rename was
**rejected** on domain grounds — recorded in
`docs/adr/0005-battle-companion-rule-source-module-naming.md`. This plan runs
on the PR branch, same rules as
`plans/RALPH_LANE_COMPANION_SESSION_CONVERGENCE.md`: declared base ref is the
branch, never rebase onto or merge `master`, run the base check before each
task, one sequential lane (the tasks share files with CSC-T08..T11).

Sequencing against the convergence lane:

- **R0 runs first, before CSC-T08.** It is a regression fix, not a refactor;
  CSC-T11's convergence gate cannot pass honestly while a direct-RAW rule is
  silently unexecuted. R0 touches `companions.ts` (same file as T08, different
  region) and `rests.ts` (no lane task touches it).
- **R3-lite and R4a may run anytime** (battle-runtime only, no lane-file
  overlap); they pair naturally in one session.
- **After CSC-T10: R2, then R1, then CSC-T11.** T08/T09/T10 edit
  `character-battle-runtime/src/index.ts` and the MCP tools. R2 reshapes the
  protocol threading and deletes the settlement inverse-mapping; R1 then moves
  the companion section in its final shape — code moves once (the lane's own
  CSC-T07 rationale).
- **R4b folds into CSC-T10's session** (adjacent to T10's id-constructor
  bullet). **R4c is superseded by R2** — skip unless R2 is rejected during
  implementation.

## Task R0 — Restore the Long Rest companion expiration and the sheet companion tests

Status: ready-for-implementation · Mode: AFK · Priority: regression fix

**Finding (architecture review R0; regression introduced by merge
`e5d9ccea6`).** The merge of origin/master (parents `64bd4ec90` = CSC-T07,
`bb28c152e` = master) adopted master's split of the sheet runtime
(`84198a859` "Split character sheet runtime tests" dissolved `index.ts` and
`index.test.ts` into per-module files) and silently dropped two things the
branch had landed:

- `companionAfterLongRest` — present at `1b0d227c5`
  (`packages/character-sheet-runtime/src/index.ts:2781` call inside
  `completeLongRest`, `:2861` definition). At HEAD, `completeLongRest`
  (`packages/character-sheet-runtime/src/rests.ts:214`) spreads `...sheet`
  on both of its return paths with no companion transform. Result: a Wild
  Companion familiar no longer disappears when its owner finishes a Long
  Rest — direct SRD RAW (Druid Wild Companion), the exact behavior CSC-T05
  landed under A46. `retainedCompanionProtocolFacts(...).expiration` now has
  exactly one production reader (battle admission threading,
  `packages/character-battle-runtime/src/index.ts:321`); the expiration rule
  itself executes nowhere.
- The entire sheet-side companion test block — at `1b0d227c5`,
  `index.test.ts` had 48 companion references (~lines 322–590: the
  `retainedCompanionInput`/`retainedCompanionProtocolInput` fixtures plus
  eight tests). At HEAD, zero companion references exist in any
  `character-sheet-runtime` test. The 866-line `companions.ts` has no direct
  test file; remaining coverage is indirect via `mcp/src/server.test.ts`
  (6,386 lines) and `character-battle-runtime/src/index.test.ts`
  (5,121 lines).

**Direction.** Restore with better locality than before — the rule was lost
precisely because it lived in a 2,900-line `index.ts` that two branches
edited concurrently:

1. Reintroduce `companionAfterLongRest(companion: CharacterSheetCompanion):
   CharacterSheetCompanion` in
   `packages/character-sheet-runtime/src/companions.ts` (the Companion
   module), with the A46 comment from the `1b0d227c5` version: the owner's
   Long Rest does not touch a surviving retained companion (HP and Temporary
   Hit Points persist); the only companion it removes is the owner-long-rest
   (Wild Companion) protocol, per `retainedCompanionProtocolFacts(...)
   .expiration` / `isOwnerLongRestRetainedCompanionProtocol`. Export it from
   `companions.ts` for intra-package use; do **not** add it to the `index.ts`
   barrel (keeps `scripts/audit-character-sheet-runtime-split.mjs`
   EXPECTED_EXPORTS untouched).
2. Call it in `completeLongRest` (`rests.ts`): compute
   `const companion = companionAfterLongRest(sheet.companion)` once before
   the spellcasting branch and include `companion` in **both** return-path
   spreads (the T06 shape had exactly this structure).
3. Recover the test block from
   `git show 1b0d227c5:packages/character-sheet-runtime/src/index.test.ts`
   (region ~322–590) into a new
   `packages/character-sheet-runtime/src/companions.test.ts`, adapted to the
   post-split module layout (imports from `./companions.ts`,
   `./sheet-types.ts`, `./rests.ts`, current `test-support.ts` helpers). The
   eight tests to restore:
   - creates and parses an empty durable companion slot;
   - retains one familiar-like companion with resolved form proof;
   - rejects retained embodied companions with zero current HP;
   - rejects retained companions with an empty durable id;
   - rejects retained companion protocol hybrids (parameterized:
     special-form without attack-exception protocol; owner-long-rest without
     Fey creature type override);
   - rejects a stored retained companion protocol with an unknown tag;
   - removes owner-long-rest retained companions on Long Rest;
   - leaves a surviving retained companion's Hit Points and Temporary Hit
     Points unchanged on Long Rest (A46 — the discriminating 1/2-HP + 1-THP
     fixture asserting 1/1 after the rest).

**RAW anchors (re-read before implementing):**
`.references/srd-5.2.1/Classes/Druid.md` Wild Companion (disappearance when
the Druid finishes a Long Rest), `.references/srd-5.2.1/Playing-the-Game.md`
Temporary Hit Points and Long Rest, `ASSUMPTIONS.md` A46/A47,
`UBIQUITOUS_LANGUAGE.md` "Controlled Creatures And Companions".

**Acceptance:**

- `completeLongRest` removes a retained companion iff its protocol's
  expiration fact is `ownerFinishedLongRest`, on both return paths; all other
  companions round-trip unchanged (HP and THP).
- `companions.test.ts` exists with the eight restored tests green;
  `pnpm --filter @dnd/character-sheet-runtime test` and `typecheck` green.
- Grep evidence in the task output that the expiration rule has an executor
  (`companionAfterLongRest` called from `rests.ts`).
- `node scripts/audit-character-sheet-runtime-split.mjs` (or its `pnpm`
  wrapper, if wired) still green — no new barrel exports.

## Task R1 — One settlement operation for "the battle ended for this character"

Status: blocked on R2 (which is blocked on CSC-T10) · Mode: AFK

**Finding (architecture review R1; CLAUDE.md connascence rule "replace caller
sequencing requirements with one operation").** Settlement of one domain
event is exposed as two operations the caller must sequence:
`applyBattleHandoffToCharacterSheet`
(`packages/character-battle-runtime/src/index.ts:190`) then
`applyBattleCompanionHandoffToCharacterSheet` (`:362`) on the result. The
ordering knowledge lives in the sole production caller,
`packages/mcp/src/battle-handoff.ts:34,47`. A future settlement caller that
forgets the second call silently keeps a stale durable companion on the
sheet — no compile error, no runtime error. The deferred L13COMP-03 work
(battle-only familiars settling as new durable companions) belongs behind
this same seam.

**Direction.**

1. Add one exported operation to `character-battle-runtime`:
   `settleCharacterSheetFromBattle({ sheet, state, combatant, unitLibrary,
   statBlockCatalog })` performing creature handoff then companion handoff
   internally. The two existing functions become private helpers.
2. While touching the file, move the companion admission/settlement section
   (`index.ts:294–825` at HEAD; re-locate after T08–T10) into a module,
   e.g. `companion-handoff.ts`, matching the package's existing layout
   (`battle-creature-init.ts`, `battle-character-build-projection.ts`,
   `battle-support-profiles.ts`); `index.ts` stays the barrel. Preserve any
   `KERNEL-COVERAGE`/`UNIT-PROFILE-COVERAGE` markers with the moved code and
   re-run the coverage check.
3. Update `mcp/src/battle-handoff.ts` to the single call. No MCP test asserts
   the `CHARACTER_SESSION_HANDOFF_INVALID` / `COMPANION_SESSION_HANDOFF_INVALID`
   split (verified by grep), so collapse to one error code with the issue
   message; record the wire change in the task output. If reviewers want the
   phase distinction kept, add a phase discriminant to
   `CharacterSheetBattleHandoffIssue` instead of a second exported operation.
4. Rewrite test call sites against the combined operation: 22 usages in
   `character-battle-runtime/src/index.test.ts`, 9 in
   `character-battle-settlement.mbt.test.ts` (driver glue only — the
   settlement witness `.qnt` stays unmodified; a state with no battle
   companion makes companion handoff a no-op, so existing creature-only
   expectations carry over mechanically).

**Acceptance:**

- One exported settlement operation; grep shows no production caller of the
  two halves (tests may exercise them only if a half remains the
  implementation-under-test for the settlement MBT witness — if so, record
  that as an explicit exception per the CSC-T04 `castFindFamiliar`
  precedent; otherwise privatize both).
- `pnpm --filter @dnd/character-battle-runtime typecheck` + unit suite green;
  `pnpm --filter @dnd/mcp typecheck` + `server.test.ts` green;
  `character-battle-settlement.mbt.test.ts` green under the MBT mutex
  protocol (check for zombie `quint_evaluator` first; run with
  `run_in_background` + timing wrapper);
  `pnpm unit-profile-coverage:check` green if marked code moved.

## Task R2 — Hoist the companion protocol tag; battle state carries the tag, settlement stops inverting

Status: blocked on CSC-T10 · Mode: AFK · Approved by owner 2026-06-11 after
design exploration

**Finding (architecture review R2; connascence of algorithm).** The durable
companion protocol tag is projected into battle as two facts and reconstructed
by a hand-maintained inverse mapping:

- forward: `battleFormAccessForSheetCompanion`
  (`packages/character-battle-runtime/src/index.ts:725`) derives `formAccess`
  from the protocol tag; admission threads
  `retainedCompanionProtocolFacts(...).expiration` (`:321`);
- inverse: `retainedCompanionProtocolFromBattle` (`:424`) reconstructs the tag
  from `formAccess` + `expiration` at settlement, assuming
  `formAccess === "pactOfTheChain"` ⇒ attack-exception protocol. The first
  protocol that reuses Pact form access without the attack exception (or any
  fourth protocol, e.g. Find Steed's mounted protocol) silently mislabels the
  settled Sheet protocol instead of failing to compile.

Exploration evidence (verified 2026-06-11, re-verify only if a prior task
changed it):

- Battle-side `expiration` is **pure freight**: every TS read
  (`find-familiar-lifecycle.ts:472–1095`, `battle-reducer/damage-apply.ts:793`)
  and every QNT read (`battle-runtime-find-familiar.qnt`) copies it through
  transitions; nothing branches on it since CSC-T04 deleted the battle
  long-rest lane. It exists only so settlement can run the inverse mapping.
- The Pact attack exception does **not** read companion protocol facts: the
  gate is `combatantHasPactOfTheChainFindFamiliar`
  (`find-familiar-pact-chain.ts:107`), reading the owner's
  `invocationSpellAccesses`. Replacing the battle-side protocol facts risks no
  behavior change.
- Neither companion MBT witness mentions `expiration` (witness `.qnt` files
  stay unmodified; driver glue has no expiration mapping). No MCP test asserts
  it; `BattleCompanionExpirationSchema`
  (`battle-reducer/battle-codecs.ts:141`) is internal state codec only.

**Direction.**

1. New leaf `packages/shared-algebras/companion-protocol-algebra.ts`
   (matches the package's domain-named algebra convention; sheet, battle, and
   bridge already depend on `@dnd/shared-algebras`). Contents:
   `RETAINED_COMPANION_PROTOCOL_TAGS`, the derived tag type, the facts type and
   table (moved from `character-sheet-runtime/src/sheet-types.ts:190–242`),
   the three protocol constructors, the tag guards, and a new `formCatalog:
   "findFamiliar" | "pactOfTheChain"` column so the form-family derivation is
   table-driven rather than an if-chain. Protocol tags are rule vocabulary,
   not authored catalog identity, so shared-algebras — not surface — is the
   domain-correct home.
2. **QNT-first:** replace `FindFamiliarExpiration` with a three-tag
   `FindFamiliarProtocol` in `battle-runtime-model.qnt:92–127` (all lifecycle
   variants), thread it through the slice
   (`battle-runtime-find-familiar.qnt` — mechanical, the field is freight) and
   the proofs in `battle-runtime-core-combat-tests.qnt`.
3. TS battle: `BattleCompanionProtocolState` carries `protocol` (the tag)
   instead of `expiration`; `BattleCompanionExpiration` is deleted; casts
   choose tags (`castWildCompanion` → owner-long-rest,
   `castFindFamiliar` → ordinary); threading sites update mechanically; codec
   schema becomes a literal-union tag schema.
4. Bridge: admission threads `protocol: companion.protocol.tag`; settlement
   **copies** the tag back; delete `retainedCompanionProtocolFromBattle` and
   the duplicated constructors (closes R4c structurally); derive the stored
   form family from the facts table.
5. Sheet: `CharacterSheetRetainedCompanionProtocol` re-points to the leaf tag
   type; update the `scripts/audit-character-sheet-runtime-split.mjs`
   EXPECTED_EXPORTS allowlist for any barrel names that move.

Notes: battle-only cast familiars now carry a protocol tag from birth — this
is the hook the deferred L13COMP-03 battle-only settlement needs. The facts
table's `attack`/`dismissal`/`initiative` columns deliberately stay despite
having no executable consumer today: the Pact attack gate follows the owner's
invocation access (a defensible RAW reading — the exception attaches to the
Warlock, not the familiar instance); the columns become load-bearing when a
protocol actually differs. Do not move that gate.

**Acceptance:**

- One tags/facts/constructors definition site repo-wide (grep); no
  `retainedCompanionProtocolFromBattle`, no `BattleCompanionExpiration`.
- Witness `.qnt` files unmodified; both companion MBT files green under the
  mutex protocol; `quint test battle-runtime-core-combat-tests.qnt` (or the
  full `test:qnt-proofs` lane) green for the touched proof modules.
- Typecheck + focused suites green for shared-algebras, battle-runtime,
  character-sheet-runtime, character-battle-runtime, mcp;
  `pnpm unit-profile-coverage:check` and the sheet split audit green.

## Task R3-lite — Delete the FindFamiliar alias family; keep rule-source module names

Status: ready (anytime; pairs with R4a) · Mode: AFK

**Finding (architecture review R3, scope reduced after exploration).**
`find-familiar-lifecycle.ts:82–100` defines a type-alias family
(`FindFamiliarState = BattleCompanionState` and siblings:
`Present/TemporarilyDismissed/DisappearedAtZeroHitPoints/Absent` states,
`Snapshot`, `Placement`, `StoredForm`, `SelectedForm`, `HitPoints`,
`CurrentHitPoints`), and `companion-state.ts:99` defines the reverse alias
`FindFamiliarDisappearedAtZeroHitPointsState`. Verified usage: ~6 internal
sites in the lifecycle module, 2 barrel re-exports in
`battle-runtime/src/index.ts`, zero consumers in character-battle-runtime,
mcp, or app. Two names for one concept, pure noise.

The review's larger proposal — renaming/splitting the module to
`companion-lifecycle.ts` — was **rejected**: the battle mechanics (temporary
dismissal, 30-foot reappearance, zero-HP disappearance, telepathy, Touch
delivery, Pact attack exception) are Find Familiar SRD text, and the QNT
slice, both witnesses, and the `spell.find-familiar-lifecycle` coverage
profile (`plans/unit-profile-coverage/profiles.jsonl` pins the paths) name
that rule source. See
`docs/adr/0005-battle-companion-rule-source-module-naming.md` for the
decision and its revisit trigger.

**Direction.** Delete the alias block and the reverse alias; replace the ~9
use sites and the barrel re-exports with the `BattleCompanion*` names. Keep
the genuinely distinct types (`FindFamiliarCastInput`,
`WildCompanionCastInput`, `FindFamiliarReappearanceInput`,
`FindFamiliarOwnerInput`, `FindFamiliarLifecycleInputBase`) — they are cast/
operation inputs for the authored routes, not duplicate state vocabulary. No
file renames; `profiles.jsonl`, evidence files, and coverage markers stay
untouched.

**Acceptance:** grep shows none of the deleted alias names repo-wide;
battle-runtime typecheck green; focused find-familiar tests green
(`pnpm --filter @dnd/battle-runtime exec vitest run src/find-familiar-lifecycle.test.ts src/battle-runtime-find-familiar-and-pact.test.ts`);
`profiles.jsonl` and marker comments unchanged (git diff).

## Task R4 — Housekeeping batch

Status: R4a ready; R4b folds into CSC-T10; R4c superseded by Task R2 · Mode:
AFK (R4b has one HITL decision)

**R4a — delete the compatibility re-export shim.**
`packages/battle-runtime/src/find-familiar-forms.ts` (21 lines) is a pure
pass-through to `@dnd/surface/surface/find-familiar-forms` left by CSC-T07.
"Compatibility" shims contradict the repo's no-external-consumers rule.
Repoint the internal importers (`companion-state.ts:9`,
`find-familiar-state.ts:5`, `find-familiar-lifecycle.ts:66,70`,
`character-battle-resources.ts:41`, `battle-reducer/battle-codecs.ts:81–82`)
to the surface module — `character-sheet-runtime` and `mcp` already import
surface directly. For the barrel re-export (`battle-runtime/src/index.ts:125`):
check which consumers import the form vocabulary via `@dnd/battle-runtime`
(grep `character-battle-runtime`/`mcp` imports); prefer repointing them to
surface and dropping the barrel re-export so the vocabulary has one import
home. Acceptance: shim file deleted; battle-runtime typecheck + affected
package typechecks green; grep shows no import of
`battle-runtime/src/find-familiar-forms`.

**R4b — give durable companion id uniqueness an owner (decide scope with
CSC-T10's id-constructor bullet).** Ids are caller-minted
(`packages/mcp/src/character-tools.ts:317` brands the raw tool string); the
only cross-companion uniqueness check lives at battle admission
(`find-familiar-lifecycle.ts` `companionDurableIdentityInUse`). Two
characters whose retained companions coincidentally share an id are both
legal at creation and fail only at `start_battle`, with a confusing
admission error. Options:

1. (Recommended) Session-store uniqueness: when the MCP companion-creation
   operation persists a sheet, reject a durable companion id already used by
   a different character's retained companion. Smallest change; keeps
   caller-named ids; makes the battle-init check the defensive layer the
   plan doc says it should be.
2. Server-minted ids: MCP generates the id and returns it; removes the
   caller's naming ability (wire change).
3. Accept caller-owned collision risk and document it.

HITL: option choice is the owner's; default to (1) if unanswered.
Acceptance: chosen option implemented with a typed rejection + server test,
or the decision recorded with reason.

**R4c — deduplicate the protocol constructors. SUPERSEDED by Task R2
(approved 2026-06-11).** `ordinaryFamiliarLikeProtocol` /
`pactFamiliarLikeProtocol` / `ownerLongRestExpiringFamiliarLikeProtocol`
exist verbatim in `packages/character-sheet-runtime/src/companions.ts:823–833`
and `packages/character-battle-runtime/src/index.ts:438–448`; the matching
tag guards are already in T10's batch. R2's shared-algebras leaf absorbs the
constructors structurally. Do R4c standalone (export once beside the
tag/facts table in `sheet-types.ts`, import in both places) only if R2 is
rejected during implementation. Acceptance when applicable: one definition
site repo-wide (grep); both package typechecks green.

## Verification (every task)

- Reviewer-loop convergence per CLAUDE.md: RAW/ubiquitous-language pass where
  rule meaning is touched (R0 in particular: re-read SRD Druid Wild
  Companion, Long Rest, Temporary Hit Points; confirm restored behavior
  matches A46/A47 and `UBIQUITOUS_LANGUAGE.md` Companion terminology),
  architecture/connascence pass, code-review pass; repeat until no
  reasonable findings remain; record rejected notes with reasons.
- RAW traceability: every restored or moved rule must trace to the SRD
  passages or assumptions named in the task; no new rule semantics may be
  introduced by R1/R2/R3-lite/R4 (they are behavior-preserving except R1's
  error-code collapse and R4b's new rejection, both recorded in task output).
  R2 must keep the Pact attack gate on owner invocation access — moving it to
  protocol facts would be a rule-semantics change outside this plan's scope.
- Typechecks for touched packages; focused test suites as listed per task;
  MBT only where named (R1), under the mutex protocol with
  `run_in_background` and the timing wrapper; reproduce any MBT failure with
  the reported `QUINT_SEED` before fixing.
- `git diff --check` before each commit; base-ref ancestor check before each
  task (`git merge-base --is-ancestor <declared-base-sha> HEAD`).
