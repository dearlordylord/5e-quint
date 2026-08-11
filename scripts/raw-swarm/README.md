# RAW swarm testing harness (slice 1)

Tests the adjudicator SDK for SRD 5.2.1 RAW correctness with agents that emulate
players and DMs. It records deterministic transcripts, replays them, and stores
runs and adversarial findings in SQLite.

## Purpose and boundaries

The adjudicator SDK is the system under test: `@dnd/battle-runtime` and the
character runtime packages composed over Surface content. MCP is an interaction
adapter for agents, not the primary test target. Exercising SDK behavior through
MCP deliberately adds compound coverage of MCP decoding, session storage, and
response projection, but an MCP-only defect and an SDK rules defect must be
classified separately.

Agents can participate in two roles:

- **test author** — write a structured deterministic scenario and expected RAW
  claims, then let a driver execute it;
- **player/DM emulator** — make choices live from the SDK's currently available
  acts and holes, without knowing the implementation.

The first role does not inherently need MCP. A scalable SDK-first swarm may
generate scenario JSON or code against a thin typed SDK driver. This first slice
uses `handleToolCall` even for scripted probes because the existing MCP
composition root was the smallest complete headless facade. Consequently it
tests the SDK through one adapter rather than directly. The freeplay lane uses
MCP because Codex needs a live tool protocol while pretending to be a player or
DM. Neither lane should treat MCP behavior as the RAW oracle.

For later slices, keep the authored scenario vocabulary independent of MCP tool
names and wire shapes. The preferred expansion is one canonical scenario with a
direct typed SDK executor as the primary lane and an optional MCP executor for
adapter parity and live-agent play. Agents may author scenario source, but the
trusted harness accepts only scenario data decoded through its boundary parser;
do not compile arbitrary agent-authored TypeScript into the harness.

Two lanes:

- **scripted probes** — deterministic RAW claims authored as scenario JSON and
  executed in-process through the current MCP composition facade;
- **freeplay** — an external player/DM-emulating agent drives the same SDK
  through an MCP stdio adapter and a byte-transparent recording proxy.

Prerequisite: run everything under mise-managed Node 24 from the worktree
root (see `mise.toml`):

```sh
mise exec -- <command>
```

Generated artifacts (transcripts, SQLite DBs) go under
`scripts/raw-swarm/out/` (gitignored).

## Scripts

### `driver.ts` — scripted probe runner

Executes a scenario JSON: `select_stat_block` for each participant,
`start_battle`, then per script act `discover_battle_acts` → select the act
matching `actSelector` (matched against `label`/`summary` and
`subject.action`/`subject.tag`; if several match, the rolled variant without
`statBlockDamageNotation` is preferred) → `fill_battle_hole` per requested
hole (`targetChoice`, `attackRoll`, `rolledDice`, `attackDamageDisposition`)
or `resolve_battle_act` for no-hole acts → optional `end_turn`. Writes one
JSONL transcript line per tool call (`seq`, `tool`, `args`, `response`,
`responseSha256` over canonical sorted-key JSON), preceded by a header line.
Finally evaluates `expectations` (explicit dot-path resolver with
`name[selector]` array filters and `.length`) and exits non-zero if any fail.

```sh
mise exec -- pnpm exec tsx scripts/raw-swarm/driver.ts \
  scripts/raw-swarm/probes/probe-001-goblin-scimitar-vs-skeleton.json \
  --transcript scripts/raw-swarm/out/probe-001.jsonl
```

### `replay.ts` — determinism checker

Rebuilds a fresh composition root, re-executes the recorded tool calls
verbatim, and asserts each response's canonical-JSON sha256 matches the
recorded hash. Exits non-zero with the first divergence on mismatch.

```sh
mise exec -- pnpm exec tsx scripts/raw-swarm/replay.ts \
  scripts/raw-swarm/out/probe-001.jsonl
```

### `replay-freeplay.ts` — recorded MCP-call replay

Pairs each recorded freeplay `tools/call` request with its JSON-RPC response,
replays the tool calls against a fresh in-process composition root, and compares
canonical response hashes. This verifies the recorded choices deterministically;
rerunning the agent may make different choices.

```sh
mise exec -- pnpm exec tsx scripts/raw-swarm/replay-freeplay.ts \
  scripts/raw-swarm/out/freeplay-001-transcript.jsonl
```

### `mcp-recording-shim.mjs` — MCP stdio recording proxy

Spawns `battle-slice-server.ts`, a real SDK server exposing content discovery
and battle tools, and bridges stdin/stdout byte-for-byte while appending each
direction's newline-delimited JSON-RPC messages to the transcript as
`{seq, direction, message}` lines (unparseable lines are forwarded untouched
and logged with `unparsed: true`). Server stderr passes through. Configure an
MCP client to launch this script as the server command:

```sh
node scripts/raw-swarm/mcp-recording-shim.mjs \
  --transcript scripts/raw-swarm/out/freeplay-001.jsonl \
  --scenario freeplay-001-goblin-warrior-vs-skeleton
```

