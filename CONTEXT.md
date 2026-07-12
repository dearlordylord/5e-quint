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
The one language-neutral input corpus used to build independent Target SDKs. It contains RAW, canonical Dhall and generated JSON Surface content, active calibrated QNT, and shared domain language. It is not divided into per-Unit or per-assignment packages.
_Avoid_: Per-Unit package, export catalog, experiment catalog

**Target Language Adapter**:
The closed conformance-tool profile paired with the Cleanroom Core for one Target Language Profile. It identifies the real language Quint connector, its documentation and invocation, and the evidence checks required for conformance. Rust is currently the only such adapter. It contains no Target SDK interfaces or implementation code.
_Avoid_: Target implementation kit, reducer skeleton

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
Selection of a real Surface record by authored identity, such as a wizard choosing the SRD Ice Knife record. Identity is valid at catalog, selection, provenance, replay, and presentation boundaries. After selection, executable admission and reducer behavior are determined from the record's parsed mechanics and typed procedure facts, not a reducer branch on the authored id.
_Avoid_: Erasing authored identity from user workflows; dispatching runtime semantics by spell or Unit id

**Static Mechanics Admission**:
The context-independent step that turns a decoded Surface record into typed facts for a production reducer rule, or returns a typed unsupported-shape reason. It occurs when content is installed into a Target SDK, before character or battle discovery. It is distinct from dynamic availability: whether a supported rule can be used by this actor in this state with these resources.
_Avoid_: Returning an empty list for both unsupported mechanics and a supported rule that is currently unavailable

## Target SDK Data Flow

The Cleanroom Core supplies already-authored Dhall and the corresponding
already-generated JSON. Generation belongs to source-side package preparation;
a Target SDK neither authors Dhall nor regenerates JSON.

```text
Cleanroom Core
  pre-authored Dhall + pre-generated JSON + QNT + RAW/domain language
                              |
                              v
Target SDK loads the authored JSON catalog
                              |
                              v
user or application selects an authored record identity
                              |
                              v
target parses/admits that record's mechanics into typed domain facts
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
Admission. A catalog whose declared support scope contains an unsupported record
fails with typed reasons. Later character/battle discovery consumes admitted
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
