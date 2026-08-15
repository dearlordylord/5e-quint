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
runtime session with canonical five-foot arena/current-placement snapshots and
table-owned illumination and scenario-object facts. Multiple battle controllers and branching
remain later workflow increments. Missing capability is reported as an
obstruction rather than modeled in a harness language.

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

Generation has campaign-configured minimum and maximum iteration counts. It
cannot stop before the minimum or before every configured review milestone.
After both boundaries, an independent readiness
reviewer decides whether the scenario has a mechanically meaningful setup,
enough strategic substance in every strategy-bearing brief, and the campaign's
requested balance of fixed and delegated choices. A ready decision stops
generation; a critique continues it. Reaching the maximum also stops generation
and sends the result to final review. Readiness output is disposable generation
material, not part of the final scenario. These bounds and decisions are
authoring control, not scenario stages or domain states.

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
content-availability, SDK-capability, and artifact-policy assessments. The RAW
assessment classifies the accumulated prose against the local SRD and the
registered ambiguity decisions in [`ASSUMPTIONS.md`](../../ASSUMPTIONS.md) for
legality, coherence, and executability. The content assessment compares
authored canonical identities with the supplied catalog and explicit campaign
intent. The SDK assessment compares the scenario with the current public
consumer documentation. Keeping the reported responsibilities separate keeps
“RAW-supported,” “available in this product profile,” and “representable
through the current SDK” distinct without paying for four model conversations.
The
SDK review does not use historical run verdicts as a permanent blacklist: when
the public SDK and its documentation gain a capability, the next review sees it
as supported, so ordinary generation can use it and an obsolete capability
probe is rejected. These reviewers report problems without choosing tactics,
declaring an outcome, or silently rewriting the scenario, and their critiques
become input to a later generation iteration. Final RAW, content,
SDK-capability, and policy reviews happen before play.

Generation uses the Sol model at medium reasoning. Readiness uses Luna at max
reasoning. The four generation-review responsibilities share one Luna
invocation at max reasoning and remain separate report sections, not concurrent
voters or scenario domain roles. The post-play adversarial review remains an
independent invocation.

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
D&D scenario model. It contains only the distribution preference, explicit
content-availability and SDK-capability intents, iteration bounds, candidate
count, review milestones, and whether a reviewed RAW-unsupported result may be
admitted.
Start from
[`scenario-campaign.example.json`](scenario-campaign.example.json), then run
from a clean revision:

```sh
mise exec -- pnpm exec tsx scripts/raw-swarm/generate-scenario.ts \
  scripts/raw-swarm/scenario-campaign.example.json
```

The command refuses to overwrite either output. It retains only the selected
final prose and its adjacent `.scenario-review.json` as authored scenario
artifacts; candidate batches, random indices, readiness decisions, and agent
process output are discarded. Ignored generation evidence retains the typed
invocation ledger and the exact prompt/result envelope for each composite
milestone and final pre-play review so a controlled review comparison can replay
the same input. Separate final RAW, content-availability, SDK-capability, and
public-artifact policy reviews record the scenario id, clean Git revision,
availability/capability/admission intent, and a hash of the exact final prose
bytes. The command derives both output filenames from the validated scenario
id. Admitted
artifacts go under `sdk-player/scenarios/`; rejected diagnostic output goes
under ignored `out/rejected-scenarios/` and is not playable input.
The review's `reviewScope` states which independent review responsibilities
actually ran. Retained pre-capability-review artifacts remain
`rawContentPolicy`; do not backfill a verdict that was never produced. New
campaigns retain `rawContentSdkCapabilityPolicy` and require the SDK-capability
intent and verdict.

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
SCENARIO=generated-battle-example

mise exec -- pnpm exec tsx scripts/raw-swarm/author-scenario-characters.ts \
  "$SCENARIO"

# Commit the retained character source before the clean-revision setup step.
# If character composition is obstructed, retain that result and skip setup.

