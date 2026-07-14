# Cleanroom Core and Target Language Adapter Boundary

Wayfinder decision for [Define the Cleanroom Core and Target Language Adapter
boundary](https://github.com/dearlordylord/5e-quint/issues/20), resolved against
source commit `e0bd11af0afdc08dd49278cc0541fc40cd8b1a63`.

## Decision

There is one **Cleanroom Core**: the language-neutral rules and executable
conformance corpus supplied from one coherent source snapshot. A **Target
Language Adapter** is a deliberately tiny profile for one Target Language
Profile. It links to the real Quint connector and that connector's own
documentation and contains one canonical native Opaque Oracle property-test
example as its sole code artifact. It is not a library, harness, bridge,
scaffold, SDK layer, or conformance ledger.

The Target SDK owns all Target-language implementation and test code. That
includes its production Functional Reducers, SDK interfaces, Quint connector
integration, action and observation mappings, state projection, comparison,
property-based Case generation, failure reporting, persistence, and optional
shrinking. The Core specifies observable contracts; neither the Core nor the
Adapter prescribes Target modules, types, or reducer organization.

The source-free main production application is distributed separately for use
as the **Opaque Oracle**. Its Case/Trace schema and portable fixtures are
language-neutral Core artifacts. The executable itself is neither Core nor
Adapter, and there is no shared Oracle client, comparator, or harness between it
and Target-owned tests.

## Closed ownership table

| Owner                      | Artifacts or responsibilities                                                                                                                                                                                                                                          | Explicitly not owned                                                                                                                    |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Source publication         | Regenerate canonical Dhall to source-peer JSON, strictly decode the complete source catalog, derive the Cleanroom Mechanics Slice, generate portable artifacts, calibrate QNT against production TypeScript, assemble the Core, and compare generated outputs directly | Target implementation, compatibility releases, a Core digest, or Target acceptance                                                      |
| Cleanroom Core             | Language-neutral rules ground truth, explicit modeling choices, naming authority, generated mechanics catalog, generated schemas, portable cases, and active calibrated QNT closure                                                                                    | TypeScript, target-language code, source accounting, implementation guidance, or executable tooling                                     |
| Target Language Adapter    | Link to the real language connector and its documentation; one canonical native Oracle property-test example as its sole code artifact                                                                                                                                 | Connector wrapper, reusable test harness, reducer bridge, SDK interfaces, architecture recipe, or ledger                                |
| Target SDK                 | Production implementation and every Target-native conformance binding from Core facts to production reducers and public SDK workflows                                                                                                                                  | An independently maintained second schema authority, copied rule constants, target-computed expectations, or authored-identity dispatch |
| Opaque Oracle distribution | Source-owned executable of the main production application, its intrinsic CLI/HTTP surfaces, startup catalog projection, and operational `DistributionId`                                                                                                              | Rules authority, Target dependency, Core identity, shared Target harness, or reference SDK                                              |
| Diagnostic orchestration   | Copy/stage inputs, launch tools, and collect run-local diagnostics during a Dirty-Cleanroom Rehearsal                                                                                                                                                                  | Portable contract, clean acceptance, or new Target inputs                                                                               |

## Exact Cleanroom Core

The Core is one corpus with conventional artifact roots and one tiny index. The
index names the requested outcome and those roots; it contains no implementation
recipe. The corpus contains the following closed categories.

### 1. Rules authority and domain language

- the redistributable local SRD 5.2.1 RAW corpus;
- the applicable license terms, `NOTICE`, and required attribution for project
  and SRD-derived material;
- the rules-facing modeling assumptions for places where RAW is underspecified;
  and
- shared language-neutral D&D domain terminology.

These must be the direct source authorities, not cleanroom-specific summaries
copied beside them. The current `ASSUMPTIONS.md` and
`UBIQUITOUS_LANGUAGE.md` are not yet directly publishable as whole Core files:
the former mixes rules decisions with source implementation history, while the
latter contains implementation references and stale 2014 rules statements.
Source readiness must repair the owning documents or separate their concerns at
the source. It must not generate a second assumptions ledger or duplicate
glossary that can drift.

`ARCHITECTURE.md`, `docs/cleanroom/CONTEXT.md`, `AGENTS.md`, `CLAUDE.md`, ADRs, package
documentation, wayfinder decisions, implementation plans, and Ralph
infrastructure remain source-side. They constrain how the Core is produced but
are not language-neutral implementation inputs.

### 2. Portable Surface artifacts

- the one generated SRD-tagged Cleanroom Surface aggregate containing the
  complete Cleanroom Mechanics Slice as distinct Unit and Stat Block
  collections;
- the one generated JSON Schema Draft 2020-12 compound schema for that
  aggregate; and
- source-owned valid and invalid portable Surface cases with typed issue facts.

The aggregate is the Target catalog input. Canonical Dhall, source-peer
per-record JSON, the complete canonical SRD catalog, the Effect implementation,
and the source publication generator/check remain source-side. A Target neither
interprets Dhall nor reconstructs catalog membership from files.

### 3. Active calibrated QNT closure

- active rule-core and focused package QNT semantics eligible for the Cleanroom
  scope;
- the QNT-side executable MBT entry modules, proof/verification entry modules,
  protocol fixtures, and required transitive QNT imports; and
- language-neutral action, observation, and typed-result facts consumed by
  Target-owned connector tests.

TypeScript `*.mbt.test.ts` drivers, TypeScript bridge kits, production source,
source calibration paths, rules-kernel ledgers, coverage reports, and package
scripts do not enter the Core. A QNT vocabulary or proof companion enters only
when it belongs to the compiler-visible semantic closure of an executed Core
root; file presence or an unused import is not eligibility.

The source does not yet expose a language-neutral, mechanically enforced
declaration of this whole executable closure. Source readiness must make the
required set derivable from executable QNT protocols and entrypoints. It must
not solve that gap with a handwritten eligible-file manifest, per-QNT Adapter,
or target-facing copy of the current source accounting registries.

### 4. Oracle algebra and portable fixtures

- the generated strict Oracle Case/Trace Draft 2020-12 schema;
- the portable valid, invalid, equality, ordering, batch, lifecycle, and typed
  rejection fixtures defined by the Oracle Case/Trace decision; and
- the language-neutral contract facts needed to decode and compare those
  values structurally.

The source owns one Case/Trace algebra and projection implementation. Core
artifacts are generated from that authority. Target examples consume them but
do not independently maintain a second variant or schema authority, generate
expected traces, or import a shared comparator. A Target may generate or
implement native Case/Trace representations when its decoder and types are
mechanically checked against the Core schema and portable cases.

### 5. No additional scenario or status bundle

Public SDK reachability is Target-owned executable behavior, not a narrative
scenario package. At the Cleanroom Workflow Horizon, the Target suite derives
the supplied records and admitted capabilities from the aggregate and runs
capability-shaped SDK Scenarios through its public interfaces and production
Functional Reducers. The portable Surface and Oracle cases supply concrete
cross-language examples; there is no additional per-Unit journey guide,
completion inventory, or copied expected-outcome corpus.

## Target Language Adapter

For one Target Language Profile, the complete Adapter is a very small profile
containing only:

1. the Target Language Profile name;
2. an immutable link to the real language Quint connector and a link to its own
   usage documentation; and
3. one canonical native property-test example that directly invokes the
   source-free main application's CLI or HTTP surface and may name the
   language's ordinary property-testing library.

The property-test example is an example, not reusable cleanroom infrastructure.
It must leave Case generation, Target invocation, Target-to-Trace projection,
equality execution, reporting, persistence, shrinking, and discrepancy
investigation visibly owned by the Target test. Source publication smoke-tests
the example against the current Oracle schema and portable fixtures so schema
drift fails where the coupled facts are owned.

The Adapter does not own a standard invocation configuration, wrapper crate or
package, action registry, reducer interface, bridge type, state projector,
comparator, test runner, scaffold, generated code, architecture guide, evidence
schema, or receipt. Rust is the first Adapter, not a special Core and not a
reference Target implementation.

The earlier comprehensive-conformance statement that an Adapter “uses one real
connector integration” is retained only as an observable Target requirement:
the Target's tests must use one real connector integration. No such integration
code is shipped by the Adapter.

## Conformance without a ledger

The **Conformance Closure** remains fail-closed and executable:

1. every required QNT MBT, proof, and verification root runs through its real
   Quint lane;
2. runtime-bearing replay enters the same production Functional Reducer used by
   public SDK workflows and compares QNT-owned facts after relevant
   transitions;
3. every supplied record-rooted mechanics graph reaches Static Mechanics
   Admission and the applicable production reducer without authored-identity
   dispatch; and
4. records within the Cleanroom Workflow Horizon remain reachable through
   Target-owned public SDK Scenarios.

Expected sets come from executable QNT protocols and the generated aggregate.
The conformance command fails when a required root, transition, supplied record,
capability, or workflow is absent. It may emit connector invocation, QNT trace,
transition comparison, concrete record, scenario, and outcome facts for the
current run. Those facts are run-local diagnostics, not a committed receipt
manifest or a second statement of support.

This supersedes the earlier proposal to bind execution receipts to a Cleanroom
Core digest. The Core has no hash, release id, integrity manifest, compatibility
identity, file inventory, per-Unit status, or durable execution receipt. Source
freshness is established before construction by regenerating the corpus and
directly comparing actual generated output with committed output.

The Oracle `DistributionId` is the narrow exception that proves the distinction.
It binds one separately packaged opaque executable, its Case/Trace contract, and
its filtered startup catalog projection so a discrepancy can be replayed. It is
not a Core digest, Surface freshness mechanism, conformance receipt, or rules
authority.

## Clean acceptance and dirty rehearsal

### Cleanroom Acceptance Run

A Cleanroom Acceptance Run begins in a fresh Target workspace. Its declared
inputs are only:

- the one coherent Cleanroom Core;
- the applicable minimal Target Language Adapter;
- the ordinary Target Language Profile toolchain and external tools linked by
  that Adapter; and
- separately, the source-free Opaque Oracle distribution when Oracle
  differential conformance is exercised.

The Target may write and revise its own implementation and tests in that
workspace. It may not receive source TypeScript, source tests, source
calibration/accounting paths, an earlier Target implementation, undeclared
source-generated runtime traces, Target-native copied goldens, implementation
plans, or undeclared harness code. The declared portable schemas and fixtures
remain valid Core inputs. Only a run with this input boundary can establish
portability and cleanroom sufficiency.

### Dirty-Cleanroom Rehearsal

A Dirty-Cleanroom Rehearsal may stage the same declared Core, Adapter, and
separate tools into an existing Target repository. Source-side automation may
copy files, launch the connector or Oracle, invoke Target commands, and retain
diagnostics. Existing Target code or earlier knowledge may help find packaging,
connector, conformance, or implementation defects quickly.

Its result is diagnostic only. It cannot establish that the declared inputs
were sufficient, and no success from it can be promoted into clean acceptance.
Copy scripts, source paths, working-tree conventions, cached dependencies,
baseline commits, contamination notes, and orchestration metadata belong to the
rehearsal environment. They are not Core, Adapter, or Target contract fields.

The retired experiment harness correctly distinguished contaminated diagnostic
rehearsal from a fresh portability run. Its manifests, hashes, receipts,
scaffolds, and per-run accounting were deliberately retired and do not return.

## Rejected artifacts and guidance

The following proposals are rejected because they either prescribe Target
implementation, duplicate authority, or merely account for work:

- per-Unit, per-assignment, or per-QNT Core packages;
- canonical Dhall or per-record JSON as Target Surface inputs;
- generated implementation guidance, architecture recipes, Unit walkthroughs,
  checklists, prompts, or copied wayfinder prose;
- an Adapter-owned connector wrapper, native harness, reducer bridge, action
  registry, projector, comparator, scaffold, or SDK interface;
- a reference Target SDK, shadow reducer, copied expected values, or
  target-computed oracle;
- a shared Oracle client, differential harness, comparator, generator, or
  shrinker;
- handwritten QNT eligibility lists, Unit-to-QNT joins, support labels,
  completion markers, path inventories, branch counts, or import counts as
  conformance truth;
- Core hashes, release ids, Core/Surface compatibility protocols, integrity manifests,
  source snapshot ids, or persistent execution receipts;
- source TypeScript, TypeScript tests, source MBT bridge kits, coverage reports,
  registry ledgers, package scripts, or Ralph infrastructure; and
- dirty-rehearsal copy scripts, cached workspace state, contamination metadata,
  or baseline commits as portable inputs.

The parked `QNT_GENERATOR_READINESS_BACKLOG.md` proposal for a copied
`cleanroom-input/qnt/**` tree, a native Rust harness, and cleanroom-specific
`AGENTS.md` instructions is therefore superseded. The current rules-kernel
coverage registries remain useful source-side accounting, but their exported
snapshot/hash/pass manifest language is not part of the Cleanroom architecture.

## Source-readiness consequences

This decision defines artifact ownership; it does not claim that the artifacts
already exist. Before the Core can be published, source work must:

1. implement the Portable Surface publication command, generated aggregate,
   generated Draft 2020-12 schema, and portable cases;
2. implement the source executable-mechanics projection and repair the source
   until the resulting complete Mechanics Slice satisfies the admission and
   conformance decisions;
3. make Cleanroom QNT eligibility, decisive projection facts, and executable
   closure mechanically derivable without exporting source accounting;
4. implement the Oracle Case/Trace owner, generated schema, portable fixtures,
   production application operation, and source-free distribution;
5. make the rules-facing assumptions directly packageable without historical
   QNT/TypeScript change logs, audit them for authored-identity and licensing
   safety, and remove every PHB+ id, name, heading, page reference, and protected
   example; use local SRD 5.2.1 support where available and otherwise omit the
   material from the Core or use a visibly synthetic renamed mechanics example,
   while preserving `ASSUMPTIONS.md` as the sole authority for actual modeling
   choices;
6. repair `UBIQUITOUS_LANGUAGE.md` against SRD 5.2.1 and separate shared D&D
   terms from package-specific implementation vocabulary before publishing it
   as Core language; and
7. remove or clearly supersede current documentation that still presents
   exported hashes, receipt manifests, copied QNT trees, native Adapter
   harnesses, or cleanroom-specific implementation guidance as requirements;
   and
8. package the applicable license terms, `NOTICE`, and required attribution and
   smoke-test each Adapter's sole native property-test example against the
   current Oracle schema and portable fixtures.

Two current glossary errors demonstrate why source-ready domain language is a
gate rather than a blind file copy. `UBIQUITOUS_LANGUAGE.md` calls Grapple and
Shove contests despite its own 2024 example correctly using a Saving Throw, and
it describes the archived 2014 Exhaustion effects. SRD 5.2.1 instead resolves
the Unarmed Strike's Grapple and Shove options with a Strength or Dexterity
Saving Throw (`.references/srd-5.2.1/Rules-Glossary.md`, “Unarmed Strike”) and
defines Exhaustion as −2 per level to D20 Tests and −5 feet per level to Speed
(`Rules-Glossary.md`, “Exhaustion [Condition]”). This decision does not repair
those rules; it prevents stale language from being published as cleanroom
authority.

## Map impact

This decision clears the Cleanroom composition, integrity, minimal-guidance,
manifest, Adapter-responsibility, and clean-versus-dirty workflow fog from
[Wayfinder: Language-neutral Cleanroom SDK
readiness](https://github.com/dearlordylord/5e-quint/issues/12). It does not
surface another boundary decision. The missing generated artifacts, executable
QNT declaration closure, domain-document repairs, Oracle implementation, and
stale-document cleanup are source-readiness and later execution work for the
final specification.

## Verification

This is a documentation-only architecture/domain decision. It changes no RAW
mechanic, QNT, reducer state, runtime behavior, Surface content, or public API.
RAW applicability is therefore **no new modeled rule**. The review must still
check every rule-bearing example against local SRD 5.2.1 and
`UBIQUITOUS_LANGUAGE.md`; where the glossary conflicts with RAW, RAW controls
and the conflict is recorded as source-readiness work rather than copied into
the Core.

The reviewer loop must converge over:

1. RAW traceability and SRD/PHB+ authored-identity safety;
2. ubiquitous/domain language, including Core, Adapter, Oracle, acceptance, and
   rehearsal ownership;
3. architecture and connascence, especially one generated catalog, one
   Case/Trace authority, derived executable closure, no copied schema or
   expected values, and no persistent ledger; and
4. `.claude/review-rules.md`, including state-space minimality, boundary typing,
   typed failures, source-versus-runtime provenance, and the distinction between
   observable contracts and prescribed Target internals.

After implementation, fix every reasonable finding, explicitly reject a note
only with a concrete reason, and repeat all four passes until no reasonable
findings remain. A round that finds a real issue is followed by another complete
round; convergence, not a fixed pass count, is the exit condition.

No MBT, QNT proof, or runtime test is required for this decision-only change.
Future implementation must run the affected focused lanes and conscious
end-to-end publication, conformance, and Oracle black-box checks after code
changes are complete.
