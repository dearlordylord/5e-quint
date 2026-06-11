# Companion Session Admission And Reappearance Plan

Status: session admission and reducer-discovered reappearance are landed;
remaining companion-act coverage is deferred to L13COMP-03.

## Task Index

| Task                                          | Status   | Summary                                                                                                                                                 |
| --------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `L13COMP-01-COMPANION-SESSION-ADMISSION`      | done     | Character Sheet owns retained companion creation; start-battle admits durable sheet companions; settlement writes the battle outcome back without session-local admission state. |
| `L13COMP-02-COMPANION-REAPPEARANCE-DISCOVERY` | done     | Normal battle act discovery and resolution can reappear a temporarily dismissed familiar without adding MCP-local companion procedures.                 |
| `L13COMP-03-GENERIC-MCP-COMPANION-ACTS`       | deferred | Complete remaining MCP companion coverage through reducer-discovered battle acts and fills, without public authored-identity companion tools.           |

## L13COMP-01-COMPANION-SESSION-ADMISSION

Implemented. The workflow lives outside the battle reducer: a caller can create
a character with a supported companion source, record the table-selected form
and mutable retained facts on the Character Sheet, and start battle with that
durable companion admitted as a separate combatant.

Battle admission does not decide whether the companion was produced by a Ritual,
a Spell Slot cast, a class feature, or another legal out-of-battle source. The
battle boundary receives typed companion protocol/source facts and caller battle
facts. Source-specific eligibility and cost rules are checked by the
Character Sheet/session boundary that owns the out-of-battle event.

Landed output:

- A generic MCP/session path for selecting and retaining an out-of-battle
  companion form/source fact, including owning character, selected form,
  selected creature type where applicable, stable companion identity, lifecycle
  status, retained HP/Temporary Hit Points when no active battle combatant owns
  those facts, and source facts sufficient to reconstruct battle admission.
- Battle start admission that consumes those typed facts without dispatching on
  authored spell or feature identity in reducers.
- Focused MCP/session tests showing a character starts battle with a present
  companion that can use already-supported battle behavior such as delivering a
  Touch-range spell.

Non-goals:

- Do not add Ritual casting as a battle act.
- Do not duplicate combatant HP or Stat Block facts in session state while the
  companion is an active battle combatant.
- Do not make battle admission branch on "ritual-summoned familiar" or any
  other source event that produced the durable companion.
- Do not add a table-owned tactics or placement policy; callers still supply
  placement, Initiative, and other table facts at the boundary.

Closed gap: `start_battle` no longer uses inline `sourceLinked.findFamiliarForm`
admission or derives retained-companion eligibility from the battle character.
It consumes durable Character Sheet companion facts plus caller battle facts.
The session-level `companionAdmission` copy was removed; `end_battle`
settlement now reads the battle companion outcome inside the single
`settleCharacterSheetFromBattle` operation.

### Pre-Research Findings

Character persistence already exists and should be reused. MCP stores finalized
`CharacterSheet`s in `sessionStore.characters`; starting battle projects an
available sheet into battle creature init, marks the sheet `inBattle`, and
ending battle settles battle-owned facts back onto the same sheet. The relevant
seams are:

- `packages/mcp/src/session-store.ts` defines available/in-battle character
  sessions and stores only Character Sheets as durable character state.
- `packages/mcp/src/start-battle-tool.ts` calls `characterSheetBattleInit`,
  starts `BattleState`, and then marks each participating sheet `inBattle`.
- `packages/mcp/src/battle-handoff.ts` calls
  `settleCharacterSheetFromBattle` for every character-origin combatant
  before clearing the active battle.
- `packages/character-battle-runtime/src/index.ts` owns sheet/battle projection
  and settlement, including HP, Temporary Hit Points, conditions, spell slots,
  feature-resource expenditures, Book of Shadows presence, and Wild Shape known
  forms.

Battle companion state already exists but is encounter-owned. `BattleState`
stores `companions: ReadonlyMap<CombatantId, BattleCompanionState>`, and the
snapshot projects present and absent companion states. Present companion HP,
stat block, Initiative, turn resources, reactions, and placement are battle
facts; they must not be duplicated on the sheet while the companion has an
active battle combatant.