mise exec -- pnpm exec tsx scripts/raw-swarm/author-scenario-setup.ts \
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
domain does not model. Record the assignment with the run. For the simple
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

Reuse a controller agent when practical so its strategy has continuity.
Controller agents must not concurrently edit one shared program. The supervisor
seeing all briefs is an accepted instructional boundary for the prototype, not
a claim of secure hidden information.

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

## Run a direct-SDK scenario

The first tracer remains a manually authored Goblin Warrior versus Skeleton
scenario. Every scenario run starts from adjacent `.md` prose, admitted
`.scenario-review.json`, and controller-owned `.characters.ts` files. A ready
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

An obstructed character composition or setup is a successful diagnostic run,
not a failed or fabricated battle. The runner retains the available authored
source and a call-free transcript, does
not launch the player, and supports the same replay, report ingestion, and
whole-trace review flow.

The agent edits ordinary TypeScript inside the continuation. The supervisor
requires every canonical SDK operation to consume the one current session,
advances that cursor from the returned result, and accepts only that latest
session in the continuation outcome. It records complete JSON evidence
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
not the default reviewer context. Reviewers should receive a bounded derived
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
records first-party model usage when available, while
`evidence/supervisor-timings.jsonl` separates continuation typechecking,
prior-call verification/replay, new SDK execution, and evidence writes.
`performance-comparison.ts summarize` combines those records with typed model
invocation ledgers. Its descriptor names the authoritative transcript, ledger
paths, supervisor timing path, and a versioned reporting-timing artifact;
scenario identity and call and
continuation counts are derived from that transcript. The summary reports
the scenario-review, character, and setup hashes as part of the comparison
identity, so different admitted facts cannot satisfy a same-scenario gate. It reports
whole-path wall time and token totals normalized per invocation, continuation,
and call. It records the byte length and SHA-256 of every source artifact and
refuses a saved summary that no longer recomputes from those exact sources.
`compare-legacy` marks legacy footer token totals as
incomparable with first-party JSON usage instead of claiming a token reduction.
Legacy whole-path wall time is also incomparable because the retained run does
not prove per-phase model identity or invocation counts. Preserve it as an
inventory/size baseline; use controlled reruns for performance acceptance.
Comparable same-scenario evidence gates packet-based post-play review tokens and wall
time at a 50% reduction, comparable-path model tokens and wall time at a 40%
reduction, and player tokens per continuation and call at a 40% reduction.

Recording requires a clean revision and refuses to overwrite prior evidence:

```sh
SCENARIO=tracer-001-goblin-warrior-vs-skeleton

mise exec -- pnpm exec tsx scripts/raw-swarm/run-sdk-player.ts "$SCENARIO"

# The standard Codex worker environment does not currently provide the Linux
# filesystem isolation required by the preferred profile. The runner proves
# that capability at startup and otherwise requires this explicit fallback:
mise exec -- pnpm exec tsx scripts/raw-swarm/run-sdk-player.ts \
  "$SCENARIO" --instructional-isolation

# Record another controlled run of the same immutable scenario without
# overwriting its earlier evidence. The transcript still records SCENARIO as
# its scenario identity; the evidence id names only the output artifact set.
mise exec -- pnpm exec tsx scripts/raw-swarm/run-sdk-player.ts \
  "$SCENARIO" --evidence-id "$SCENARIO-controlled-001" \
  --instructional-isolation

mise exec -- pnpm exec tsx scripts/raw-swarm/replay-sdk-player.ts \
  "scripts/raw-swarm/out/$SCENARIO-sdk-player"

mise exec -- pnpm exec tsx scripts/raw-swarm/report.ts ingest \
  "scripts/raw-swarm/out/$SCENARIO-sdk-player/evidence/sdk-calls.jsonl" \
  --db scripts/raw-swarm/out/player-swarm.db
```

Run and import the independent whole-trace RAW review exactly like the MCP lane:

```sh
mise exec -- scripts/raw-swarm/run-raw-review.sh \
  scripts/raw-swarm/reviews/sdk-player.prompt.txt \
  "scripts/raw-swarm/out/$SCENARIO-sdk-player/evidence/sdk-calls.jsonl" \
  "scripts/raw-swarm/out/$SCENARIO-sdk-review.json" \
  "scripts/raw-swarm/out/$SCENARIO-sdk-review-agent.log"

mise exec -- pnpm exec tsx scripts/raw-swarm/report.ts review \
  "scripts/raw-swarm/out/$SCENARIO-sdk-review.json" \
  --run <run-id> --db scripts/raw-swarm/out/player-swarm.db
```

The review launcher first derives `<review-name>.audit.jsonl` and a bounded
`<review-name>.packet.json`. The packet combines the audit, retained header
evidence without the initial session, current-turn projections, line-numbered
run artifacts, domain authorities, and scenario-selected local SRD passages.
It is capped at 900 KiB and is supplied directly as one review turn; exceeding
the cap is a precise failure, never truncation. Commands and tools invalidate
that measured invocation, preventing a second accumulating turn from replacing
the bounded review product. Exact-sequence extraction is a separate retained
operator drill-down. A review consuming extracted records is another measured
invocation rather than an invisible extension of the packet review.

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

Retained evidence lives under
`scripts/raw-swarm/out/<scenario>-sdk-player/`. Every outcome retains
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
mise exec -- pnpm check:raw-swarm-sdk-player
```

## Run the existing MCP prototype

The scenario id names a committed prompt at
`freeplay/<scenario-id>.prompt.txt`. The launcher derives default transcript
and agent-log paths from the same id:

```sh
SCENARIO=freeplay-001-goblin-warrior-vs-skeleton

mise exec -- pnpm exec tsx scripts/raw-swarm/run-freeplay.ts "$SCENARIO"

mise exec -- pnpm exec tsx scripts/raw-swarm/replay-freeplay.ts \
  "scripts/raw-swarm/out/$SCENARIO-transcript.jsonl"

mise exec -- pnpm exec tsx scripts/raw-swarm/report.ts ingest \
  "scripts/raw-swarm/out/$SCENARIO-transcript.jsonl" \
  --db scripts/raw-swarm/out/player-swarm.db
```

`run-freeplay.ts` pins the model, reasoning effort, sandbox, MCP server, and
recording policy in one place. The scenario id also fixes the prompt,
transcript, agent-log, and reviewer-prompt naming convention so later steps
cannot silently inspect another run. Agent choices are intentionally
nondeterministic; the recorded calls are the deterministic replay input.
Recording requires a clean worktree so the recorded Git SHA identifies all
tested code. Replay also requires that exact revision to be checked out.

Run the committed adversarial review and import it as one review round:

```sh
mise exec -- scripts/raw-swarm/run-raw-review.sh \
  "scripts/raw-swarm/reviews/$SCENARIO.prompt.txt" \
  "scripts/raw-swarm/out/$SCENARIO-transcript.jsonl" \
  "scripts/raw-swarm/out/$SCENARIO-review.json" \
  "scripts/raw-swarm/out/$SCENARIO-review-agent.log"

mise exec -- pnpm exec tsx scripts/raw-swarm/report.ts review \
  "scripts/raw-swarm/out/$SCENARIO-review.json" \
  --run <run-id> --db scripts/raw-swarm/out/player-swarm.db
