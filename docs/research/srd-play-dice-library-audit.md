# SRD Play dice parsing and generation dependency audit

> **Research evidence, not architecture authority.** This note records current
> repository and upstream-library facts for the SRD Play Wayfinder. Stable product
> structure belongs in [`ARCHITECTURE.md`](../../ARCHITECTURE.md), as routed by
> [`CONTEXT-MAP.md`](../../CONTEXT-MAP.md).

Research checked: 2026-08-20.

## Question

Does SRD Play need a maintained Node/TypeScript dice-expression parser or roller?
In particular, does MCP force the application to parse textual dice notation, and
can an external roller use the project's deterministic, testable Effect Random
service without compromising isolated Play Sessions?

## Executive finding

**Do not add a dice library for the v1 gameplay-bound roll operation.** The
production model already represents ordinary dice as structured numeric facts, MCP
already returns schema-described `structuredContent`, and a canonical structured
`DiceRollRequest` would remove the remaining need to infer a recipe from runtime
holes. Sampling `count` integers bounded by `dieSize` is smaller and fits Effect
Random directly.

The current runtime does **not** yet expose that uniform request. Some roll holes
carry a `DiceExpr` in variant-specific nested fields, while others carry only an
attack, procedure reference, or label. That is a projection gap, not evidence for a
notation parser. The runtime owner should project each rollable hole into one typed
request; MCP should transport that request without rendering and reparsing a string.

If a later, separately specified feature accepts arbitrary human-authored dice
notation, `roll-parser` is the strongest candidate found. It is zero-dependency,
MIT-licensed, tested on Ubuntu, accepts a per-call RNG, and supports familiar D&D
forms. Its v3 API is also very new and fast-moving, and its RNG callback is
synchronous, so that later feature should pin and spike it behind a narrow boundary
rather than make it part of v1.

## What the repository actually transports

### MCP output is already structured