The old MCP admission bridge has been removed. `start_battle` accepts
`companionAdmissions` that refer to retained Character Sheet companion facts,
then projects them through `character-battle-runtime` into
`admitCompanionToBattle`. Session/sheet workflows validate source-specific
out-of-battle creation, store a typed durable companion fact, and battle
admission consumes that fact without asking how the companion was produced.

RAW/domain anchors for the implementation:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Find Familiar` gives the
  selected form, Celestial/Fey/Fiend choice, 100-foot telepathy/touch delivery,
  own Initiative, cannot-attack rule, zero-HP disappearance, temporary/permanent
  dismissal, 30-foot reappearance, left-behind worn/carried objects, and one
  familiar only.
- `.references/srd-5.2.1/Rules-Glossary.md#Ritual` makes Ritual casting
  out-of-battle/session-owned here: it changes casting time and slot
  expenditure, not battle admission semantics.
- `.references/srd-5.2.1/Classes/Wizard.md#Ritual Adept` must be checked for
  Wizard spellbook Ritual access that can cast Ritual spells from the spellbook
  without preparation.
- `.references/srd-5.2.1/Classes/Warlock.md#Pact of the Chain` must be checked
  for no-slot Find Familiar access, Pact-only form access, Magic-action
  casting, and the familiar attack exception.
- `.references/srd-5.2.1/Classes/Druid.md#Wild Companion` and the existing
  `packages/surface/content/druid_wild_companion.dhall` projection must be
  checked for no-Material casting, fixed Fey type, Spell Slot or Wild Shape use
  spend, and disappearance when the Druid finishes a Long Rest.
- `.references/srd-5.2.1/Playing-the-Game.md#Temporary Hit Points` must be
  checked before retaining out-of-battle companion Temporary Hit Points; they
  last until depleted or the creature finishes a Long Rest.
- `UBIQUITOUS_LANGUAGE.md` defines Companion as a source-owner relationship, not
  provenance or tactics, and Companion Execution as reducer validation of
  table-selected acts.
- `ASSUMPTIONS.md` A33 records caller-provided Initiative for creatures entering
  combat and Find Familiar's own Initiative.

### Durable State Design

Durable companion state lives on `CharacterSheet`, not in MCP-local session maps.
For the level 1-3 slice, the parsed `CharacterSheet` exposes a
discriminated durable companion slot, e.g.
`companion: { tag: "none" } | { tag: "retainedOneAtATime"; companion: CharacterSheetRetainedCompanionState }`.
That encodes the familiar-like one-companion rule once. Ordinary spell access,
Ritual access, Pact access, and Wild Companion are admission routes that project
into the same retained companion protocol when their parsed facts match it; they
are not durable variants keyed by authored spell or feature identity. Future
multi-companion support should widen this type into an explicit companion set
with mutually compatible protocol variants; do not start with a plain list that
can persist two mutually exclusive retained companions for one owner.

A durable sheet companion fact should contain only facts whose lifetime survives
outside a battle:

- stable companion identity, distinct from battle combatant identity. Battle
  admission should parse caller battle combatant id plus durable companion id
  into a typed `BattleCompanionAdmissionIdentity`; settlement maps back by the
  durable companion id carried in battle companion state, not by caller
  convention;
- protocol facts as typed discriminated variants, not authored event history.
  The level 1-3 retained protocol is familiar-like: one-at-a-time cardinality, own
  Initiative, form catalog selection, no-attack baseline, any typed attack
  exception capability, temporary dismissal/reappearance, zero-HP disappearance,
  and optional expiration policy. If two authored routes produce those same
  facts, they must parse to the same durable protocol shape;
- selected form and selected creature type override where RAW requires a table
  choice;
- lifecycle state as a closed manifestation union, not loose booleans:
  - `embodiedOutsideBattle`, with retained HP/Temporary Hit Points and resolved
    stat block id/form proof. This is explicitly not a live battle presence;
  - `temporarilyDismissed`, only for protocols whose source rules include a
    pocket-dimension-style dismissal/reappearance operation. It retains
    HP/Temporary Hit Points and resolved stat block id/form proof because
    reappearance does not recast or restore the creature;
  - `disappearedAtZeroHp`, with no retained positive HP fact and retained
    selected/resolved form facts needed for lawful recast/replacement handling.
    Recasting updates or replaces this same retained slot; it must never append
    a second companion record;
