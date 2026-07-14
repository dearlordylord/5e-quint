# Cleanroom SDK Context

This context names the language-neutral cleanroom workflow used to build independent D&D SDKs from the repository's allowed rules corpus.

## Language

**Target SDK**:
A durable, independent D&D SDK implemented from the allowed cleanroom corpus. A Target SDK is production software rather than a disposable experiment or evidence artifact.
_Avoid_: Target, cleanroom target, experiment implementation

**Target Language Profile**:
The language and ordinary toolchain chosen for one Target SDK, such as Rust and Cargo. It does not change the language-neutral cleanroom corpus or define a separate source-side workflow.
_Avoid_: Target, target profile

**Cleanroom Constraint**:
The restriction on which source knowledge may be used to build a Target SDK. It constrains inputs; it is not a second product, task ledger, or acceptance system.
_Avoid_: Cleanroom harness, cleanroom implementation

**Cleanroom Core**:
The one language-neutral input corpus used to build independent Target SDKs. It contains RAW, the Cleanroom Mechanics Slice projected from canonical authored content, active calibrated QNT, and shared domain language. It is not divided into per-Unit or per-assignment packages.
_Avoid_: Per-Unit package, export catalog, experiment catalog

**Reducer-Eligible Authored Mechanics**:
The authored mechanics whose rules consequences can be owned by a Functional Reducer rather than decided by the table. They may consume explicit table-supplied witnesses; needing a witness does not make the resulting mechanical consequence table-owned.
_Avoid_: Treating every rule that mentions space, objects, tactics, or a caller choice as non-executable

**Source-Executable Authored Mechanics**:
The Reducer-Eligible Authored Mechanics actually supported through production TypeScript Functional Reducers in the source snapshot. Authored mechanics outside the Source Execution Horizon or without a production execution path do not enter the Cleanroom package.
_Avoid_: Catalog-only mechanics, planned runtime support, test-helper-only execution

**Source Execution Horizon**:
The character-progression range used when package eligibility depends on acquiring or composing a mechanic through character advancement, presently levels 1 through 10. It does not assign a fictitious level to Stat Blocks or other non-progression roots, and it is not a cap on the character levels, Spell Levels, Cast Levels, or other extension inputs that an included mechanic already supports through production TypeScript reducers.
_Avoid_: Spell-level horizon, maximum executable level

**Cleanroom Mechanics Slice**:
The packaged projection of complete Authored Mechanics Graphs whose represented mechanics are all Source-Executable and whose progression-governed roots fall within the Source Execution Horizon. An included record retains its entire authored mechanic, including every progression, scaling, and extension fact; if any represented part lacks production TypeScript reducer execution, the record is excluded or the source is repaired rather than packaged as a partial rule. The slice is derived from source authority, not a handwritten support list or a Target-selected subset.
_Avoid_: Support scope, per-Unit package, Target capability declaration

**Cleanroom Workflow Horizon**:
The character-progression range for which the Cleanroom requires composed public Character Creation-to-Battle SDK workflows, presently levels 1 and 2. It narrows required public workflow reachability, not package membership, Static Mechanics Admission, or the extension behavior of an included mechanic; Spell Level is a separate domain axis. The source-free main application may apply it once when loading the catalog used for Oracle evaluation, while preserving the complete Authored Mechanics Graphs and Authored Reference closure required by the Portable Surface Contract for retained roots; that runtime view does not redefine the packaged Cleanroom Mechanics Slice. Widening the horizon should compose already-executable reducer semantics rather than add rule logic or redesign the Target's mechanics model.
_Avoid_: Spell-level horizon; truncating authored records at the horizon; treating the horizon as the maximum level representable by Target domain types

**Target Language Adapter**:
The closed conformance-tool profile paired with the Cleanroom Core for one Target Language Profile. It identifies the real language Quint connector, its documentation and invocation, the evidence checks required for conformance, and may recommend an ordinary property-testing library for Target-owned Oracle Case generation and optional shrinking. Rust is currently the only such adapter. It contains no Target SDK interfaces or implementation code.
_Avoid_: Target implementation kit, reducer skeleton

