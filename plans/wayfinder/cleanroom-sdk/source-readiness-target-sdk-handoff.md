# Source Readiness and Target SDK Foundation Handoff

## Decision

Source Readiness is one atomic source-side handoff. Target SDK foundation work
may begin only when one coherent source state produces a complete Cleanroom
Harness and every source-owned gate for that state passes. A partial Core,
missing tool, dirty-rehearsal success, allowlist, inflated baseline, or planned
repair does not establish Source Readiness.

The Cleanroom Harness is the source-produced deployment artifact and
instructions given to the AI agent implementing a Target SDK. It must declare,
make discoverable, and require the agent to use every input and tool in its
applicable role, including the Cleanroom Core, the applicable Target Language
Adapter, and the Opaque Oracle. It may contain an artifact or reference where
the agent obtains it. Physical containment is not part of the contract.

The handoff does not prescribe a Target build order or internal architecture.
Target progress is reported at two different levels:

- a **Rule Capability Increment** is the reusable implementation increment;
- an **Implemented Authored Record** is the domain-facing claim that a complete
  authored graph works through those reusable capabilities.

An SDK Scenario is evidence for the second claim, not a synonym for it.
Whole-catalog portability from a fresh workspace remains a separate Cleanroom
Acceptance Run.

The handoff retains the decided horizons: progression-governed package
eligibility uses Source Execution Horizon levels 1–10, while required composed
public Character Creation-to-Battle workflows use Cleanroom Workflow Horizon
levels 1–2. Neither horizon truncates included mechanics or turns Spell Level
into a character-level axis.

This Harness definition supersedes the earlier rejection of a generic
"harness" in
[Cleanroom Core and Target Language Adapter Boundary](./cleanroom-core-target-language-adapter-boundary.md).
That rejection correctly excludes a shared Target-side comparator, connector
wrapper, or shadow implementation, but it had conflated those with the
source-produced deployment artifact defined here.

## Source-readiness exit criteria

All criteria below apply to the same source state. Passing one group cannot
compensate for a failure in another.

### 1. Harness and ownership

- The Cleanroom Harness identifies the Target SDK outcome and every required
  artifact and tool.
- The AI agent can discover each declared input/tool and is instructed that it
  must use each one in its applicable role.
- The Harness may embed or reference the Opaque Oracle. Either form is valid if
  discovery and use are reliable.
- The Core remains language-neutral, the applicable Adapter remains
  language-specific, and the Oracle remains a source-owned conformance tool.
  Packaging must not collapse their roles.
- The Harness describes observable outcomes and allowed knowledge. It does not
  prescribe Target modules, type names, architecture, or implementation order.

### 2. Rules, language, provenance, and licensing

- Local SRD 5.2.1 remains RAW authority; `ASSUMPTIONS.md` contains every actual
  choice where RAW is silent or ambiguous and no historical implementation
  narrative.
- `UBIQUITOUS_LANGUAGE.md` is reconciled to SRD 5.2.1 before its applicable
  language enters the Core. Known 2014 Grapple/Shove and Exhaustion language is
  repaired rather than packaged.
- Rules-facing assumptions and examples are audited for authored identity,
  provenance, licensing, and PHB+ safety. Unsupported closed content is omitted
  or represented only by visibly synthetic mechanics examples where allowed.
- Required license terms, `NOTICE`, and attribution are present and correct.

### 3. Portable authored content

- The complete canonical source catalog is regenerated and strictly decoded.
  Every canonical Dhall source has exactly one generated JSON peer and every
  generated peer has one canonical source.