- lifecycle expiration encoded as a closed protocol policy, not as independent
  flags or source names. For example, an owner-long-rest expiration is a
  protocol fact admitted from source rules; a non-expiring retained
  companion state cannot also claim that expiration because the constructor
  chooses exactly one expiration policy.

Do not store:

- live battle combatant HP or Temporary Hit Points while the companion is
  present in an active battle;
- `presentInBattle` as a durable manifestation. Active battle presence is
  represented by `BattleState`; the durable sheet keeps only the pre-battle
  companion fact until settlement writes the post-battle manifestation;
- Initiative, turn order, reactions, current action resources, current
  placement, encounter side, or table tactics;
- duplicated Stat Block payloads; store selected form/source facts and the
  resolved Stat Block id/form proof wherever out-of-battle retained HP must be
  validated without a live combatant;
- "ritual-summoned" or "spell-slot-summoned" as battle admission state. Those
  are source event/cost facts, not companion protocol;
- spell or feature ids as runtime dispatch facts. Authored identity may appear
  in Surface records, user selection, admission parsing, tests, and RAW anchors;
  executable reducers and durable battle/session state must see only parsed
  protocol facts.

The state shape should make impossible combinations unrepresentable. In
particular, a `presentInBattle` durable sheet variant should not exist; an
`InBattleCharacterSession` already points to the pre-battle sheet while live
battle facts live in `BattleState`. Settlement is the only place that writes the
post-battle durable companion fact back to the sheet. Parser and constructor
boundaries must reject duplicate retained companion facts before persistence;
handoff conflict checks are defensive integrity checks, not the primary
uniqueness gate.

The retained slot is also the anti-duplication guard for 0-HP disappearance and
recast. A disappeared retained companion still occupies the mutually exclusive
slot until it is permanently dismissed or replaced by the same retained protocol's
recast semantics. Recast construction must be an update operation over the
existing retained slot, not a list append. Temporary dismissal is different: it
is needed only where the protocol admits a reappearance action without recast,
so protocols that lack that operation cannot represent this manifestation.

### Boundary Design

`character-sheet-runtime` owns durable companion parsing, construction,
long-rest effects, and any out-of-battle source-cost settlement that changes
sheet resources. It added helpers analogous to existing sheet accessors for
HP/spell slots/Wild Shape known forms:

- read durable companion facts from a parsed sheet;
- create/replace the retained one-at-a-time companion slot for any admitted
  familiar-like source route, so routes with the same mutually exclusive
  protocol cannot coexist as multiple retained companions;
- remove a durable companion when a session event makes it disappear forever or
  when its admitted expiration policy reaches its boundary.

This is deliberately not a one-case-per-summon design. Future Surface families
such as `spawned_companion`, `spawned_creature`, `reanimated_creature`, and
`templated_multi_spawn` should project to protocol variants named for
cardinality, lifecycle, and control: retained one-at-a-time companion,
spell-duration spawned companion, mounted companion, commanded group, or
multi-spawn group. Summon Dragon, demon/elemental/forest-spirit-style summons,
and similar records should enter through their structured Surface payloads and
typed support facts, not through reducers that check spell names. Find Steed is
the durable-companion pressure that requires a mounted-combat protocol before
complete support.

`character-battle-runtime` owns projection and settlement:

- `characterSheetBattleInit` continues to project only the owner
  combatant. Companion admission is a sibling projection because companions are
  separate battle combatants, not fields on the owner creature init.
- It provides a function that projects sheet companion facts plus caller battle facts
  into typed battle companion admissions. Caller facts include battle
  combatant id, Initiative, placement, and any table spatial facts. For
  owner-linked companions whose battle side is the owner's side, derive side
  from the owner combatant instead of asking the caller to restate it. The
  projection must create a typed admission identity from durable companion id
  and battle combatant id, and battle companion state must retain the durable id
  so settlement can map back even when battle combatant ids are caller-chosen.
- `settleCharacterSheetFromBattle` reads `BattleState.companions` for each
  character owner and writes the post-battle durable companion fact back to the
  owner sheet as part of the single character-battle handoff operation. Present
  companions settle HP/Temporary Hit Points from their battle combatant and
  resolved stat block id/form proof from companion state or the combatant's Stat
  Block origin. Temporarily dismissed companions settle retained HP/Temporary Hit
  Points plus resolved stat block id/form proof from companion state. Zero-HP
  disappeared companions settle as disappeared, with no live combatant HP.