**Opaque Oracle**:
The role in which Target SDK tests query a source-free distribution of the main production application's CLI or HTTP surface to discover calibrated production behavior during implementation and later differential conformance. Both intrinsic production surfaces expose the same strict JSON contract for one stateless composed Character Creation-to-Battle evaluation; there is no Oracle-specific application or harness. A Target SDK remains buildable and runnable without them, and RAW plus calibrated QNT remain the rules authority.
_Avoid_: Reference SDK, separate Oracle implementation, Target dependency, source-code handoff

**Oracle Case**:
A self-contained, schema-decoded input to the Opaque Oracle's single composed Character Creation-to-Battle evaluation. It contains an ordered Character Creation fill-batch prefix, non-derivable fresh-sheet input, explicit Battle-entry facts, and an ordered prefix of Battle Act attempts with Runtime Hole fill batches; it carries no transport correlation, mutation revision, cumulative replay state, or retained Oracle session identity. Successful creation always proceeds through Character Build, Character Sheet, and Battle entry before ordinary input exhaustion may return an Oracle Continuation Frontier. The exact case is the reproducibility artifact; a Target-owned property test may shrink it while preserving a failure, but shrinking is not an Oracle responsibility.
_Avoid_: Oracle session, transport-specific test case

**Oracle Evaluation Batch**:
A non-empty, ordered collection of Oracle Cases decoded atomically and evaluated sequentially by the main production application. Each normally evaluated Case has exactly one position-corresponding Oracle Trace; singleton evaluation uses a one-Case batch, so no alternate wire shape or case identifier is needed. Batch evaluation is observationally equal to concatenated singleton evaluations, including after prior messages in the same process.
_Avoid_: Partial batch, correlated request set

**Oracle Trace**:
A source-owned, language-neutral ordered trace returned by evaluating an Oracle Case through the real production Character Creation-to-Battle workflow. It contains presentation-free Character Creation, Character Build, Character Sheet, and Battle outcomes plus the exclusive current Oracle Continuation Frontier; collection comparison is structural after canonical set projection, and internal helpers, mutation/replay bookkeeping, unstable prose, route evidence, sessions, and caches are excluded.
_Avoid_: Internal execution trace, final observation only

**Oracle Continuation Frontier**:
The one decision boundary at which a successful Oracle Case may stop after Battle entry: either the canonical set of currently available Battle Acts or the ordered non-empty Runtime Holes for one selected Act. Character Creation input exhaustion is an Oracle Workflow Rejection rather than a continuation frontier.
_Avoid_: Active battle marker, creation continuation, internal replay state

**Oracle Workflow Rejection**:
A typed outcome showing that structurally valid Case data contradicts the composed evaluation lifecycle, such as creation input exhaustion/surplus or Battle input supplied beyond the current Act-or-Hole frontier. It is deterministic domain data in an Oracle Trace, not a decode failure or unexpected application defect.
_Avoid_: Protocol error, exception, partial success

**Oracle Discrepancy**:
A difference identified by a Target-owned test between its SDK observations and the Oracle Trace for the same replayable Oracle Case. The difference is evidence rather than an Oracle verdict; the implementer owns failure behavior, reporting, persistence, diagnosis against RAW and calibrated QNT, and any resulting fix.
_Avoid_: Oracle verdict, generated golden expectation

**Portable Surface Contract**:
The language-neutral boundary that accepts the complete generated Surface aggregate for the Cleanroom Mechanics Slice or rejects it with typed content issues. The complete canonical SRD catalog remains the source-side publication authority rather than Target input; this boundary covers the generated projection's JSON shape and catalog integrity, not Static Mechanics Admission or dynamic availability.
_Avoid_: Dhall schema, mechanics support manifest, content release protocol

The Cleanroom input for one Target SDK is the Cleanroom Core plus the applicable
Target Language Adapter. There are not multiple Cleanroom Cores per Unit.

Only active source-side QNT may enter the Cleanroom Core. A new composite
scenario is introduced in the source repository first, connected to the
production TypeScript reducers/SDK as applicable, and calibrated there through
real `quint-connect` parity. The cleanroom is never the first integration site
for new QNT.

## Cleanroom Enforcement Boundary

The Cleanroom can directly supply only language-neutral inputs and tool
coordinates: concise prompts/domain documentation, Dhall and generated JSON,
portable schemas plus conformance fixtures, active QNT, and the selected
language connector information. Prompts can request an architecture but cannot
prove it.