```

The reviewer uses only `.references/srd-5.2.1/` as RAW authority and consults
`ASSUMPTIONS.md` for registered ambiguity choices. `run-raw-review.sh` first
requires the clean revision recorded by the transcript, then validates the
result against JSON Schema generated from the same Effect codec used by
report ingestion. The reviewer process uses `danger-full-access` because a
nested Codex read-only sandbox cannot initialize in the worker environment.
Read-only behavior is therefore an explicit reviewer-instruction contract, not
a filesystem-enforced sandbox guarantee.

## Add width to the existing MCP prototype

The following steps extend the checked-in MCP experiment only. They are useful
for another immediate run, but do not replace or redefine the target SDK-player
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
3. Run `run-freeplay.ts <scenario-id>`, replay the transcript, and ingest it.
4. Add `reviews/<scenario-id>.prompt.txt` that tries to falsify the whole run,
   then run and import the review.
5. Inspect the summary and unlinked bug observations. Classify every non-pass as
   described in [Finding and bug lifecycle](#finding-and-bug-lifecycle).
6. When a finding is actionable, put the smallest deterministic regression at
   its canonical SDK or adapter owner while fixing it. Confirm with a fresh
   player run and review.

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
replays the calls against a fresh in-process SDK composition root, and compares
canonical response hashes. It proves determinism of the concrete recorded
interaction when replayed from its recorded clean revision; rerunning the agent
can legitimately choose a different path.

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
agent logs. It retains run identity, sequence and operation metadata, hashes,
derived review facts, verdicts, issue links, and paths to immutable hash-linked
evidence files. A portable copy is an explicit export containing the database
and every referenced artifact. Its snapshot rewrites artifact paths to
bundle-relative content-addressed paths, so the directory remains resolvable
after relocation; copying the database alone is not an evidence backup.

```sh
# Inventory and rebuild the pre-index database without mutating it.
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

# For controlled evidence, time the actual reporting work. This operation owns
# the timing artifact; callers do not supply an elapsed duration.
mise exec -- pnpm exec tsx scripts/raw-swarm/report.ts controlled-reporting \
  scripts/raw-swarm/out/$SCENARIO-sdk-player/evidence/sdk-calls.jsonl \
  scripts/raw-swarm/out/$SCENARIO-sdk-review.json \
  --db scripts/raw-swarm/out/$SCENARIO-controlled-index.db \
  --destination scripts/raw-swarm/out/$SCENARIO-controlled-portable \
  --timing scripts/raw-swarm/out/$SCENARIO-controlled-portable/reporting-timing.json

# Summarize controlled telemetry and compare it with retained legacy evidence.
mise exec -- pnpm exec tsx scripts/raw-swarm/performance-comparison.ts \
  summarize scripts/raw-swarm/out/fresh-performance-input.json \
  scripts/raw-swarm/out/fresh-performance.json
mise exec -- pnpm exec tsx scripts/raw-swarm/performance-comparison.ts \
  compare-legacy scripts/raw-swarm/out/fixed-legacy-performance.json \
  scripts/raw-swarm/out/fresh-performance.json \
  scripts/raw-swarm/out/performance-comparison.json

# summary by verdict class
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

Legacy rebuild classifies each run and review as `artifactBacked`,
`inconsistent`, or `databaseOnly`. It never mutates the legacy database. The
rebuilt index stores an exact hash-linked export of every legacy table before
projecting recoverable transcripts and reviews; database-only rows remain in
that export and explicit inventory rather than disappearing or blocking the
recoverable index.

Verdict classes are `bug`, `adapter-defect`, `unsupported-capability`,
`assumption-divergence`, `corpus-ambiguity`, `scenario-invalid`,
`player-invalid`, `reviewer-error`, and `pass`.

## Finding and bug lifecycle

Hash-linked run artifacts own immutable execution and review evidence. SQLite
owns their searchable index and immutable verdict records. GitHub Issues owns
triage, assignment, priority, discussion, and open/closed status, as required by
[`docs/agents/issue-tracker.md`](../../docs/agents/issue-tracker.md). Do not
delete an SQLite issue to represent a fix, and do not add a second local
open/closed status that can disagree with GitHub.

Every verdict remains immutable run evidence. For each non-pass verdict, first
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
   and `bug` labels and requires the fingerprint, run id, tested Git SHA,
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
7. Generate a fresh player run and adversarial review for the corrected
   behavior. Preserve the original evidence; replaying an old revision can
   intentionally diverge after a behavior fix.
8. Comment on the GitHub issue with the regression, fix commit, confirming
   run/review, and remaining limits, then close it. A recurrence links new
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