The slice server publishes the canonical tool input schemas. It omits optional
`outputSchema` metadata because the battle result codecs repeat roughly 1.9 MB
per tool and Codex 0.147 rejects the whole cold-client registration at that
size. Runtime results are still encoded and validated by those canonical
Effect codecs. `battle-slice-tools.test.ts` gates the published list size and
input-schema identity.

### Battle schema boundary

The canonical production SDK schemas remain `BattleSubjectSchema` and
`BattleFillSchema` in `@dnd/battle-runtime`; SDK callers continue to construct
and receive typed `BattleSubject` and `BattleFill` values. They were not changed
to strings.

The production MCP wire contract for `fill_battle_hole` and
`resolve_battle_act` does use JSON-text envelopes (`subjectJson` and
`fillJson`). This is not confined to the swarm server. It keeps MCP
`tools/list` small enough for cold clients, then immediately applies
`Schema.parseJson(BattleSubjectSchema)` and
`Schema.parseJson(BattleFillSchema)` at the MCP boundary. Typed handler code
receives only successfully decoded SDK values. The tradeoff is deliberate:
MCP clients learn the inner fill shape from returned holes and workflow guidance
rather than receiving the full approximately 200 KB union in the advertised
input schema.

Only the omission of optional `outputSchema` metadata from every tool exposed by
`battle-slice-server.ts` is specific to the swarm server. The normal production
MCP server still publishes its codec-derived output schemas.

### `run-freeplay-001.sh` — Codex user-emulation run

Runs the committed freeplay prompt through Codex with the D&D MCP server and
records both the protocol transcript and the agent log. Codex 0.147 requires
the MCP elicitation feature to be disabled in non-interactive `exec`; otherwise
mutating MCP calls are cancelled before reaching the server. The script pins
the model and reasoning effort and accepts optional transcript and log paths.

```sh
mise exec -- scripts/raw-swarm/run-freeplay-001.sh
```

The committed prompt at
`freeplay/freeplay-001-goblin-warrior-vs-skeleton.prompt.txt` is the
deterministic freeplay input. The agent's choices remain nondeterministic and
are evidence captured by the transcript, not replay expectations.

`end_battle.closedAt` returns the SDK's canonical Initiative position:
`roundReached` and `activeTurnActorId`. Reports use the form “Battle session
closed during round N, during X's turn.” They do not label the highest round
reached as a duration or convert it to seconds. RAW says a round represents
about 6 seconds; the runtime's exact six-second tick is a rule-duration
assumption and does not measure partial-round encounter time. A RAW reviewer
separately determines when combat ended and why.

### `report.ts` — SQLite report store

Uses built-in `node:sqlite`. Creates the schema on first use.

```sh
# ingest a transcript
mise exec -- pnpm exec tsx scripts/raw-swarm/report.ts \
  ingest scripts/raw-swarm/out/probe-001.jsonl \
  --db scripts/raw-swarm/out/raw-swarm.db

# record a verdict (class: bug | assumption-divergence | corpus-ambiguity |
#                      scenario-invalid | reviewer-error | pass)
mise exec -- pnpm exec tsx scripts/raw-swarm/report.ts verdict \
  --db scripts/raw-swarm/out/raw-swarm.db --run 1 --class pass \
  --claim "<text>" --evidence "<srd anchor + quote>" --reviewer "<id>"

# counts by verdict class
mise exec -- pnpm exec tsx scripts/raw-swarm/report.ts summary \
  --db scripts/raw-swarm/out/raw-swarm.db

# list issue observations as JSONL, including GitHub links when triaged
mise exec -- pnpm exec tsx scripts/raw-swarm/report.ts issues \
  --db scripts/raw-swarm/out/raw-swarm.db

# select either side of the GitHub-linkage boundary
mise exec -- pnpm exec tsx scripts/raw-swarm/report.ts issues \
  --db scripts/raw-swarm/out/raw-swarm.db --unlinked
mise exec -- pnpm exec tsx scripts/raw-swarm/report.ts issues \
  --db scripts/raw-swarm/out/raw-swarm.db --linked
```

## Finding and bug lifecycle

SQLite owns immutable execution and review evidence. GitHub Issues owns triage,
assignment, priority, discussion, and open/closed status, as required by
[`docs/agents/issue-tracker.md`](../../docs/agents/issue-tracker.md). Do not
delete an SQLite issue to represent a fix, and do not add a second local
open/closed status that can disagree with GitHub.

For each non-pass verdict:

1. Inspect the transcript sequence and local RAW evidence. Decide whether it is
   an SDK bug, an MCP-adapter bug, an unsupported capability, a scenario defect,
   or a corpus ambiguity.
2. Use `report.ts issues` to find its provisional fingerprint. Fingerprints are
   hashes of the review class and exact claim, so triage—not wording equality—
   decides whether multiple fingerprints describe one semantic bug.