Executable artifacts can establish observable contracts:

- portable schema and fixtures check authored-content decoding;
- real QNT plus target-owned connector tests check reducer behavior;
- metamorphic cases make authored-id dispatch and duplicated constants harder
  to hide;
- SDK Scenarios check composed public workflows.

They cannot prescribe or prove internal target type names, module boundaries,
an `AuthoredCatalog`/`ExecutableCatalog` class split, or a particular reducer
implementation. Those remain target design choices and later code-review
subjects. Cleanroom acceptance must state observable behavior rather than claim
that prompts enforce internal architecture.

### Minimal Guidance

Cleanroom-specific prose approaches zero. Canonical RAW, curated assumptions,
and shared domain language remain because they are rules authority, not workflow
instructions. The cleanroom contract itself is carried by:

- conventional artifact locations;
- the portable Surface schema and valid/invalid fixtures;
- paired Dhall/JSON authored content;
- active QNT and its executable drivers;
- a small machine-readable Target Language Adapter configuration identifying
  the connector and standard invocation.

Do not create narrative Unit bundles, generated guidance essays, per-Unit
checklists, or prose obligation ledgers. Any unavoidable bootstrap text should
only identify the requested outcome and the artifact roots.

### Manifest Discipline

Per-Unit or per-QNT manifests are allowed when they improve an executable
contract. They are not allowed merely to report status or repeat facts already
owned elsewhere.

A manifest must satisfy all of these conditions:

- a schema validates it and a conformance command consumes it;
- missing, stale, duplicate, or contradictory entries fail the command;
- derivable fields are generated from authoritative Dhall/JSON/QNT rather than
  handwritten;
- non-derivable declarations name a real semantic contract and are owned at the
  source boundary where that contract is decided;
- it contains no prose guidance, implementation recipe, completion claim, or
  copied expected outcome;
- removing it would remove a specific enforceable quality gate.

Potentially useful examples are a generated Dhall/JSON/schema pairing index or
a source-owned classification of cleanroom-executable QNT entry modules and
their declared observable cases. File lists, hashes, support labels, and
Unit-to-QNT joins that can be derived mechanically should not become manually
maintained truth. Whether either example is justified remains a source-audit
decision, not a default requirement.

**Rules Corpus**:
The language-neutral rules knowledge allowed by the Cleanroom Constraint, including RAW, canonical authored content, formal QNT semantics, and shared domain language. It contains no TypeScript runtime implementation or TypeScript runtime tests.
_Avoid_: Guidance bundle, Unit index

**Functional Reducer**:
The central rules engine for a domain such as character creation or battle. It consumes parsed authored mechanics together with reducer state and commands/fills, then returns the next state, required holes, or a typed rejection. QNT conformance targets this layer. The SDK is an interface to it, not a substitute for it.
_Avoid_: Treating SDK or MCP behavior as the primary rules implementation

**SDK Scenario**:
An end-to-end use of the Target SDK through public domain APIs, from an authored-content selection or user-facing input through the Functional Reducer and composed outcome. It confirms that reducer capabilities are reachable through the SDK rather than only through target-owned MBT driver code. It is downstream integration evidence, not the primary QNT parity boundary.
_Avoid_: Selected-identity projection, adapter fixture

SDK Scenarios are ordinary Target-SDK-owned executable tests. The cleanroom
workflow does not introduce new "SDK journey QNT." If a journey reveals a
missing or weak formal semantic obligation, adding or strengthening QNT is a
source-side task: improve the model, integrate it into production TypeScript,
calibrate it through source-side parity, and only then admit it to a later
version of the Cleanroom Core.

**Authored Selection**:
Selection of a real Surface record by authored identity, such as a wizard choosing the SRD Ice Knife record. Identity is valid at catalog, selection, provenance, replay, and presentation boundaries. After selection, binding and reducer behavior consume the record's statically admitted mechanics and typed procedure facts, not a reducer branch on the authored id.
_Avoid_: Erasing authored identity from user workflows; dispatching runtime semantics by spell or Unit id

