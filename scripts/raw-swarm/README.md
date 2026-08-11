# RAW player swarm

Uses agents pretending to be players and DMs to discover gaps in the D&D 5e
SRD 5.2.1 adjudicator SDK. The harness records their real interactions, replays
the exact calls, and stores adversarial RAW findings in SQLite.

## Architecture

The SDK is the system under test. The player agent operates it through MCP
because MCP gives an untrusted agent a discoverable, typed interaction surface.
This also tests the MCP adapter, but adapter coverage is a consequence rather
than the purpose. Review findings must distinguish an SDK rules defect from an
MCP projection or decoding defect.

There is no scenario interpreter and no second D&D command vocabulary. The
only authored input is a natural-language player/DM prompt. During play, the
agent chooses from the SDK's canonical surfaced acts and holes. The recorder
captures the resulting concrete MCP calls and full responses; replay executes
those calls verbatim and does not ask an agent to make the same choices again.

Ordinary package integration and regression tests remain the deterministic
regression layer for known claims. The swarm adds discovery:

1. a player/DM agent explores a build, battle, or interaction;
2. the recorder preserves everything it actually tried and observed;
3. an adversarial reviewer checks the whole trace against local RAW;
4. an actionable discovery becomes an ordinary SDK or adapter regression and
   a linked GitHub issue.

The regression preserves the discovery. It does not drive or guide later
player agents.

Run commands under mise-managed Node 24 from the worktree root:

```sh
mise exec -- <command>
```

Generated transcripts, agent logs, review output, and SQLite databases belong
under `scripts/raw-swarm/out/` and are gitignored.

## Run the existing player scenario

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
report ingestion.

## Add discovery width

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

The current swarm server exposes content discovery and battle tools. Character
build exploration therefore requires widening that MCP interaction surface to
the canonical character SDK tools. Reuse their existing tool definitions,
codecs, and handlers; do not model builds in the harness. MCP is the means by
which the player agent reaches SDK capabilities, so adding a capability means
surfacing the owning SDK operation, not inventing a scenario instruction for it.

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
