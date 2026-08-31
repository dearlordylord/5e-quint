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
_Avoid_: Cleanroom implementation

**Source Readiness**:
The atomic handoff condition in which one coherent source state supplies a complete Cleanroom Harness through which the Cleanroom Core, applicable Target Language Adapter, and Opaque Oracle are discoverable, with every source-owned gate for that state passing. Partial source artifacts and Dirty-Cleanroom Rehearsal results do not establish Source Readiness; the downstream Cleanroom Acceptance Run requires a Target SDK and therefore occurs later.
_Avoid_: Partial readiness, dirty-rehearsal acceptance, Target SDK acceptance

**Cleanroom Harness**:
The source-produced deployment artifact and instructions given to an AI agent to establish a Target SDK workspace in any Target Language Profile with an applicable Adapter. It requires the agent to discover and use the declared Core, Adapter, Oracle, and conformance tools without prescribing their physical containment or becoming a Target-side test framework.
_Avoid_: Target test harness, reference SDK, fixed physical bundle

**Cleanroom Core**:
The one language-neutral input corpus used to build independent Target SDKs, containing licensed RAW, source-ready assumptions and shared language, the generated Cleanroom Mechanics Slice, portable schemas and cases, and active calibrated QNT. Oracle schemas and fixtures belong here; the source-free Oracle application and per-Unit packages do not.
_Avoid_: Per-Unit package, export catalog, experiment catalog

**Reducer-Eligible Authored Mechanics**:
The authored mechanics whose rules consequences can be owned by a Functional Reducer rather than decided by the table. They may consume explicit table-supplied witnesses; needing a witness does not make the resulting mechanical consequence table-owned.
_Avoid_: Treating every rule that mentions space, objects, tactics, or a caller choice as non-executable

**Source-Executable Authored Mechanics**:
The Reducer-Eligible Authored Mechanics actually supported through production TypeScript Functional Reducers in the source snapshot. Authored mechanics outside the Source Execution Horizon or without a production execution path do not enter the Cleanroom package.
_Avoid_: Catalog-only mechanics, planned runtime support, test-helper-only execution

**Source Execution Horizon**:
The character-progression range used when package eligibility depends on acquiring or composing a mechanic through character advancement. It assigns no fictitious level to non-progression roots and does not cap extension inputs that an included mechanic already supports.
_Avoid_: Spell-level horizon, maximum executable level

**Cleanroom Mechanics Slice**:
The source-derived packaged projection of complete Authored Mechanics Graphs whose represented mechanics are Source-Executable and whose progression-governed roots fall within the Source Execution Horizon. Each included graph retains all progression, scaling, and extension facts; an incomplete graph is excluded or repaired, never truncated into a partial rule.
_Avoid_: Support scope, per-Unit package, Target capability declaration

**Cleanroom Workflow Horizon**:
The character-progression range for which the Cleanroom requires composed public Character Creation-to-Battle SDK workflows. It narrows public workflow reachability, not package membership, Static Mechanics Admission, Spell Level, or the full extension behavior of an included mechanic.
_Avoid_: Spell-level horizon; truncating authored records at the horizon; treating the horizon as the maximum level representable by Target domain types

**Target Language Adapter**:
The deliberately small language-specific profile paired with the Cleanroom Core, linking the real language Quint connector and its documentation and carrying one canonical native Oracle property-test example. It contains no connector wrapper, reusable bridge/test framework, Target SDK interface, implementation recipe, or conformance ledger.
_Avoid_: Target implementation kit, conformance harness, reducer skeleton

**Cleanroom Acceptance Run**:
A portability and conformance run that begins in a fresh Target workspace where the AI agent receives the Cleanroom Harness and ordinary Target toolchain, then obtains only the inputs and conformance tools made discoverable by that Harness. Only this run can establish that the declared cleanroom inputs suffice.
_Avoid_: Promoting a rehearsal result, receipt-based acceptance

**Dirty-Cleanroom Rehearsal**:
A diagnostic run that stages the declared cleanroom inputs into an existing or otherwise contaminated Target workspace to expose artifact, connector, or Target implementation failures quickly. It may use source-side orchestration, but its result is never Cleanroom acceptance and its shortcuts never become portable inputs.
_Avoid_: Cleanroom acceptance, portable harness contract

**Opaque Oracle**:
The role in which Target SDK tests query a source-free distribution of the main production application's CLI or HTTP surface to discover calibrated behavior for one stateless Character Creation-to-Battle evaluation. The Target remains standalone, and RAW plus calibrated QNT remain rules authority.
_Avoid_: Reference SDK, separate Oracle implementation, Target dependency, source-code handoff

**Oracle Case**:
The self-contained, schema-decoded input to one Opaque Oracle evaluation, containing ordered Character Creation fills, fresh-sheet input, Battle-entry facts, and ordered Battle Act attempts with Runtime Hole fills. It carries no transport correlation, cumulative replay state, or retained Oracle session identity; the exact case is the reproducibility artifact.
_Avoid_: Oracle session, transport-specific test case

