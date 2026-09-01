# RAW player swarm

Uses agents pretending to be players and DMs to discover gaps in the D&D 5e
SRD 5.2.1 adjudicator SDK. The checked-in implementation is a prototype. Its
important output is the discovery workflow and evidence requirements, not the
particular MCP plumbing used by the first experiment.

## Architecture

The SDK is the system under test. The first prototype operates it through MCP
because MCP supplied a ready-made discoverable interaction surface. This also
tests the MCP adapter, but adapter coverage is a consequence rather than the
purpose. Review findings must distinguish an SDK rules defect from an MCP
projection or decoding defect.

In the checked-in MCP prototype, there is no scenario interpreter and no second
D&D command vocabulary. Its only authored player input is a natural-language
player/DM prompt. During play, the agent chooses from the SDK's canonical
surfaced acts and holes. The recorder captures the resulting concrete MCP calls
and full responses; replay executes those calls verbatim and does not ask an
agent to make the same choices again.

Ordinary package integration and regression tests remain the deterministic
regression layer for known claims. The swarm adds discovery:

1. a player/DM agent explores a build, battle, or interaction;
2. the recorder preserves everything it actually tried and observed;
3. an adversarial reviewer checks the whole trace against local RAW;
4. an actionable SDK or adapter bug becomes an ordinary regression and linked
   GitHub issue; other findings retain their separately classified disposition.

The regression preserves the discovery. It does not drive or guide later
player agents.

The package-local vocabulary, navigation, and catalogue command live in
[`README.md`](README.md). This reference owns the prototype commands and
evidence operations; it does not redefine those domain terms.

Run commands under mise-managed Node 24 from the worktree root:

```sh
mise exec -- <command>
```

Generated transcripts, agent logs, review output, and SQLite databases belong
under `scripts/raw-swarm/out/` and are gitignored.

## Target discovery workflow

This section owns the intended workflow. The checked-in campaign runner
implements stochastic whole-prose generation plus final RAW and artifact-policy
review. The direct-SDK tracer implements the single-controller execution and
evidence seam. A controller-owned ordinary TypeScript module now creates
canonical Character Sheets through the real character-creation runtime; a
separate setup flow consumes those sheets and canonical SRD Stat Blocks to build
the initial battle session. Its neutral author first projects only fixed facts;
a controller then reviews that exact source and supplies delegated pre-battle
choices such as Initiative rolls and starting-square assignments through
ordinary SDK code. The retained `ScenarioSession` pairs the untouched battle
runtime session with a canonical spatial boundary: geometry-derived sessions
retain five-foot arena/current-placement snapshots, while table-authored
sessions retain exact table decisions without a tactical map. Both retain
table-owned illumination and scenario-object facts. Multiple battle controllers
and branching remain later workflow increments. Missing capability is reported as an
obstruction rather than modeled in a harness language.

### Geometry is an optional Table aid

Geometry is auxiliary to Raw Swarm's rules and public-SDK audit. The
[`@dnd/tactical-space`](../../packages/tactical-space/README.md) package is an
optional experimental Table adapter, not a Battle Runtime or Target SDK
completeness gate. A scenario may use it when its documented envelope helps,
but the Table may instead supply one coherent, typed spatial witness for the
exact question under adjudication. The player must not restate or override
that Table-owned fact inside a Battle fill.