**Authored Record**:
A top-level decoded authored aggregate in the Surface corpus: either a `UnitRecord` or a `StatBlockRecord`. They share the authored-record role, but remain distinct families because their catalogs, provenance boundaries, and execution relationships differ; use the specific family when that distinction matters.
_Avoid_: Using “Unit” as the umbrella term for every authored record

**Execution State**:
The complete state used by a reducer transition, including authored catalogs, admitted mechanics, and mutable runtime facts. “Immutable context” may describe a current lifecycle optimization, but it is not a domain boundary; a rules-changing game could update its catalog as part of state.
_Avoid_: Treating catalogs as categorically outside state

**Derived Mechanics Cache**:
An optional memoization of mechanics inspection or executable projections derived from authored records and support code. It is a performance/lifecycle optimization, not a second source of truth, an authored-content store, or a required workflow boundary; cached facts must remain reproducible from their authoritative inputs.
_Avoid_: Treating cached projections as an independently maintained support ledger

**Authored Mechanics Graph**:
The connected authored content rooted at a catalog record under mechanics examination: a `UnitRecord` or `StatBlockRecord`, its nested mechanics, and the domain-typed Authored Dependencies whose mechanics must be consulted to interpret or execute that root. It contains authored relationships and rule input specifications, not live reducer holes. An Authored Reference does not join the graph merely because it contains another record's identity; selection, presentation, or rules-defined identity predicates are not execution dependencies.
_Avoid_: Treating Unit and Stat Block catalogs as unrelated execution boundaries; traversing every identity-shaped Authored Reference as a mechanics dependency

**Authored Reference**:
An identity edge explicitly named by authored content, such as a Unit or Stat Block catalog reference. It exists because the rule refers to that authored record; it is not generic indirection or a reason to copy the referenced record's fields.
_Avoid_: Treating every lookup or copied projection as an authored reference

**Authored Dependency**:
Authored content whose mechanics must be consulted to interpret or execute another authored record. A dependency may be embedded, referenced by identity, or constructed by the source mechanics; it does not authorize independently maintained duplicate facts.
_Avoid_: Calling a duplicated subset of fields the dependency itself

**Authored Input Specification**:
A rule-defined constraint or parameter shape in authored mechanics, such as “one creature target,” a slot-scaling axis, or a selectable option. An authored `holeId` may name this specification, but it describes what a procedure may require; it is neither an authored-record dependency nor an open runtime request.
_Avoid_: Calling an authored input specification a filled value or a runtime hole

**Runtime Hole**:
A live reducer-workflow request for a value required to complete an executable procedure, such as a target, chosen option, slot level, or roll. It is created after a procedure is available for interaction; an authored `holeId` may identify the corresponding input specification, but the live request and its eventual fill come from a later interaction or runtime state. It is not an authored-record dependency or an authored input specification.
_Avoid_: Treating unresolved authored references and runtime inputs as the same concept

**Static Mechanics Admission**:
The observable support relation evaluated during catalog installation over the packaged Cleanroom Mechanics Slice. Every represented mechanic in that slice is required: successful admission is backed by production Functional Reducer execution, while failure returns typed unsupported-mechanics issues attributed through record-rooted mechanics paths. It is evaluated without live actor, session, or battle facts and does not create Runtime Holes. Per-root checks and receipts are diagnostic and conformance decomposition, not separate installation transactions or stored admission objects. Character/build binding and cross-capability composition occur later through production reducers and SDK Scenarios.
_Avoid_: Treating a derived cache, per-record receipt, or support-status record as the admitted object; claiming admission from decoding or shape recognition alone; merging selected records into an admission unit; returning an empty discovery result for unsupported mechanics

## Target SDK Data Flow

Canonical Dhall and the complete SRD catalog remain source-side authorities.
Source-side package preparation generates the Cleanroom Surface aggregate; a
Target SDK loads that aggregate and neither authors Dhall nor regenerates JSON.

```text
Cleanroom Core
  generated Cleanroom Surface JSON + QNT + RAW/domain language
                              |
                              v
Target SDK loads the authored JSON catalog
                              |
                              v
target evaluates Static Mechanics Admission over decoded authored mechanics
                              |
                              v
user or application selects authored record identities and supplies bindings
                              |
                              v
production character-creation or battle reducer
                              |
                              v
SDK interface
```