- Handoff must reject or precisely report conflicts: owner missing, companion
  owner mismatch, live companion combatant missing, duplicate durable companion
  for one-at-a-time source, or battle companion state that cannot be represented
  durably.

`battle-runtime` keeps companion execution and battle lifecycle. The
source-linked admission helper was replaced by a typed companion admission helper
that receives already-validated protocol/source facts. It may resolve selected
forms against the Stat Block catalog and enforce battle-local constraints, but it
must not inspect prepared spells, spellbook Ritual access, Pact invocation
identity, or Druid feature identity to decide whether admission is legal.

`mcp` remains a transport/application layer:

- no public `cast_find_familiar`, `cast_wild_companion`, or renamed generic
  companion wrapper that bypasses reducer/session discovery;
- out-of-battle companion creation must be exposed, if exposed through MCP, as a
  generic session-discovered operation with typed holes/fills or as a direct
  decoder/delegator to a `character-sheet-runtime` typed operation. MCP must not
  own familiar eligibility, form legality, source cost, replacement, or
  lifecycle semantics in a bespoke "record familiar" path;
- `start_battle` admits companions from durable sheet companion facts plus
  caller-provided battle facts, not from inline `findFamiliarForm` source-linked
  eligibility;
- MCP tests prove existing `discover_battle_acts`,
  `resolve_battle_act`, and `fill_battle_hole` still expose touch delivery,
  dismissal, and reappearance through runtime-discovered subjects/fills.

### Landed Slices

1. Added Character Sheet durable familiar-slot types, parser support, constructor
   support, and accessors. Update parse/create tests for empty, one-companion,
   duplicate retained-companion rejection, protocol lifecycle, and resolved-form
   proof with retained HP.
2. Added Character Sheet out-of-battle companion creation/replacement helpers for
   supported familiar-like retained companion protocols. Validate source access
   at this boundary using typed facts derived from character build/sheet state
   and Surface support profiles; do not branch in reducers on authored ids.
3. Added long-rest settlement for Wild Companion disappearance at the sheet/session
   boundary.
4. Added `character-battle-runtime` projection/settlement helpers for companion
   admission identity and handoff. Keep owner creature projection separate from
   companion combatant projection.
5. Added a generic battle-runtime admission helper that consumes typed companion
   admission facts. The source-linked helper is gone; the retained low-level
   `castFindFamiliar` reducer is deliberately deferred from act discovery to
   L13COMP-03.
6. Migrated MCP `start_battle` from inline `sourceLinked.findFamiliarForm` to
   durable-sheet companion admission facts plus caller battle facts. Preserve
   ordinary Stat Block encounter participants.
7. Added focused MCP/session tests:
   - create/finalize a character, record a durable familiar, start battle with
     it present, and deliver a Touch-range spell through existing battle acts;
   - end battle and confirm companion HP/state is retained on the sheet;
   - reject duplicate retained familiar state at parse/constructor boundaries;
   - temporarily dismiss in battle, end battle, start a later battle, and
     reappear through reducer-discovered holes;
   - Druid Wild Companion disappears after the owner's Long Rest, and Temporary
     Hit Points retention/clearing follows the RAW/assumption decision recorded
     for companion rest participation;
   - no public spell- or feature-named MCP companion tools exist.

### Verification Requirements And Task 11 Status

- RAW/ubiquitous-language pass: re-read the Find Familiar spell, Ritual
  glossary, Wizard Ritual Adept, Pact of the Chain, Druid Wild Companion, the
  Wild Companion Surface record, Temporary Hit Points and Long Rest rules,
  Companion terminology, and A33 before implementation. Confirm every
  executable rule traces to those texts or an existing assumption.
- Architecture/connascence pass: check for duplicate companion HP/stat-block
  facts across sheet and battle, lingering MCP-owned companion state, battle
  reducers re-deriving source eligibility, and source-event labels such as
  "ritual-summoned" leaking into admission.
- Code-review pass: enforce typed failures for parse/admission/session
  conflicts, collection validation where multiple companions/admissions are
  independent, no dead compatibility helpers, no authored identity dispatch in
  reducers, and no impossible optional/empty state combinations.