An unsupported tactical-space feature is an experiment-boundary observation,
not by itself a rules defect, public SDK defect, or reason to expand geometry.
Reviewers still reject contradictory spatial assertions or scenarios whose
objectives and tactics are fundamentally incoherent; ordinary Table
authorship is not permission to rescue nonsense. Keep those dispositions
separate from a runtime defect that mishandles an accepted witness or a public
contract defect that exposes the wrong witness shape. See the product boundary
in [`ARCHITECTURE.md`](../../ARCHITECTURE.md#spatial-modeling-frontier).

### Generate battle scenarios as prose

Scenario generation is an offline authoring process, separate from battle
execution. A generation campaign supplies a broad distribution preference,
such as mostly exploratory character choices with a few tightly constrained
edge cases. It must bias toward battles, serious pursuit of authored objectives,
and materially different strategies rather than plots or storytelling.

The generator also receives the canonical stat-block availability profile and
two explicit intents. Content availability is `availableOnly` or
`probeUnavailableContent`; SDK capability is `supportedOnly` or
`probeUnsupportedCapability`.
Ordinary scenarios may select canonical stat blocks only from that profile; an
absent SRD record is a scenario-authoring error, not an implied request to widen
the shipped catalog. Unavailable content is admitted as playable authored input
only for a deliberate availability-probe campaign whose prose names that
unsupported intent. Rejected authoring evidence may still be retained outside
the playable scenario directory. A supported-only campaign must remain within
the current public scenario-character, setup, and player SDK documentation. A
capability-probe campaign must explicitly name one unsupported SDK boundary and
keep the rest representable.

Each generation iteration asks an LLM for several materially different, complete
revisions of the scenario-so-far. A script randomly selects one revision and
passes that exact prose into the next iteration. The alternatives must differ in
mechanically relevant facts or tactical intent, not merely wording. Unselected
candidates, selection indices, seeds, and generation logs are disposable; only
the final reviewed scenario is an authored artifact. Random selection is an
unaudited diversity heuristic, not evidence of an unbiased distribution. It can
reduce choice-after-generation bias, but cannot remove bias in the generated
candidate set.

Generation has campaign-configured minimum and maximum iteration counts and one
feedback review milestone. It cannot stop before the minimum or before that
milestone. The milestone and the final pre-play boundary use one composite
review invocation with independently named RAW, content-availability,
SDK-capability, artifact-policy, and scenario-quality assessments. A critique continues the next
complete revision; an empty composite result after the minimum and feedback
milestone stops generation. There is no second readiness model pass: setup
meaning, strategic substance, and fixed/delegated fit are part of the retained
composite review contract. Reaching the maximum also stops generation and sends
the result to final review. These bounds and decisions are authoring control,
not scenario stages or domain states.

Scenario prose may mix degrees of prescription. It can require an exact level,
class, ability priority, SRD or synthetic item, SRD or synthetic spell,
combatant count, or battlefield fact while delegating other choices to the
player agent. Do not encode this continuum as a stage enum, prescription level,
mechanic recipe, or parallel build model. The prose itself owns the constraints.
Generated scenarios must follow the standing
[PHB+ authoring policy](../../docs/mushroom-playbook/AUTHORING.md): never retain
recognizable non-SRD official identity or expression in prompts, reviews,
generated evidence, or other public worktree artifacts. Unsupported probes use
visibly synthetic content.

Keep prose mechanically relevant. Include only facts that can affect character
choices, encounter setup, tactical decisions, or result interpretation. Brief
fiction may establish terrain, visibility, distance, objectives, or another
battle fact; do not grow dialogue, travel narrative, personalities, or plot for
its own sake. Every represented combatant or group must seriously pursue its
authored objective. A scenario may give any strategy-bearing brief an initial approach, but
must permit strategies to change as the battle develops. When one agent
controls conflicting roles, it must pursue each brief faithfully rather than
collapsing them into one cooperative strategy.

At selected generation milestones, one review invocation reports separate RAW,
content-availability, SDK-capability, artifact-policy, and scenario-quality
assessments. The RAW
assessment classifies the accumulated prose against the local SRD and the
registered ambiguity decisions in [`ASSUMPTIONS.md`](../../ASSUMPTIONS.md) for
legality, coherence, and executability. The content assessment compares
authored canonical identities with the supplied catalog and explicit campaign
intent. The SDK assessment compares the scenario with the current public
consumer documentation. Keeping the reported responsibilities separate keeps
“RAW-supported,” “available in this product profile,” and “representable
through the current SDK” distinct without paying for separate model
conversations.
The
SDK review does not use historical execution verdicts as a permanent blacklist: when
the public SDK and its documentation gain a capability, the next review sees it
as supported, so ordinary generation can use it and an obsolete capability
probe is rejected. These reviewers report problems without choosing tactics,
declaring an outcome, or silently rewriting the scenario, and their critiques
become input to a later generation iteration. Final RAW, content,
SDK-capability, policy, and scenario-quality reviews happen before play.

Generation uses the Sol model at medium reasoning. The five composite-review
responsibilities share one Luna invocation and remain separate report fields,
not concurrent voters or scenario domain roles. The historical profile retains
Luna at max reasoning for its composite and post-play reviews; the bounded
profile predeclares Luna at medium reasoning for those same responsibilities.
The model-facing review schemas, evidence packet, and independent post-play
invocation are unchanged. Retained authorities now admit both configured
efforts, profile admission fails closed, and every invocation records its effort
so the implementation-sequence difference is explicit and independently
validatable.

Every model invocation retains its own raw first-party event stream beside the
phase ledger. Generation events are retained under the Campaign Evidence Set at
`out/$CAMPAIGN_EVIDENCE/invocation-events/`; character and setup events are
retained beside their \*-authoring-invocations.jsonl ledger, player events
under the SDK-player evidence directory, and post-play review events beside
its review ledger. A ledger's eventsSha256 is the binding between one typed
row and one retained event authority; event filenames are transport names and
are not identity.

Every generation, authoring, player, and review role receives a bounded,
versioned `CAPABILITY_CONTEXT.md` projection for its role. The projection is
derived from one canonical owner and describes supported public operations and
experiment boundaries; it is not a copied D&D schema or a model-facing
declaration bundle. Declarations may be emitted into an isolated authoring
directory solely so ordinary TypeScript can compile the submitted module. The
author prompt names only the operations and declaration imports needed for its
role. The complete transcript, replay evidence, findings, and retained review
results remain the authorities.

At integration source `b88a923f6`, the
Effect 4 public declaration graph is a reviewed deterministic measurement: 571
declaration files and 10,277,269 bytes. The byte gate remains 10 MiB, leaving
208,491 bytes of explicit margin; the coarse file safety ceiling is 1,000.
Deterministic verification asserts exact-manifest acceptance plus coarse-cap
and cap-plus-one boundary tests; changing either bound, any admitted path, or
any declaration content requires a new measured graph and review. The canonical
manifest is owned beside the declaration emitter in
`sdk-player/consumer-distribution.ts` and is reproduced by the clean-consumer
distribution test. The
[declaration-bundle convergence certificate](../../docs/migrations/effect-4/declaration-bundle-convergence.md)
records the repaired 23 additions and one removal from comparison commit
`993cb0b11`, plus the seven unintended Stat Block runtime/data declarations
excluded by the lightweight mechanics-admission owner.

TypeScript 5.9.3 is the hermetic Raw Swarm implementation for declaration
serialization, submitted-source checking, and authored-source AST parsing. It
is copied into each distribution for those internal operations; it is not a
supported external compiler version or compatibility matrix. Declaration
emission and relocated checks require exit zero with no diagnostics and keep
`skipLibCheck` disabled. Generated configurations are byte-identical after
relocation, use `baseUrl: "."`, and contain only POSIX relative declaration
paths. Compiler resolution is supplied separately from the certified D&D
declaration graph by an authentic declaration-only cohort:
Effect 4.0.0-rc.112, fast-check 4.9.0, msgpackr 2.1.0, and pure-rand 8.4.2.
That cohort contains the packages' original manifests and licenses plus their
complete required declaration files; exact version, dependency, path, content,
file-count, and byte ledgers reject drift. It contains no JavaScript, maps, or
source runtime and is not an authored SDK capability. The authored-source
admission boundary permits only the role's generated static type import from
its exact public SDK module and rejects every other module edge before
typechecking or evaluation.

The current tracer post-play review keeps this bounded context inline and is
commandless; its review-invocation manifest intentionally does not admit a
legacy context-read exception. The fixed benchmark's historical
`documentDeclarationSet` profile is a separate baseline path: its oversized
declaration authority remains an immutable path/byte-length/SHA-256 evidence
record and is accessed only through strictly validated direct read/search
commands against that exact path. First-party command output may be client-
truncated, so this historical profile proves bounded authority access and
telemetry—not complete ingestion of every authority byte. The packet remains
inline, one post-play invocation is retained, and no transcript, packet,
repository, unrelated path, write, or non-read command is admitted.
Historical equivalence is established from the retained review classifications
and findings, the review outcome, and the canonical SDK-call authorities bound
to the same scenario—not by asserting that every source byte entered model
context. The immutable authority path, byte length, and SHA-256 prove that
the command-read target did not change while those comparable semantic
authorities are evaluated.

An impossible or partially unsupported scenario can still be valuable evidence.
After preserving the RAW and availability verdicts, the campaign may admit the
scenario when its explicit intent makes the unsupported boundary diagnostic
rather than accidental. Contradictory RAW or accidental unavailable-content
results are retained only as rejected authoring evidence. The player must make
a serious attempt, use the closest legal path when appropriate, and report where
progress became impossible. It must not fabricate support or force an
unavailable outcome.

A final scenario is one prose document. It may contain a public setup and
controller-specific briefs. Separate opposing agents receive the public setup
and only their own brief; a single agent controlling every combatant may receive
the whole document. These prose sections do not constitute a scenario DSL.

The executable campaign boundary is a small JSON authoring configuration, not a
D&D scenario model. It identifies the Scenario Campaign, planned semantic
Scenario, human title and exploratory purpose, and authoring Evidence Set. It
also contains the distribution preference, explicit content-availability and
SDK-capability intents, iteration bounds, candidate count, one review milestone,
and whether a reviewed RAW-unsupported result may be admitted.
Start from
[`scenario-campaign.example.json`](scenario-campaign.example.json), then run
from a clean revision through the bounded manual-trial lane. A durable
operation uses `raw-swarm:model:campaign` and also supplies its accepted
operation identity and UTC deadline as documented in [`README.md`](README.md):

```sh
export RAW_SWARM_EXPECTED_GIT_SHA=$(git rev-parse HEAD)
export RAW_SWARM_OPERATION_ID="campaign-$(date -u +%Y%m%d-%H%M%S)"
export RAW_SWARM_OPERATION_DEADLINE_UTC="$(date -u -d '+8 hours' '+%Y-%m-%dT%H:%M:%SZ')"
mise exec -- pnpm raw-swarm:model:campaign -- scenario-campaign \
  scripts/raw-swarm/scenario-campaign.example.json
```

The command refuses to overwrite existing Scenario or Evidence Set artifacts.
On admission it retains the selected final prose, adjacent
`.scenario-review.json`, canonical `.scenario.json` admission record, and a
controller-owned `.stage-facts.json` authority containing the selected
candidate's typed planning facts. Rejection retains a separately identified
Candidate rejection record. Unselected candidate batches, random
indices, candidate-selection decisions, and agent process output are discarded. Ignored
generation evidence retains the typed
invocation ledger and the exact prompt/result envelope for each composite
milestone and final pre-play review so a controlled review comparison can replay
the same input. Separate final RAW, content-availability, SDK-capability,
public-artifact policy, and scenario-quality reviews record the planned Scenario id, clean Git revision,
availability/capability/admission intent, and a hash of the exact final prose
bytes. Admitted artifacts use the planned semantic Scenario ID after admission;
rejected diagnostic artifacts use the selected Candidate ID. Campaign evidence
is always stored beneath its independently supplied Evidence Set ID. Admitted
artifacts go under `sdk-player/scenarios/`; rejected diagnostic output goes
under ignored `out/rejected-scenarios/` and is not executable input.
The review's `reviewScope` states which independent review responsibilities
actually ran. Retained pre-capability-review artifacts remain
`rawContentPolicy`; do not backfill a verdict that was never produced. New
campaigns retain `rawContentSdkCapabilityPolicyQuality`, including the named
scenario-quality result, and require the SDK-capability intent and verdict.

The candidate output is not prose-parsed: each candidate carries its own
versioned `stageFacts`. The controller plans that candidate before invoking the
expensive whole-scenario review. An incoherent outside-envelope candidate is
rejected there and retains a candidate stage plan and stage-plan findings under
`out/rejected-scenarios/`; a coherent Table-owned spatial fact proceeds to
review. Candidate stage-plan identity includes the SHA-256 of the exact
retained candidate prose, and findings projection checks that binding against
the scenario authority. For an admitted scenario, the retained plan is derived from the
controller-owned stage-facts authority and review identity, and skipped-stage
findings are retained beside it. Historical review artifacts are never edited
to claim facts their reviewer did not emit; an older artifact without this
authority is explicitly unavailable to the new stage-planned authoring path.

For a controlled performance comparison, replay each retained milestone or
final review-input envelope through the same production composite-review
invocation. The envelope supplies the exact original prompt and output schema;
the current clean Git revision identifies the reviewer implementation. Use a
unique output path for each invocation and one shared ledger path. The command
also retains the replayed prompt, schema, and typed result beside that ledger:

```sh
export RAW_SWARM_EXPECTED_GIT_SHA=$(git rev-parse HEAD)
mise exec -- pnpm raw-swarm:model:trial -- scenario-review \
  scripts/raw-swarm/out/$CAMPAIGN_EVIDENCE/generation-invocations-review-inputs/scenarioCompositeReview-MILESTONE.json \
  scripts/raw-swarm/out/$CAMPAIGN_EVIDENCE/replayed-milestone-review.json \
  scripts/raw-swarm/out/$CAMPAIGN_EVIDENCE/replayed-review-invocations.jsonl
```

Run the same command with the retained `reviewStage: "final"` envelope and
another output path for the final pre-play review. A scenario prose path is not
accepted because it cannot prove which milestone input was reviewed. This
command measures the current production review path; it does not manufacture
historical generation provenance for an older scenario.

An admitted prose artifact is not parsed. A controller agent first authors an
adjacent `<scenario-id>.characters.ts` against the canonical character-creation
and Character Sheet APIs. It owns the builds delegated by the prose and returns
actual fresh `CharacterSheet` values, not a harness build description. A
separate neutral setup agent authors the closest `<scenario-id>.setup.ts`
against `@dnd/scenario-setup-sdk` without choosing delegated facts. A controller
agent then reviews that exact source and may edit it only to supply player- and
GM-owned pre-battle choices. The final source either returns the initial
`ScenarioSession`, whose `battle` member is the canonical `BattleRuntimeSession`
and whose `battlefield` member retains table-owned setup facts, or reports a
precise remaining obstruction. Neither
author may substitute missing creatures, drop required combatants, or encode
later tactics. From a clean revision run:

```sh
SCENARIO=synthetic-beacon-eight-round-defense

mise exec -- pnpm raw-swarm:model:trial -- scenario-character-authoring \
  "$SCENARIO"

# Commit the retained character source before the clean-revision setup step.
# If character composition is obstructed, retain that result and skip setup.

mise exec -- pnpm raw-swarm:model:trial -- scenario-setup-authoring \
  "$SCENARIO"

# Commit the retained setup source before recording play. The player runner,
# replay, and review all require the clean revision recorded in their evidence.
```

Each author receives only the prose, its exact admission review, relevant public
declarations and documentation, and the public catalog facts in a disposable
scratch consumer. Character composition may resolve only controller-owned
build choices. Neutral setup may project scenario-fixed facts and consume the
completed sheets; its controller reviewer may supply only delegated pre-battle
choices and must preserve the neutral source's scenario-fixed facts. The
neutral draft is discarded, so only the final ordinary TypeScript setup is
retained. Commit the retained character source before setup authoring so both
later setup and evidence use a clean, reproducible revision. This is the same
code-consumer boundary as play, not a scenario interpreter or generated build
schema. When the optional Codex filesystem profile is
unavailable, this cooperative authoring step falls back to explicit scratch-only
instructions; it does not claim hostile-code isolation.

### Execute through the public SDK

The intended primary player behaves as an external SDK consumer, not as an
agent using repository knowledge. Give it a scratch project containing public
type declarations, user documentation, and the final scenario prose. Its
ordinary working context does not include implementation source or internal
tests. The agent writes ordinary TypeScript against canonical SDK operations
and types; the supervisor runs that code against the SDK.

Agent topology is an execution choice rather than a scenario fact. The same
scenario may be run by one agent controlling every combatant or by separate
agents with explicit combatant-to-controller assignments. The SDK supplies the
currently acting creature; the execution configuration maps that creature to a
decision owner. It must not infer an encounter-wide `side` that the battle
domain does not model. Record the assignment with the Execution. For the simple
multi-agent form, one neutral battle-session supervisor:

1. owns the SDK process, append-only program, execution transcript, and turn
   scheduling;
2. routes an acting creature's turn choice through its recorded controller
   assignment, while routing a pending reaction, save, interrupt, or other
   Table Decision through the decision subject or owner surfaced by the SDK;
3. gives the resolved controller agent the public observation, its private brief,
   relevant prior results, public SDK documentation, and a continuation function
   stub;
4. accepts the exact, variable-sized TypeScript function body authored by that
   controller agent;
5. validates, appends, executes, and records it without translating or
   strategically rewriting it; and
6. returns the observable result for the next decision.

If a surfaced decision lacks enough ownership information to resolve its
controller, the supervisor records the obstruction instead of letting the
acting creature's controller decide by default.

The current single-controller runner uses one model invocation for the complete
play session. After each tactical continuation, the trusted supervisor publishes
the bounded latest observation. The controller must reread that file before
replacing the editable continuation body. Its TypeScript submission still
compiles against the emitted public declaration graph, but the declarations are
not a second player-facing context product. An observation hash in each request
rejects queued work based on an older frontier, and the supervisor admits at
most 128 frozen continuations. Multiple controllers must not concurrently edit
one shared program. The supervisor seeing all briefs is an accepted
instructional boundary for the prototype, not a claim of secure hidden
information.

If a continuation records an SDK call and then fails, that continuation remains
frozen evidence. Its error response carries the supervisor-derived projection
and the prior bounded tactical note, so the controller can recover in the next
continuation without rewriting recorded history.

The continuation stub is the one stable code handoff. Its function parameters
provide the supervisor-owned current session value and required SDK operations
using canonical public SDK types. The controller sees the stub and public
observations, not the shared accumulated source or another controller's brief.
The supervisor appends the authored body verbatim inside that function. The
stub must not define new D&D actions, commands, or result types; it is ordinary
TypeScript dependency passing around the public SDK.

The starter TypeScript program is incomplete; the final scenario prose is not.
After a continuation first produces an observable SDK interaction, its source
becomes immutable play history. Enforce this narrowly by retaining the frozen
prefix byte length and SHA-256 and rejecting later changes to that prefix.
Compilation failures and other failures before SDK interaction may be edited
freely. An SDK error or unsupported result is observable evidence and therefore
freezes the continuation that produced it. Recovery is appended; abandoning a
path creates a separately identified branch instead of rewriting history. Each
branch owns a fresh SDK process and transcript. Before executing its new suffix,
the supervisor reconstructs the fork state by replaying the frozen common
canonical-call prefix against the same SDK revision.

A continuation may contain as much ordinary TypeScript as one coherent
decision requires. Do not impose one call or one line per checkpoint. Instruct
agents to run and observe whenever new information could reasonably change
their strategy. Preserve the final program, checkpoint prefix facts, canonical
public SDK calls and results, tested SDK revision, and agent observations as
execution evidence. Deterministic replay applies to the recorded canonical SDK
call stream against its recorded SDK revision, not to rerunning arbitrary agent
TypeScript with uncontrolled time, randomness, filesystem, network, or process
inputs. The evidence, unlike discarded generation candidates, must support that
call-stream replay and adversarial review.

MCP may remain an optional parity and compound-coverage lane. It is not a
required part of the target SDK-player workflow.

## Execute a direct-SDK scenario

The first tracer remains a manually authored Goblin Warrior versus Skeleton
scenario. Every Execution starts from adjacent `.scenario.json` identity,
`.md` prose, admitted `.scenario-review.json`, and controller-owned
`.characters.ts` files. A ready
character composition additionally requires the retained controller-reviewed
`.setup.ts` produced by the neutral-to-controller authoring flow; an obstructed
composition is retained and replayed without one. The runner refuses
an incomplete set for the reached state. It does not parse prose or introduce a
scenario interpreter. The player receives a scratch directory outside the
checkout with:

- the final prose scenario and public battle-runtime README;
- declaration-only public SDK artifacts;
- one typed `PlayerContinuation` stub; and
- a small file-protocol client that submits the authored continuation to the
  neutral supervisor without containing SDK implementation.

The supervisor, SDK implementation, append-only program, and evidence live in a
separate working directory. The supervisor owns the canonical `discoverBattleActs`,
`resolveBattleRuntimeSubject`, `resolveBattleRuntimeInterrupt`, and
`endBattleRuntimeTurn` operations. It copies each submission once, typechecks
that exact copy, executes it, and records its calls. This is a cooperative
external-consumer test boundary, not a hostile-code security sandbox: the
player is instructed to use only the provided files and public SDK, and the
harness does not attempt to defend against malicious submitted JavaScript.

Before play, the supervisor always typechecks and evaluates the exact adjacent
character-composition source. After ready composition it also evaluates setup.
The common transcript header owns the character source hash and observation.
Ready composition adds the canonical Character Sheet projection plus setup
source and setup-observation evidence; ready setup adds the initial-session
projection and hash. Replay
re-evaluates every reached source and requires those facts to match before the
first recorded SDK call.

An obstructed character composition or setup is a successful diagnostic Execution,
not a failed or fabricated battle. The runner retains the available authored
source and a call-free transcript, does
not launch the player, and supports the same replay, report ingestion, and
whole-trace review flow.

The agent edits ordinary TypeScript inside the continuation. The supervisor
requires every canonical SDK operation to consume the one current session,
advances that cursor from the returned result, and accepts only that latest
session in the continuation outcome. Player-call inputs cross a canonical JSON
boundary before validation and execution: `undefined` object properties are
absent, while sparse arrays and non-JSON execution values are rejected. Strict
input decoding still rejects excess properties that have JSON values. The
frozen continuation source retains the exact authored JavaScript syntax. The
supervisor records complete JSON evidence
projections of the public input/output sessions (including every Map and Set
entry),
the public operation payload, and the canonical result projection, then
reconstructs later state by replaying the stream and checking every lineage
hash. Returned and thrown calls are both records. It freezes
the exact authored continuation on its first SDK call. A compiler or runtime
failure before the first call remains editable; an SDK `invalid` result or a
later failure after a call remains frozen evidence. The retained
`frozen-prefix.json` carries the byte length and SHA-256 of the append-only final
program, and every later attempt verifies both before running. A
`playerConcluded` outcome records the player's assertion; only the independent
RAW review decides whether the concrete terminal facts support the Table's
decision to end combat; it does not derive an encounter-wide outcome.

The complete canonical SDK transcript is the immutable execution authority,
not the default reviewer context. Reviewers should receive the size-capped
audit projection first, together with the transcript path, exact byte size, and
an exact-sequence extraction operation. They inspect raw transcript records
only when a concrete audit fact requires them; they must not load a large
transcript wholesale merely because it exists. The audit projection is
disposable and must remain reconstructible and hash-linked to the authoritative
transcript.

Player and reviewer projections are different derived products. The player
receives a small current-turn projection with actor, round, phase, bounded act
and hole facts, and materially changed combatant, object, position, condition,
and resource facts. A byte-capped tactical note may preserve player reasoning
between continuations but is not execution evidence. The reviewer instead
receives all-call audit metadata and exact sequence references. Neither
projection embeds complete sessions, discovery results, or operation results,
and neither replaces the transcript.
Each player projection is at most 32 KiB of encoded JSON, and its separate
UTF-8 tactical note is at most 4 KiB. The supervisor rejects an oversized
projection or note precisely; it never truncates one. `evidence/invocations.jsonl`
records one typed player entry and first-party model usage for the complete
persistent player invocation. That entry binds
`evidence/player-events.jsonl`. Continuation counts and phase timings come from
the separately validated observation and supervisor-timing evidence; performance
reporting normalizes the one player invocation by both continuations and
canonical SDK calls.
`evidence/supervisor-timings.jsonl` separates continuation typechecking,
prior-call verification/replay, new SDK execution, and evidence writes.
`performance-comparison.ts summarize` combines those records with typed model
invocation ledgers. The review invocation evidence binds each retained
milestone/final source input to the corresponding replay input and measured
invocation. The descriptor names that evidence, the continuation-observation
path, the supervisor timing path, and a versioned reporting-timing artifact.
Scenario identity and call count are derived from the transcript; continuation
count is derived from the ordered observations so a frozen callless failure is
still measured. The summary reports
the scenario-review, character, and setup hashes as part of the comparison
identity, so different admitted facts cannot satisfy a same-scenario gate. It reports
whole-path wall time and token totals normalized per invocation, continuation,
and call. It records the byte length and SHA-256 of every source artifact and
refuses a saved summary that no longer recomputes from those exact sources.
`compare-legacy` marks legacy footer token totals as
incomparable with first-party JSON usage instead of claiming a token reduction.
Legacy whole-path wall time is also incomparable because the retained Execution does
not prove per-phase model identity or invocation counts. Preserve it as an
inventory/size baseline; use controlled reruns for performance acceptance.
Comparable same-scenario evidence gates packet-based post-play review tokens and wall
time at a 50% reduction, comparable-path model tokens and wall time at a 40%
reduction, and player tokens per continuation and call at a 40% reduction.
For the broader #292 gate, the complete-path comparison exported by
`performance-comparison.ts` composes the canonical stage plan, current v4
invocation ledger, and findings projection. Each current projection is retained as a
hash-linked authority and must decode to the inline typed projection; changing
the inline reliability or actionable-finding evidence without changing its
authority fails validation. It retains failures, corrections, stage-plan
reasons, and every token dimension for the candidate path, while historical
baseline authorities remain explicitly unavailable where #287 predates them.
It marks paths incomparable when required identity/evidence or first-party
usage is unavailable; missing usage is never zero. The complete-path comparison
keeps every finding pointer in retained evidence, but trace-local
SDK sequence, verdict-index, and event-line pointers are not scenario identity.
Equivalent paths instead require the same final review classifications,
post-play verdict classes, and actionable issue identities (domain role plus
fingerprint). Player failures and successful corrections remain explicit
summary dimensions; a candidate with more player failures or more failed model
stages is reliability-worse and therefore incomparable. Transcript-derived SDK
call count is diagnostic rather than monotonic because equivalent tactics may
use different call counts, and accepted-call review rows may vary with reviewer
verbosity. Correction count is also diagnostic rather than monotonic: successful
recovery is not a regression and is interpreted alongside the failure count.
Both paths must retain independently reviewed `completed` outcomes for the same
scenario and immutable bundle; tactical trace differences are reliability
observations, not a second spelling of scenario identity. The current
bounded-context size estimate and the retained `open-grid-wolf-skeleton-pursuit` report are
documented in
[`docs/research/raw-swarm-capability-context-and-complete-path.md`](../../docs/research/raw-swarm-capability-context-and-complete-path.md).
The role-view byte estimate is not a live model result; a complete-path claim
requires hash-linked baseline and candidate measurements.

Assemble a current measurement only from retained authorities. Prepare a
descriptor naming the stage plan, findings projection, every phase ledger,
every phase event stream, and observed terminal outcome. The typed assembler
decodes and composes those rows, validates their hashes and stage bindings,
and refuses to write an invalid or already-existing measurement. Its descriptor
has schemaVersion 1, pathId, stagePlanPath, findingsPath,
invocationLedgerPaths, invocationEventPaths, and outcome fields. Populate the
event array with every retained generation, composite-review, character,
neutral-setup, controller-setup, player, and post-play-review event authority;
do not use an estimate or fabricate a missing legacy stream.

Hash-bound current measurements use schema version 4; fixed-scenario benchmark
measurements use schema version 5. Previously retained versions 2 and 3 remain
readable as legacy-unbound evidence, but cannot pass strict equivalent-path
acceptance because their inline findings projection has no envelope-level hash
authority. Never rewrite those immutable envelopes; produce a fresh bound
measurement instead.

```sh
mise exec -- pnpm exec tsx scripts/raw-swarm/performance-comparison.ts \
  assemble scripts/raw-swarm/out/goblin-warrior-skeleton-tracer-execution-assembly.json \
  scripts/raw-swarm/out/goblin-warrior-skeleton-tracer-execution-measurement.json

mise exec -- pnpm exec tsx scripts/raw-swarm/performance-comparison.ts \
  compare-complete scripts/raw-swarm/out/baseline-measurement.json \
  scripts/raw-swarm/out/candidate-measurement.json \
  scripts/raw-swarm/out/complete-path-comparison.json
```

The assemble operation rejects v1 ledgers, missing or malformed recognized
invocation events, omitted phase authorities, mismatched event hashes, and
scenario or review identities that disagree with the retained stage plan and
findings. Do not wrap the historical open-grid-wolf-skeleton-pursuit footer in this
schema: its missing authorities remain unavailable. `compare-complete` reads
and validates both measurements before retaining their equivalence result, and
also refuses to overwrite an existing comparison.

Recording requires a clean revision and refuses to overwrite prior evidence:

```sh
SCENARIO=goblin-warrior-skeleton-tracer
EXECUTION=goblin-skeleton-tracer-execution
EVIDENCE=goblin-skeleton-tracer-evidence
CAMPAIGN_EVIDENCE=<campaign-evidence-set-id>
export RAW_SWARM_EXPECTED_GIT_SHA=$(git rev-parse HEAD)

mise exec -- pnpm raw-swarm:model:trial -- sdk-player \
  "$SCENARIO" --execution-id "$EXECUTION" --evidence-set-id "$EVIDENCE"

# The standard Codex worker environment does not currently provide the Linux
# filesystem isolation required by the preferred profile. The runner proves
# that capability at startup and otherwise requires this explicit fallback:
mise exec -- pnpm raw-swarm:model:trial -- sdk-player \
  "$SCENARIO" --execution-id "$EXECUTION" --evidence-set-id "$EVIDENCE" \
  --instructional-isolation

# Record another controlled Execution of the same immutable Scenario without
# overwriting its earlier Evidence Set. Each identity is supplied explicitly.
mise exec -- pnpm raw-swarm:model:trial -- sdk-player \
  "$SCENARIO" --execution-id goblin-skeleton-tracer-execution-two \
  --evidence-set-id goblin-skeleton-tracer-evidence-two \
  --instructional-isolation

mise exec -- pnpm exec tsx scripts/raw-swarm/replay-sdk-player.ts \
  "scripts/raw-swarm/out/$EVIDENCE"

# Replay also retains evidence/replay-result.json. It hash-links the exact
# transcript and replay supervisor, records the exact matched SDK call count,
# and is immutable once written.

mise exec -- pnpm exec tsx scripts/raw-swarm/report.ts ingest \
  "scripts/raw-swarm/out/$EVIDENCE/evidence/sdk-calls.jsonl" \
  --db scripts/raw-swarm/out/player-swarm.db
```

### Execution findings and human audit

The direct-SDK runner first emits an immutable
`evidence/findings-checkpoint.json` when it retains a transcript. This
checkpoint covers the Execution, setup, player, and retained evidence that exists at
the runner boundary; it is deliberately not the final review projection.
After the transcript and any review have been imported, project the canonical
bounded Execution audit. The canonical projection contains only stable Execution identity,
hashes of the evidence authorities, classified findings, and exact pointers;
the transcript, model events, and review remain the authorities. Review,
scenario-review, and generation-ledger inputs may be repeated when they are
retained outside the Evidence Set directory. The final `findings.json` is immutable
once written, so later review rounds cannot silently replace it.

```sh
# Run and import the independent whole-trace review first.
mise exec -- pnpm raw-swarm:model:trial -- post-play-review \
  scripts/raw-swarm/reviews/sdk-player.prompt.txt \
  "scripts/raw-swarm/out/$EVIDENCE/evidence/sdk-calls.jsonl" \
  "scripts/raw-swarm/out/$EVIDENCE/review/sdk-review.json" \
  "scripts/raw-swarm/out/$EVIDENCE/review/sdk-review-agent.log"

mise exec -- pnpm exec tsx scripts/raw-swarm/report.ts review \
  "scripts/raw-swarm/out/$EVIDENCE/review/sdk-review.json" \
  --execution-row <sqlite-execution-row-id> --db scripts/raw-swarm/out/player-swarm.db

# Resolve every promoted issue fingerprint before finalization. Repeat the
# link command for each retained unlinked fingerprint that warrants an issue.
mise exec -- pnpm exec tsx scripts/raw-swarm/report.ts issues \
  --db scripts/raw-swarm/out/player-swarm.db --unlinked
mise exec -- pnpm exec tsx scripts/raw-swarm/report.ts link-github-issue \
  --db scripts/raw-swarm/out/player-swarm.db \
  --fingerprint <sha256> --github-issue <number>

# Finalize only after all review rounds have been imported and linked.
mise exec -- pnpm exec tsx scripts/raw-swarm/report.ts findings \
  "scripts/raw-swarm/out/$EVIDENCE/evidence/sdk-calls.jsonl" \
  --db scripts/raw-swarm/out/player-swarm.db \
  --review "scripts/raw-swarm/out/$EVIDENCE/review/sdk-review.json" \
  --generation-ledger "scripts/raw-swarm/out/$CAMPAIGN_EVIDENCE/generation-invocations.jsonl" \
  --review-replay-milestone "scripts/raw-swarm/out/$CAMPAIGN_EVIDENCE/generation-invocations-review-inputs/scenarioCompositeReview-MILESTONE.json" \
  --review-replay-final "scripts/raw-swarm/out/$CAMPAIGN_EVIDENCE/generation-invocations-review-inputs/scenarioCompositeReview-FINAL.json" \
  --render "scripts/raw-swarm/out/$EVIDENCE-execution-audit.md"

# Render later from the same hash-linked indexed projection.
mise exec -- pnpm exec tsx scripts/raw-swarm/report.ts audit \
  --execution-row <sqlite-execution-row-id> \
  --db scripts/raw-swarm/out/player-swarm.db
```

The optional named --review-replay-milestone and --review-replay-final inputs
are the two original composite-review
envelopes, not new model invocations. When supplied, the pair must contain
exactly one milestone and one final envelope. Each envelope must match one
historical v2 or current v4 `scenarioCompositeReview` row in the supplied
generation ledger by invocation id, model, reasoning effort, scenario, and Git
identity. The sibling `campaign.json` manifest is required for this replay
boundary and supplies the expected Campaign, Evidence Set, and planned
Scenario identity; a missing or malformed manifest rejects replay. A
historical schema-2 envelope may use an exact v2 row (or a
migrated v4 row) and retains only admitted Scenario identity; a current
schema-3 Candidate envelope requires the matching v4 lifecycle subject,
including its Candidate, Campaign, Evidence Set, and planned Scenario. The
milestone envelope binds to the Candidate reviewed at that milestone; only
the final envelope must bind its Candidate source hash to the admitted
Scenario. Their bytes become
replay-milestone and replay-final authorities in the findings projection;
their adjacent retained event streams become
prePlayReviewReplayEvents-milestone/final authorities, and they do not add
ledger rows or duplicate usage totals. A complete current path additionally
requires the replay-supervisor.mjs and immutable evidence/replay-result.json
authorities produced by replay-sdk-player; the latter must match the Execution
transcript hash, supervisor hash, and exact SDK call count. Complete-path
assembly allows one or more generation invocations interleaved with the
milestone/final composite reviews within the pre-play admission group, while
later authoring, player, and post-play stages remain ordered.

The findings projection records generation rejection, character/setup
obstruction, pre-call compilation/runtime failure, malformed submissions and
successful corrections, accepted-call review verdicts, and promoted issue
fingerprints when those authorities are supplied. A GitHub issue number is
included when the corresponding indexed fingerprint is already linked. SQLite
stores finding metadata and the projection artifact reference, never complete
sessions, SDK results, transcripts, or model event logs. Every external
authority supplied to the projection is also registered as a hash-linked execution
artifact, so portable export retains the review, scenario-review, and
generation-ledger files referenced by the projection. `audit` reads the
indexed projection rather than reconstructing a second report.

Scenario Campaigns also emit a transcript-free projection beneath their
Evidence Set directory. Its `campaign.json` authority supplies the Campaign,
planned Scenario, Evidence Set, Git, and time identities; no fake
SDK transcript is created. The generation runner indexes this projection in
the Scenario Campaign tables of the configured SQLite store (the default is
`scripts/raw-swarm/out/player-swarm.db`). To index or render a retained
projection manually:

```sh
mise exec -- pnpm exec tsx scripts/raw-swarm/report.ts generation-findings \
  "scripts/raw-swarm/out/$CAMPAIGN_EVIDENCE/evidence/findings.json" \
  --db scripts/raw-swarm/out/player-swarm.db

mise exec -- pnpm exec tsx scripts/raw-swarm/report.ts generation-audit \
  --campaign-row <sqlite-campaign-row-id> \
  --db scripts/raw-swarm/out/player-swarm.db
```

The SQLite artifact-index schema is versioned. Opening an older compact index
fails with an inventory/rebuild instruction instead of silently mutating its
format. Preserve or export that older file first; rebuild a current v3 index from the
retained transcripts with `report ingest` (or deliberately discard the old
compact index when its authorities were not retained).

The review launcher shown above first derives `<review-name>.audit.jsonl` and a review
evidence packet at `<review-name>.packet.json`. The packet combines the audit, retained header
evidence without the initial session, current-turn projections, line-numbered
execution artifacts, domain authorities, and scenario-selected local SRD passages.
It is capped at 900 KiB and is supplied directly as one review turn; exceeding
the cap is a precise failure, never truncation. Commands and tools invalidate
that measured invocation, preventing a second accumulating turn from replacing
the review result. Exact-sequence extraction is a separate retained
operator drill-down. A review consuming extracted records is another measured
invocation rather than an invisible extension of the scenario review.

Following the repository-wide entity-naming rule in
[`AGENTS.md`](../../AGENTS.md), this workflow uses the role or contract names
scenario reviewer, review evidence packet, review result, and one-turn review
invocation. Size, age, and comparison adjectives describe measurements or
historical evidence; they do not create alternate workflow entities.

To inspect an omitted exact result, extract only named sequences and then
attach both the exact records and their provenance to the imported review:

```sh
mise exec -- pnpm exec tsx scripts/raw-swarm/sdk-player/sdk-audit-cli.ts \
  extract scripts/raw-swarm/out/example-sdk-review.audit.jsonl \
  scripts/raw-swarm/out/example-review-records.jsonl \
  scripts/raw-swarm/out/example-review-provenance.json 12 47

# After relocating a portable export, supply its hash-linked artifacts rather
# than the original paths recorded in the audit header.
mise exec -- pnpm exec tsx scripts/raw-swarm/sdk-player/sdk-audit-cli.ts \
  extract portable/artifacts/<audit>.jsonl records.jsonl provenance.json \
  --transcript-artifact portable/artifacts/<transcript>.jsonl \
  --replay-supervisor-artifact portable/artifacts/<supervisor>.mjs 12 47

mise exec -- pnpm exec tsx scripts/raw-swarm/report.ts drilldown \
  scripts/raw-swarm/out/example-review-records.jsonl \
  scripts/raw-swarm/out/example-review-provenance.json \
  --review <review-id> --db scripts/raw-swarm/out/player-swarm.db
```

The runner prefers a Codex permission profile that grants only minimal runtime
reads and write access to the scratch consumer. The standard Codex worker
environment currently lacks the Linux filesystem-isolation capability needed
by that profile. The startup probe is the authority for this capability; do not
infer support merely from the host or CLI version. When the probe fails, the
runner refuses to proceed unless the operator appends
`--instructional-isolation`; the transcript header records
`instructionalFallback`, and the prompt forbids reading outside scratch. The
profile probe checks that the agent shell can write scratch but cannot read
a known repository file. The distribution test checks the intentionally
provided files. Neither claim turns submitted TypeScript into untrusted code;
that is deliberately outside this game-testing prototype.

Retained evidence lives under the explicitly supplied
`scripts/raw-swarm/out/<evidence-set-id>/`. Every outcome retains
`SCENARIO.md`, `SCENARIO_REVIEW.json`, the replay bundle, canonical SDK JSONL,
and the reached authored sources. Ready character composition adds its sheet
projection and setup source; ready setup adds the append-only program and
frozen-prefix facts. Player execution retains only the log, observations, and
attempts actually reached, while completed execution also has the final message
and conclusion. Terminal character/setup obstructions intentionally omit later
artifacts. The disposable compiler and
declaration distribution remains in the deleted scratch directory.

Run the focused executable gate with:

```sh
mise exec -- pnpm check:raw-swarm-deterministic
```

## Run the existing MCP prototype

The scenario id names a committed prompt at
`freeplay/<scenario-id>.prompt.txt`. The launcher derives default transcript
and agent-log paths from the same id:

```sh
SCENARIO=freeplay-001-goblin-warrior-vs-skeleton
export RAW_SWARM_EXPECTED_GIT_SHA=$(git rev-parse HEAD)

mise exec -- pnpm raw-swarm:model:trial -- freeplay "$SCENARIO"

mise exec -- pnpm exec tsx scripts/raw-swarm/replay-freeplay.ts \
  "scripts/raw-swarm/out/$SCENARIO-transcript.jsonl"

mise exec -- pnpm exec tsx scripts/raw-swarm/report.ts ingest \
  "scripts/raw-swarm/out/$SCENARIO-transcript.jsonl" \
  --db scripts/raw-swarm/out/player-swarm.db
```

`run-freeplay.ts` pins the model, reasoning effort, sandbox, MCP server, and
recording policy in one place. The scenario id also fixes the prompt,
transcript, agent-log, and reviewer-prompt naming convention so later steps
cannot silently inspect another Execution. Agent choices are intentionally
nondeterministic; the recorded calls are the deterministic replay input.
Recording requires a clean worktree so the recorded Git SHA identifies all
tested code. Replay also requires that exact revision to be checked out.

Run the committed adversarial review and import it as one review round:

```sh
mise exec -- pnpm raw-swarm:model:trial -- post-play-review \
  "scripts/raw-swarm/reviews/$SCENARIO.prompt.txt" \
  "scripts/raw-swarm/out/$SCENARIO-transcript.jsonl" \
  "scripts/raw-swarm/out/$SCENARIO-review.json" \
  "scripts/raw-swarm/out/$SCENARIO-review-agent.log"

mise exec -- pnpm exec tsx scripts/raw-swarm/report.ts review \
  "scripts/raw-swarm/out/$SCENARIO-review.json" \
  --execution-row <sqlite-execution-row-id> --db scripts/raw-swarm/out/player-swarm.db
```

The reviewer uses only `.references/srd-5.2.1/` as RAW authority and consults
`ASSUMPTIONS.md` for registered ambiguity choices. `run-raw-review.sh` first
requires the clean revision recorded by the transcript, then validates the
result against JSON Schema generated from the same Effect codec used by
report ingestion. The reviewer process uses `danger-full-access` because a
nested Codex read-only sandbox cannot initialize in the worker environment.
Read-only behavior is therefore an explicit reviewer-instruction contract, not
a filesystem-enforced sandbox guarantee. Fixed-benchmark preparation uses the
same contract on hosts without nested sandbox support: each call receives a
complete scratch workspace, and retained first-party telemetry must contain
only the closed set of named-file read commands before the Execution is admissible.

## Add width to the existing MCP prototype

The following steps extend the checked-in MCP experiment only. They are useful
for another immediate Execution, but do not replace or redefine the target SDK-player
workflow above. Do not widen MCP solely to implement that target; begin from the
external-consumer and battle-session supervisor requirements in
[Execute through the public SDK](#execute-through-the-public-sdk).

Do not create JSON commands, mechanic recipes, an expectation language, or a
generic sequencing DSL. Add another player experiment like this:

1. Pick one meaningful build, battle, or interaction and read its relevant
   local SRD passages before authoring the prompt.
2. Choose a lowercase hyphenated scenario id and add
   `freeplay/<scenario-id>.prompt.txt`. Describe the setup and player/DM goal;
   do not prescribe internal SDK calls or declare the outcome the agent must
   obtain.
3. Run `pnpm raw-swarm:model:trial -- freeplay <scenario-id>`, replay the
   transcript, and ingest it.
4. Add `reviews/<scenario-id>.prompt.txt` that tries to falsify the whole trace,
   then run and import the review.
5. Inspect the summary and unlinked bug observations. Classify every non-pass as
   described in [Finding and bug lifecycle](#finding-and-bug-lifecycle).
6. When a finding is actionable, put the smallest deterministic regression at
   its canonical SDK or adapter owner while fixing it. Confirm with a fresh
   player Execution and review.

Prefer width over a Cartesian product. A new prompt should add one useful source
of surprise, such as a different character build, act family, pending-hole
sequence, outcome, turn position, combatant origin, or malformed/stale player
choice.

The current MCP prototype exposes content discovery and battle tools. Character
build exploration through this prototype therefore requires widening that MCP
interaction surface to the canonical character SDK tools. Reuse their existing
tool definitions, codecs, and handlers; do not model builds in the harness. In
this prototype, MCP is the means by which the player agent reaches SDK
capabilities, so adding a capability means surfacing the owning SDK operation,
not inventing a scenario instruction for it.

## Evidence tools

### Player transcript recording and replay

`mcp-recording-shim.ts` starts `battle-slice-server.ts`, bridges MCP stdio, and
records each newline-delimited JSON-RPC message as `{seq, direction, message}`.
Unparseable lines are still forwarded and recorded explicitly. The transcript
header carries the scenario id, tested Git SHA, and start time.

`replay-freeplay.ts` pairs every recorded `tools/call` with its response,
replays the calls through a fresh in-process MCP protocol server and client,
and compares canonical response hashes. Recorded process-lifetime Play Session
handles are supplied to the canonical protocol registry so routed calls remain
verbatim. It proves determinism of the concrete recorded interaction when
replayed from its recorded clean revision; rerunning the agent can legitimately
choose a different path.

```sh
mise exec -- pnpm exec tsx scripts/raw-swarm/mcp-recording-shim.ts \
  --transcript scripts/raw-swarm/out/example-transcript.jsonl \
  --scenario example
```

### MCP schema boundary

The canonical production SDK schemas remain `BattleSubjectSchema` and
`BattleFillSchema` in `@dnd/battle-runtime`; SDK callers construct and receive
typed `BattleSubject` and `BattleFill` values.

The production MCP wire contract for `fill_battle_hole` and
`resolve_battle_act` uses JSON-text envelopes (`subjectJson` and `fillJson`) to
keep `tools/list` below cold-client limits. The MCP boundary immediately applies
`Schema.parseJson(BattleSubjectSchema)` and `Schema.parseJson(BattleFillSchema)`,
so typed handlers receive only decoded SDK values. The inner schema is not
weakened; only its MCP representation is size-bounded.

The swarm server also omits optional `outputSchema` metadata from its exposed
tools because repeated battle result codecs make cold registration too large.
Runtime results are still encoded and validated by the canonical Effect codecs.
The normal production MCP server continues to publish its codec-derived output
schemas. `battle-slice-tools.test.ts` gates the swarm tool list size and input
schema identity.

`end_battle.closedAt` is the SDK's canonical Initiative position:
`roundReached` and `activeTurnActorId`. Report it as “Battle session closed
during round N, during X's turn.” Session closure does not prove the RAW reason
combat ended, the highest round reached is not elapsed duration, and it must not
be converted to seconds. The reviewer checks the concrete facts recorded when
the Table ended combat.

### SQLite report store

`report.ts` creates a WAL-mode SQLite store on first use. The store is a
searchable index, not a second archive of complete sessions, transcripts, or
agent logs. It retains Execution identity, sequence and operation metadata, hashes,
derived review facts, verdicts, issue links, and paths to immutable hash-linked
evidence files. A portable copy is an explicit export containing the database
and every referenced artifact. Its snapshot rewrites artifact paths to
bundle-relative content-addressed paths, so the directory remains resolvable
after relocation; copying the database alone is not an evidence backup.

```sh
# Inventory and rebuild the pre-index database without mutating it. The command
# prints one tagged JSON result: `supported` identifies either the historical
# transcriptPath source or a v1/v2/v3 hash-linked artifact index, while each entry
# remains `artifactBacked`, `inconsistent`, or `databaseOnly`.
mise exec -- pnpm exec tsx scripts/raw-swarm/report.ts legacy-inventory \
  --legacy-db scripts/raw-swarm/out/player-swarm-legacy.db
mise exec -- pnpm exec tsx scripts/raw-swarm/report.ts rebuild-index \
  --legacy-db scripts/raw-swarm/out/player-swarm-legacy.db \
  --db scripts/raw-swarm/out/player-swarm.db \
  --artifacts scripts/raw-swarm/out/raw-swarm-artifacts

# Produce a consistent snapshot plus every referenced immutable artifact.
mise exec -- pnpm exec tsx scripts/raw-swarm/report.ts export \
  --db scripts/raw-swarm/out/player-swarm.db \
  --destination scripts/raw-swarm/out/player-swarm-portable

# First concatenate the comparable phase ledgers in execution order. Each entry
# carries the scenario/Git identity and the SHA-256 of its retained Codex event
# stream; the evidence command rejects missing, substituted, or unrelated
# streams. The post-play stream must also prove the no-tools policy and produce
# the exact retained review JSON.
{
  jq -c 'select(.phase == "scenarioCompositeReview")' \
    scripts/raw-swarm/out/$CAMPAIGN_EVIDENCE/generation-invocations.jsonl
  cat scripts/raw-swarm/out/$EVIDENCE/evidence/invocations.jsonl
  cat scripts/raw-swarm/out/$EVIDENCE/review/sdk-review.invocations.jsonl
} > scripts/raw-swarm/out/$EVIDENCE/review/controlled-invocations.jsonl

# Bind the transcript, review, audit, packet, exact source/replay inputs,
# ledger, and each event stream before reporting or performance comparison.
mise exec -- pnpm exec tsx scripts/raw-swarm/review-invocation-evidence.ts \
  create \
  scripts/raw-swarm/out/$EVIDENCE/evidence/sdk-calls.jsonl \
  scripts/raw-swarm/out/$EVIDENCE/review/sdk-review.json \
  scripts/raw-swarm/out/$EVIDENCE/review/sdk-review.audit.jsonl \
  scripts/raw-swarm/out/$EVIDENCE/review/sdk-review.packet.json \
  scripts/raw-swarm/out/$EVIDENCE/review/review-invocation-evidence.json \
  "$MILESTONE_SOURCE_INPUT" \
  "$MILESTONE_REPLAY_INPUT" \
  "$FINAL_SOURCE_INPUT" \
  "$FINAL_REPLAY_INPUT" \
  scripts/raw-swarm/out/$EVIDENCE/review/controlled-invocations.jsonl \
  scripts/raw-swarm/out/$CAMPAIGN_EVIDENCE/generation-invocations-review-inputs/*.events.jsonl \
  scripts/raw-swarm/out/$EVIDENCE/evidence/player-events.jsonl \
  scripts/raw-swarm/out/$EVIDENCE/review/sdk-review-agent.log.events.jsonl

# For controlled evidence, time the actual reporting work. This operation owns
# the timing artifact; callers do not supply an elapsed duration. It refuses a
# transcript or review outside the hash-linked invocation evidence.
mise exec -- pnpm exec tsx scripts/raw-swarm/report.ts controlled-reporting \
  scripts/raw-swarm/out/$EVIDENCE/evidence/sdk-calls.jsonl \
  scripts/raw-swarm/out/$EVIDENCE/review/sdk-review.json \
  --db scripts/raw-swarm/out/$EVIDENCE/review/controlled-index.db \
  --destination scripts/raw-swarm/out/$EVIDENCE/review/controlled-portable \
  --timing scripts/raw-swarm/out/$EVIDENCE/review/controlled-portable/reporting-timing.json \
  --review-invocation-evidence \
  scripts/raw-swarm/out/$EVIDENCE/review/review-invocation-evidence.json

# Summarize controlled telemetry and compare it with retained legacy evidence.
mise exec -- pnpm exec tsx scripts/raw-swarm/performance-comparison.ts \
  summarize scripts/raw-swarm/out/fresh-performance-input.json \
  scripts/raw-swarm/out/fresh-performance.json
mise exec -- pnpm exec tsx scripts/raw-swarm/performance-comparison.ts \
  compare-legacy scripts/raw-swarm/out/fixed-legacy-performance.json \
  scripts/raw-swarm/out/fresh-performance.json \
  scripts/raw-swarm/out/performance-comparison.json

# separate current Execution and historical-observation counts and verdicts
mise exec -- pnpm exec tsx scripts/raw-swarm/report.ts summary \
  --db scripts/raw-swarm/out/player-swarm.db

# all, unlinked, or linked issue observations as JSONL
mise exec -- pnpm exec tsx scripts/raw-swarm/report.ts issues \
  --db scripts/raw-swarm/out/player-swarm.db
mise exec -- pnpm exec tsx scripts/raw-swarm/report.ts issues \
  --db scripts/raw-swarm/out/player-swarm.db --unlinked
mise exec -- pnpm exec tsx scripts/raw-swarm/report.ts issues \
  --db scripts/raw-swarm/out/player-swarm.db --linked
```

Legacy rebuild classifies each historical observation and review as `artifactBacked`,
`inconsistent`, or `databaseOnly`. It never mutates the legacy database. The
rebuilt index stores an exact hash-linked export of every legacy table before
projecting recoverable transcripts and reviews; database-only rows remain in
the export and explicit inventory rather than disappearing or blocking the
recoverable index. A v1/v2/v3 hash-linked artifact index is already a compact
evidence store; `legacy-inventory` inspects it read-only, while `rebuild-index`
continues to accept only the historical transcriptPath source.

Verdict classes are `bug`, `adapter-defect`, `unsupported-capability`,
`assumption-divergence`, `corpus-ambiguity`, `scenario-invalid`,
`player-invalid`, `reviewer-error`, and `pass`.

## Finding and bug lifecycle

Hash-linked execution artifacts own immutable execution and review evidence. SQLite
owns their searchable index and immutable verdict records. GitHub Issues owns
triage, assignment, priority, discussion, and open/closed status, as required by
[`docs/agents/issue-tracker.md`](../../docs/agents/issue-tracker.md). Do not
delete an SQLite issue to represent a fix, and do not add a second local
open/closed status that can disagree with GitHub.

Pure tactical-space limits and geometry expansion remain experiment-boundary
findings. They are not silently promoted to runtime or public-API work. The
following existing tickets are explicitly independent of that geometry
classification: [#279](https://github.com/dearlordylord/5e-quint/issues/279)
(per-test Table circumstance decisions),
[#283](https://github.com/dearlordylord/5e-quint/issues/283) (ordinary-object
targeting), [#284](https://github.com/dearlordylord/5e-quint/issues/284)
(Cover's attack-AC consequence), and
[#286](https://github.com/dearlordylord/5e-quint/issues/286) (canonical public
spatial-witness shape). Those tickets remain rules or SDK work even when a
scenario happens to mention spatial facts.

Every verdict remains immutable Execution evidence. For each non-pass verdict, first
classify and disposition it:

1. Inspect the transcript sequence and local RAW evidence. Classify it as an SDK
   bug, adapter bug, unsupported capability, invalid scenario, invalid player
   decision, reviewer error, or corpus ambiguity.
2. Correct invalid setups or reviewer claims in their owning prompt/review.
   Record unsupported capability and corpus ambiguity for the appropriate
   product or corpus decision; do not label them SDK bugs.

Only a reviewer-classified `bug` or `adapter-defect` verdict enters the
remaining bug-observation lifecycle. `report.ts` adds those observations to the
`issues` collection for human triage; this is not independent confirmation.
Other classes remain in the review evidence without an issue fingerprint.

3. Use `report.ts issues` to obtain the bug observation's fingerprint.
   Fingerprints hash the review class and exact claim; triage decides whether
   different wording is one semantic issue.
4. Search existing GitHub Issues. Create one only when no semantic duplicate
   exists. Use the **RAW swarm finding** issue form, which applies `raw-swarm`
   and `bug` labels and requires the fingerprint, SQLite Execution row ID, tested Git SHA,
   transcript sequences, RAW citations, reproduction, expected behavior,
   owning package, and regression level. Put each fingerprint on an exact
   `Raw-Swarm-Fingerprint: <sha256>` line.
5. Link every matching fingerprint:

   ```sh
   mise exec -- pnpm exec tsx scripts/raw-swarm/report.ts \
     link-github-issue --db scripts/raw-swarm/out/player-swarm.db \
     --fingerprint <sha256> --github-issue <number>
   ```

6. Fix the canonical SDK owner unless the defect is specifically in the MCP
   adapter. Add the smallest deterministic regression at that owner.
7. Generate a fresh player Execution and adversarial review for the corrected
   behavior. Preserve the original evidence; replaying an old revision can
   intentionally diverge after a behavior fix.
8. Comment on the GitHub issue with the regression, fix commit, confirming
   Execution/review, and remaining limits, then close it. A recurrence links new
   evidence to the same reopened issue.

SQLite stores only `githubIssueNumber`, not GitHub lifecycle state. Generated
evidence must be retained outside an ephemeral worktree for a long-lived swarm;
confirmed fixes live in committed regression tests.

### Navigate findings in both directions

The `raw-swarm` label is the canonical visual and API collection marker. Exact
fingerprint lines provide reverse lookup from SQLite.

```sh
# visual and programmatic collection views
gh issue list --label raw-swarm --state all --web
gh issue list --label raw-swarm --state all \
  --json number,title,state,url,labels

# SQLite fingerprint -> GitHub issue
gh issue list --state all \
  --search '"Raw-Swarm-Fingerprint: <sha256>" in:body' \
  --json number,title,state,url

# SQLite issue number -> GitHub issue
gh issue view <number> --web
gh issue view <number> --json number,title,state,url,labels,body
```

`link-github-issue` appends and verifies the exact fingerprint backlink and
`raw-swarm` label before writing the issue number to SQLite. Failed updates stay
unlinked and can be retried. Multiple fingerprints may point to one semantic
issue; ambiguous relinking is rejected. A per-database workflow lock serializes
local link workers while keeping SQLite transactions short.

## Files

- Direct-SDK tracer: `sdk-player/`, `run-sdk-player.ts`, and
  `replay-sdk-player.ts`.
- Player inputs: `freeplay/` and `run-freeplay.ts`.
- Reviewer inputs: `reviews/` and `run-raw-review.sh`.
- Evidence: `mcp-recording-shim.ts`, `transcript.ts`,
  `replay-freeplay.ts`, and `report.ts`.
- Agent-facing SDK interaction: `battle-slice-server.ts` and
  `battle-slice-tools.ts`.
- Generated evidence: `out/` (gitignored).