**Oracle Evaluation Batch**:
A non-empty, ordered collection of Oracle Cases decoded atomically and evaluated sequentially by the main production application. Each normally evaluated Case has exactly one position-corresponding Oracle Trace; singleton evaluation uses a one-Case batch, so no alternate wire shape or case identifier is needed. Batch evaluation is observationally equal to concatenated singleton evaluations, including after prior messages in the same process.
_Avoid_: Partial batch, correlated request set

**Oracle Trace**:
A source-owned, language-neutral ordered trace returned by evaluating an Oracle Case through the real production Character Creation-to-Battle workflow. It contains mechanics-relevant workflow outcomes plus the exclusive Oracle Continuation Frontier, excluding internal helpers, replay bookkeeping, unstable prose, sessions, and caches. A selected `CharacterBuildFact` may retain authored selection identity such as `authoredStartingItem.itemName`; that existing selected-build boundary is identity data, not a presentation field.
_Avoid_: Internal execution trace, final observation only

**Oracle Continuation Frontier**:
The one decision boundary at which a successful Oracle Case may stop after Battle entry: the canonical set of currently available Battle Acts, the ordered non-empty ordinary Runtime Holes for one selected Act, or one interrupt decision with its mechanical choices. Character Creation input exhaustion is an Oracle Workflow Rejection rather than a continuation frontier.
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

**Rules Corpus**:
The language-neutral rules knowledge allowed by the Cleanroom Constraint, including RAW, the generated Cleanroom Mechanics Slice, formal QNT semantics, source-ready rules assumptions, and shared D&D language. It contains no canonical Dhall, per-record source JSON, TypeScript runtime implementation, or TypeScript runtime tests.
_Avoid_: Guidance bundle, Unit index

**Functional Reducer**:
The central rules engine for a domain such as character creation or battle, consuming parsed authored mechanics, reducer state, and commands/fills to return the next state, required holes, or a typed rejection. QNT conformance targets this layer; the SDK is an interface to it, not a substitute.
_Avoid_: Treating SDK or MCP behavior as the primary rules implementation

**Conformance Closure**:
The fail-closed, role-specific executable relation showing that every required Cleanroom QNT artifact ran through its applicable Quint lane, every runtime-bearing replay ran through the real language connector and reached the production Functional Reducer, and the required behavior remained publicly reachable where the Cleanroom Workflow Horizon requires an SDK Scenario. Required sets are derived from executable protocols and the generated catalog; run-local evidence is not a durable receipt ledger.
_Avoid_: Coverage manifest, completion inventory, Core digest

**Rule Capability Increment**:
A completed Target SDK foundation increment for one reusable D&D rule capability. Its observable path begins with supplied parsed mechanics, runs applicable QNT through the real language connector into the production Functional Reducer, and reaches a public SDK Scenario where the Cleanroom Workflow Horizon requires one; it is never a Unit-specific reducer or package.
_Avoid_: Unit batch, spell implementation task, helper-only rule implementation

**Implemented Authored Record**:
A domain-facing conformance claim that one complete Authored Mechanics Graph is statically admitted, has applicable QNT parity through production Functional Reducers, passes synthetic-identity checks, and is exercised end to end through public Target SDK behavior using reusable rule capabilities. One passing SDK Scenario is insufficient, and the claim creates no record-specific reducer, task, or package.
_Avoid_: Partially implemented Unit, record-specific reducer, per-Unit package

**SDK Scenario**:
An end-to-end use of the Target SDK through public domain APIs, from authored-content selection or user-facing input through the Functional Reducer and composed outcome. It proves public reachability rather than primary QNT parity.
_Avoid_: Selected-identity projection, adapter fixture

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
The connected authored content rooted at a `UnitRecord` or `StatBlockRecord`, including its nested mechanics and Authored Dependencies whose mechanics must be consulted to interpret or execute the root. It contains authored relationships and input specifications, not live Runtime Holes or identity references used only for selection, presentation, or predicates.
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
A live reducer-workflow request for a value required to complete an executable procedure, created only after that procedure becomes available for interaction. An authored `holeId` may identify the corresponding input specification, but the request and fill are runtime facts, not authored dependencies or specifications.
_Avoid_: Treating unresolved authored references and runtime inputs as the same concept

**Static Mechanics Admission**:
The observable support relation evaluated during catalog installation over the packaged Cleanroom Mechanics Slice, backed by production Functional Reducer execution for every represented mechanic or typed issues attributed through record-rooted mechanics paths. It uses no live actor/session/battle facts, creates no Runtime Holes or stored admission object, and leaves binding and dynamic availability to later workflows.
_Avoid_: Treating a derived cache, per-record receipt, or support-status record as the admitted object; claiming admission from decoding or shape recognition alone; merging selected records into an admission unit; returning an empty discovery result for unsupported mechanics

**Accidental Combinatorics**:
Pairwise or authored-identity-specific wiring between reusable rule capabilities when RAW does not define the pair as a distinct rule, such as spell-specific copies of general continuation or damage lifecycles. Conformance follows domain capabilities and authored composition rather than a matrix of content-record combinations.
_Avoid_: Treating one observed content interaction as part of either content record's definition
