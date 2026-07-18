# Oracle Case and Trace Algebra

Wayfinder decision for [Define the Oracle Case and Trace
algebra](https://github.com/dearlordylord/5e-quint/issues/23), investigated at
source commit `3441f91b623e6ec661e9958e15d6c296fa20d578`.

## Status amendment (2026-07-16)

The original Battle observation and Case decomposition below is superseded. It
incorrectly promoted caller/table choices into durable Oracle roles, fixed one
Character-Sheet-backed combatant and one Stat-Block-backed opponent as a
production observation invariant, and treated an Oracle-only observation as
the remedy for presentation facts already present in the production snapshot.
The entire file is now historical decision evidence, not an implementation
contract. The corrected canonical delivery contract is the native child graph
under [GH-92](https://github.com/dearlordylord/5e-quint/issues/92), with composed
acceptance in GH-93 through GH-95. `UBIQUITOUS_LANGUAGE.md` owns the domain
terms, and `docs/adr/0006-battle-runtime-holes-do-not-expose-partial-state.md`
owns the stable committed-state/continuation decision. The summaries below
explain the supersession only; they do not create parallel requirements.

### Historical replacement-constraint summary

- A Battle roster is an arbitrary production-reachable collection of
  combatants. An individual Oracle fixture may deliberately use a narrow
  roster, but the production snapshot and fact owners impose no one-versus-one
  cardinality.
- Character Sheet and Stat Block are mechanically meaningful combatant origins.
  Character, opponent, ally, enemy, party, opposition, Encounter Side, and
  companion are not global combatant roles. A Companion is an owner-to-creature
  relationship; it does not replace either combatant origin.
- Ally/enemy or similar relationship judgments are contextual Table Decisions
  unless RAW fixes them. A reducer consumes the rule-local decision or witness
  needed by the current procedure; it does not infer or retain an
  encounter-wide partition.
- `BattleSnapshot` is the production-owned public read model for committed
  mechanical state. It is purified in place; there is no parallel
  `BattleObservation` or Oracle-local roster projection.
- Available Acts, Runtime Holes, and interrupt choices form a production-owned
  continuation frontier separate from `BattleSnapshot`. A caller-facing result
  may pair the committed snapshot with its current frontier, but that envelope
  is not another store of Battle state.
- An Act commits atomically when it resolves. While an Act is awaiting fills,
  the visible snapshot remains the last committed snapshot. Rejected selection
  or fill input leaves both that snapshot and its frontier unchanged and may be
  retried. An Oracle Case may stop recording after rejection without making the
  Battle terminal.
- Combatant identity remains `CombatantId` and continues to scope each
  combatant's resources. Existing Stat Block part identity is preserved in
  meaning, but production execution and resource linkage must not dispatch on
  an authored part name or array position. Any corrected presentation-free
  execution reference is owned by production admission/runtime and merely
  reused by the Oracle.
- Presentation is joined at UI, MCP, or other presentation boundaries. Labels,
  display names, authored record identity, and session/composition identity do
  not become duplicate reducer or snapshot state. Authored identity may remain
  at the repository's explicitly allowed selection and catalog boundaries.
- Oracle schemas and facts are constructed exhaustively from their production
  owners. Generic schema-AST rewriting, field-name omission registries, casts,
  Oracle role maps, and parallel hand-maintained Battle schemas are prohibited.
- Optional values and empty collections retain one domain spelling. Issue
  algebras are flat, precisely owner-named, accumulated where failures are
  independent, and do not store a derived message beside structured issues.

### Historical replacement-decomposition summary

The former GH-86/GH-92 decomposition is retired rather than patched. Preserve
its issues, attempts, and review artifacts as historical evidence, but do not
resume dependent implementation from their role/cardinality premises. Replace
it with these independently reviewable increments:

1. **[Correct contextual Battle relationships](https://github.com/dearlordylord/5e-quint/issues/156).** Remove Encounter Side from
   production Battle initialization, state, snapshots, reducer decisions, and
   active QNT parity owners. Replace every equality-based ally/enemy decision
   with the narrow rule-local Table Decision or RAW-fixed relationship its
   procedure actually requires. Update focused QNT and MBT bridges where
   behavior changes. This increment blocks any Oracle Battle contract.
2. **[Correct production execution references](https://github.com/dearlordylord/5e-quint/issues/157).** Retain combatant-owned
   procedure/resource identity while replacing authored-name and positional
   dispatch in `BattleSubject`, Stat Block part keys, and coupled resource
   lookup with production-owned typed execution references. Preserve explicit
   shared resource ownership where RAW makes procedures share a pool. This
   increment blocks presentation-free Battle facts but is independent of the
   relationship correction.
3. **[Purify the production Battle read/continuation boundary](https://github.com/dearlordylord/5e-quint/issues/161).** Make the
   existing `BattleSnapshot` committed mechanical state only; remove
   presentation and setup classifications, and expose exactly one separate
   production continuation frontier for available Acts, rule-input Holes, or
   interrupt decisions. Encode atomic commit and unchanged retry semantics in
   the production result types. Depend on increments 1 and 2.
4. **Complete non-Battle fact owners.** In owner-sized slices, finish exact
   [Character Creation projection](https://github.com/dearlordylord/5e-quint/issues/158),
   [fresh Character Sheet construction and its narrowed freshness proof](https://github.com/dearlordylord/5e-quint/issues/159),
   and [Character-Sheet-to-Battle entry issues](https://github.com/dearlordylord/5e-quint/issues/160).
   Accumulate independent issues without nested issue collections or stored
   summary messages. These slices do not invent Battle roster roles.
5. **[Compose the Oracle Case and Trace](https://github.com/dearlordylord/5e-quint/issues/93), then [publish its schema](https://github.com/dearlordylord/5e-quint/issues/94).** Only after increments
   1-4 converge, specify Case cardinality as a workflow/fixture choice rather
   than a production snapshot invariant. Derive one strict Case/Trace algebra,
   one projection, and one generated schema from the corrected owners. Trace
   frames pair committed snapshots with separate frontiers and reuse the
   production execution references.
6. **[Publish fixtures and transports](https://github.com/dearlordylord/5e-quint/issues/95).** Add portable fixtures and CLI/HTTP
   consumption only after the composed algebra is stable. These consumers may
   serialize or present the owner contract but may not redeclare it.

Increments 1, 2, and the owner-sized portions of 4 may proceed independently.
Increment 3 depends on 1 and 2; increment 5 depends on 3 and all required parts
of 4; increment 6 depends on 5. This graph keeps the architecture corrections
out of the Oracle composition task while still making them explicit blockers.

### Historical verification recommendation

- Before changing a modeled rule, read and cite the relevant passage in the
  local `.references/srd-5.2.1/` corpus and check `UBIQUITOUS_LANGUAGE.md`.
  Confirm afterward that every modeled rule still traces to that RAW text and
  that Table Decisions have not become reducer-owned policy.
- Run the focused typecheck and tests for each changed owner. Run affected QNT
  proofs and the focused battle MBT only when the increment changes those
  parity owners, following the repository's resource and seed protocols.
- Check authored-identity, redundant-state, invalid-state, and connascence
  boundaries explicitly, including every name/value/position fact that must
  change together.
- After implementation, run RAW/ubiquitous-language, architecture/domain and
  connascence, and strict code/spec review passes. Fix every reasonable finding,
  record concrete reasons for any rejection, and repeat the complete reviewer
  loop until it converges with no reasonable findings. Non-trivial increments
  require at least two rounds.

## Superseded decision (historical)

The Opaque Oracle contract is one strict, language-neutral algebra over the
production Character Creation-to-Battle continuation protocol. An **Oracle
Case** supplies:

1. an ordered Character Creation fill-batch prefix;
2. the one conditional fresh-sheet input that is not derivable from the
   finalized Character Build;
3. the externally varying facts for one character-versus-Stat-Block Battle
   entry; and
4. an ordered Battle act-attempt prefix whose attempts contain ordered,
   non-empty Runtime Hole fill batches.

An **Oracle Trace** is the ordered sequence of presentation-free production
outcomes and continuation frontiers produced from those inputs. It includes
Character Creation frontiers, Character Build and fresh Character Sheet
projections, Battle observations, available Acts, Runtime Holes, resolved
outcomes, and typed rejections. It excludes draft revisions and identities,
Character Sheet and Battle identities, display names, labels, messages, route
events, replay accumulators, interrupt-stack depth, sessions, caches, and MCP
envelopes.

The source owns one schema and one projection implementation for this algebra.
CLI, HTTP, portable fixtures, Target examples, and the generated Draft 2020-12
schema consume that authority; they may not re-declare the variants. The
contract reuses the production `CreationFill`, `BattleSubject`, and
`BattleFill` mechanical unions. Where their current owners lack a strict schema
or typed rejection, implementation changes the owning lower layer instead of
adding an Oracle adapter or parallel error registry.

## Production inventory

The current source has the required semantic parts but not their composed
portable contract:

| Production boundary                  | Existing owner                                                                                                                        | Oracle consequence                                                                                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Blank Character Draft                | `packages/character-creation-runtime/src/draft.ts:754-769`                                                                            | The operation creates one call-local draft. `draftId` and `revision` are not Case data.                                                                      |
| Creation frontier                    | `packages/character-creation-runtime/src/discovery.ts:183-194`; `src/types.ts:934-952`                                                | Project Creation Holes mechanically; remove option labels.                                                                                                   |
| Atomic creation mutation             | `packages/character-creation-runtime/src/fill-reducer.ts:122-173`; `src/types.ts:954-1057`                                            | One Oracle creation decision is one non-empty ordered fill batch. The operation supplies the current internal revision.                                      |
| Finalization                         | `packages/character-creation-runtime/src/finalization.ts:238-282`; `src/types.ts:1296-1327`                                           | Preserve `ready`, `incomplete`, and `invalid` semantics. Emit the durable Character Build only on `ready`.                                                   |
| Fresh Character Sheet                | `packages/character-sheet-runtime/src/sheet-lifecycle.ts:86-261`; `src/sheet-types.ts:687-731`, `1237-1260`                           | Derive all fresh defaults. Only Wild Shape known-form selection varies outside the build at the Workflow Horizon.                                            |
| Character Sheet-to-Battle projection | `packages/character-battle-runtime/src/index.ts:174-236`, `342-378`; `src/battle-creature-init.ts:97-120`                             | Use the production one-character/one-Stat-Block entry. Supply initiatives, opponent selection, AC-base choice, and optional Pact Blade bond explicitly.      |
| Battle Act selection                 | `packages/battle-runtime/src/battle-subjects.ts:338-1047`; `src/battle-reducer.ts:4647-4653`                                          | `BattleSubject` is the discovered replay key and is copied into an act attempt. Labels and summaries are not contract data.                                  |
| Runtime Hole and fill                | `packages/battle-runtime/src/battle-reducer.ts:4655-6548`, `6678-6994`; `packages/shared-algebras/src/runtime-hole-algebra.ts:67-114` | Reuse all mechanical variants. Hole order and fill-batch order are observable; cumulative replay is internal.                                                |
| Battle resolution                    | `packages/battle-runtime/src/battle-reducer.ts:7161-7186`                                                                             | Preserve `resolved`, `needsHoles`, and `invalid`; remove state objects and prose from the wire projection.                                                   |
| Battle observation                   | `packages/battle-runtime/src/battle-reducer.ts:7240-7367`                                                                             | Project the public mechanical snapshot, separating state observation from its current Act-or-Hole frontier.                                                  |
| Existing codecs                      | `packages/battle-runtime/src/battle-reducer/battle-codecs.ts:1158-3589`, `5203-5224`                                                  | Reuse their field schemas, brands, and domain bounds. They are not sufficient unchanged because snapshots and holes contain presentation and process fields. |
| MCP outputs                          | `packages/mcp/src/character-tool-output.ts:12-193`; `src/battle-tool-output.ts:14-78`                                                 | Do not import them: they use broad JSON, prose, duplicated snapshots, and session envelopes.                                                                 |

Current `CharacterSheetIssue`, `BattleCreatureInitIssue`, and
`BattleStateInitIssue` values are message-shaped. The Oracle must not stabilize
those messages. Source implementation first promotes the externally reachable
fresh-sheet and handoff failures to precise codes at their owning boundaries;
an internal inconsistency after a finalized build and startup-admitted catalog
is an unexpected defect, not a catch-all Oracle rejection.

## Algebra notation

The definitions below are normative. Names are language-neutral algebra names,
not prescribed Target SDK type names.

```text
Seq<A>       = finite ordered sequence; duplicates are significant
NonEmpty<A>  = Seq<A> with length >= 1
Vec<N,A>     = Seq<A> with length exactly N
Set<A>       = duplicate-free collection with canonical encoded order
Refined<A,P> = A admitted only through predicate P
PositiveCount = integer >= 1
Exists<N>.A  = A with its exact length index hidden on the wire
Index        = integer >= 0
Int          = exact JSON integer within the source domain bound
NonEmptyText = Unicode string whose trimmed value is non-empty
```

Every record is closed: unknown members are decode issues. Every sum is a
closed discriminated union. `null`, absent, and an empty collection are never
interchangeable. Optional members below appear only where absence is a distinct
domain state; otherwise the algebra uses a sum variant.

The branded scalar domains already owned by Character Creation, Surface,
shared algebras, Character Sheet, and Battle retain their existing predicates.
Brands do not add a wire wrapper: their encoded value is the underlying JSON
string or number.

## Oracle Case

```text
OracleCase = {
  creation: CreationInput,
  sheet: FreshSheetInput,
  battle: BattleInput
}

CreationInput = {
  fillBatches: Seq<CreationFillBatch>
}

CreationFillBatch = NonEmpty<CreationFill>

FreshSheetInput =
  | { tag: "ordinary" }
  | {
      tag: "wildShapeKnownForms",
      statBlockIds: Set<StatBlockId> & NonEmpty
    }

BattleInput = {
  opponentStatBlockId: StatBlockId,
  characterInitiative: Initiative,
  opponentInitiative: Initiative,
  armorClassBase: ArmorClassBaseInput,
  pactBladeBond: PactBladeBondInput,
  attempts: Seq<BattleActAttempt>
}

ArmorClassBaseInput =
  | { tag: "derive" }
  | { tag: "choose", choice: CharacterSheetArmorClassBaseChoice }

CharacterSheetArmorClassBaseChoice =
  | { kind: "default_unarmored" }
  | { kind: "class_feature", unitId: UnitId }

PactBladeBondInput =
  | { tag: "none" }
  | { tag: "weapon", itemId: CharacterEquipmentItemId }

BattleActAttempt = {
  subject: BattleSubject,
  fillBatches: Seq<BattleFillBatch>
}

BattleFillBatch = NonEmpty<BattleFill>
```

`CreationFill`, `BattleSubject`, and `BattleFill` are the complete mechanical
unions owned by their production packages, not subsets copied into an Oracle
module. Their portable schemas are generated from those owners. Widening one
of the unions therefore makes the Oracle schema/projection exhaustiveness check
fail until the new variant is intentionally admitted.

The Case contains no `caseId`, `requestId`, `draftId`, expected draft revision,
`characterId`, `battleId`, display name, catalog identity, random seed,
timestamp, or session token. The application uses reserved call-local
identities `oracle:character` and `oracle:opponent`. Those stable values appear
where a `BattleSubject`, `BattleFill`, or Trace observation needs a combatant
identity. Other runtime object, area, companion, or occurrence identities
remain explicit in the relevant Battle fills because those facts genuinely vary.

The opponent is a catalog selection boundary, so its SRD `StatBlockId` is
valid authored identity. Opponent HP starts at the selected Stat Block maximum,
Temporary HP starts at zero, both participants start without Battle-local
conditions, and the character starts from the freshly constructed sheet. These
facts are fixed semantics of this one scenario, not optional Case fields.
`characterInitiative` and `opponentInitiative` are the already-resolved table
facts consumed by the production Battle-entry boundary; the Oracle does not
invent a second initiative-roll mechanic.

`FreshSheetInput.ordinary` means the build has no Wild Shape known-form roster.
`wildShapeKnownForms` carries exactly the non-derivable initial roster for a
build that has that feature. An empty roster is not a second spelling of
`ordinary`. A duplicate roster member is a set-decoding issue. Feature mismatch,
wrong cardinality, unavailable identity, wrong creature type, excessive
Challenge Rating, and forbidden Fly Speed are typed sheet-construction
rejections.

`ArmorClassBaseInput.derive` means the production projection must have zero or
one available class-feature base formula and choose its existing default.
`choose` is required when multiple formulas are available and may explicitly
choose the default-unarmored formula. `PactBladeBondInput.none` is a real
absence of a bond for this battle; `weapon` must name an owned, wielded,
eligible melee weapon. These sums avoid overloaded omission.

## Character Creation evaluation

Evaluation creates a blank draft, discovers its frontier, and emits
`creationStarted`. For every `CreationFillBatch`, in order, the operation:

1. supplies the current call-local draft and revision to
   `fillCreationHoles`;
2. records every independently discoverable fill issue in fill-index order;
3. on rejection, emits terminal `creationFillRejected` without mutating the
   draft;
4. on acceptance with incomplete finalization, emits `creationProgressed` with
   the next canonical frontier; or
5. on acceptance with ready finalization, emits `characterBuilt` and proceeds
   to fresh-sheet construction.

An accepted batch whose finalization is `invalid` emits terminal
`creationFinalizationRejected`. If the fill sequence ends while finalization is
incomplete, the Trace emits terminal `workflowRejected` with
`creationInputExhausted`; the most recent creation step remains the current
frontier. This is not an ordinary continuation because successful Oracle
creation must reach Battle.

No later creation batch is silently ignored. If a build becomes ready before
the sequence ends, the Trace emits `characterBuilt` followed by terminal
`workflowRejected` with `creationInputSurplus` and the first unused batch
index.

Draft identity, revision, stored draft snapshots, and repeated finalization
objects are mutation-protocol state and do not enter the Trace.

## Battle attempts hide cumulative replay

A `BattleActAttempt` is one externally meaningful attempt to take a discovered
Act. The operation, not the Case, owns the production reducer's cumulative
replay protocol:

1. match `subject` against the current canonical available-Act frontier;
2. if the Act has Runtime Holes, open one `continued` Act-attempt Trace whose
   initial frontier is derived from that discovered Act;
3. feed each `BattleFillBatch` into the production continuation operation for
   that subject, preserving its batch order;
4. append one `needsFills` continuation result for every returned frontier; or
5. on resolution, commit the returned state once and close the attempt with a
   `resolved` result containing the new Act frontier and typed outcomes.

The application owns the continuation context required by the production
composition rule: current visible state, replay base, subject, accumulated
non-interrupt fill prefix, and interrupt transitions. The Case never repeats
prior fills, carries that context, or supplies an internal continuation token.
This preserves production behavior without falsely specifying every
continuation as replay from one original state or making the replay algorithm
part of the language-neutral contract.

If an Act resolves with unconsumed fill batches, evaluation emits
`battleFillInputSurplus`. If an attempt ends at a Hole frontier and another Act
attempt follows, evaluation emits `battleAttemptInputSurplus`; the pending Act
cannot be abandoned by convention. If the final attempt ends at a Hole
frontier, or the attempt sequence ends at an available-Act frontier, that last
frontier is the successful Battle continuation. An empty attempt sequence is
valid and returns the frontier immediately after Battle entry.

A production `invalid` result is terminal with the existing
`BattleInvalidReasonCode`: `selectionRejected` owns failure at an available-Act
frontier, while `fillRejected` owns failure while continuing one selected Act.
An empty production `needsHoles.holes`, a
duplicate discovered subject, or a projection that cannot encode the returned
state is an unexpected defect because the stronger Oracle frontier algebra
makes those states unrepresentable.

## Trace algebra

```text
OracleTrace = Refined<{
  steps: NonEmpty<OracleTraceStep>
}, OracleTraceLifecycle>

OracleTraceStep =
  | { tag: "creationStarted", frontier: CreationFrontier }
  | { tag: "creationProgressed", frontier: CreationFrontier }
  | { tag: "characterBuilt", build: OracleCharacterBuild }
  | { tag: "characterSheetConstructed", sheet: OracleCharacterSheet }
  | {
      tag: "battleEntered",
      observation: OracleBattleObservation,
      frontier: AvailableActFrontier
    }
  | { tag: "battleActAttempted", attempt: OracleBattleActTrace }
  | OracleTerminalRejection

OracleBattleActTrace =
  | {
      tag: "selectionRejected",
      subject: BattleSubject,
      reason: BattleInvalidReasonCode
    }
  | {
      tag: "resolvedWithoutInput",
      subject: BattleSubject,
      resolution: OracleBattleResolution
    }
  | {
      tag: "continued",
      subject: BattleSubject,
      needsFills: Seq<OracleBattleNeedsFills>,
      result: OracleBattleContinuationResult
    }

OracleBattleNeedsFills = {
  observation: OracleBattleObservation,
  frontier: RuntimeHoleFrontier
}

OracleBattleContinuationResult =
  | { tag: "open" }
  | { tag: "resolved", resolution: OracleBattleResolution }
  | { tag: "fillRejected", reason: BattleInvalidReasonCode }

OracleBattleResolution = {
  observation: OracleBattleObservation,
  frontier: AvailableActFrontier,
  outcomes: BattleResolutionOutcomes
}

CreationFrontier = {
  holes: Set<OracleCreationHole>
}

AvailableActFrontier = {
  acts: Set<OracleAvailableAct>
}

OracleAvailableAct = {
  subject: BattleSubject,
  initialHoles: Seq<OracleNonInterruptBattleHole>
}

RuntimeHoleFrontier =
  | {
      tag: "ruleInputs",
      holes: NonEmpty<OracleNonInterruptBattleHole>
    }
  | {
      tag: "interruptDecision",
      hole: OracleInterruptDecisionHole,
      choices: Set<OracleBattleInterruptProcedureChoice>
    }

OracleNonInterruptBattleHole =
  OracleBattleHole excluding kind "interruptDecision"

OracleInterruptDecisionHole =
  OracleBattleHole with kind "interruptDecision"

BattleResolutionOutcomes = {
  objectDamages: Seq<BattleObjectDamageOutcome>,
  objectIgnitions: Seq<BattleObjectIgnitionOutcome>,
  droppedObjects: Seq<BattleDroppedObjectOutcome>,
  shovePushes: Seq<BattleShovePushOutcome>,
  teleports: Seq<BattleTeleportOutcome>
}
```

All five outcome arrays are required. An empty array means that resolved Act
produced no outcome in that family; absence is not another spelling for empty.

The Trace decoder validates this lifecycle state machine as well as individual
step shapes:

| Current state          | Admitted next step                                                                                | Next state             |
| ---------------------- | ------------------------------------------------------------------------------------------------- | ---------------------- |
| start                  | `creationStarted`                                                                                 | Creation frontier      |
| Creation frontier      | `creationProgressed`                                                                              | Creation frontier      |
| Creation frontier      | `creationFillRejected`, `creationFinalizationRejected`, or creation `workflowRejected`            | terminal               |
| Creation frontier      | `characterBuilt`                                                                                  | built                  |
| built                  | `characterSheetConstructed`                                                                       | sheet                  |
| built                  | `characterSheetConstructionRejected`                                                              | terminal               |
| built                  | creation `workflowRejected` for surplus fill input                                                | terminal               |
| sheet                  | `battleEntered`                                                                                   | available-Act frontier |
| sheet                  | `battleEntryRejected`                                                                             | terminal               |
| available-Act frontier | `battleActAttempted.selectionRejected`                                                            | terminal               |
| available-Act frontier | `battleActAttempted.resolvedWithoutInput` for a discovered subject with no initial Holes          | available-Act frontier |
| available-Act frontier | `battleActAttempted.continued` with `result.resolved` for a discovered subject with initial Holes | available-Act frontier |
| available-Act frontier | `battleActAttempted.continued` with `result.open` for a discovered subject with initial Holes     | Runtime-Hole frontier  |
| available-Act frontier | `battleActAttempted.continued` with `result.fillRejected`                                         | terminal               |
| available-Act frontier | Battle `workflowRejected` for surplus fill input                                                  | terminal               |
| Runtime-Hole frontier  | Battle `workflowRejected` for surplus Act input                                                   | terminal               |

Only the available-Act and Runtime-Hole states may end without a terminal
rejection, including immediately after `battleEntered`. Every rejection is
terminal. The decoder also checks that each Act-frontier transition uses a
subject present in the prior frontier; a `continued` attempt derives its
initial Runtime-Hole frontier from that Act, and each `needsFills` member
replaces the prior frontier in sequence. `result.open` retains the derived or
last returned frontier. The enclosing attempt stores the subject once, so its
continuation cannot switch subjects.

Consequently a valid Trace cannot claim Battle continuation without having
constructed a build and sheet, cannot contain observations after rejection,
and cannot represent both an Act frontier and a Hole frontier at one point.

## Mechanical projections

### Character Creation Hole

`OracleCreationHole` preserves the production `CreationHole` union, sources,
cardinality, supported ability-score methods, option ids, and optional Unit
references. It recursively removes `label` and any message text. Choice options
are a canonical set keyed by `optionId`; duplicate ids are a projection defect.
Creation Holes themselves are a canonical set keyed by `holeId` because fill
address, not discovery-array position, is the creation protocol identity.

### Character Build

`OracleCharacterBuild` is the strict mechanical projection of the production
`CharacterBuild` algebra: it preserves every closed sum and record fact while
encoding each collection with the domain shape in the table below. It does not
flatten spellcasting versus
non-spellcasting, ordinary versus Pact slot pools, species-choice sums, or
equipment item identities. No derived Character Sheet or Battle facts are
added. Collection meanings follow the table below.

### Fresh Character Sheet

`OracleCharacterSheet` is the exact strict mutable-state projection of the
constructed production `CharacterSheet` with `characterId`, `build`, and the
constant `available` tag removed. The preceding `characterBuilt` step already
owns the build; repeating it inside the sheet projection would create redundant
state. Spellcasting and non-spellcasting remain distinct union variants, and
all mutable HP, condition, rest, resource, slot, companion, Wild Shape, and
other present fresh-sheet facts remain observable. After removing `build`, the
spellcasting variant is still distinguished structurally by its required slot-
state members; no replacement status tag is added.

### Battle Hole and Act

`OracleBattleHole` preserves every mechanical member of `BattleHole`, including
`holeId`, `holeInstanceKey`, discriminant, choices, roll modes, rule limits,
source facts, target facts, and spatial-fact requirements. It recursively
removes presentation `label` members. `OracleAvailableAct` similarly keeps the
subject and initial Hole sequence while removing `label`, `summary`, and route
events.

The Runtime Hole frontier is a sum because a pending interrupt carries
procedure choices that ordinary rule-input Holes do not. An interrupt frontier
contains the one production interrupt-decision Hole plus the mechanical
projection of `BattleInterruptProcedureChoice`, recursively removing labels.
This prevents a Trace from pairing an interrupt choice set with an unrelated
Hole or repeating the decision Hole inside the Battle observation.

`holeInstanceKey` remains observable. `holeId` identifies an authored or rule
input specification; the instance key distinguishes live occurrences that can
share that specification. Removing it would conflate simultaneous/nested
Runtime Holes.

### Battle observation

`OracleBattleObservation` is the strict production `BattleSnapshot` mechanical
projection with these exact transformations:

- remove `battleId` (one call-local battle), every creature `displayName`, and
  character-origin `characterId`;
- move `acts` into `AvailableActFrontier` and project them as above;
- move pending-interrupt `decisionHole` and mechanical `choices` into the
  interrupt variant of `RuntimeHoleFrontier`; remove `stackDepth` and the
  separately repeated trigger;
- remove every presentation label/summary/message and every route event; and
- retain all other round, actor, turn order, combatant, origin, HP, AC, Size,
  zero-HP lifecycle, Condition, Concentration, action-economy, movement,
  resource, companion, light, obscurement, readied-response, help-marker,
  and turn-state facts.

Stack depth is reducer bookkeeping. The interrupt frontier owns the trigger
through its decision Hole and owns the procedure choices, so the same facts
cannot disagree with duplicated observation fields.

## Typed rejections

Rejections are Trace outcomes, not thrown exceptions or transport failures.
They contain stable codes and structured facts, never prose. Battle selection
and fill rejections are the terminal result of their enclosing
`OracleBattleActTrace`; the remaining workflow rejections are top-level Trace
steps.

```text
OracleTerminalRejection =
  | {
      tag: "creationFillRejected",
      issues: NonEmpty<OracleCreationFillIssue>
    }
  | {
      tag: "creationFinalizationRejected",
      issues: NonEmpty<OracleCreationFinalizationIssue>
    }
  | {
      tag: "characterSheetConstructionRejected",
      issues: NonEmpty<SheetConstructionIssue>
    }
  | {
      tag: "battleEntryRejected",
      issues: NonEmpty<BattleEntryIssue>
    }
  | {
      tag: "workflowRejected",
      reason: OracleWorkflowRejection
    }

SheetConstructionIssue =
  | { code: "wildShapeKnownFormsUnexpected" }
  | { code: "wildShapeKnownFormsRequired" }
  | { code: "wildShapeKnownFormCountMismatch" }
  | { code: "wildShapeKnownFormUnavailable", statBlockId: StatBlockId }
  | { code: "wildShapeKnownFormWrongCreatureType", statBlockId: StatBlockId }
  | { code: "wildShapeKnownFormChallengeRatingExceeded", statBlockId: StatBlockId }
  | { code: "wildShapeKnownFormFlySpeedForbidden", statBlockId: StatBlockId }

BattleEntryIssue =
  | { code: "opponentStatBlockUnavailable", statBlockId: StatBlockId }
  | { code: "armorClassBaseChoiceRequired" }
  | { code: "armorClassBaseChoiceUnavailable", choice: CharacterSheetArmorClassBaseChoice }
  | { code: "pactBladeBondWithoutInvocation" }
  | { code: "pactBladeBondedWeaponNotWielded", itemId: CharacterEquipmentItemId }
  | { code: "pactBladeBondedWeaponNotOwned", itemId: CharacterEquipmentItemId }
  | { code: "pactBladeBondedItemNotWeapon", itemId: CharacterEquipmentItemId }
  | { code: "pactBladeBondedWeaponIneligible", itemId: CharacterEquipmentItemId }

OracleWorkflowRejection =
  | { code: "creationInputExhausted" }
  | { code: "creationInputSurplus", firstUnusedBatchIndex: Index }
  | {
      code: "battleFillInputSurplus",
      attemptIndex: Index,
      firstUnusedBatchIndex: Index
    }
  | {
      code: "battleAttemptInputSurplus",
      firstUnusedAttemptIndex: Index
    }

OracleCreationFillIssue = {
  holeId: CreationHoleId,
  fillIndex: Index,
  code: CreationFillIssueCode
}

OracleCreationFinalizationIssue =
  | { code: "illegalFinalization" }
  | {
      code: "invalidChoiceOption",
      optionId: CreationChoiceOptionId
    }
  | { code: "unsupportedFinalization" }
```

A terminal rejection does not repeat the observation or frontier established
by the preceding Trace prefix. `selectionRejected` leaves the prior available-
Act state unchanged; `fillRejected` leaves the continued attempt's derived or
last `needsFills` frontier unchanged. Workflow-surplus indices identify the
first unconsumed input, while the preceding attempt result owns the resulting
state. The algebra therefore cannot encode a rejection whose copied state
disagrees with the state it rejected.

Creation issues retain their existing code union, hole/fill indices, and
structured option facts, but omit messages and the redundant constant tags in
the production message shapes. A production `staleRevision` result is an
unexpected defect here: the call-local operation owns and supplies the current
revision, so that state is not representable in a decoded Case. Current
message-only finalization reasons compare at the existing stable code and
option-id granularity; source implementation must not copy prose into the
portable contract.

Sheet roster issues are accumulated for every independently checkable form.
Roster-wide issues precede per-form issues in the closed code order above;
per-form issues sort by `StatBlockId` then code. Battle-entry issues are
likewise accumulated when opponent admission, Armor Class base choice, and Pact
Blade bond checks are independent, then sorted by the listed code order and the
variant's canonical structured value. A check whose input cannot exist after
an earlier failure is not fabricated merely to increase the issue count.

Catalog decode/admission failure at application startup, impossible failure to
project a finalized build with the same admitted catalog, an empty
`needsHoles` result, or an unencodable production result is an unexpected
defect. These are not domain rejections merely because the current lower-layer
type uses `Either`.

## Collection and equality semantics

Target comparison is recursive equality over decoded algebra values after the
canonical set projections below. Raw JSON byte equality is never the contract.

| Collection                                                                                                                      | Meaning               | Equality/canonical encoding                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evaluation batches and returned traces                                                                                          | sequence              | Order and duplicates significant; output position matches input position.                                                                                                                   |
| Creation fill batches                                                                                                           | sequence              | Batch order and fill order significant because mutation and issue indices are ordered.                                                                                                      |
| Creation choice `optionIds`                                                                                                     | set                   | Reject duplicates; encode ascending by Unicode code-point order.                                                                                                                            |
| Creation frontier Holes and each Hole's options/methods                                                                         | set                   | Reject duplicate semantic keys; encode by `holeId`, `optionId`, or closed-enum order.                                                                                                       |
| Wild Shape known forms                                                                                                          | set                   | Reject duplicates; encode ascending by `StatBlockId`.                                                                                                                                       |
| Character Build origin/class-feature languages, proficiency choices, features, spell accesses, and focuses                      | set                   | Encode by language, canonical choice/feature value, spell id, or focus enum. Repeatable features remain distinct by their complete selected-choice value; identical duplicates are defects. |
| Character Progression                                                                                                           | sequence              | Preserve starting class followed by advancement history; order and repeated class entries are meaningful.                                                                                   |
| Character Build spellcasting sources, slot capacities, and owned equipment                                                      | finite map            | Encode sources by source Unit id, capacities by Spell Level, and equipment by item id; reject duplicate keys.                                                                               |
| Book of Shadows cantrips and ritual spells                                                                                      | exact-cardinality set | Encode by spell id; reject duplicates while preserving the authored required counts of three and two.                                                                                       |
| Character Sheet conditions, known forms, and rest-feature uses                                                                  | set                   | Encode by closed Condition order, Stat Block id, or rest-feature tag; reject duplicates.                                                                                                    |
| Character Sheet spent Hit Dice, resource expenditures, and ordinary/created Spell Slot expenditures                             | finite map            | Encode by class Unit id, resource identity, or Spell Level; reject duplicate keys.                                                                                                          |
| Battle attempts and fill batches                                                                                                | sequence              | Order and duplicates significant.                                                                                                                                                           |
| Ordinary Runtime Hole frontier                                                                                                  | sequence              | Preserve production Hole order; duplicate instance keys are projection defects. This preserves `BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING`.                                                    |
| Interrupt procedure choices                                                                                                     | set                   | Reject duplicate complete mechanical choices; encode by canonical complete value after recursively removing labels.                                                                         |
| Available Acts                                                                                                                  | set                   | Reject duplicate `BattleSubject` keys; encode by canonical `BattleSubject` JSON.                                                                                                            |
| Turn order, trace steps, readied-response order, roll groups, die results, target allocations, and resolution outcome arrays    | sequence              | Order and duplicates significant. Die positions remain addressable by reroll facts.                                                                                                         |
| Battle combatants, companions, light/obscurement occurrences, readied responses, help markers, conditions, and turn-usage facts | finite map or set     | Encode by combatant, companion, occurrence/area, actor/source, marker, closed Condition, or complete usage key; reject duplicate keys.                                                      |
| Numeric keyed capacities/expenditures                                                                                           | finite map            | Encode as an array sorted by numeric key; reject duplicate keys.                                                                                                                            |
| JSON object members                                                                                                             | record                | Member order ignored; duplicate member names rejected before object construction.                                                                                                           |

The canonical `BattleSubject` value key serializes closed-record members in
generated-schema order, with a union discriminant first, and preserves the
defined order of every nested sequence. The same rule is used whenever the
table names a complete canonical value as its key; it is a structural key, not
locale-sensitive text sorting or source-language object iteration order.

There is no implicit multiset in this contract. A future domain bag must be
introduced as a named `Bag<A>` and canonically encoded while preserving
multiplicity; it may not overload an ordinary array with undocumented
order-insensitive meaning.

The portable comparison corpus includes, at minimum:

- equal decoded values with every JSON object member order changed;
- equal set-shaped values with input order changed and canonical output equal;
- unequal trace, fill, Hole, turn-order, and die-result sequences with two
  members swapped;
- duplicate set members rejected rather than silently deduplicated;
- unequal ordered or future bag values when one duplicate is added/removed;
  and
- equal singleton batch evaluation and the corresponding position from a
  multi-Case batch.

## Strict JSON and boundary decoding

The generated Draft 2020-12 schema is necessary but not sufficient. The CLI
and HTTP decoders share these parse options and semantic checks:

- UTF-8 JSON only; top-level value must be an object;
- reject duplicate object member names during lexical parsing;
- reject unknown record members (`onExcessProperty: error`);
- accumulate all independently discoverable issues (`errors: all`);
- exact JSON integers only, with every branded domain applying its narrower
  source predicate;
- no non-finite numbers, numeric strings, implicit coercion, `undefined`, or
  tuple/array substitution;
- union discriminants required exactly as written;
- omitted optional members are not encoded as `null`;
- a trimmed-string domain must already equal its trimmed value; decoders reject
  rather than rewrite leading/trailing whitespace;
- set-shaped inputs reject duplicates, normalize to their canonical order, and
  encode canonically; and
- validate cross-field/lifecycle constraints after structural decoding while
  appending their issues to the same non-empty issue collection.

```text
JsonPointer = "" | "/" + RFC-6901 escaped path segments

DecodeIssue = {
  path: JsonPointer,
  code: DecodeIssueCode
}

DecodeIssueCode =
  | "invalidJson"
  | "duplicateMember"
  | "wrongType"
  | "missingMember"
  | "unknownMember"
  | "unknownVariant"
  | "outOfRange"
  | "emptyValue"
  | "emptyCollection"
  | "duplicateCollectionMember"
  | "nonCanonicalDomainValue"
  | "invalidLifecycle"
```

Issues are sorted first by JSON Pointer and then by the closed code order above,
making accumulation deterministic without prose. A pointer identifies the
offending member or the narrowest enclosing value for a cross-field issue.

The outer batch is decoded completely before any Case is evaluated. Any issue
anywhere rejects the whole request; valid prefixes are not run. Domain and
workflow rejections occur only after the entire batch is a decoded
`OracleEvaluationBatch`.

## Batch envelopes and distribution identity

```text
DistributionId = "sha256:" + 64 lowercase hexadecimal characters

OracleEvaluationBatch<N: PositiveCount> = {
  cases: Vec<N,OracleCase>
}

OracleEvaluatedResponse<N: PositiveCount> = {
  tag: "evaluated",
  distributionId: DistributionId,
  traces: Vec<N,OracleTrace>
}

OracleDecodeRejectedResponse = {
  tag: "decodeRejected",
  distributionId: DistributionId,
  issues: NonEmpty<DecodeIssue>
}

OracleBatchResponse =
  OracleDecodeRejectedResponse
  | Exists<N: PositiveCount>. OracleEvaluatedResponse<N>

OracleIdentityResponse = {
  distributionId: DistributionId
}

evaluate<N: PositiveCount>:
  OracleEvaluationBatch<N> -> OracleEvaluatedResponse<N>
```

The length index makes `traces` and decoded `cases` position-corresponding by
construction.
There is no per-Case id. `DistributionId` is the one packaging-time digest over
the executable payload, Case/Trace schema, and filtered startup catalog
projection. The digest preimage excludes only the metadata file that stores the
resulting digest, avoiding a self-reference while binding every semantic
payload byte. It is operational replay context outside every Case and Trace,
not a second content manifest or rules authority.

## CLI framing

The main application exposes these intrinsic command roles; the eventual
executable filename is packaging, not contract:

```text
<app> oracle identity
<app> oracle stream
<app> oracle serve --host 127.0.0.1 --port <port>
```

`oracle identity` writes one compact `OracleIdentityResponse` plus LF and exits
zero. `oracle stream` is persistent line-delimited JSON: each non-empty UTF-8
line is exactly one `OracleEvaluationBatch`, and each normally handled input
line yields exactly one compact `OracleBatchResponse` line in the same order.
Blank lines are `invalidJson` frames, not keepalives. EOF after a complete line
is a clean shutdown; EOF in an unterminated non-empty final line still evaluates
that line.

Schema/decode rejection is a normal response and does not terminate the stream.
After EOF, a process that handled only evaluated/decode-rejected frames exits
zero. An unexpected defect writes no response line for the failing frame,
discards every Trace computed for that frame, writes only non-contractual
diagnostics to stderr, and exits with code 70. No later frame is processed.

A fresh CLI run is the same stream command with one input line and EOF. There
is no alternate singleton request or response shape.

## HTTP mapping

The same application server exposes:

| Request                                          | Response                                                                |
| ------------------------------------------------ | ----------------------------------------------------------------------- |
| `GET /oracle/identity`                           | `200` + `OracleIdentityResponse`                                        |
| `POST /oracle/evaluations` with a valid batch    | `200` + `OracleEvaluatedResponse`                                       |
| `POST /oracle/evaluations` with any decode issue | `400` + `OracleDecodeRejectedResponse`                                  |
| Unexpected application defect                    | `500` + exactly `{ "tag": "defect", "distributionId": DistributionId }` |

Request and response media type is `application/json; charset=utf-8`. The POST
route accepts exactly one batch object, never line framing. A defect response
contains no Trace or partial-success member. Method-not-allowed, body-size,
socket, TLS, and proxy behavior are ordinary HTTP deployment concerns, not
Oracle domain variants.

CLI and HTTP encode the same decoded batch response values. The HTTP status is
transport classification around that shared algebra, not a second behavior
contract.

## Portable case and black-box fixture corpus

Source implementation ships schema-validated SRD or visibly synthetic fixtures
with no PHB+ authored identity. The minimum portable corpus is:

| Fixture                        | Required observation                                                                                                                                                    |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `valid-level-1-battle-entry`   | Complete SRD level-1 creation reaches `characterBuilt`, fresh sheet construction, and `battleEntered`; empty Battle prefix returns the Act frontier.                    |
| `valid-level-2-creation`       | A level-2 progression proves creation choices and derived build/sheet facts are retained without a second level-1 class input.                                          |
| `valid-wild-shape-known-forms` | A level-2 SRD Druid supplies the exact eligible known-form set and reaches Battle.                                                                                      |
| `valid-battle-hole-prefix`     | Select an available attack, fill target and attack roll in separate batches, and stop at the ordered damage-roll Hole frontier.                                         |
| `valid-battle-resolution`      | Complete the same plausible attack with a hit and damage; observe HP change, outcomes, and next Act frontier.                                                           |
| `creation-input-exhausted`     | Empty or incomplete creation prefix yields typed `creationInputExhausted`, never a creation continuation success.                                                       |
| `creation-fill-rejected`       | Structurally valid unknown/duplicate/wrong-kind fills accumulate ordered creation issues and leave the frontier unchanged.                                              |
| `sheet-input-rejected`         | Wild Shape input absent, unexpected, unavailable, or ineligible yields the precise sheet code; a duplicate roster member is rejected by set decoding before evaluation. |
| `battle-entry-rejected`        | Unknown opponent or unavailable AC/Pact choice yields the precise handoff code.                                                                                         |
| `battle-act-rejected`          | A structurally valid stale or unavailable subject at an Act frontier yields `BattleInvalidReasonCode`.                                                                  |
| `battle-fill-rejected`         | A structurally valid invalid fill while one subject has a Hole frontier yields `BattleInvalidReasonCode` without changing frontier kind.                                |
| `creation-input-surplus`       | A ready build followed by another creation batch reports the first unused index.                                                                                        |
| `battle-input-surplus`         | Extra fill batches after resolution and a later Act after an open Hole frontier produce the two distinct workflow codes.                                                |

Boundary fixtures additionally establish:

- an empty outer batch is a decode rejection;
- a mixed batch with valid members and multiple independently invalid members
  reports all issues and evaluates nothing;
- distinguishable Cases preserve result position;
- same Case replay is deterministic;
- a multi-Case response equals concatenated singleton responses;
- the same decomposition law holds after unrelated prior frames in one CLI
  process;
- fresh CLI, persistent CLI, and HTTP return structurally equal decoded values;
- set, sequence, duplicate, and object-member-order comparison rules above;
- a later injected defect discards an earlier computed Trace and produces only
  nonzero/500 behavior; and
- CLI and HTTP report the same immutable `DistributionId` as the identity
  endpoint.

Target Language Adapter examples consume these fixtures but do not own them,
generate expected traces, or import a source comparator. The Target test still
owns arbitrary Case generation, Target projection, equality execution,
reporting, persistence, and optional shrinking.

## Source-readiness consequences

This decision does not implement the Oracle. Source implementation must:

- introduce one application-owned Case/Trace schema and projection module,
  generated Draft 2020-12 schema, and portable fixtures;
- make Character Creation own a strict `CreationFill`/Hole/Build schema or
  derive it from its existing type authority;
- reuse the existing Battle subject/fill schemas and add presentation-free Hole,
  Act, observation, outcome, and rejection projections at the Battle owner;
- promote fresh-sheet Wild Shape and character-to-Battle handoff failures from
  messages to the precise typed codes above at their current owners;
- keep cumulative Battle replay, draft revision, fixed call-local identities,
  catalog services, and application composition inside the single operation;
- define the four reserved Oracle identities once in one application-owned
  value used by composition and projection, rather than repeating string
  literals across transports or fixtures;
- implement the shared atomic decoder once for CLI and HTTP;
- derive the levels-1-and-2 startup catalog projection from the canonical
  generated catalog and compute one distribution digest;
- package the three CLI roles and two HTTP routes in the source-free main
  application distribution; and
- black-box the packaged artifact with the complete fixture matrix above.

No Oracle package may copy `CharacterBuild`, `CharacterSheet`, `BattleSubject`,
`BattleHole`, `BattleFill`, or Battle observation fields into a parallel type
hierarchy. Change/re-export/project from the owning layer and let exhaustive
compilation identify every fact that must change together.

## Rejected alternatives

### Complete intermediate Draft, Sheet, or Battle state in the Case

That would let callers bypass the composed production lifecycle, duplicate
derived state, and create contradictory build/sheet/battle combinations. The
Case supplies only external decisions and table facts.

### Draft revisions and cumulative Battle fill replay on the wire

Those are current mutation/reducer algorithms. Stable Hole identities and
ordered fill batches preserve the domain protocol while the application owns
revision and replay bookkeeping.

### One flat creation choice object

It would bypass discovery, conditional Hole opening, atomic batch rejection,
and the same reducer path that the Target must implement. Ordered fill batches
exercise the production continuation boundary directly.

### One Battle subject plus one flat fill list

It would hide intermediate Hole frontiers and cannot distinguish simultaneous
fills from later continuation decisions. Per-attempt non-empty fill batches
preserve both without introducing a stateful Oracle session.

### Full MCP Character/Battle outputs

They carry sessions, broad JSON, presentation, duplicated snapshots, and MCP
tool envelopes. They are a different frontend, not a language-neutral
application contract.

### Raw `BattleSnapshot` as Trace

It contains battle/process identity, display prose, available Acts inside state,
and interrupt stack depth. The mechanical projection retains domain outcomes
while separating observation from the exclusive Act-or-Hole frontier.

### String messages as portable rejection identity

Messages are unstable presentation and the current sheet/handoff messages
collapse distinct failures. Typed owner-level codes are cheaper and safer than
an Oracle-side message registry.

### Seeds, Case ids, or transport correlation

The exact decoded Case reproduces evaluation. Generation seeds are Target test
metadata; batch positions correlate results. None belongs in Case or Trace.

### Bytewise JSON equality

Object member order is not JSON data, while several domain collections are
sets and others are ordered. Canonical set projection plus recursive decoded
equality makes the distinction executable.

## Map impact

This decision fixes the strict Oracle Case/Trace lifecycle, inputs,
presentation-free projections, rejection boundary, collection equality,
portable fixtures, CLI framing, HTTP mapping, and distribution identity. It
does not reopen the Opaque Oracle topology or implement any source change.

The answer removes “The exact Oracle Case and Trace algebra” from the
wayfinder map's fog. No new decision ticket is surfaced: implementation details
are now source-readiness and later execution work, while which Oracle artifacts
belong in the Cleanroom Core or Target Language Adapter remains owned by
[Define the Cleanroom Core and Target Language Adapter
boundary](https://github.com/dearlordylord/5e-quint/issues/20).

## Verification

This is a documentation-only architecture/domain decision. It changes no RAW
mechanic, QNT, reducer state, runtime behavior, Surface content, or public API.
RAW applicability is therefore **no new modeled rule**. The production
inventory was checked against local SRD 5.2.1 Character Creation
(`Character-Creation.md`, character creation steps, HP/AC/Initiative facts) and
Combat (`Playing-the-Game.md`, Combat Step-by-Step, Initiative, turns, and
attacks), plus `Rules-Glossary.md` Character Sheet and Initiative. The algebra
preserves current production rule facts and makes externally varying table
facts explicit; it does not add a mechanic or resolve an ambiguity beyond RAW.

The required reviewer loop converged in three passes:

1. RAW and ubiquitous-language review confirmed the Character Creation,
   Character Sheet, Stat Block, Battle, turn, and Initiative terminology. It
   corrected an overstatement that every Battle continuation replays from one
   original state and separated duplicate set input from sheet-domain
   rejection.
2. Domain/architecture and connascence review removed copied observations,
   subjects, and frontiers from rejection shapes; moved interrupt-only facts
   into an interrupt frontier; nested continuation results under one Act
   attempt; accumulated independent roster/handoff issues; length-indexed
   batch results; and centralized the reserved-identity requirement. This pass
   also replaced the prose lifecycle with the executable refinement/state
   machine above.
3. Code-review review against `.claude/review-rules.md` rechecked strict decode
   accumulation, optional-versus-empty states, set/map/sequence semantics,
   authored identity and PHB+ boundaries, lower-layer ownership, batch
   atomicity, defect abort, source references, and formatting. No reasonable
   finding remained.

Two challenged additions were rejected with concrete reasons: a duplicate-form
sheet issue would be unreachable after `Set<StatBlockId>` decoding, and an
Oracle-only expansion of `BattleInvalidReasonCode` would create a parallel
error taxonomy instead of changing its Battle owner when that owner needs more
granularity.

`git diff --check` and Prettier checks pass. No MBT, QNT proof, TypeScript
typecheck, or runtime test is required for this documentation-only decision;
future implementation must run the affected focused runtime tests and one
conscious end-to-end Oracle black-box lane after code changes are complete.