- Reviewer-loop convergence: repeat the RAW, ubiquitous-language/domain,
  architecture/connascence, and code-review passes until no reasonable findings
  remain. If a note is rejected, document the concrete reason next to the review
  result before stopping the loop.
- Task 11 retry closeout repaired the previous unrelated baseline blockers:
  `check:authored-id-dispatch` now accepts the `fire_bolt` MBT fixture boundary
  via an inline allowlist annotation, and `@dnd/battle-runtime typecheck` no
  longer reports the TS7053 Quint-tag-map errors in unrelated MBT files such as
  `quickened-spell-governor.mbt.test.ts`,
  `ray-of-enfeeblement-lifecycle.mbt.test.ts`,
  `reaction-casting-time.mbt.test.ts`,
  `roll-modifier-active-effects.mbt.test.ts`,
  `spike-growth-movement-hazard.mbt.test.ts`, and
  `web-restraint-hazard.mbt.test.ts`.
- Task 11 closeout verification status: still blocked by unrelated baseline
  failures outside the companion-session docs. Current `pnpm quality`
  verification now reaches `pnpm unit-profile-coverage:check` and stops on a
  broad selected-identity MBT replay metadata baseline: many
  `packages/battle-runtime/src/*selected-identity*.mbt.test.ts` and rule-core
  MBT files cite replay actions that the coverage script reports as
  unreachable because it finds no readable Quint MBT step action set. Per the
  repo broad-verification stop rule, this closeout did not expand into that
  cross-lane coverage failure.
- Task 11 retry closeout has verified: base check; typechecks for
  `@dnd/shared-algebras`, `@dnd/battle-runtime`,
  `@dnd/character-sheet-runtime`, `@dnd/character-battle-runtime`, and
  `@dnd/mcp`; `check:authored-id-dispatch`;
  `check:character-sheet-runtime-split`; `check:qa-generated-identity`;
  `check:mbt-driver-closure`; `rules-kernel-coverage:check`; focused
  `battle-runtime-mbt-driver-kit.test.ts`; and `git diff --check`.
- Task 11 did not complete, per the repo broad-verification stop rule after the
  unrelated baseline failures: full package test suites, the two focused
  companion MBT files under the MBT mutex protocol,
  `character-battle-settlement.mbt.test.ts`, `test:qnt-proofs`, and a green
  `pnpm unit-profile-coverage:check`. An accidental broad
  `@dnd/battle-runtime` test run did execute many battle MBTs and unit tests,
  including the two companion MBT files and the driver-kit unit test, but the
  command was not the required promoted companion-MBT protocol and failed on
  unrelated tests/timeouts (`blur-attack-roll-defense-lifecycle.mbt.test.ts`,
  `starry-wisp-object.mbt.test.ts`,
  `unit-profile-admission-passive-defense-and-archery.test.ts`,
  `unit-profile-admission-spike-growth-movement-hazard.test.ts`, and
  `unit-profile-admission-spiritual-weapon.test.ts`). These gates must be
  rerun by a later Task 11 closeout run after the coverage/test baseline
  failures are repaired or otherwise explicitly exempted.
- MBT runs are not part of pre-research. If implementation changes QNT/MBT-owned
  companion behavior, run only the focused companion MBT after code changes and
  follow the repo seed-reproduction protocol for failures.

## L13COMP-02-COMPANION-REAPPEARANCE-DISCOVERY

Implemented in the reducer-discovered battle-act slice. Generic battle act
discovery now exposes a `companionLifecycle` `reappear` subject for a retained
temporarily dismissed familiar when the owner can spend a Magic action.
Resolution consumes generic placement and Initiative fills plus the resolver
Stat Block catalog context that MCP already owns. No MCP-local companion verb is
needed.

Closed evidence:

- A catalog/source-fact route lets battle runtime reconstruct the selected
  companion form from retained companion facts and resolver catalog context.
- A reducer-discovered reappearance act and resolution path uses normal
  `discoverBattleActs`, `resolveBattleSubject`, and `fill_battle_hole`
  protocols.
- No MCP-local `companion` verb or special `find_familiar` verb. MCP should
  pass through reducer-discovered subjects and fills only.

## L13COMP-03-GENERIC-MCP-COMPANION-ACTS

