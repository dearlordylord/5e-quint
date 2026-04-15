# Research: Runtime Replay Patterns

Scope:

- Non-5e systems only.
- Focus on deterministic replay, serialization, seeds, logs, undo/history.
- Use this as a pattern library for our runtime, not as a feature wishlist.

Primary sources:

- [`boardgame.io`](./inspirations/boardgame.io/README.md)
- [`boardgame.io` random docs](./inspirations/boardgame.io/docs/documentation/random.md)
- [`boardgame.io` undo docs](./inspirations/boardgame.io/docs/documentation/undo.md)
- [`boardgame.io` testing docs](./inspirations/boardgame.io/docs/documentation/testing.md)
- [`boardgame.io` concepts docs](./inspirations/boardgame.io/docs/documentation/concepts.md)
- [`boardgame.io` multiplayer docs](./inspirations/boardgame.io/docs/documentation/multiplayer.md)
- [`boardgame.io` types](./inspirations/boardgame.io/src/types.ts)
- [`boardgame.io` master](./inspirations/boardgame.io/src/master/master.ts)
- [`boardgame.io` client](./inspirations/boardgame.io/src/client/client.ts)
- XMage overview: [`readme.md`](./inspirations/xmage/readme.md)
- XMage test harness: [`CardTestPlayerAPIImpl.java`](./inspirations/xmage/Mage.Tests/src/test/java/org/mage/test/serverside/base/impl/CardTestPlayerAPIImpl.java)
- XMage scripted player: [`TestPlayer.java`](./inspirations/xmage/Mage.Tests/src/test/java/org/mage/test/player/TestPlayer.java)
- XMage scenario harness: [`MulliganTestBase.java`](./inspirations/xmage/Mage.Tests/src/test/java/org/mage/test/mulligan/MulliganTestBase.java)

## Executive Takeaway

`boardgame.io` is the cleanest runtime replay reference in the corpus. It treats game state as JSON-serializable data, keeps randomness server-side, records a log with patches/metadata, and exposes undo/redo for a bounded history window. XMage is useful as a contrast: it has a powerful scripted test harness and special test mode, but not a general-purpose deterministic replay architecture.

For our project, the transferable pieces are:

- pure move functions over serializable state;
- seed control and controllable randomness;
- log entries with metadata and optional patches;
- bounded undo/redo history;
- scenario-driven test setup with explicit state injection;
- scripted player APIs that can be replayed step by step.

## What To Mine

### `boardgame.io`

- `G` plus `ctx` is the runtime split to copy: game state and framework state are separated, and both are serializable.
- `seed` is first-class and part of game initialization, which makes replay and test reproducibility explicit.
- Randomness is not a free-floating API call; it is injected into move context and kept authoritative on the server.
- `State` includes `_undo`, `_redo`, `_stateID`, `deltalog`, and plugin state. That is a compact replay substrate.
- `LogEntry` carries action kind, state ID, turn, phase, metadata, and optional patches. That is enough to reconstruct or inspect the path to a state.
- Undo/redo is built into the runtime and is restricted by move metadata when needed.
- The testing docs explicitly support:
  - unit tests on pure moves,
  - scenario tests by injecting a custom setup,
  - fixed-seed randomness,
  - mock random plugins,
  - multiplayer tests with local master/client sync.

### XMage

- The test harness is intentionally imperative but highly scripted.
- `CardTestPlayerAPIImpl` exposes a dense command vocabulary:
  - `addCard`, `castSpell`, `activateAbility`, `setChoice`, `setTarget`,
  - `setStopAt`, `setStrictChooseMode`, `execute`,
  - check/show commands for battlefield, hand, graveyard, stack, mana, counters, etc.
- `TestPlayer` keeps queues for actions, targets, choices, aliases, and modes. That is a replayable command stream even though it is not a generalized log.
- `MulliganTestBase` shows a separate scenario harness for a specific subsystem with custom step interfaces and deterministic deck generation.
- The XMage readme points at a special local test mode for pre-defined conditions. That is useful as a pattern for scenario injection, not as a runtime architecture.

## Import Paths

### deterministic tests

- `boardgame.io/docs/documentation/testing.md`
- `boardgame.io/docs/documentation/random.md`
- `boardgame.io/docs/documentation/concepts.md`
- `XMage/Mage.Tests/src/test/java/org/mage/test/serverside/base/impl/CardTestPlayerAPIImpl.java`
- `XMage/Mage.Tests/src/test/java/org/mage/test/player/TestPlayer.java`

What to mine:

- pure function unit tests over move logic;
- fixed setup scenarios;
- deterministic deck or board initialization;
- explicit assertions on final state.

### MBT

- `boardgame.io/src/types.ts`
- `boardgame.io/src/master/master.ts`
- `boardgame.io/src/testing/mock-random.ts`
- `boardgame.io/docs/documentation/random.md`

What to mine:

- seed-driven repeatability;
- explicit RNG injection;
- log/state IDs for trace correlation;
- patch-backed replay inspection.

### QA

- `boardgame.io/docs/documentation/debugging.md`
- `XMage/Mage.Verify/src/test/java/mage/verify/VerifyCardDataTest.java`
- `XMage/Mage.Tests/src/test/java/org/mage/test/mulligan/MulliganTestBase.java`

What to mine:

- metadata-rich logs for human debugging;
- structured scenario inventories;
- validation of content sources against repository data;
- pre-defined scenario scripts that can be run by humans.

### architecture review

- `boardgame.io/src/types.ts`
- `boardgame.io/src/master/master.ts`
- `boardgame.io/docs/documentation/multiplayer.md`
- `./inspirations/xmage/readme.md`

What to mine:

- separation of authoritative engine vs client projection;
- explicit replay substrate;
- bounded undo history;
- local-vs-remote master split;
- test mode as a first-class capability.

## What To Avoid Importing

- Do not import `boardgame.io`’s browser-first Redux/plugin stack. The useful idea is the deterministic substrate, not its framework shape.
- Do not import XMage’s command-string explosion as an API style. The useful idea is the scripted scenario harness, not the stringly command vocabulary.
- Do not import multiplayer transport abstractions unless they are needed for our own runtime. We want replay and verification patterns, not a network layer reference design.
- Do not import game-genre specifics from XMage such as card-zone semantics, mulligan flow, or deck import machinery. Those are MTG-specific fixtures, not reusable runtime ideas.

## Transfer Summary

Best-fit imports for our stack:

- deterministic replay: `boardgame.io` state + seed + log model;
- bounded history: `boardgame.io` undo/redo;
- scenario injection: XMage scripted test setup;
- trace debugging: boardgame.io log metadata and state IDs;
- human QA harnesses: XMage step-driven tests and explicit check commands.

The clean boundary is simple: replay infrastructure should be generic and data-only; scenario setup can be domain-specific; logs should be structured enough to support both MBT and human triage.
