# Quint usage retrospective and call briefing

Research snapshot: 2026-09-21. This is a repository-history and architecture
review of `dearlordylord/5e-quint` at `3865ec1a0` and the sibling
`dearlordylord/huly-mcp` checkout at `fdbaa5a0`. It distinguishes statements the
repositories prove from inferences and recommendations. It does not treat a
passing bounded run as an exhaustive proof.

## Executive assessment

Quint has paid for itself in this project, but not in the simple sense that “we
formally proved D&D.” Its clearest benefits have been:

1. forcing rules and state transitions into explicit, executable contracts;
2. generating adversarial action sequences that found real TypeScript/runtime
   divergences early;
3. giving later runtime packages a language-neutral semantic vocabulary; and
4. making coverage and ownership auditable at the rule-obligation level.

The costs and limits are equally real. The project grew from one large model to
a 124,396-line forest of 833 `.qnt` files, with 181 TypeScript MBT files. The
forest is the result of learned constraints, not the original design: whole
battle composition became impractical, import-closure instantiation dominated
trace cost, and broad lanes became scarce enough to require locks, process
cleanup rules, focused selectors, and a default of one trace in the battle
driver kit. The current architecture therefore gives strong local semantic and
parity evidence, but deliberately does not exhaustively verify whole-battle
composition. The repository says this explicitly in
[`ADR-0001`](../../docs/adr/0001-forest-of-qnt-slices.md#L31-L53).

The most important blind spot for the call is directionality. The project
mostly uses **Quint-generated actions/picks → TypeScript replay → state
comparison**. That is the stock Quint Connect approach. Quint Studio's Huly
integration demonstrates the other useful direction:
**TypeScript-emitted action observations → Quint transition replay/validation**.
That reverse lane is not inherently circular because the implementation emits
events and arguments while the model still owns action guards and next-state
semantics. Huly currently forwards action observations without generated
post-state assertions
([setup](https://github.com/dearlordylord/huly-mcp/blob/fdbaa5a081cbf4344d3b415c5feb45d4c898617f/test/setup/quint-oracle.ts#L10-L20)); this is materially
different from generating expected Quint values from TypeScript results.

There is also a live contradiction in this repository. Architecture says,
“Never generate Quint assertions from TypeScript results”
([`ARCHITECTURE.md`](../../ARCHITECTURE.md#L477-L495)), and commit
[`7059aef3`](https://github.com/dearlordylord/5e-quint/commit/7059aef3c11d2d114da34ddd1e7432a2a1a6a2c5)
removed that pattern from battle. Character creation still does it: a test feeds
TypeScript results into `renderQuintParityModule`
([call site](../../packages/character-creation-runtime/src/index.test.ts#L3198-L3219)),
writes the resulting temporary `.qnt`, and executes it
([runner](../../packages/character-creation-runtime/src/index.test.ts#L13828-L13857));
the generated assertions embed TS-derived drafts, holes, and finalization tags
as Quint expectations
([renderer](../../packages/character-creation-runtime/src/index.test.ts#L13883-L13923)).
`git blame` traces the core path to
[`d97235759` (2026-04-29)](https://github.com/dearlordylord/5e-quint/commit/d972357592),
before the May prohibition, while August and September commits extended it.
This is the clearest concrete architecture debt uncovered by this review.

## What “direction” means

Three mechanisms should not be collapsed into one:

| Mechanism                                      | Source of actions                                  | Source of expected semantics                                                                                                  | What it establishes                                                                                                     |
| ---------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| D&D `quint-connect` MBT                        | Quint simulator (`any` action plus `nondet` picks) | Quint next state                                                                                                              | The TS driver can replay model scenarios and project the same state.                                                    |
| Huly Quint Studio oracle                       | Instrumented TS execution/tests                    | Quint guards, transitions, properties; optional observation assertions are supported but Huly does not currently forward them | The implementation-produced trace is admitted by and replayable through the model.                                      |
| D&D generated character-creation parity module | TS test results                                    | The same TS results rendered as Quint assertion literals                                                                      | Quint can reproduce selected TS outputs; this is a compatibility check, not independent Quint-owned expected semantics. |

The official Quint CLI documents `--mbt` as adding `mbt::actionTaken` and
`mbt::nondetPicks` to **outgoing simulator traces**
([CLI documentation](https://github.com/quint-co/quint/blob/main/docs/content/docs/quint.md#the---mbt-flag)).
The official December 2025 Quint Connect article likewise describes replaying
model scenarios in implementation code and calls validation of implementation
or production traces “Approach 3: Trace validation (future work)”
([Quint Connect article](https://github.com/quint-co/quint/blob/main/docs/content/posts/quint_connect.mdx#approach-3-trace-validation-future-work)).
So Huly's reverse lane should be described precisely as **Quint Studio-generated
oracle tooling implementing that trace-validation direction**, not as a stock
`quint run` input mode.

This distinction resolves the apparent conflict with the D&D rule. “Do not
generate Quint expected literals from TS results” is sound. “Do not let Quint
consume implementation events” is unnecessarily restrictive and is not what
the architecture currently says. A TS event is evidence to validate; a
TS-derived expected value promoted into a Quint assertion can become a circular
oracle.

## Chronology: how the D&D usage evolved

### 1. March 22: Quint-first, one model, deliberately abstract inputs

The initial plan started with `State + pure functions + thin actions`, a
single-creature state machine, caller-supplied dice outcomes, and caller-supplied
spatial facts. It explicitly said to start in one file and split only when
unwieldy
([initial commit `21602838d`](https://github.com/dearlordylord/5e-quint/commit/21602838d7cda8e26d9e8f7db09dc4f6bdf4c7fb)).
The first implementation commit added `dnd.qnt` and `dndTest.qnt`
([`69bac1059`](https://github.com/dearlordylord/5e-quint/commit/69bac1059)).

That abstraction remains visible today: the core runtime does not roll dice or
infer geometry; callers supply those witnesses
([README](../../README.md#L20-L34)). This is beneficial because it keeps the
formal state space tractable and preserves table ownership. It is also a scope
limit: Quint can verify how the engine handles a supplied roll or spatial fact,
not whether the physical/table observation was correct.

### 2. March 23: stateful actions, invariants, then Quint→TS MBT

Commit [`55172fa2`](https://github.com/dearlordylord/5e-quint/commit/55172fa2e60d19eb1ea5ae4700d19c72de445b29)
added state variables, 38 thin actions, a nondeterministic `step`, and 19 safety
invariants. Its commit record credits invariant work with three model fixes:
prone removal while unconscious, clamping death failures, and disallowing
standing while incapacitated. It reports 5,000 samples × 100 steps and 558
tests.

The next commit,
[`b8a1d4cd`](https://github.com/dearlordylord/5e-quint/commit/b8a1d4cd8041bfb7771b8fae7c7f4d8aa3755f97),
introduced `@firfi/quint-connect`: Quint chose actions and produced ITF state,
an exhaustive action map replayed those actions into XState, and a projection
compared TS state with Quint state. The commit credits that lane with finding
multiple runtime defects across damage, healing, rests, fall damage,
concentration, and environmental transitions. Commit
[`61332b4e`](https://github.com/dearlordylord/5e-quint/commit/61332b4ec25beee71e72c73d74ccf138cb8a967e)
then fixed further behavioral divergences and recorded 50 traces × 30 steps.

This was the highest-return phase: one model, one implementation, broad action
coverage, and enough sequencing to uncover real drift. It also established the
direction that persisted: model-generated trace replay into TypeScript.

### 3. March 23–25: generated community-Q&A assertions

The project briefly broadened “formal evidence” with an LLM pipeline that
classified RPG Stack Exchange/Reddit questions and generated Quint assertions
([`96b6211a9`](https://github.com/dearlordylord/5e-quint/commit/96b6211a99abe8e9def5cbf38952fabd5f3fde18)).
This was useful as a corpus-mining experiment, but it mixed weaker community
input and model-generated tests with the rules authority. The active project
later made local SRD 5.2.1 the only RAW authority, and commit
[`bfb5a6d99`](https://github.com/dearlordylord/5e-quint/commit/bfb5a6d9947cf489a05948bb2997a008d6a40ff7)
removed the 12,277-line aggregated `qa_generated.qnt` with the other archived
root models. The scripts remain as historical/research tooling, not the active
semantic authority.

### 4. March 31–April 5: whole-battle composition and the first performance wall

The multi-creature `battle.qnt` spike added dynamic rosters, reaction
interrupts, attack transactions, initiative, and invariants; its commit reported
50 × 30 at 131 traces/second
([`0523a289f`](https://github.com/dearlordylord/5e-quint/commit/0523a289f9ed37b0abb916dbf12f8f1e8c83dd45)).
As battle behavior widened, random trace replay gained reproducible seeds and
pre-generated ITF replay.

Performance then changed the design. Commit
[`c6cadc00`](https://github.com/dearlordylord/5e-quint/commit/c6cadc00c5c60f509d10c8a05a4f4f52c2cec7d7)
reported 20–25 second MBT runs dominated by roughly 15 seconds of Quint
parse/typecheck and introduced a compiled-spec cache, bringing development runs
to about one second. Commit
[`1c834a34`](https://github.com/dearlordylord/5e-quint/commit/1c834a34b5edc1f8c0c63a85b51d649663e24c16)
phase-split `bStartTurn` from 16 combat actions and reported an improvement from
one timeout in eight seeds and ~2 second median to zero timeouts and ~283 ms
median. Counterspell depth was bounded and actions were capability-split soon
after. These were verification-model performance decisions, not game-rule
changes.

### 5. April 29–May 11: package ownership, canonical model, and oracle-direction correction

Quint usage moved out of root monoliths into package-local runtime slices and
shared algebras. `quint-connect` advanced through 1.0 and 2.0. Commit
[`625db25a`](https://github.com/dearlordylord/5e-quint/commit/625db25ac02a08bd5fffb37711c8270e916d7c30)
selected the promoted battle runtime's canonical QNT spec.

On May 3, commit
[`7059aef3`](https://github.com/dearlordylord/5e-quint/commit/7059aef3c11d2d114da34ddd1e7432a2a1a6a2c5)
deleted a battle test that generated Quint expected literals from TS results and
made the rule explicit: Quint owns expected parity semantics; TypeScript must
not render its state into Quint assertions and call that proof. This was a good
correction, but it was applied incompletely: the character-creation generator
described in the executive assessment survived and has continued to grow.

### 6. May 11–June 3: from hub to forest

Battle QNT was first split through rule-core bridges
([`36ecb99a0`](https://github.com/dearlordylord/5e-quint/commit/36ecb99a0)),
then decomposed into focused behavioral slices. ADR-0001, added in
[`fb4bf3bc`](https://github.com/dearlordylord/5e-quint/commit/fb4bf3bcdf74f1358c3ad1fb5910d7a5a0905ae4),
rejected a whole-battle top and cross-language harness coupling. Each language
target instead owns its own harness against the shared Quint source
([ADR](../../docs/adr/0001-forest-of-qnt-slices.md#L1-L53)).

The empirical reason became sharper on May 29. An unused import raised a 0.6
second spec to 85 seconds; a barrel-importing driver took 87.5 seconds against
0.8 seconds for a larger leaf-importing driver. Slimming
`battle-runtime-model` reduced its closure from 30 files to two and improved one
case from 87.5 to 18.4 seconds
([`8c598a52`](https://github.com/dearlordylord/5e-quint/commit/8c598a52cc54a206075f1daf224970cd0518e80e)).
The ADR records the resulting conclusion: per-trace transitive import-closure
instantiation, more than branch count or step depth, was the dominant observed
cost
([ADR evidence and rules](../../docs/adr/0001-forest-of-qnt-slices.md#L55-L65)).

That led to an enforced ≤8-file MBT import-closure budget, pure type leaves, and
a preference for literal projection witnesses over computed-oracle drivers.
The broad `battle-runtime.qnt` shell was deleted in
[`d55dafc15`](https://github.com/dearlordylord/5e-quint/commit/d55dafc156bfd9995e774b9b0e355fc1e04c53b3).
The same cleanup deleted the archived root models and 39,215 lines of old QNT
artifacts in `bfb5a6d99`.

### 7. June onward: typed witness protocol, obligation accounting, and portability

The current shape separates reusable `rule-core` mechanics, package-local
integration slices/bridges, proof modules, and focused `*.mbt.qnt` witnesses
([architecture](../../ARCHITECTURE.md#L100-L143)). A typed witness protocol
distinguishes init, holes, resolved, and invalid outcomes; `nondet` picks are for
sampled inputs while separate actions represent procedure paths
([ADR addendum](../../docs/adr/0001-forest-of-qnt-slices.md#L67-L78)).

Coverage became an explicit join among semantic obligations, QNT owners, TS
owners, parity witnesses, supported profiles, and exhaustive TS command
dispatch. This is valuable governance, but “exhaustive” applies to the
obligation inventory and dispatch, not all composed reachable states
([ADR](../../docs/adr/0001-forest-of-qnt-slices.md#L31-L37)). The long-term goal
is portable semantic cores/generator input, but generator readiness is tracked
separately from parity
([architecture](../../ARCHITECTURE.md#L129-L143)).

At the snapshot, reproducible counts are:

```text
rg --files -g '*.qnt'                                      833 files
rg --files packages/battle-runtime -g '*.qnt'             594 files
rg --files packages/battle-runtime -g '*.mbt.qnt'         212 files
rg --files packages/shared-algebras/proofs/rule-core ...  172 files
rg --files packages -g '*.mbt.test.ts'                    181 files
wc -l over all .qnt files                                  124,396 lines
```

These counts demonstrate investment and maintenance surface, not proof quality.

## Current D&D mechanics: what is actually happening

A representative focused lane calls `run` with a Quint MBT spec, `init`, `step`,
a TS driver, TS backend, trace/step bounds, and a state check
([weapon-attack test](../../packages/battle-runtime/src/weapon-attack-skeleton.mbt.test.ts#L14-L33)).
The QNT driver owns the action sequence and expected model state; the TS driver
replays each action and the state check projects runtime state for comparison.
The official connectivity map states that QNT and TS do not call one another in
production, only through verification lanes
([connectivity map](../../plans/BATTLE_RUNTIME_QNT_TS_CONNECTIVITY.md#L1-L27)).

Important current operating facts:

- The driver kit defaults to **one trace** and a 120-second test timeout
  ([driver kit](../../packages/battle-runtime/src/battle-runtime-mbt-driver-kit.test-support.ts#L187-L202)).
- `MBT_TRACES` controls generated walks, while `MBT_MAX_SAMPLES` is an
  invariant-search budget and does not add traces
  ([agent rules](../../docs/agents/QNT-MBT.md#L122-L125)).
- Battle MBT is officially “scarce”: one focused process at a time, shared lock,
  seed reproduction, and offline trace analysis after failure
  ([agent rules](../../docs/agents/QNT-MBT.md#L18-L49)).
- Simulated drivers may import pure leaves, not behavioral modules; computed
  oracles are exceptional
  ([agent rules](../../docs/agents/QNT-MBT.md#L82-L100)).
- Literal witnesses are fast but can move expected behavior out of the reusable
  semantic core. Reviewers must ensure they state independent RAW facts rather
  than quietly duplicate a reducer algorithm. The representative “literal”
  Skeleton witness still contains a local HP/damage calculation helper
  ([QNT witness](../../packages/battle-runtime/battle-runtime-weapon-attack-skeleton.mbt.qnt#L23-L38));
  that may be justified as a tiny scenario oracle, but it illustrates the
  boundary reviewers need to police.

## Latest Huly Quint additions

Huly added its entire current Quint surface in one large integration commit,
[`cc2c7352` on 2026-09-12](https://github.com/dearlordylord/huly-mcp/commit/cc2c7352d0978596e23de797a44d45695e124708),
then added an audit and one test-order correction in
[`626b03aa` on 2026-09-13](https://github.com/dearlordylord/huly-mcp/commit/626b03aaabd692f01375d56a8cd419bc6ef22956).
No later commit in the sibling checkout touches `quint-specs/` at this snapshot.

The integration is one bounded model of HTTP admission, request-client
ownership, and shutdown. Its stated omissions include SDK wire/JSON-RPC detail,
the actual five-second duration, Effect causes, and error rendering; timeout is
modeled nondeterministically
([model scope](https://github.com/dearlordylord/huly-mcp/blob/fdbaa5a081cbf4344d3b415c5feb45d4c898617f/quint-specs/http-transport-admission.qnt#L1-L27)).
The model has explicit state for admissions/leases, client lifecycles, HTTP
leases, servers, the process resolver, HTTP requests/handler, and coverage flags
([state declarations](https://github.com/dearlordylord/huly-mcp/blob/fdbaa5a081cbf4344d3b415c5feb45d4c898617f/quint-specs/http-transport-admission.qnt#L398-L406)).
Its test module includes deterministic close-race, pending-acquisition, shutdown,
header-fallback, and cache scenarios
([tests](https://github.com/dearlordylord/huly-mcp/blob/fdbaa5a081cbf4344d3b415c5feb45d4c898617f/quint-specs/http-transport-admission_test.qnt#L1-L105)).

### The TS→Quint event path

Yes: Huly generates events from TypeScript and feeds them to Quint Studio's
oracle daemon.

1. Production lifecycle code calls `observeHttpAdmission` at transition points;
   for example request admission logs create, enter, release, and quiesce events
   ([production source](https://github.com/dearlordylord/huly-mcp/blob/fdbaa5a081cbf4344d3b415c5feb45d4c898617f/src/mcp/request-admission.ts#L12-L52)).
2. The publisher parses each event through a closed Effect Schema and publishes
   it on a Node diagnostics channel; with no subscriber it avoids resolving
   deferred fields
   ([publisher](https://github.com/dearlordylord/huly-mcp/blob/fdbaa5a081cbf4344d3b415c5feb45d4c898617f/src/mcp/http-admission-observations.ts#L6-L41),
   [delivery](https://github.com/dearlordylord/huly-mcp/blob/fdbaa5a081cbf4344d3b415c5feb45d4c898617f/src/mcp/http-admission-observations.ts#L94-L122)).
3. Vitest setup subscribes only when `QUINT_ORACLE_URL` is enabled and forwards
   `{ action, fields, scope }` via the generated adapter
   ([setup](https://github.com/dearlordylord/huly-mcp/blob/fdbaa5a081cbf4344d3b415c5feb45d4c898617f/test/setup/quint-oracle.ts#L1-L20)).
4. The generated client buffers each test's observations as a trace and the
   daemon replays a successful test trace against the spec
   ([generated client](https://github.com/dearlordylord/huly-mcp/blob/fdbaa5a081cbf4344d3b415c5feb45d4c898617f/quint-specs/oracle-client/typescript/index.ts#L1-L18)).
5. The daemon protocol receives event POSTs and a final run-status PATCH over
   HTTP
   ([transport](https://github.com/dearlordylord/huly-mcp/blob/fdbaa5a081cbf4344d3b415c5feb45d4c898617f/quint-specs/oracle-client/typescript/transport.ts#L11-L61)).
6. Studio regenerates a QNT coverage artifact from test-proven replays; its
   header explicitly distinguishes replayed transitions from tests the model
   could not reproduce
   ([coverage artifact](https://github.com/dearlordylord/huly-mcp/blob/fdbaa5a081cbf4344d3b415c5feb45d4c898617f/quint-specs/http-transport-admission.coverage.qnt#L1-L14)).

The generated client supports optional post-state assertions
([API](https://github.com/dearlordylord/huly-mcp/blob/fdbaa5a081cbf4344d3b415c5feb45d4c898617f/quint-specs/oracle-client/typescript/index.ts#L127-L159)),
but Huly's forwarding setup calls `log(_tag, fields, [scope])`, not the assertion
form. Thus its current evidence is implementation action/argument trace
validation against Quint-owned transition semantics, not TS-generated expected
state literals. That is the useful pattern D&D has not adopted.

### What Huly gained—and what it did not

The model/lock records three regressions that were demonstrably red against old
code: blank auth tokens disabling auth, unrelated `x-huly-*` headers breaking
env fallback, and shutdown failures disappearing
([lock rows](https://github.com/dearlordylord/huly-mcp/blob/fdbaa5a081cbf4344d3b415c5feb45d4c898617f/quint-specs/quint.lock#L66-L127)). It also records
a partial, uncovered shared-client shutdown ordering hazard
([lock](https://github.com/dearlordylord/huly-mcp/blob/fdbaa5a081cbf4344d3b415c5feb45d4c898617f/quint-specs/quint.lock#L171-L202)).

The follow-up audit is appropriately conservative: the evidence supports three
defects and later review hardening, but **does not show that Quint's model
checker independently discovered a production bug**; the restoration was not
an exact historical checkout or a daemon-generated counterexample
([audit](https://github.com/dearlordylord/huly-mcp/blob/fdbaa5a081cbf4344d3b415c5feb45d4c898617f/quint-specs/bug-audit.md#L1-L17)). It also notes stale
lock entries and no fresh daemon-backed E2E evidence
([audit limits](https://github.com/dearlordylord/huly-mcp/blob/fdbaa5a081cbf4344d3b415c5feb45d4c898617f/quint-specs/bug-audit.md#L73-L85)).

The Huly result is therefore valuable as:

- a model-driven adversarial review and behavior inventory;
- a typed, low-overhead production observation seam;
- a way to measure which ordinary tests exercise modeled transitions; and
- a reverse replay lane that can detect implementation traces the model rejects.

It is not evidence that every lifecycle interleaving is covered, that the model
discovered all three bugs unaided, or that ordinary CI validates traces when the
Studio daemon is absent. The README says ordinary tests run inertly without the
daemon and concurrent tests are unsupported
([Huly Quint README](https://github.com/dearlordylord/huly-mcp/blob/fdbaa5a081cbf4344d3b415c5feb45d4c898617f/quint-specs/README.md#L17-L37)).

## Benefits, nonbenefits, and blind spots

### Benefits supported by the record

- **Defect finding through sequences, not just examples.** Early model and MBT
  commits found both model errors and implementation divergences across state
  transitions that ordinary point tests had missed.
- **Precise ownership.** RAW → semantic core → package integration → runtime
  projection is much clearer than a monolithic TS rules engine. The forest and
  registries make missing semantic owners reviewable.
- **Reproducibility.** Seeds, ITF traces, focused drivers, and typed picks make a
  randomized failure replayable. Once captured, the repo explicitly prefers
  offline trace/debugging over paying to regenerate it.
- **Portability pressure.** Quint types and procedure facts force the semantic
  boundary to be representable outside TypeScript. The separate generator-
  readiness classification prevents “has a proof” from being conflated with
  “safe source for another implementation.”
- **Trace validation opportunity.** Huly shows that existing implementation
  tests can become formal-model coverage and conformance evidence without
  requiring Quint to synthesize every scenario.

### Things Quint does not buy here

- **Not a whole-engine proof.** Whole-battle state exploration is out of scope;
  integration is bounded-fixture evidence.
- **Not independent RAW correctness by itself.** A formally consistent model
  can encode the wrong reading of the SRD. Local RAW citations, domain review,
  and assumptions remain essential.
- **Not implementation equivalence from one passing run.** The default focused
  battle run is one trace; absence of a sampled counterexample is not a proof.
- **Not free maintenance.** Hundreds of specs, drivers, projections, coverage
  registries, import gates, and tool-specific process handling must evolve with
  runtime semantics.
- **Not coverage of table-owned facts.** Dice outcomes, selections, and spatial
  observations are intentionally inputs. Quint checks responses to them.
- **Not protection from common-mode duplication.** If a literal witness copies
  the runtime algorithm, or a generated Quint assertion copies TS output, both
  sides can agree and still be wrong.

### Blind spots to raise honestly

1. **We treated the oracle direction too categorically.** Rejecting TS-derived
   expected literals was correct; overlooking TS-emitted event replay was not.
   The Huly lane shows a non-circular middle ground.
2. **The architecture rule is not enforced repository-wide.** Character
   creation is a current exception/violation, not just historical debt. A static
   gate catches MBT import closure and witness storage, but no equivalent gate
   rejects `writeFileSync(...qnt)` with runtime-derived assertions.
3. **Performance shaped epistemology.** To stay fast, many drivers became small
   literal witnesses and import no behavioral semantics. That is pragmatic, but
   shifts review burden onto whether each literal is independently RAW-backed.
4. **Coverage accounting can look stronger than exploration.** “100% QNT
   coverage” means registered obligation/branch/identity evidence plus bounded
   integration, not exhaustive reachable-state coverage.
5. **The first successful monolith did find many bugs.** The later forest solved
   scale and performance, but it loses the broad random composition that created
   some of the earliest value. A reverse trace lane could recover real composed
   sequences from TS tests without reintroducing a simulated top.
6. **Instrumentation completeness is a new trust boundary.** Huly validates only
   transitions that production code emits. A missing, misplaced, or wrongly
   parameterized observation can create false confidence. Event schemas and
   action coverage need the same parity discipline as D&D's TS drivers.
7. **Concurrency is constrained in the current generated client.** Huly's
   ambient registry rejects concurrent tests. That is a serious limitation for
   validating the lifecycle/interleaving domain that motivated the model.
8. **Generated tooling provenance and lifecycle need clarity.** Huly checks in a
   sizable generated client, support spells, lock, and coverage artifact. The
   audit already found stale lock facts. It is unclear which files are stable
   public contracts, how they are upgraded, and what can run self-hosted in CI.

## Recommended position for the Quint call

The strongest honest message is:

> Quint gave us real value when it generated sequences and forced explicit
> state ownership. At scale, evaluator/import costs pushed us from broad models
> to a forest of focused semantic cores and literal witnesses. That made the
> suite operable but reduced broad composition exploration. We now see
> implementation-event trace validation—like the Studio oracle used in Huly—as
> complementary, not contrary, to model-generated MBT. We want both directions,
> with Quint still owning semantics and with an explicit ban on TS-derived
> expected literals masquerading as proof.

A sensible hybrid for D&D would be:

1. keep QNT-first rule cores, invariants, and focused Quint→TS MBT for generative
   discovery;
2. add a typed TS observation seam at high-value reducer boundaries;
3. replay ordinary integration-test traces through QNT to regain composed
   sequence evidence without a whole-battle simulator;
4. use action/argument observations first, with no TS-derived post-state
   assertions in the authority lane;
5. generate a coverage artifact that distinguishes replayed actions, stutters,
   truncated traces, and no-model-replay tests; and
6. delete or reclassify the current character-creation generated-assertion lane,
   replacing it with either hand-authored QNT expectations or reverse event
   replay.

### Suggested 30-minute call agenda

1. **Five minutes — outcomes:** the early bugs found, the current semantic-core
   forest, and the difference between obligation coverage and state-space proof.
2. **Five minutes — scale costs:** the 0.6s→85s unused-import result, why the
   project retired its battle hub, and the operational scarcity of MBT.
3. **Ten minutes — both trace directions:** current Quint→TS replay, Huly's
   Studio TS→Quint observation lane, and the character-creation circular-oracle
   counterexample.
4. **Five minutes — desired hybrid:** model-owned semantics plus generative MBT
   plus implementation-trace validation and coverage.
5. **Five minutes — roadmap:** self-hosting, TypeScript support, concurrency,
   import caching, and stable trace/coverage protocols.

## Questions worth asking the Quint person

1. Is Quint Studio's oracle/trace-validation protocol intended to become a
   public, self-hostable Quint/Quint Connect capability? What is the stability
   and licensing plan for the generated client, daemon protocol, lock, and
   coverage format?
2. Can the reverse lane consume a complete ITF trace directly, or only streamed
   named events? Can it validate offline production traces without launching
   the test process?
3. How does the oracle choose among multiple enabled actions with the same event
   name/arguments, and how are stuttering, dropped observations, partial traces,
   and nondeterministic internal actions represented?
4. What is the plan for concurrency? The generated Huly registry refuses
   overlapping tests, while HTTP lifecycle correctness is fundamentally
   concurrent.
5. Can event schemas/action signatures be generated from QNT so a missing or
   stale TypeScript observation fails at compile/test time, analogous to our
   exhaustive Quint→TS action maps?
6. Can the evaluator cache or incrementally instantiate transitive imports
   across generated traces? Our measurements show an unused import changing
   0.6 seconds to 85 seconds and equivalent drivers differing by ~100×.
7. Is there a supported notion of semantic-core modules versus proof examples,
   MBT drivers, and integration witnesses? Our forest needs those roles to avoid
   treating every `.qnt` file as equal authority.
8. Can coverage combine both directions: model-generated branch/witness
   reachability and implementation-generated trace replay, while clearly
   labeling bounded/sample evidence versus exhaustive model checking?
9. What TypeScript-first Quint Connect roadmap exists? We use a third-party
   TypeScript connector, while the official December 2025 material presents
   Rust and describes trace validation as future work.
10. What guidance does Quint recommend for avoiding common-mode oracles—literal
    witnesses that duplicate implementation formulas, or implementation-derived
    post-state assertions that are fed back into the spec?

## Verification notes

This review used only repository source, documentation, tests, generated
artifacts, and Git history for project claims. Official Quint sources were used
only to distinguish core CLI/Quint Connect capabilities from Quint Studio's
newer oracle flow. No proof, MBT, or Studio-daemon run was executed: the task
was architectural/history research, Huly's daemon is not part of ordinary test
execution, and D&D repository policy treats battle MBT as a scarce mutation-
focused lane. File counts were reproduced at the snapshot commits above.
