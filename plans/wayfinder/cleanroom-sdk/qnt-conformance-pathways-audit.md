# QNT Conformance Pathways Audit

Wayfinder research for [Trace QNT conformance through reducers and SDK
workflows](https://github.com/dearlordylord/5e-quint/issues/16), investigated
at source commit `10b2381727a5b3ec2d21295447762032becc77cc`.

The inventory and lane facts in this audit are reproducible with read-only
commands:

```sh
pnpm check:qnt-inventory
pnpm check:test-lane-hygiene
pnpm check:mbt-script-inventory
rg -n 'await run\(|stateCheck\(' packages -g '*.mbt.test.ts'
rg -n '"test".*--exclude.*mbt\.test\.ts|test:mbt' packages/*/package.json
rg -n 'createCharacterDraft|fillCreationHoles|finalizeCharacterDraft|startBattle|discoverBattleActs|resolveBattleSubject' \
  packages/mcp/src packages/character-battle-runtime/src
```

## Scope and terms

This audit traces existing evidence from executable Quint through production
TypeScript and then separately through the public SDK/MCP workflows. It
classifies where a cleanroom target could appear conformant without actually
implementing the source semantics. It does not design a Target Language
Adapter, prescribe target modules or types, choose a portable manifest, or
claim that every current QNT artifact is cleanroom-eligible.

The terms follow `CONTEXT.md` and `UBIQUITOUS_LANGUAGE.md`:

- the **Functional Reducer** is the production rule-execution boundary;
- **QNT conformance** is executable agreement between eligible Quint semantics
  and that reducer, not a source-file or status-accounting relationship;
- an **SDK Scenario** proves that a public workflow reaches production behavior;
  it is complementary evidence, not a substitute for QNT conformance;
- a **projection** is evidence only for the state it observes. A route label,
  selected identity, or final snapshot cannot silently stand in for unobserved
  transition semantics.

## Result at a glance

The repository has a real, strong conformance spine:

```text
focused .qnt specification
  -> real `quint run --mbt` ITF trace
  -> quint-connect dispatches each recorded Quint action
  -> driver invokes a production Functional Reducer entrypoint
  -> driver projects reducer-owned state
  -> quint-connect compares QNT and implementation state after the step
```

The public reachability spine is separate:

```text
MCP Client
  -> MCP protocol Server
  -> decoded tool handler
  -> the same public character-creation / battle reducer exports
  -> public result and snapshot
```

No single test needs to run MCP inside Quint to make those spines useful. The
missing fact is an explicit, executable relationship saying which QNT
obligations are calibrated at the reducer and which SDK Scenarios reach those
same production capabilities. Current registries describe pieces of that
relationship, but their gates mostly validate paths, markers, imports, and
declared rows rather than execution.

| Seam                                        | What is actually observed                                                                  | Strength                                  | Main limitation                                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------- | ----------------------------------------------------------------------------------------------- |
| quint-connect replay                        | A real Quint-generated action trace and QNT state are compared stepwise with a driver      | Strong connector seam                     | A dishonest driver or projection can still bypass the production reducer                        |
| Character Creation runtime MBT              | `fillCreationHoles` results, draft, Hole frontier, finalization, and typed rejection facts | Strong Functional Reducer seam            | Its separate route connector authors route events in the test                                   |
| Battle runtime MBT                          | `discoverBattleActs`, `resolveBattleSubject`, interrupts, Battle State, Holes, and results | Strong Functional Reducer seam            | Evidence strength varies across computed owners, literal witnesses, and selected-identity lanes |
| Battle reducer route MBT                    | Route events emitted on public acts/results by production code                             | Strongest current ownership/dispatch seam | Route correctness alone is not semantic state correctness                                       |
| Character Sheet to battle MBT               | Sheet-derived creature initialization, battle discovery/resolution, and settlement         | Strong composition seam                   | It does not by itself prove the preceding public character-creation workflow                    |
| SDK integration tests                       | Public package exports build characters, create sheets, and resolve battles                | Strong public package reachability        | They do not execute Quint                                                                       |
| MCP protocol scenarios                      | A real MCP Client and Server exercise character and battle tools over transport            | Strong end-user reachability              | They do not execute Quint and the evidence manifest is static accounting                        |
| QNT/MBT inventories and coverage registries | Files, markers, declared owners/witnesses, import reachability, and script grouping        | Useful completeness accounting            | They can pass without the declared behavior executing                                           |

## Findings

### 1. quint-connect supplies a genuine live connector and stepwise comparison

The workspace pins `@firfi/quint-connect` 2.0.0
(`pnpm-lock.yaml:977`, `5479`). Inspection of that released source shows that
the default adapter constructs `quint run <spec> --mbt --n-traces ... --out-itf
...`, spawns the Quint CLI, and reads the resulting ITF traces. The replay loop
extracts the recorded action, dispatches it to the driver, and then performs a
state check. The check deserializes the QNT state independently, asks the driver
for implementation state, and reports expected QNT state versus actual
implementation state on mismatch:

- [Quint CLI invocation](https://github.com/dearlordylord/quint-connect-ts/blob/5defaf7a03d317163b2f7e50f7b35aa9fcb41fd3/src/cli/quint-cli-adapter.ts#L43-L86)
- [action replay and per-step state check](https://github.com/dearlordylord/quint-connect-ts/blob/5defaf7a03d317163b2f7e50f7b35aa9fcb41fd3/src/runner/runner.ts#L25-L66)
- [QNT-versus-implementation comparison](https://github.com/dearlordylord/quint-connect-ts/blob/5defaf7a03d317163b2f7e50f7b35aa9fcb41fd3/src/runner/state-check.ts#L29-L61)

Repository MBT calls supply a `spec`, `init`, `step`, driver, and `stateCheck`;
no repository call supplies a compiled or replacement trace generator. The
connector is therefore not a ceremonial import: when an MBT test runs, Quint
actually generates the expected side of the comparison.

This proves the connector only. It does not prove that the driver's action
handler invokes the production Functional Reducer, that `getState` observes
the right state, or that the projection is comprehensive. Those are separate
source facts that must be established at each driver boundary.

### 2. Character Creation has a direct reducer calibration seam

The main Character Creation MBT driver creates a real draft, calls the public
`discoverCreationHoles`, `fillCreationHoles`, and `finalizeCharacterDraft`
functions, retains the returned draft and Hole frontier, and projects the
typed outcome and issue codes
(`packages/character-creation-runtime/src/character-creation-runtime.mbt.test.ts:540-625`).
Its test runs `character-creation-runtime.mbt.qnt` through quint-connect and
uses the runtime state check after replayed steps (the same file, lines
`1082-1095`). The QNT driver derives accepted and rejected transitions from the
Character Creation slice rather than asking TypeScript to calculate its own
expected result
(`packages/character-creation-runtime/character-creation-runtime.mbt.qnt:1-200`).

That is the strongest existing Character Creation semantic seam because a
change in revision handling, atomic fills, Hole closure, finalization, or typed
rejection can disagree at the public reducer result and fail stepwise.

The Character Creation **route** seam is weaker. Its test-local
`CharacterCreationRouteEvent` type and route session call the real reducer, but
then append `applyCreationFillBatch`, `discoverCreationHoles`, projection, fact,
and finalization events inside the test
(`packages/character-creation-runtime/src/reducer-route-connectors.mbt.test.ts:948-1018`).
Production Character Creation results do not emit that route. Consequently:

- the semantic state MBT still protects the overlapping draft behavior;
- the route test usefully documents an intended ownership story;
- the route comparison alone could be reproduced by a shadow route reducer
  even if production did not traverse those named owners.

It must not be cited as production-observed routing in the same sense as the
Battle route seam.

### 3. Battle MBT reaches the production reducer and production-owned routes

The shared battle driver kit imports the public Battle runtime surface. Its
generic resolution recorder submits fills directly to `resolveBattleSubject`
and records the returned `BattleResolutionResult`
(`packages/battle-runtime/src/battle-runtime-mbt-driver-kit.ts:491-534`). The
ordinary battle driver likewise resolves the current subject through the
production function and projects returned state, Holes, result tag, and invalid
reason (the same file, lines `2645-2684`). Focused MBT tests then pair these
drivers with focused QNT owners or witnesses and a state check.

The reducer-spine contract is a particularly legible composition witness. It
runs a real QNT trace from battle start through spell targeting and damage, End
Turn, then weapon targeting and damage
(`packages/battle-runtime/src/reducer-spine-contract.mbt.test.ts:14-29`). Its
driver calls production discovery and `resolveBattleSubject` across those
phases
(`packages/battle-runtime/src/battle-runtime-mbt-driver-kit.ts:11309-11475`).
The QNT file explicitly identifies itself as a thin spine witness rather than
the rule owner; focused slices remain responsible for the rule semantics
(`packages/battle-runtime/battle-runtime-reducer-spine-contract.mbt.qnt:1-11`).

Battle also has the strongest current ownership/dispatch observation. The
production `resolveBattleSubject` attaches route events to its public result
(`packages/battle-runtime/src/battle-reducer/dispatcher.ts:418-424`), and public
act discovery attaches route events to discovered acts
(`packages/battle-runtime/src/battle-reducer/battle-discovery.ts:685-692`). The
route MBT requires those production-provided arrays and fails when they are
absent instead of constructing replacement events
(`packages/battle-runtime/src/battle-runtime-mbt-driver-kit.ts:2789-2873`).

This makes a helper-only or shadow-dispatch implementation more visible: the
same public result that carries semantic state must also carry the production
route. It still does not make route labels an oracle for unobserved mechanics;
state/result comparison remains the decisive evidence.

### 4. Character-to-battle composition reaches the same Battle reducer

Character Battle runtime MBTs exercise the Sheet-to-creature projection and
then real Battle discovery, subject resolution, and settlement. The production
`characterSheetBattleInit` delegates to the route-producing projection and the
package composes it with `startBattle`; the MCP start-battle handler calls that
same public projection for stored Character Sessions before calling the public
Battle `startBattle`
(`packages/character-battle-runtime/src/character-battle-init-projection.mbt.test.ts:136-364`,
`packages/character-battle-runtime/src/character-session-sheet-derived-battle-acts.mbt.test.ts:174-486`,
`packages/character-battle-runtime/src/index.ts:215-360`,
`packages/mcp/src/start-battle-tool.ts:1-13`, `71-110`, `202-219`).

The package's Level 1 SDK integration also builds real Character Drafts through
`createCharacterDraft`, repeated `fillCreationHoles`, and
`finalizeCharacterDraft`, then exercises Battle public exports
(`packages/character-battle-runtime/src/level1-sdk-raw-integration.test.ts:1-40`,
`6360-6500`). This is meaningful public package reachability, but it is a
normal TypeScript integration lane, not a QNT lane.

The evidence therefore composes at production function identity:

```text
Character Creation QNT -> public creation reducer
Character Battle QNT    -> sheet/battle projection -> public battle reducer
SDK integration         -> those public package exports
```

There is no existing executable assertion that joins every creation obligation
to every handoff and SDK Scenario. That absence is a factual gap, not a reason
to introduce a second reducer or a cross-layer duplicate state model.

### 5. MCP scenarios are real public reachability, separately from QNT

The MCP boundary is not a direct helper test. `createDndMcpProtocolServer`
installs request handlers on the actual MCP SDK `Server` and delegates tool
calls to the decoded composition root
(`packages/mcp/src/protocol-server.ts:1-30`,
`packages/mcp/src/server.ts:60-92`). Character handlers directly call the
public creation reducer functions
(`packages/mcp/src/character-tools.ts:1-8`, `96-180`). Battle handlers directly
call `discoverBattleActs`, `resolveBattleSubject`, `resolveBattleInterrupt`,
`startBattle`, and `snapshotBattle`
(`packages/mcp/src/battle-tools.ts:1-11`, `65-220`, `334-350`).

`mcp-protocol.test.ts` creates a real MCP `Client`, links it to that Server with
`InMemoryTransport`, and runs full vertical, Fireball, Steady Aim, and Ice Knife
acceptance scenarios over the protocol
(`packages/mcp/src/mcp-protocol.test.ts:1-16`, `25-107`). This is strong evidence
that an end user can reach current production reducers without a parallel MCP
rules implementation.

However, the scenario evidence manifest and its validator do not prove that
relationship by themselves. The validator checks schema fields, known flows,
declared scenario ids, a package script, and the existence of owner/test paths
(`scripts/ultra-golden-gate.cjs:449-640`). The manifest test checks the same
registry and path relationships
(`packages/mcp/src/mcp-scenario-evidence.test.ts:68-115`). The named package
script does execute the protocol scenario tests when invoked
(`packages/mcp/package.json:8-15`), but the static quality gate does not inspect
whether a declared scenario calls its named reducer capability.

Accordingly, MCP evidence has two different strengths:

- the executed protocol scenarios are genuine SDK reachability evidence;
- the manifest is accounting that helps find those scenarios but cannot replace
  their execution or join them semantically to QNT obligations.

### 6. Current default gates can report green without executing MBT

At the audited commit, `pnpm check:qnt-inventory` reports 566 QNT files and all
566 reachable from executable QNT roots. `pnpm check:test-lane-hygiene` reports
142 Battle, 10 Character Creation, 7 Character Battle, 13 Character Sheet, and
1 shared-algebra MBT test files in their intended opt-in lanes.
`pnpm check:mbt-script-inventory` accounts for every file through either an
explicit script or an accepted grouping rationale.

Those are inventory facts, not execution facts. The root `quality` script runs
inventory, closure, marker, coverage, lint, circularity, and type checks, but no
MBT corpus (`package.json:7-30`). The relevant runtime packages deliberately
exclude `*.mbt.test.ts` from their default `test` scripts, while only subsets
have explicit MBT scripts
(`packages/battle-runtime/package.json:12-76`,
`packages/character-creation-runtime/package.json:12-17`,
`packages/character-battle-runtime/package.json:12-15`, and
`packages/character-sheet-runtime/package.json:12-17`). No repository-local
GitHub Actions workflow supplies a hidden mandatory MBT lane.

This separation is appropriate for expensive, nondeterministic MBT, but it
means a portable conformance claim cannot use “present, reachable, and
accounted for” as a synonym for “executed successfully.” A target could add
QNT paths, driver-shaped files, and registry rows while never running a real
connector.

### 7. Some static reducer-reachability checks are intentionally syntactic

The selected-identity coverage scanner recursively reads a test's relative
import closure, records recognized imported entrypoint names, and marks a
Battle owner reachable when it sees a discovery/start entrypoint plus a
resolution entrypoint, or any package-local runtime entrypoint
(`scripts/unit-profile-coverage-claim-scan.cjs:424-498`). It does not construct
a call graph or prove that the replayed action invokes those imports.

This is useful lint: it rejects a witness closure with no visible route to the
runtime. It is not executable reducer conformance. A driver could import a
public reducer, calculate its actual result with a helper or shadow state
machine, and satisfy the scanner. Source review and live state comparison are
what distinguish the current strong drivers from that false positive.

### 8. QNT evidence has deliberately heterogeneous semantic strength

The forest contains reusable rule-core semantics, focused Battle integration
slices, run-block proofs, computed-oracle MBT drivers, literal projection
witnesses, selected-identity witnesses, and route contracts. The connectivity
map explicitly documents literal witnesses versus the few computed-oracle
drivers and the absence of a production QNT call boundary
(`plans/BATTLE_RUNTIME_QNT_TS_CONNECTIVITY.md:1-205`). The companion audit found
that selected-identity QNT often records fixed projections and must not be
promoted into a semantic owner
(`plans/wayfinder/cleanroom-sdk/qnt-accidental-content-combinatorics-audit.md`).

Literal QNT is not automatically target-computed. A QNT-owned literal can be a
valid bounded witness for a deterministic SRD outcome. False conformance occurs
when the target side computes both expected and actual values from the same
implementation, copies target constants into the “spec” projection, or
reimplements a QNT reducer in the driver instead of calling the production
Functional Reducer.

The current architecture localizes many mappings in shared driver helpers, but
there is no general mechanical check that a target projection is independent,
complete, or free of target-computed expectations. The final conformance
definition must judge evidence by role:

- semantic owners and computed QNT transitions establish rule behavior;
- literal witnesses establish only their bounded observable outcome;
- route evidence establishes only the route projection;
- selected-identity evidence establishes reachability of that selection, not
  identity-independent semantics;
- SDK Scenarios establish public reachability, not formal parity.

### 9. Synthetic mechanics evidence exists, but is not a comprehensive contract

The TypeScript corpus includes same-shaped synthetic Surface records and
admission tests intended to prove mechanics-driven behavior, such as synthetic
initiative support and synthetic extra-attack counts. Some focused MBT fixtures
also use synthetic identity
(`packages/battle-runtime/src/unit-profile-admission-alert-initiative.test.ts:73-129`,
`packages/battle-runtime/src/unit-profile-admission-extra-attack-and-speed-features.test.ts:82-287`).
This is valuable defense against authored-id dispatch.

It is not systematic evidence across every cleanroom-eligible QNT obligation,
Functional Reducer path, and SDK Scenario. A target could pass an SRD-identity
fixture by branching on the id while failing the equivalent renamed synthetic
mechanics. The final conformance definition therefore needs an observable
identity-independence requirement where authored identity is not itself a RAW
input. This audit does not prescribe the fixture or adapter representation.

## False-conformance matrix

| Failure mode                      | How it could look green                                         | Strongest existing defense                                                           | Remaining factual gap                                                                                     |
| --------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Superficial QNT use               | QNT files, markers, imports, and registry rows exist            | Live quint-connect trace generation and state comparison                             | MBT is not part of default quality/test and there is no mandatory whole eligible-corpus command           |
| Helper-only implementation        | Driver invokes a test helper while importing a public reducer   | Direct calls in current main creation/battle drivers; production Battle route events | Static reachability scanner cannot prove the call path                                                    |
| Shadow reducer                    | Driver maintains parallel transition state or route log         | Semantic state projected from returned production results                            | Character Creation route events are test-authored; no general anti-shadow check                           |
| Target-computed oracle            | Expected and actual derive from the same target code/constants  | Expected state arrives from Quint ITF in quint-connect                               | Projection independence and completeness require review; witness roles are not one uniform semantic class |
| Authored-identity dispatch        | SRD fixture passes through id/name branches                     | Synthetic shape-based admission and some synthetic runtime fixtures                  | No comprehensive renamed/synthetic conformance relation across eligible obligations                       |
| Stranded reducer parity           | Reducer MBT passes but public SDK uses another path             | Current SDK/MCP imports the same public reducer exports; protocol tests execute them | No executable obligation-to-SDK Scenario join                                                             |
| Accounting mistaken for execution | Inventory and coverage gates pass                               | Explicit MBT/package scripts and protocol scenario script                            | Grouped rationales and declared paths do not themselves execute behavior                                  |
| Adapter mapping error             | Target projection drops, renames, or recomputes a decisive fact | Stepwise full equality for each current declared projection                          | No language-neutral declaration of decisive projection facts or cleanroom-eligible corpus yet             |

## Inputs to “Define comprehensive QNT conformance”

The downstream grilling ticket can now decide observable outcomes from these
source facts without designing target-language interfaces:

1. **Real execution is necessary.** Conformance evidence must originate in a
   real Quint execution through the real language connector and must fail when
   no trace is generated or replayed.
2. **The production reducer is the implementation side.** Replayed actions must
   reach the same Functional Reducer behavior used by SDK Scenarios; helper-only
   and shadow reducers are not equivalent evidence.
3. **Expected state is QNT-owned.** Target code may deserialize and project, but
   must not calculate both sides of the comparison from target behavior.
4. **Comparison is transition-sensitive.** Evidence must compare after the
   relevant replayed steps, including typed failures, Hole frontiers,
   continuation state, and durable rule state where those facts are part of the
   obligation. A final happy-path snapshot is insufficient.
5. **Evidence roles stay distinct.** Proofs, computed semantic owners, literal
   witnesses, routes, selected identity, and SDK Scenarios must make only the
   claims their observations support.
6. **Coverage needs executable closure.** A cleanroom-eligible QNT set and its
   conformance run need an executable completeness relationship; handwritten
   status and path accounting may support diagnostics but cannot define
   success.
7. **Public reachability is a second required axis.** SDK Scenarios must execute
   through the production reducers, and their claimed capabilities must be
   joined to calibrated QNT obligations without pretending the scenarios
   themselves run Quint.
8. **Identity independence is observable.** Where RAW behavior is mechanics-
   driven, equivalent synthetic or renamed mechanics must not change behavior;
   authored identity may remain only where it is a legitimate input.
9. **Failure must be attributable.** The current seed/action/state mismatch and
   focused test naming are useful seams to preserve as observable diagnostics.
10. **The source is not yet declaration-complete.** The current corpus does not
    supply one language-neutral, mechanically enforced declaration of which QNT
    artifacts are cleanroom-eligible, which projection facts are decisive, and
    which SDK Scenarios complete public reachability. That is a decision for the
    downstream specification, not a field to invent in this audit.

## Map impact

This research resolves the source-tracing question and supplies the missing
inputs to [Define comprehensive QNT
conformance](https://github.com/dearlordylord/5e-quint/issues/19). It discovers
no separate investigation that is not already owned by that ticket or by the
later Cleanroom Core/Target Language Adapter boundary ticket, so no new map
ticket is required.

## Verification

This is documentation-only research. It changes no rule semantics, QNT, runtime
state, reducer behavior, Surface content, or public API. RAW applicability was
therefore checked as **no new modeled rule**: the audit uses the repository's
formal-evidence vocabulary and existing rule traceability without making a new
SRD interpretation. `UBIQUITOUS_LANGUAGE.md`, `CONTEXT.md`, `ARCHITECTURE.md`,
ADRs 0001 and 0002, and `.claude/review-rules.md` were reviewed before the
classification.

Two reviewer-loop passes checked:

1. source citations and live path claims against the connector, drivers,
   production reducers, SDK/MCP handlers, manifests, and package scripts; and
2. RAW applicability, ubiquitous/domain language, architecture, evidence-role
   separation, connascence, false-conformance coverage, map ownership, and the
   prohibition on target-interface design.

No MBT or QNT proof was run: the change is non-executable, the inventory checks
were sufficient to establish lane topology, and project policy reserves MBT
for end-to-end validation after behavior changes. The three read-only inventory
checks listed at the top passed at the audited commit.
