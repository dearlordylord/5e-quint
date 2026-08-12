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

This section specifies the intended workflow. It is not a claim that the
checked-in prototype already implements scenario generation or direct SDK play.

### Generate battle scenarios as prose

Scenario generation is an offline authoring process, separate from battle
execution. A generation campaign supplies a broad distribution preference,
such as mostly exploratory character choices with a few tightly constrained
edge cases. It must bias toward battles, attempts to win, and materially
different strategies rather than plots or storytelling.

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
cannot stop before the minimum. After the minimum, an independent readiness
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
its own sake. Every represented combatant or group has a serious objective to
win. A scenario may give any strategy-bearing brief an initial approach, but
must permit strategies to change as the battle develops. When one agent
controls conflicting roles, it must pursue each brief faithfully rather than
collapsing them into one cooperative strategy.

At selected generation milestones, an independent RAW reviewer classifies the
accumulated prose against the local SRD and the registered ambiguity decisions
in [`ASSUMPTIONS.md`](../../ASSUMPTIONS.md) for legality, coherence, and
executability. It reports contradictions and unsupported assumptions without
choosing tactics, predicting a winner, or silently rewriting the scenario. Its
critique becomes input to a later generation iteration. A final review happens
before play. The RAW classification remains distinct from the campaign's
decision to admit a scenario for play.

An impossible or partially unsupported scenario can still be valuable evidence.
After preserving the RAW reviewer's unsupported or contradictory verdict, the
campaign may admit the scenario when attempting it could reveal an SDK
capability gap or unclear interaction boundary rather than mere nonsense. The
player must make a serious attempt, use the closest legal path when appropriate,
and report where progress became impossible. It must not fabricate support or
force an unavailable outcome.

A final scenario is one prose document. It may contain a public setup and
controller-specific briefs. Separate opposing agents receive the public setup
and only their own brief; a single agent controlling every combatant may receive
the whole document. These prose sections do not constitute a scenario DSL.

### Execute through the public SDK

The intended primary player is an isolated external SDK consumer, not an agent
with repository knowledge. Give it a scratch project containing the built
public SDK, public type declarations, user documentation, and the final scenario
prose. Do not expose implementation source or internal tests. The agent writes
and runs ordinary TypeScript against canonical SDK operations and types.

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
  "scripts/raw-swarm/out/$SCENARIO-review.json" \
  "scripts/raw-swarm/out/$SCENARIO-review-agent.log"

mise exec -- pnpm exec tsx scripts/raw-swarm/report.ts review \
  "scripts/raw-swarm/out/$SCENARIO-review.json" \
  --run <run-id> --db scripts/raw-swarm/out/player-swarm.db
```

The reviewer uses only `.references/srd-5.2.1/` as RAW authority and consults
`ASSUMPTIONS.md` for registered ambiguity choices. `run-raw-review.sh` validates
the result against JSON Schema generated from the same Effect codec used by
report ingestion. The reviewer process uses `danger-full-access` because a
nested Codex read-only sandbox cannot initialize in the worker environment.
Read-only behavior is therefore an explicit reviewer-instruction contract, not
a filesystem-enforced sandbox guarantee.

## Add width to the existing MCP prototype

The following steps extend the checked-in MCP experiment only. They are useful
for another immediate run, but do not replace or redefine the target SDK-player
workflow above. Do not widen MCP solely to implement that target; begin from the
isolated external SDK consumer and battle-session supervisor requirements in
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
weakened; only its MCP representation is compact.

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
be converted to seconds. The reviewer determines when and why combat ended.

### SQLite report store

`report.ts` creates a WAL-mode SQLite store on first use.

```sh
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

Verdict classes are `bug`, `assumption-divergence`, `corpus-ambiguity`,
`scenario-invalid`, `reviewer-error`, and `pass`.

## Finding and bug lifecycle

SQLite owns immutable execution and review evidence. GitHub Issues owns triage,
assignment, priority, discussion, and open/closed status, as required by
[`docs/agents/issue-tracker.md`](../../docs/agents/issue-tracker.md). Do not
delete an SQLite issue to represent a fix, and do not add a second local
open/closed status that can disagree with GitHub.

Every verdict remains immutable run evidence. For each non-pass verdict, first
classify and disposition it:

1. Inspect the transcript sequence and local RAW evidence. Classify it as an SDK
   bug, MCP-adapter bug, unsupported capability, invalid player setup/reviewer
   claim, or corpus ambiguity.
2. Correct invalid setups or reviewer claims in their owning prompt/review.
   Record unsupported capability and corpus ambiguity for the appropriate
   product or corpus decision; do not label them SDK bugs.

Only a reviewer-classified `bug` verdict enters the remaining bug-observation
lifecycle. `report.ts` adds those observations to the `issues` collection for
human triage; this is not independent confirmation. Other classes remain in the
review evidence without an issue fingerprint.

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

- Player inputs: `freeplay/` and `run-freeplay.ts`.
- Reviewer inputs: `reviews/` and `run-raw-review.sh`.
- Evidence: `mcp-recording-shim.ts`, `transcript.ts`,
  `replay-freeplay.ts`, and `report.ts`.
- Agent-facing SDK interaction: `battle-slice-server.ts` and
  `battle-slice-tools.ts`.
- Generated evidence: `out/` (gitignored).