MCP must continue to expose companion behavior only through the ordinary
runtime-discovered battle subject and hole protocol. A caller can ask what the
actor can do, select the returned act, and fill the returned holes; MCP must not
define separate public tools named for individual spells, class features, or
companion mechanics.

Required output:

- Companion admission/cast options discovered by battle runtime from the
  current character/session/battle facts, including loaded authored content
  projected through typed procedure and support-profile facts.
- Wild Companion cast discovery must be included here. The current runtime
  has the low-level `castWildCompanion` reducer and battle support marker, but
  the reducer-discovered act path still lacks typed Find Familiar form-catalog
  facts at the battle boundary; do not solve that by branching on the raw
  `druid_wild_companion` or `find_familiar` ids in reducers or MCP.
- In-battle Find Familiar casting wiring. The low-level `castFindFamiliar`
  reducer is retained (it is the implementation under test for the two companion
  MBT witnesses, which verify cast, recast/form-adoption, dismissal, and touch
  delivery) but is intentionally **not** wired into act discovery: the Companion
  Session Convergence lane (CSC-T04) kept it as an explicit exception instead of
  deleting it. Wiring it requires the Magic-action gates Pact-of-the-Chain and
  Wild Companion RAW require, and ordinary Find Familiar (1-hour/Ritual casting
  time) must never become a battle act — so discovery must gate on parsed casting
  access, not expose a bare in-battle cast.
- Generic fills for selected form, creature type mode, companion identity,
  Initiative, placement, source-cost choice, and any table-supplied facts the
  selected act requires.
- Generic lifecycle and routing subjects for remaining companion admission/cast
  paths, long-rest disappearance, and any future companion protocol effects
  where those behaviors are available from protocol facts. Temporary dismissal,
  reappearance, permanent dismissal, shared senses, and Touch spell delivery are
  already carried by reducer-discovered battle subjects and fills.
- A damage-result/table-fact path for carried or worn objects left behind when
  ordinary damage reduces a present familiar to 0 Hit Points. The current
  battle damage hook records the zero-HP disappearance; the explicit companion
  zero-HP helper can report dropped objects when supplied held-object facts, but
  ordinary damage resolution does not yet have a hole/outcome channel for that
  table fact.
- Durable settlement of battle-created (battle-only) familiars. Deferred here
  from the Companion Session Convergence lane (CSC-T03). That lane shipped the
  `dismissedForever` battle tombstone and made `end_battle` settlement read the
  battle companion outcome inside the single `settleCharacterSheetFromBattle`
  operation, with the session-level `companionAdmission` copy removed. A battle-only
  familiar (no durable Character Sheet identity) currently leaves the Sheet
  untouched at settlement rather than evaporating; settling it as a new durable
  companion belongs here, once in-battle Find Familiar casting is wired with the
  Magic-action gates Pact-of-the-Chain/Wild-Companion RAW requires. The
  settlement outcome reads on battle identity (`battleOnly` vs
  `retainedBetweenBattles`), so this slots in without reworking the outcome
  shape.
- MCP tests proving `resolve_battle_act` / `fill_battle_hole` carry the
  runtime-returned subjects and fills, and proving public tools such as
  `cast_find_familiar` or `cast_wild_companion` do not exist.

Non-goals:

- Do not add a renamed generic MCP wrapper that still bypasses runtime
  discovery.
- Do not make MCP own companion eligibility, lifecycle, command semantics, or
  companion state.

## Related Work

- `plans/DESIGN_C4a_spawned_companion.md` owns the broader spawned-companion
  stat-block design pressure.
- Complete Find Steed remains blocked on a mounted-combat core owner; do not
  use this plan to add ridden controlled-mount semantics.

## Companion Session Convergence Closeout

Ralph lane `csc-r2-post-t16` has a complete finding ledger for the companion
session admission review. Task 11 retry closeout repaired the prior MBT-driver
baseline blockers described above, but full verification is still blocked by an
unrelated `unit-profile-coverage:check` selected-identity MBT replay metadata
baseline. Runtime behavior remains traced to SRD 5.2.1 Find Familiar, Druid
Wild Companion, Pact of the Chain, Ritual, Long Rest, Temporary Hit Points, and
the repo's controlled-companion vocabulary. A46 and A47 match the landed
implementation: an owner's Long Rest leaves surviving non-Wild retained
companions unchanged, Wild Companion disappears at owner Long Rest, and recast
updates the retained companion in place with preserve-and-clamp HP semantics.