- The nine RAW-to-Surface omissions identified by
  [Classify failing quality gates against Cleanroom architecture](https://github.com/dearlordylord/5e-quint/issues/13#issuecomment-4951521834)
  are repaired at canonical source ownership, not patched in generated output.
- Source publication derives one SRD-provenance Cleanroom Surface aggregate
  containing complete Source-Executable Authored Mechanics Graphs within the
  Source Execution Horizon. It never truncates a graph to make it pass.
- The aggregate makes mixed provenance unrepresentable and passes collection,
  reference, and complete-graph integrity checks.
- Effect Schema generates the portable Draft 2020-12 schema. The generated
  schema, aggregate, and portable valid/invalid cases are in sync and agree
  with an independent JSON Schema implementation.
- The root publication gate covers the entire canonical corpus without an
  allowlist or handwritten Target support inventory.

The detailed content contract remains in
[Portable Surface Content Contract](./portable-surface-content-contract.md) and
[Static Mechanics Admission and Dynamic Availability](./static-mechanics-admission-and-dynamic-availability.md).

### 4. Source execution and admission

- Source package eligibility is derived from complete, strictly decoded
  record-rooted mechanics graphs and production TypeScript execution.
- Static Mechanics Admission occurs before actor/session/battle availability.
  It returns complete typed mechanics issues for unsupported represented
  mechanics instead of `null`, `false`, or `[]`.
- Later discovery consumes admitted facts plus current state; it does not
  repeat support recognition over weaker authored input.
- Unit and Stat Block paths use the same domain boundary rather than
  consumer-specific admission exceptions.
- Production execution follows Surface mechanics and typed procedure facts.
  Authored identity remains only at its allowed catalog, selection, reference,
  provenance, replay, and presentation boundaries.
- The authored-ID and character-sheet split quality gates pass after the
  architecture is repaired, without identity allowlists or automatic
  acceptance of the stale export baseline.

The owning analysis remains in
[Surface Decoding and Admission Boundary Audit](./surface-decoding-admission-audit.md)
and
[Static Mechanics Admission and Dynamic Availability](./static-mechanics-admission-and-dynamic-availability.md).

### 5. QNT and production parity

- Cleanroom QNT eligibility, executable roots, decisive projection facts, and
  their semantic closure are mechanically derivable from active source QNT.
- Every required proof/verification root runs in its real QNT lane. Every
  runtime-bearing replay uses the real Quint process and applicable language
  connector, enters the production Functional Reducer, and compares QNT-owned
  results after each relevant transition.
- Lower-level helper execution, literal witnesses, imports, static inventories,
  or test-authored routes do not stand in for production-reducer parity.
- Public SDK reachability is required where the Cleanroom Workflow Horizon
  requires an SDK Scenario; later-horizon included graphs still require
  production-reducer evidence without inventing a scenario requirement.
- QNT continuation semantics are capability- and phase-shaped. The current
  authored Ice-Knife/Shield continuation matrix is repaired across the whole
  continuation domain, with the RAW Magic Missile exception retained as a
  typed rule.
- A synthetic attack-roll spell with the already-admitted procedure shape does
  not require a new Shield-specific continuation variant or resume branch.
- Semantic owners, computed parity drivers, literal projection witnesses, and
  authored-selection reachability remain distinct executable evidence claims.

The detailed QNT decisions remain in
[QNT Accidental Content Combinatorics Audit](./qnt-accidental-content-combinatorics-audit.md)
and
[QNT Conformance Pathways Audit](./qnt-conformance-pathways-audit.md).

### 6. Opaque Oracle

- The production application owns one typed, stateless Character
  Creation-to-Battle operation over the real production reducers.
- One strict source-owned Oracle Case/Trace algebra, generated schema, and
  portable fixture corpus cover the operation.
- CLI and HTTP expose the same atomic ordered-batch contract and corresponding
  decode, workflow-rejection, defect-abort, determinism, and batch-decomposition
  behavior.
- The source-free distribution contains no source or source maps, runs without
  external network access, and passes clean-directory black-box checks.
- The Harness makes the Oracle discoverable and requires its applicable use.
  Target-owned tests still own arbitrary generation, Target projection,
  comparison, reporting, persistence, and optional shrinking.
- RAW and calibrated QNT remain authority. An Oracle discrepancy is evidence to
  investigate, not an automatic Target verdict.

The exact boundary and algebra remain in
[Opaque Oracle Conformance Boundary](./opaque-oracle-conformance-boundary.md)
and [Oracle Case and Trace Algebra](./oracle-case-trace-algebra.md).

### 7. Coherence and gates

- Every applicable source quality gate passes for the same source state.
- No new allowlist, baseline inflation, stored-trace substitute, shadow
  reducer, target-computed oracle, or cleanroom-only workaround masks a failure.
- Stale documents that prescribe copied QNT trees, durable receipts, Core
  digests, reusable Target harnesses, or conflicting artifact ownership are
  removed or explicitly superseded.
- Required sets derive from executable protocols and the generated catalog;
  conformance emits only run-local diagnostics, not per-record/per-QNT receipts,
  release ids, Core digests, or status ledgers.
- Documentation follows `CONTEXT-MAP.md`: D&D terms, Cleanroom terms,
  architecture, RAW assumptions, package vocabulary, and work-specific
  acceptance each have one owner.

## Target-facing progress claims

### Rule Capability Increment

A Rule Capability Increment is complete only when one reusable rule capability:

- begins with supplied parsed Surface mechanics;
- is generic over mechanics shape and synthetic identity;
- runs applicable QNT through the real language connector;
- reaches and is compared with the production Functional Reducer;
- is available through the reducer's normal command/hole/fill workflow; and
- reaches a public SDK Scenario where the Workflow Horizon requires one.

Internal groundwork may happen in any Target-owned order. Completion is not
claimed for a helper-only rule, shadow reducer, copied content constants, or
authored-identity branch.

### Implemented Authored Record

An authored record may be called implemented when its complete Authored
Mechanics Graph:

- is statically admitted without unsupported represented mechanics;
- has applicable QNT parity through production Functional Reducers;
- passes synthetic-identity checks showing that behavior follows mechanics;
  and
- is exercised end to end through public Target SDK behavior.

This is a domain-facing integration claim, not an implementation task, reducer,
package, or permission to specialize behavior by record identity. “Ice Knife
implemented” is therefore meaningful; “implement Ice Knife with its own
reducer” is not.

One passing SDK Scenario proves only that one path is reachable. It does not by
itself establish the complete-record claim. Conversely, the complete-record
claim need not wait for unrelated authored records; whole-catalog sufficiency
belongs to the Cleanroom Acceptance Run.

### Status communication

“Implemented” never stands alone. A status answer first identifies the subject:
a Rule Capability Increment, an Authored Record, or the whole Target SDK. A
Cleanroom Acceptance Run is evidence about the whole Target SDK, not another
implementation subject. Once the subject is clear, the answer begins with yes,
no, or partially and states the decisive evidence or missing fact in one
sentence. Detailed gates are linked, not recited unless requested.

## Iteration and backup

- If a source semantic defect appears during Target work, stop the affected
  Rule Capability Increment and repair QNT plus production TypeScript at the
  source owner. The Target does not invent replacement semantics.
- After a source repair, regenerate the affected Cleanroom inputs, refresh them
  into the existing Target workspace, and continue Dirty-Cleanroom Rehearsal.
  Do not restart from a fresh Target workspace for each repair.
- The dirty-versus-clean distinction is current operational policy, not part of
  the Harness's artifact identity or schema. It can change without redesigning
  the Harness.
- If connector execution or comparison is untrustworthy, repair the connector
  owner or the Target-owned integration. Do not replace real execution with
  stored traces or target-specific accounting.
- Existing Target code may be preserved in Git and migrated incrementally in
  the existing workspace. Only evidence-backed code becomes production
  authority; a clean restart is not the default fallback.
- If a planned increment is too large, reduce it to a smaller complete Rule
  Capability Increment. A Unit may motivate or verify the work but does not
  become the implementation boundary.

## Documentation handoff

`CONTEXT-MAP.md` is the routing authority for future wayfinder and
domain-modeling sessions:

- `UBIQUITOUS_LANGUAGE.md` owns D&D/SRD terms;
- `docs/cleanroom/CONTEXT.md` owns only Cleanroom workflow terms;
- `ARCHITECTURE.md` and accepted ADRs own stable system architecture;
- `ASSUMPTIONS.md` owns only explicit RAW modeling choices;
- package documents own local technical vocabulary; and
- the accepted specification and Cleanroom Harness instructions own
  work-specific requirements and acceptance.

The final specification promotes every still-valid decision from the wayfinder
artifacts into those owners or links to its detailed evidence. It does not copy
the same fact into multiple authorities. Non-glossary prose is removed from the
Cleanroom context as part of that promotion.

## Rejected alternatives

- beginning Target work from partial or mutually inconsistent source artifacts;
- treating a Dirty-Cleanroom Rehearsal as Source Readiness or final acceptance;
- prescribing a five-step or other fixed Target implementation order;
- using authored records as reducer or implementation-task boundaries;
- treating one SDK Scenario pass as a complete-record implementation claim;
- withholding every Implemented Authored Record claim until unrelated records
  pass whole-catalog acceptance;
- rerunning a fresh Cleanroom Acceptance Run after every source repair;
- making Oracle physical containment part of the Harness contract;
- saying an AI agent may use declared inputs or tools rather than requiring
  their applicable use; and
- answering “is it implemented?” with an unnamed status or a wall of gate
  jargon.

## Verification

- No new D&D rule is modeled here. RAW-bearing criteria trace through the prior
  decision artifacts to local SRD 5.2.1 and `ASSUMPTIONS.md`.
- `UBIQUITOUS_LANGUAGE.md` remains the D&D-language authority; known stale
  entries are source-readiness work, not silently corrected by this decision.
- Architecture and documentation review verifies single ownership, no Target
  build-order prescription, no per-Unit implementation boundary, no redundant
  status ledger, and no physical-packaging dependency.
- Code-review rules apply to the changed project instructions and documentation.
  Reviewer rounds continue until no reasonable RAW/language, architecture,
  connascence, or documentation findings remain.