The MCP codec generates an `outputSchema` and returns the encoded value in both a
JSON text block and `structuredContent`
([`schema-codec.ts`](../../packages/mcp/src/schema-codec.ts#L53-L76)). Battle
resolution reports return `holes` as fields of that structured result
([`battle-tool-payloads.ts`](../../packages/mcp/src/battle-tool-payloads.ts#L163-L191)).
This matches the MCP specification: structured tool results are JSON values governed
by `outputSchema`, with serialized JSON text retained for backward compatibility
([MCP tools specification](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/server/tools.mdx#structured-content)).

Consequently, a result being visible to ChatGPT as text does not require the
application to invent and parse dice notation. The same result is already available
as typed JSON. A future roll tool can likewise accept nested structured input such
as dice groups or a non-empty batch; MCP does not restrict it to a notation string.

The existing `fill_battle_hole` input does ask callers to submit
`JSON.stringify(fill)` and then decodes it with `BattleFillSchema`
([`battle-tool-input.ts`](../../packages/mcp/src/battle-tool-input.ts#L38-L53),
[`battle-tool-input.ts`](../../packages/mcp/src/battle-tool-input.ts#L246-L271)).
That is JSON transport parsing, not dice-expression parsing, and it does not justify
a dice grammar dependency.

### Dice facts are structured, but the roll request is not uniform yet

The authored `DiceExpr` schema is a record containing `dice`, `dieSize`, and
optional modifier facts; it is not notation text
([`schema-base.ts`](../../packages/surface/src/surface/schema-base.ts#L825-L831)).
The shared runtime algebra stores individual `DieRollResult` values in
`RolledDiceGroup` and validates their count and range directly against a `DiceExpr`
([`runtime-hole-algebra.ts`](../../packages/shared-algebras/src/runtime-hole-algebra.ts#L45-L60),
[`runtime-dice-algebra.ts`](../../packages/shared-algebras/src/runtime-dice-algebra.ts#L26-L50)).

The missing fact is a canonical roll request:

- generic `rolledDice` holes expose only identity and an optional label
  ([`runtime-hole-algebra.ts`](../../packages/shared-algebras/src/runtime-hole-algebra.ts#L67-L87));
- ordinary attack-damage and spell-damage holes carry an attack or procedure
  reference rather than a direct expression, while other variants put an expression
  in their own nested field
  ([`battle-state-execution.ts`](../../packages/battle-runtime/src/battle-state-execution.ts#L4902-L4947));
- a generic Unit-feature roll hole adds no recipe at all
  ([`battle-state-execution.ts`](../../packages/battle-runtime/src/battle-state-execution.ts#L5792-L5795)).

A parser cannot recover facts that the runtime has not projected. Parsing labels or
hole IDs would also turn display text or authored identity into execution behavior.
The correct boundary is a runtime-owned, discriminated `DiceRollRequest` that carries
the exact groups, roll/selection mode, modifiers or outcome-construction facts, and
semantic hole identity needed to produce the typed fill.

## Existing dependency audit

No workspace `package.json` declares a dice parser, roller, or application RNG
package, and production source does not import one. The lockfile contains
`seedrandom`, but only as a transitive dependency of the Quint development tool
([`pnpm-lock.yaml`](../../pnpm-lock.yaml#L5925-L5947)); it is not an SRD Play or
runtime dependency. The workspace already pins Effect
([`package.json`](../../package.json#L59-L79)).

The pinned Effect Random service provides effectful bounded integer generation and
supports seeded and fixed Random implementations for deterministic tests
([Effect 3.21.5 Random source](https://github.com/Effect-TS/effect/blob/v3.21.5/packages/effect/src/Random.ts)).
That is a direct fit for a small sampler over structured requests. It avoids a second
RNG abstraction, hidden process-global state, and an adapter from an effectful draw
to a synchronous callback.

## Maintained library comparison

“Linux-focused” is not a meaningful discriminator for these portable JS packages.
The useful evidence is a declared Node version, no native addon dependency, and CI
on Ubuntu. None of the candidates is Linux-specific.

| Candidate | Current maintenance and platform evidence | License / runtime dependencies | Grammar and result fit | RNG fit | Assessment |
| --- | --- | --- | --- | --- | --- |
| [`roll-parser`](https://github.com/edloidas/roll-parser) 3.3.1 | Published 2026-08-19; Node >=22.12; its CI builds, tests, and pack-smokes on `ubuntu-latest` ([registry](https://registry.npmjs.org/roll-parser), [CI](https://github.com/edloidas/roll-parser/blob/b2f3d91e3920d514adbaa791f0fcb66ca397d37e/.github/workflows/ci.yml)) | MIT; zero runtime dependencies | Familiar forms including `d20`, arithmetic, and keep-high/low; structured results, individual dice, limits, and typed error classes | Per-call synchronous `RNG` with `nextInt(min,max)`, avoiding global cross-session state ([source](https://github.com/edloidas/roll-parser/blob/b2f3d91e3920d514adbaa791f0fcb66ca397d37e/src/rng/types.ts)) | Best contingency if arbitrary text becomes a requirement. The stable v3 line began only in August 2026 and had several releases in two weeks; pin and spike first. Thrown failures must be translated to typed Effect failures. |
| [`@randsum/roller`](https://github.com/RANDSUM/randsum/tree/main/packages/roller) 4.0.0 | Published 2026-07-09; Node >=18; active repository and Ubuntu CI ([registry](https://registry.npmjs.org/%40randsum%2Froller), [CI](https://github.com/RANDSUM/randsum/blob/main/.github/workflows/ci.yml)) | MIT; zero runtime dependencies | Supports multiple roll arguments, but uses its own RDN spellings and implements far more modifiers than the structured SRD request needs | Per-call synchronous `randomFn`; seeded and queue helpers are provided ([source](https://github.com/RANDSUM/randsum/blob/36f58bcbafbf61f1668835874827cb974a6b655b/packages/roller/src/random.ts)) | Viable portable library and useful bulk-call precedent, but unnecessary grammar mismatch and rapid major-version churn (1.x to 4.x during 2026). |
| [`@dice-roller/rpg-dice-roller`](https://github.com/dice-roller/rpg-dice-roller) 5.5.1 | Published 2025-02-08; Node >=18; mature repository with Ubuntu CI ([registry](https://registry.npmjs.org/%40dice-roller%2Frpg-dice-roller), [CI](https://github.com/dice-roller/rpg-dice-roller/blob/develop/.github/workflows/build.yml)) | MIT; direct dependencies on `mathjs` and `random-js` | Rich, familiar notation and detailed results, but substantially broader than the required count/sides sampler | Customization mutates one exported module-global generator engine ([source](https://github.com/dice-roller/rpg-dice-roller/blob/9b0a6540aed8ab07bd3acce13e4be005dac43bd0/src/utilities/NumberGenerator.js)) | Reject for the concurrent Play Session host: global mutable RNG ownership can couple sessions, and it has the largest dependency surface. |

Older packages such as `dice-typescript` 1.6.1 (last published 2018) and
`dice-roller-parser` 0.1.8 (last published 2020) are not maintained candidates
([`dice-typescript` registry](https://registry.npmjs.org/dice-typescript),
[`dice-roller-parser` registry](https://registry.npmjs.org/dice-roller-parser)).

All three maintained candidates expose synchronous RNG callbacks. Effect Random is
effectful. Pre-drawing an Effect-managed queue and feeding it to a library is
possible, but once the request is structured that adapter merely wraps a more complex
engine around already-generated faces. Calling Effect unsafely from a synchronous
callback or replacing a module-global generator during a roll would weaken the
application's concurrency and test boundaries.

## Recommendation for the SRD Play specification

1. Define a canonical structured `DiceRollRequest` projection at the owning runtime
   boundary. Do not derive dice from labels, hole IDs, rendered notation, or MCP
   prose.
2. Implement the v1 gameplay-bound operation by sampling that request with the
   injected Effect Random service, constructing the exact typed fill, and applying it
   atomically. Keep user/physical-dice fills available.
3. Return a structured receipt containing the request/hole identity, every generated
   face, the selected face where relevant, and the derived total or outcome. Keep the
   accepted fill as the canonical gameplay fact; do not put an RNG seed or cursor in
   reducer state.
4. Use the same structured request representation if a later standalone roller gains
   a non-empty bulk operation. Bulk transport does not create a need for notation.
5. Treat arbitrary human-authored notation as a separate feature. If it becomes real,
   spike an exactly pinned `roll-parser` version against only the accepted grammar,
   translate thrown errors to precise typed failures, and keep parsing outside the
   authoritative rule reducers.

This research does not choose the exact `DiceRollRequest` variants or decide whether
one gameplay operation may satisfy one or several simultaneously pending holes. Those
remain decisions for the dice-contract specification.
