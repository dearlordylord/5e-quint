# Research: Verification Scenario Mining

Scope:

- Non-5e systems only.
- Focus on scenario injection, fixture formats, trace formats, and what to mine into verification workflows.
- Use this as input for deterministic tests, MBT, QA, and architecture review.

Primary sources:

- `boardgame.io` testing docs: [`testing.md`](./inspirations/boardgame.io/docs/documentation/testing.md)
- `boardgame.io` random docs: [`random.md`](./inspirations/boardgame.io/docs/documentation/random.md)
- `boardgame.io` debug docs: [`debugging.md`](./inspirations/boardgame.io/docs/documentation/debugging.md)
- `boardgame.io` types: [`types.ts`](./inspirations/boardgame.io/src/types.ts)
- XMage overview: [`readme.md`](./inspirations/xmage/readme.md)
- XMage scripted harness: [`CardTestPlayerAPIImpl.java`](./inspirations/xmage/Mage.Tests/src/test/java/org/mage/test/serverside/base/impl/CardTestPlayerAPIImpl.java)
- XMage scripted player: [`TestPlayer.java`](./inspirations/xmage/Mage.Tests/src/test/java/org/mage/test/player/TestPlayer.java)
- XMage scenario harness: [`MulliganTestBase.java`](./inspirations/xmage/Mage.Tests/src/test/java/org/mage/test/mulligan/MulliganTestBase.java)
- XMage content verifier: [`VerifyCardDataTest.java`](./inspirations/xmage/Mage.Verify/src/test/java/mage/verify/VerifyCardDataTest.java)
- Example scripted card scenario: [`BeamsplitterMageTest.java`](./inspirations/xmage/Mage.Tests/src/test/java/org/mage/test/cards/single/grn/BeamsplitterMageTest.java)

## Executive Takeaway

The two useful verification styles are:

1. `boardgame.io`’s narrow, repeatable runtime tests built around seeded randomness and custom setup.
2. XMage’s wide, command-driven scenario tests that inject board states and then drive the engine through a scripted player.

They solve different problems. `boardgame.io` is better for deterministic replay and reducer-level tests. XMage is better for rich scenario construction and exhaustive content validation.

For our project, the key move is to combine them:

- use boardgame.io-like seed/log/state IDs for replayable engine traces;
- use XMage-like scripted setup for human-authored edge cases and content regression suites;
- keep the fixture format explicit and inspectable;
- make scenario scripts easy to mine into MBT traces and QA regressions.

## Scenario Formats Worth Copying

### 1. Seeded setup plus direct move assertions

Source pattern: `boardgame.io/docs/documentation/testing.md`

What it looks like:

- instantiate a client with fixed `seed`;
- optionally override the random plugin;
- perform a small number of moves;
- assert final state directly.

Why it transfers:

- gives deterministic, low-friction unit tests;
- reduces flakiness in stateful logic;
- makes single-step regressions cheap to express.

Best use:

- deterministic tests;
- MBT seed replay when a failing trace needs a minimal reproduction.

### 2. Scenario injection by replacing setup state

Source pattern: `boardgame.io/docs/documentation/testing.md`

What it looks like:

- define a custom setup that returns a specific board state;
- run a few moves from that position;
- assert the resulting state and gameover condition.

Why it transfers:

- ideal for “start from a weird state” regressions;
- lets us bypass irrelevant early-game setup;
- keeps tests focused on a single interaction.

Best use:

- deterministic tests;
- QA edge cases;
- architecture review when verifying state transitions.

### 3. Scripted player commands and state checkpoints

Source pattern: XMage `CardTestPlayerAPIImpl` + `TestPlayer`

What it looks like:

- preload board, hand, graveyard, stack, and library with explicit cards;
- enqueue commands like `castSpell`, `activateAbility`, `setChoice`, `setTarget`;
- stop at a phase step;
- execute and then inspect state with `assert*` helpers.

Why it transfers:

- the setup is explicit enough to become a reproducible fixture;
- the command queue is effectively a trace of intent;
- the check/show vocabulary makes it easy to write dense assertions.

Best use:

- QA harnesses;
- scenario mining for MBT seeds;
- human-authored regressions for tricky timing windows.

### 4. Structured content verification

Source pattern: XMage `VerifyCardDataTest`

What it looks like:

- scan repository content;
- compare against external structured sources;
- use skip lists for known exceptions;
- allow debug flags for narrower local checks;
- validate sample decks as fixtures.

Why it transfers:

- turns content review into a repeatable verifier;
- supports large inventories without hand-curated one-off checks;
- separates source-of-truth validation from runtime combat tests.

Best use:

- QA;
- architecture review;
- content import pipelines.

### 5. Smaller subsystem scenario harnesses

Source pattern: XMage `MulliganTestBase`

What it looks like:

- define a tiny DSL of steps (`mulligan`, `scry`, `discardBottom`);
- generate deterministic decks;
- run a scenario and assert counts or order.

Why it transfers:

- good model for narrow subsystem verification;
- avoids overfitting every scenario to the full combat loop;
- makes fixture data lighter weight than full engine traces.

Best use:

- deterministic tests;
- subsystem QA;
- future scenario libraries.

## Trace Formats Worth Copying

### `boardgame.io`

- `State` carries `_stateID`, `_undo`, `_redo`, `deltalog`, and plugin state.
- `LogEntry` includes action type, state ID, turn, phase, metadata, and optional patch data.
- That combination is enough for replay, inspection, and diff-driven debugging.

### XMage

- No general replay log surfaced in the inspected docs, but the test harness itself is a trace:
  - ordered action queue,
  - explicit choices/targets,
  - phase stop points,
  - assertions after execution.
- Test failure output is mostly log-driven rather than trace-object-driven.

## Import Paths

### deterministic tests

- `boardgame.io/docs/documentation/testing.md`
- `boardgame.io/docs/documentation/random.md`
- `XMage/Mage.Tests/src/test/java/org/mage/test/cards/single/grn/BeamsplitterMageTest.java`
- `XMage/Mage.Tests/src/test/java/org/mage/test/mulligan/MulliganTestBase.java`

Mine:

- seeded setup;
- small action sequences;
- direct final-state assertions;
- subsystem-specific scenario helpers.

### MBT

- `boardgame.io/src/types.ts`
- `boardgame.io/src/master/master.ts`
- `boardgame.io/src/testing/mock-random.ts`
- `XMage/Mage.Tests/src/test/java/org/mage/test/player/TestPlayer.java`

Mine:

- replayable logs or action queues;
- random control hooks;
- state IDs and checkpoint metadata;
- scripted failure reproduction.

### QA

- `XMage/Mage.Verify/src/test/java/mage/verify/VerifyCardDataTest.java`
- `XMage/Mage.Tests/src/test/java/org/mage/test/serverside/base/impl/CardTestPlayerAPIImpl.java`
- `boardgame.io/docs/documentation/debugging.md`

Mine:

- content scanners;
- skip lists for known exceptions;
- metadata-rich debug logs;
- scenario inventories that can be run manually.

### architecture review

- `boardgame.io/docs/documentation/concepts.md`
- `boardgame.io/docs/documentation/multiplayer.md`
- `boardgame.io/src/types.ts`
- `./inspirations/xmage/readme.md`

Mine:

- authoritative server/master split;
- serializable runtime state;
- explicit test mode;
- distinction between engine state and scenario fixtures.

## What To Avoid Importing

- Do not import XMage’s Magic-specific fixture vocabulary into the runtime layer. Decks, zones, mulligans, and card-name commands belong in the scenario layer only.
- Do not import a test harness that depends on dozens of bespoke string commands unless the domain genuinely needs that style. The useful part is scripted reproducibility, not the string grammar.
- Do not confuse content verification with runtime verification. XMage’s `VerifyCardDataTest` is about corpus correctness, not engine replay.
- Do not make scenario files so generic that they lose the domain facts that make failures interpretable.

## Practical Mining Guidance

Use this rule of thumb:

- If the problem is “I need the engine to reach a known state,” mine XMage-style scenario injection.
- If the problem is “I need to reproduce a state transition exactly,” mine boardgame.io-style seeded replay plus logs.
- If the problem is “I need to validate a content corpus,” mine XMage `VerifyCardDataTest`-style scanners.
- If the problem is “I need to know what happened after the fact,” mine boardgame.io `LogEntry` shape and metadata.

## Shortlist

Most transferable pieces for this repo:

- deterministic tests: custom setup, seeded randomness, small action sequences;
- MBT: replayable logs, state IDs, and random-control hooks;
- QA: scripted scenario DSLs plus content scanners;
- architecture review: serializable authoritative state and explicit test-mode entrypoints.

Least transferable pieces:

- genre-specific scenario vocabularies;
- network transport design;
- UI/debug panels that are tied to a specific frontend stack;
- card-game or board-game rules encoded directly into the harness.