### Review Finding Ledger

| Finding | Closed by | Commit | Closeout |
| --- | --- | --- | --- |
| F1 | CSC-T03-SETTLEMENT-OUTCOME | `4e3034374` | Battle state now carries settlement-ready companion outcome data. |
| F2 | CSC-T03-SETTLEMENT-OUTCOME | `4e3034374` | Session-level `companionAdmission` state was removed. |
| F3 battle half | CSC-T04-DEAD-BATTLE-LONG-REST-LANE | `fec8b52b9` | Dead battle long-rest companion expiration lane was deleted. |
| F3 sheet half | CSC-T05-COMPANION-REST-ASSUMPTION | `c8702a9a2` | A46 records owner-rest semantics and sheet long-rest behavior preserves surviving retained companion HP/Temporary Hit Points. |
| F4 battle half | CSC-T03-SETTLEMENT-OUTCOME | `4e3034374` | Battle settlement outcome became the single handoff source for companion result state. |
| F4 cross-layer consistency | CSC-T06-RECAST-SEMANTICS | `1b0d227c5` | A47 records one recast semantic across sheet and battle layers. |
| F5 | CSC-T01-OWNER-KEYED-COMPANIONS | `bcde5dd5f` | Battle companions are keyed by owner; synthetic companion-state ids were deleted. |
| F6 | CSC-T02-PROTOCOL-TAG-UNION | `5ac0dd082` | Retained companion protocol is a tag union with one derivation table. |
| F7 | CSC-T07-FORM-VOCAB-HOIST-CREATION-MOVE | `64bd4ec90` | Familiar-form vocabulary moved to the Surface/sheet boundary. |
| F8 | CSC-T07-FORM-VOCAB-HOIST-CREATION-MOVE | `64bd4ec90` | Out-of-battle companion creation moved into `character-sheet-runtime`. |
| F9 | CSC-T08-CREATION-HP-SURFACE | `064ac6e13` | MCP callers no longer mint companion HP/Temporary Hit Points for creation. |
| F10 | CSC-T09-FORM-CATALOG-REFERENCE | `803337c6d` | Familiar-form catalog lookup has an executable uniqueness boundary instead of first-match order dependence. |
| F11 | CSC-T10-SMALL-FINDINGS-BATCH | `53973e276` | Narrowing, dead exports, duplicated rules, id parsing, and durable-id uniqueness ownership were closed or recorded. |

### Architecture Review Ledger

| Item | Closed by | Commit | Closeout |
| --- | --- | --- | --- |
| R0 | CSC-T12-R0-LONG-REST-COMPANION-RESTORE | `ac389e7fc` | Restored Wild Companion Long Rest disappearance and the sheet companion canary tests after the master merge dropped them. |
| R1 | CSC-T16-R1-SINGLE-SETTLEMENT-OPERATION | `c7d17afdf` | `settleCharacterSheetFromBattle` is the single exported settlement operation; MCP reports one handoff error code. |
| R2 | CSC-T15-R2-PROTOCOL-TAG-HOIST | `f67e03fbe` | Retained companion protocol tags/facts/constructors live in `shared-algebras`; battle carries the tag instead of a lossy projection. |
| R3 | CSC-T13-R3LITE-ALIAS-FAMILY-DELETION | `5acda5047` | The `FindFamiliar* = BattleCompanion*` alias family was deleted; ADR 0005 records why rule-source module names stay. |
| R4a | CSC-T14-R4A-FORMS-SHIM-DELETION | `9c0319fe5` | The battle-runtime `find-familiar-forms` compatibility shim was deleted. |
| R4b | CSC-T10-SMALL-FINDINGS-BATCH | `53973e276` | Session-store companion-id uniqueness is the default durable-id owner. |
| R4c | CSC-T15-R2-PROTOCOL-TAG-HOIST | `f67e03fbe` | Protocol-constructor duplication was superseded by the shared-algebras protocol leaf. |

Deferred work is intentionally limited to L13COMP-03: battle-created familiar
durable settlement, wired in-battle Magic-action Find Familiar/Wild Companion
casting with the required admission gates, and remaining reducer-discovered
companion act/fill coverage.
