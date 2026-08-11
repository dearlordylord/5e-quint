# RAW swarm testing harness (slice 1)

Drives the adjudicator MCP SDK the way a user would, records deterministic
transcripts, replays them to prove determinism, and stores runs in SQLite.

Two lanes:

- **scripted probes** — `driver.ts` executes a scenario JSON in-process
  against `handleToolCall` (`packages/mcp/src/server.ts`).
- **freeplay** — an external agent drives the real MCP stdio server through
  `mcp-recording-shim.mjs`, a byte-transparent recording proxy.

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
```

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
