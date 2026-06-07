# Companion Session Admission And Reappearance Plan

Status: future work; not part of the reducer-discovered battle-act slice.

## Task Index

| Task                                          | Status   | Summary                                                                                                                                                 |
| --------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `L13COMP-01-COMPANION-SESSION-ADMISSION`      | designed | Create an out-of-battle/session workflow that can build a character with companion access and start battle with an already-present companion combatant. |
| `L13COMP-02-COMPANION-REAPPEARANCE-DISCOVERY` | done     | Normal battle act discovery and resolution can reappear a temporarily dismissed familiar without adding MCP-local companion procedures.                 |
| `L13COMP-03-GENERIC-MCP-COMPANION-ACTS`       | deferred | Complete remaining MCP companion coverage through reducer-discovered battle acts and fills, without public authored-identity companion tools.           |

## L13COMP-01-COMPANION-SESSION-ADMISSION

The missing workflow is outside the battle reducer. A caller should be able to
create a character with a supported companion source, record the table-selected
companion form and mutable retained facts, and start a battle with the companion
already admitted as a source-linked combatant.

Battle admission must not care whether the companion was produced by a ritual,
a Spell Slot cast, a class feature, or another legal out-of-battle source. The
battle boundary should receive typed companion/source facts and a combatant init
shape. Source-specific eligibility and cost rules belong at the session,
Character Sheet, or character-creation boundary that owns the out-of-battle
event.

Required output:

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

Current gap to remove in this follow-up: `start_battle` source-linked familiar
admission still derives eligibility from prepared spell, spellbook Ritual, and
Pact access on the battle character. That is retained only as the pre-session
companion bridge; the target architecture is typed durable companion facts at
the battle boundary.

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
  `applyBattleHandoffToCharacterSheet` for every character-origin combatant
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

The current MCP admission path is the bridge to remove. `start_battle` accepts a
`sourceLinked` Stat Block combatant with `findFamiliarForm` selection, then
calls `admitPresentFindFamiliarToBattle`. That reducer still derives admission
eligibility from the battle character's prepared spells, spellbook Ritual
accesses, or Pact of the Chain access. The desired boundary is the inverse:
session/sheet workflows validate source-specific out-of-battle creation, store a
typed durable companion fact, and battle admission consumes that fact without
asking how the companion was produced.

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

Add durable companion state to `CharacterSheet`, not to MCP-local session maps.
For the level 1-3 slice, the parsed `CharacterSheet` should expose a
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
sheet resources. It should add helpers analogous to existing sheet accessors for
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

- `characterSheetBattleInit` should continue to project only the owner
  combatant. Companion admission is a sibling projection because companions are
  separate battle combatants, not fields on the owner creature init.
- Add a function that projects sheet companion facts plus caller battle facts
  into typed battle companion admissions. Caller facts include battle
  combatant id, Initiative, placement, and any table spatial facts. For
  owner-linked companions whose battle side is the owner's side, derive side
  from the owner combatant instead of asking the caller to restate it. The
  projection must create a typed admission identity from durable companion id
  and battle combatant id, and battle companion state must retain the durable id
  so settlement can map back even when battle combatant ids are caller-chosen.
- Add a settlement function that reads `BattleState.companions` for each
  character owner and writes the post-battle durable companion fact back to the
  owner sheet. Present companions settle HP/Temporary Hit Points from their
  battle combatant and resolved stat block id/form proof from companion state or
  the combatant's Stat Block origin. Temporarily dismissed companions settle
  retained HP/Temporary Hit Points plus resolved stat block id/form proof from
  companion state. Zero-HP disappeared companions settle as disappeared, with no
  live combatant HP.
- Handoff must reject or precisely report conflicts: owner missing, companion
  owner mismatch, live companion combatant missing, duplicate durable companion
  for one-at-a-time source, or battle companion state that cannot be represented
  durably.

`battle-runtime` should keep companion execution and battle lifecycle. Replace
the source-linked admission helper with a typed companion admission helper that
receives already-validated protocol/source facts. It may resolve selected forms
against the Stat Block catalog and enforce battle-local constraints, but it must
not inspect prepared spells, spellbook Ritual access, Pact invocation identity,
or Druid feature identity to decide whether admission is legal.

`mcp` remains a transport/application layer:

- no public `cast_find_familiar`, `cast_wild_companion`, or renamed generic
  companion wrapper that bypasses reducer/session discovery;
- out-of-battle companion creation must be exposed, if exposed through MCP, as a
  generic session-discovered operation with typed holes/fills or as a direct
  decoder/delegator to a `character-sheet-runtime` typed operation. MCP must not
  own familiar eligibility, form legality, source cost, replacement, or
  lifecycle semantics in a bespoke "record familiar" path;
- `start_battle` should admit companions from durable sheet companion facts plus
  caller-provided battle facts, not from inline `findFamiliarForm` source-linked
  eligibility;
- MCP tests should prove existing `discover_battle_acts`,
  `resolve_battle_act`, and `fill_battle_hole` still expose touch delivery,
  dismissal, and reappearance through runtime-discovered subjects/fills.

### Implementation Slices

1. Add Character Sheet durable familiar-slot types, parser support, constructor
   support, and accessors. Update parse/create tests for empty, one-companion,
   duplicate retained-companion rejection, protocol lifecycle, and resolved-form
   proof with retained HP.
2. Add Character Sheet out-of-battle companion creation/replacement helpers for
   supported familiar-like retained companion protocols. Validate source access
   at this boundary using typed facts derived from character build/sheet state
   and Surface support profiles; do not branch in reducers on authored ids.
3. Add long-rest settlement for Wild Companion disappearance at the sheet/session
   boundary.
4. Add `character-battle-runtime` projection/settlement helpers for companion
   admission identity and handoff. Keep owner creature projection separate from
   companion combatant projection.
5. Add a generic battle-runtime admission helper that consumes typed companion
   admission facts. During the migration branch, keep the existing helper only
   for tests or call sites not yet moved; final implementation should delete it
   or restrict it once MCP stops using it.
6. Migrate MCP `start_battle` from inline `sourceLinked.findFamiliarForm` to
   durable-sheet companion admission facts plus caller battle facts. Preserve
   ordinary Stat Block encounter participants.
7. Add focused MCP/session tests:
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

### Verification Plan

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
- Test gates for implementation:
  - `pnpm --filter @dnd/character-sheet-runtime test -- src/index.test.ts`
  - `pnpm --filter @dnd/character-battle-runtime test -- src/index.test.ts`
  - focused MCP tests covering start/end battle and discovered battle acts
  - focused battle-runtime companion tests touched by admission changes
  - `pnpm --filter @dnd/character-sheet-runtime typecheck`
  - `pnpm --filter @dnd/character-battle-runtime typecheck`
  - `pnpm --filter @dnd/battle-runtime typecheck`
  - `pnpm --filter @dnd/mcp typecheck`
  - `pnpm unit-profile-coverage:check`
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