Target conformance is not satisfied by implementing a QNT behavior only in a
lower-level helper. The behavior must be reachable through the production
domain reducer or command dispatcher. Lower-level proofs and tests remain
useful but are not target-conformance evidence by themselves.

The language conformance checks must establish at least:

- the real Quint process and the selected language connector ran, rather than a
  stored or hand-authored trace substitute;
- intended QNT MBT behavior was exercised through Target-SDK-owned test code
  into the production reducer, without a shadow reducer or target-computed
  oracle;
- reducer state was compared with QNT state after the relevant transitions;
- SDK scenarios reached the same production reducer, so reducer parity is not
  stranded below the Target SDK interface.

Catalog installation combines portable Surface decoding with Static Mechanics
Admission. Every represented mechanic in the supplied Cleanroom Mechanics Slice
is required, so any unsupported mechanic rejects executable installation with
typed reasons. Mechanics excluded by the source-side narrowing pipeline are not
shipped in that package. Later character/battle discovery consumes admitted
facts plus current state to decide dynamic availability; it does not repeat
shape recognition or silently reinterpret unsupported content as unavailable.

This paragraph is an observable target contract, not a mandated internal type
or module design. A Target SDK may realize it differently if the same boundary
behavior is demonstrated.

The Target Language Adapter may identify required evidence and supported external
tools, but it must not compile against package-owned target-language interfaces.
Doing so would prescribe the Target SDK's implementation through its language.

Target conformance must also establish the catalog-to-reducer connection. A
checksum, import event, or assertion that a JSON file was opened proves only
input presence. Conformance uses synthetic-identity metamorphic cases at the
catalog boundary:

- the same parsed mechanics under a visibly synthetic authored identity retain
  the same rule behavior, apart from legitimate identity/provenance projection;
- changing a selected mechanics fact under that synthetic identity changes the
  reducer behavior as the corresponding QNT semantics require.

These cases run through the production reducer. They demonstrate that behavior
follows supplied structured mechanics rather than duplicated target-language
constants or authored-id dispatch. Real SRD identity scenarios separately prove
that the supplied catalog records can be selected and executed.

**Accidental Combinatorics**:
Pairwise or authored-identity-specific wiring between otherwise reusable rule capabilities when RAW does not define that pair as a distinct rule. Examples include spell-specific continuation variants for a general reaction protocol and spell-specific copies of the general damage or Concentration lifecycle. Conformance checks must follow domain capabilities and authored composition rather than constructing a matrix of content-record combinations.
_Avoid_: Treating one observed content interaction as part of either content record's definition

## Source Follow-up

- Remove the Ice-Knife-specific Shield coupling from active QNT. Preserve the
  domain behavior through general attack-trigger, Reaction, continuation, and
  authored-content composition semantics instead.
- Audit the active QNT forest for other authored-identity continuations and
  pairwise mechanic combinations that create accidental combinatorics.
- Strengthen QNT wherever cleanroom research exposes a weak, literal-only, or
  missing semantic model. Treat the resulting TypeScript improvement as part of
  source calibration, not as target-side cleanroom work.
- Strengthen the cleanroom review/conformance workflow so domain-first
  rule ownership is checked before adding content-specific witnesses.
- Publish a portable Surface contract from the source-side authoritative
  decoder. It must cover the closed structural vocabulary and carry portable
  valid/invalid examples for constraints that the chosen schema format cannot
  express. Validate the artifact against the TypeScript decoder before adding
  it to the Cleanroom Core. The current `_types.dhall` helper is not this
  contract; it is a permissive authoring aid for heterogeneous Dhall lists.
- Split TypeScript runtime support recognition from dynamic availability.
  Decode Surface records and statically admit their mechanics with typed
  unsupported-shape reasons at catalog installation. Discovery should consume
  admitted facts plus actor/runtime state instead of using `[]` for both an
  unsupported record and a supported-but-currently-unavailable action.
- Do not assume that Ice Knife's current phase composition must become one
  indivisible or permanently named procedure identity. That modeling decision
  remains outside this cleanroom architecture discussion.

### Surface Installation And Static Admission Subtask

This is a separate source-side architecture task that must not be lost inside
the cleanroom plan. Its proposed scope is:

1. Publish and test the portable Surface contract and conformance fixtures.
2. Introduce distinct TypeScript workflow states for decoded authored content
   and statically admitted executable content; exact type names remain a design
   decision for that task.
3. Return typed unsupported-shape reasons during installation rather than
   collapsing them into an empty discovery result.
4. Keep actor/state/resource availability in later character and battle
   discovery.
5. Integrate the change through production TypeScript reducers and update QNT
   wherever the admission/availability distinction has formal semantics.
6. Complete normal RAW, domain-language, architecture, and code-review
   convergence before the resulting artifacts enter the Cleanroom Core.

## Target Build Order

The Target SDK is built by domain layers, not as one implementation assignment
per Unit or spell:

1. Implement the Surface schema/catalog boundary and load the supplied authored
   JSON corpus. Surface is above individual rule execution and preserves real
   authored selection identity.
2. Implement the shared base-rule semantics represented by rule-core QNT as
   reusable target-language domain logic.
3. Implement production character-creation and battle reducers that compose
   those base rules from parsed Surface mechanics.
4. Admit the Surface catalog through mechanics shapes. A record fitting an
   implemented shape is data, not a request for a new spell-specific reducer.
5. Add SDK interfaces and executable SDK Scenarios over those reducers.

An authored Unit can expose a missing Surface shape, base rule, or reducer
composition, but it is not itself the implementation boundary. Work is owned by
the missing rule area and then benefits every applicable record. This
prevents attacks, Saving Throws, damage, areas, spell slots, and similar rules
from being reimplemented for Ice Knife, Fire Bolt, Fireball, or any other Unit.

### Useful Foundation Increment

Long foundation work is expressed as rule-area asks, not Unit batches. For
example, **Implement Attack resolution end to end** means attack-roll inputs, Armor
Class comparison, hit/miss, critical-hit handling, and the path through the
production battle reducer. Ice Knife, Fire Bolt, weapon attacks, and monster
attacks then use that same work. A completed ask is useful only when it leaves
production architecture that later tasks extend without replacement:

- supplied Surface JSON is parsed through the target's real catalog boundary;
- the rule is generic over parsed mechanics and synthetic identity;
- real QNT runs through the selected language connector;
- Target-SDK-owned MBT code reaches the production domain reducer and compares
  reducer state with QNT state;
- the main reducer exposes the rule through its normal command/hole/fill
  workflow;
- no authored-id dispatch, duplicated content constants, shadow reducer, or
  target-computed oracle is introduced.

An incomplete foundation may report completed rule-area asks, but it may
not report an authored Unit as implemented.

### Foundation Acceptance

Before authored Units can be called implemented:

1. Every supplied Surface JSON record is decoded against the portable Surface
   contract into the target's typed catalog with authored identity and
   provenance intact. JSON syntax alone does not count. Portable negative
   examples are rejected at the same boundary.
2. Every source-declared, cleanroom-eligible reusable QNT behavior has run via
   the real language connector and reached a production reducer. Completeness
   is derived from source-owned executable QNT declarations, not a handwritten
   target ledger.
3. Character-creation and battle main reducers have exhaustive command
   dispatch for the admitted capabilities, typed failures, and no helper-only
   semantic implementations.
4. Synthetic-identity metamorphic checks prove behavior follows supplied
   mechanics rather than authored ids or duplicated native constants.
5. Target-owned SDK Scenarios exercise creation, discovery, fills,
   finalization, battle entry, battle holes/fills, resolution, and settlement
   through those same production reducers.

### Backup Plan

- If the whole foundation cannot land in one run, reduce the next batch to a
  smaller complete rule area. Do not reduce scope to one authored Unit.
- If QNT is missing, literal-only, identity-coupled, or unable to expose the
  behavior needed for conformance, stop that target rule area and perform the
  source-side QNT plus TypeScript repair first.
- If the language connector cannot provide trustworthy real-execution or
  comparison evidence, improve the connector/Target Language Adapter; do not
  replace it with stored traces or target-specific accounting scripts.
- If existing Target SDK code conflicts with the foundation, preserve it in Git
  and remove or migrate it incrementally inside the existing repository. Only
  code that passes the foundation gates is retained as production authority.