3. For an actionable bug, search existing GitHub Issues. Create one only when no
   semantic duplicate exists. Use the **RAW swarm finding** issue form, which
   applies the `raw-swarm` and `bug` labels and requires the fingerprint, run id,
   tested Git SHA, transcript sequences, RAW citations, reproduction command,
   expected behavior, owning package, and required regression level. Record each
   fingerprint on its own exact `Raw-Swarm-Fingerprint: <sha256>` line.
4. Link every matching fingerprint to that GitHub issue:

   ```sh
   mise exec -- pnpm exec tsx scripts/raw-swarm/report.ts \
     link-github-issue --db scripts/raw-swarm/out/raw-swarm.db \
     --fingerprint <sha256> --github-issue <number>
   ```

5. Fix the canonical SDK owner unless the finding is specifically in an
   adapter. Add the smallest deterministic regression before relying on another
   freeplay run.
6. Generate a new run and adversarial review that explicitly exercises the
   corrected behavior. Preserve the original run: replay proves determinism for
   its recorded revision, so an old response hash may intentionally diverge
   after a behavior fix.
7. Comment on the GitHub issue with the regression path, fix commit, confirming
   run/review evidence, and any remaining limits; then close it. GitHub remains
   the only lifecycle status. A later recurrence links new evidence to the same
   reopened issue.

SQLite's `githubIssueNumber` is only a stable external reference. It does not
copy GitHub state. Generated databases and transcripts are gitignored, so a
long-lived swarm must publish or retain the database outside an ephemeral
worktree; confirmed fixes belong in committed regression tests even if raw run
artifacts are later pruned.

### Finding navigation and filtering

The `raw-swarm` label is the canonical GitHub collection marker. It makes the
collection visible in the issue list and available through the GitHub API; the
fingerprint lines provide exact reverse lookup from a local observation. The
issue form at [`.github/ISSUE_TEMPLATE/raw-swarm.yml`](../../.github/ISSUE_TEMPLATE/raw-swarm.yml)
enforces the human-facing evidence headings and applies that label.

```sh
# visual GitHub view
gh issue list --label raw-swarm --state all --web

# programmatic GitHub view
gh issue list --label raw-swarm --state all \
  --json number,title,state,url,labels

# reverse lookup: SQLite fingerprint -> GitHub issue
gh issue list --state all \
  --search '"Raw-Swarm-Fingerprint: <sha256>" in:body' \
  --json number,title,state,url

# forward lookup: SQLite issue number -> GitHub
gh issue view <number> --web
gh issue view <number> --json number,title,state,url,labels,body
```

`link-github-issue` idempotently appends the exact fingerprint backlink and
applies the `raw-swarm` label through `gh`. It verifies both GitHub facts before
writing the issue number to SQLite, then prints a visual-open command. A failed
GitHub update therefore remains `--unlinked` locally and can be retried safely.
Multiple wording fingerprints may point to one semantic GitHub issue; the
command puts every one in that issue body so either store can recover the
relationship independently. A fingerprint cannot be silently moved to another
issue because that would leave an ambiguous reverse backlink; the command
rejects such a relink before touching GitHub. A per-database workflow lock
serializes the GitHub operation across local workers; SQLite write transactions
remain short and never span a network call.

### `run-raw-review.sh` — adversarial RAW review

Runs a committed falsifier prompt under a pinned Codex model and validates its
final response against a temporary JSON Schema generated from the same Effect
codec used by report ingestion. Import the result as one atomic review round:

```sh
mise exec -- scripts/raw-swarm/run-raw-review.sh \
  scripts/raw-swarm/reviews/freeplay-001.prompt.txt \
  scripts/raw-swarm/out/freeplay-001-review.json \
  scripts/raw-swarm/out/freeplay-001-review-agent.log

mise exec -- pnpm exec tsx scripts/raw-swarm/report.ts review \
  scripts/raw-swarm/out/freeplay-001-review.json \
  --run 2 --db scripts/raw-swarm/out/raw-swarm.db
```

The runner defaults to Codex's `read-only` sandbox. On hosts that disable the
user namespaces required by bubblewrap, use
`RAW_REVIEW_SANDBOX=danger-full-access`; the committed falsifier prompts remain
read-only and forbid browsing or workspace changes, while the generated agent
log records the effective sandbox mode.

`reviews/probe-001.prompt.txt` provides the same adversarial lane for the
scripted probe. Review JSON and agent logs are generated evidence under `out/`.

### `probes/probe-001-goblin-scimitar-vs-skeleton.json`

Goblin Warrior (initiative 15) vs Skeleton (initiative 10). Expectations are
derived from SRD 5.2.1 stat blocks, not from observing the engine: Skeleton
HP 13 (`Monsters-P-S.md#skeleton`), Scimitar 1d6+2 slashing
(`Monsters-E-G.md#goblin-warrior`), one action per turn
(`Rules-Glossary.md#action`). A FAIL here is an engine-vs-SRD finding, not a
harness bug.

## Files

- `transcript.ts` — shared canonical-JSON/sha256/header helpers.
- `driver.ts`, `replay.ts`, `report.ts`, `mcp-recording-shim.mjs` — lanes above.
- `probes/` — scenario JSON files.
- `out/` — generated transcripts and databases (gitignored).
