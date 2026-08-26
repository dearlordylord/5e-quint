# `@drdice/dice` engineering assessment

Research checked: 2026-08-26.

Implementation status: completed locally on 2026-08-26. The sibling DRDice
checkout now provides `sampleDiceGroups` in `@drdice/dice` 0.4.0 with the
`dice-groups-v1/ordered-atomic-rejection-5-blocks-x-5-attempts` semantic
profile. MCP pins the published `@drdice/dice` and `@drdice/prng` 0.4.0 releases
through pnpm, owns them behind one Effect service, persists the seed and
semantic identities in recoverable format 3, and requires a caller UUID for
idempotent sampling. The remainder of this note records the evidence and
decision that led to that implementation.

This note evaluates `@drdice/dice` 0.3.4 and its runtime dependency,
`@drdice/prng` 0.3.4, against the MCP Play Session dice and replay contracts.
Only the npm registry, the package's own repository, release artifacts, source,
tests, and this repository are used as evidence. External links are pinned to
the 0.3.4 release commit where practical.

## Decision

Adopt DRDice's PRNG and replay contract, but do **not** translate the MCP's
structured groups into `@drdice/dice.evaluate` expressions and do **not** feed
Effect's `Random` into DRDice.

The best target design is:

1. add a structured-group rolling operation in `@drdice/dice` that
   accepts and returns immutable `@drdice/prng` state, has a budget compatible
   with this project's grouped-roll contract, and continues bounded rejection
   sampling transactionally;
2. use it behind one project-owned Effect service that accepts the
   already-decoded `RollDiceRequest`, threads immutable DRDice state, and returns
   either complete faces plus the Next Generator State or a precise failure;
3. link the local 0.4.0 packages during development, persist the complete algorithm identity
   with each session, and version the stored-session format before changing any
   roll semantics.

This preserves the existing canonical structured input instead of introducing
a second string representation. It also keeps Effect as the composition and
failure-management layer without retaining Effect's PRNG as a second random
source.

Direct use of `@drdice/dice.evaluate` is not an acceptable drop-in replacement.
Its evaluator accepts a dice-expression string and caps one evaluation at eight
die samples, four dice terms, an arithmetic magnitude of 100, and 24 evaluation
steps ([source](https://github.com/dearlordylord/drdice/blob/7a1d129bb40df70aac44b6176f58567a5dbe5581/packages/dice/src/index.ts#L40-L54)).
The MCP contract is structured, returns raw faces rather than an expression
total, and permits 1,000 dice per group and 10,000 per call
([local contract](../../packages/mcp/src/dice-tool-input.ts#L14-L46)). Splitting
one request into many expression evaluations would make an upstream resource
limit into a distant caller-sequencing protocol and would add parsing semantics
the domain does not need.

## What the packages actually provide

### API and state model

`@drdice/dice` exposes `evaluate(source, state, maximumAttempts?)`. It parses a
small expression language, rolls dice from left to right, and returns the total,
the ordered `{ sideCount, face }` trace, and the next generator state
([evaluation](https://github.com/dearlordylord/drdice/blob/7a1d129bb40df70aac44b6176f58567a5dbe5581/packages/dice/src/index.ts#L401-L489),
[public entry point](https://github.com/dearlordylord/drdice/blob/7a1d129bb40df70aac44b6176f58567a5dbe5581/packages/dice/src/index.ts#L502-L559)).
It has no callback or interface for injecting an external random source.

The lower-level `@drdice/prng` API is the relevant fit for this repository. Its
`sample(state, bound, maximumAttempts?)` returns a structured success containing
an integer in `[0, bound)`, the successor state, and the number of 32-bit output
words consumed; malformed state, invalid bounds/fuel, and exhausted sampling are
structured failures rather than thrown errors
([implementation](https://github.com/dearlordylord/drdice/blob/7a1d129bb40df70aac44b6176f58567a5dbe5581/packages/prng/src/index.ts#L178-L216),
[documented API](https://github.com/dearlordylord/drdice/blob/7a1d129bb40df70aac44b6176f58567a5dbe5581/packages/prng/README.md#L39-L59)).
Its public bound is `1..100`, exactly the current MCP die-size envelope.

Generator state is explicit and immutable. The caller passes the returned state
to continue or reuses an earlier state to replay
([README](https://github.com/dearlordylord/drdice/blob/7a1d129bb40df70aac44b6176f58567a5dbe5581/packages/prng/README.md#L19-L40)).
That is a better persistence boundary than an opaque mutable `Effect.Random`
stream.

### Seed and generator

The sequence profile is named
`xoshiro128ss-1.1/warmup16-msb-chunk-rejection-2`, and serialized states carry
both that profile and schema version `1`
([constants and serialization](https://github.com/dearlordylord/drdice/blob/7a1d129bb40df70aac44b6176f58567a5dbe5581/packages/prng/src/index.ts#L57-L61),
[snapshot validation](https://github.com/dearlordylord/drdice/blob/7a1d129bb40df70aac44b6176f58567a5dbe5581/packages/prng/src/index.ts#L218-L253)).
The generator has four 32-bit words of state. `randomSeed()` fills all four from
`globalThis.crypto.getRandomValues`, correcting only the forbidden all-zero
state, and initialization retains a four-word state while applying 16 warm-up
transitions
([source](https://github.com/dearlordylord/drdice/blob/7a1d129bb40df70aac44b6176f58567a5dbe5581/packages/prng/src/index.ts#L128-L149)).

This removes the present path in which a 256-bit hex seed is handed to
`Effect.Random.make` ([composition root](../../packages/mcp/src/composition-root.ts#L89-L103)).
Effect 3.21.5 hashes that arbitrary input to one numeric seed before creating
its PCG instance
([Effect source](https://github.com/Effect-TS/effect/blob/703792d9dea3f49acdeb8cce85b261b302fee4e3/packages/effect/src/internal/random.ts#L22-L31),
[constructor boundary](https://github.com/Effect-TS/effect/blob/703792d9dea3f49acdeb8cce85b261b302fee4e3/packages/effect/src/internal/random.ts#L88-L91)).
DRDice instead retains a defined 128-bit seed shape. It does not turn xoshiro
into a cryptographically secure generator; the package explicitly says it is
deterministic and non-cryptographic
([safety contract](https://github.com/dearlordylord/drdice/blob/7a1d129bb40df70aac44b6176f58567a5dbe5581/packages/prng/README.md#L61-L67)).

### Uniform bounded sampling

DRDice computes `ceil(log2(bound))`, scans every complete chunk of that width
from most-significant to least-significant within a 32-bit output word, accepts
only candidates below the bound, and otherwise advances to another output word
([source](https://github.com/dearlordylord/drdice/blob/7a1d129bb40df70aac44b6176f58567a5dbe5581/packages/prng/src/index.ts#L168-L207)).
Conditioned on a success, every face has the same number of accepted bit
patterns; this removes modulo range-reduction bias. The project's committed
oracle and immutable golden vectors independently cover transition, rejection,
exhaustion, and state advancement
([verification design](https://github.com/dearlordylord/drdice/blob/7a1d129bb40df70aac44b6176f58567a5dbe5581/verification/prng-semantics/README.md#L1-L31)).

There is an operational qualification: `sample` permits at most five output
words. Exhaustion is therefore a real result, not merely a theoretical branch.
For bound 65, each word supplies four 7-bit candidates, so five completely
rejected words occur with probability

```text
((128 - 65) / 128)^(4 * 5) = (63 / 128)^20
                               ≈ 6.96004e-7 per d65
```

At the MCP maximum of 10,000 d65 rolls, the probability of at least one such
exhaustion is approximately `1 - (1 - 6.96004e-7)^10000 = 0.006936`, or
0.6936%. The expression evaluator surfaces this failure and its successor state
([source](https://github.com/dearlordylord/drdice/blob/7a1d129bb40df70aac44b6176f58567a5dbe5581/packages/dice/src/index.ts#L421-L442)).

The integration must therefore choose and name a project-level exhaustion
policy. The recommended policy is to continue from the returned state in a
small, fixed number of five-word blocks, treating the whole group request as one
transaction. Twenty-five words reduce the worst per-die exhaustion probability
to about `1.63e-31`, while a final exhaustion still returns a precise failure and
does not publish partial faces or commit a partially advanced session. An
unbounded retry would hide a runtime budget; treating the default five words as
infallible would produce user-visible failures at the current maximum call size.

One additional sequence detail is explicit upstream: d1 consumes one output
word even though its face is fixed
([coverage contract](https://github.com/dearlordylord/drdice/blob/7a1d129bb40df70aac44b6176f58567a5dbe5581/verification/prng-sampling-coverage/README.md#L1-L13)).
This must be included in local golden vectors because changing it shifts every
later sequential roll.

## Recommended Effect integration

Do not implement a bridge from `Effect.Random.Random` to DRDice. There is no
upstream injection point, and synthesizing DRDice state from Effect outputs on
each call would discard DRDice's named sequence profile, immutable state/replay
model, and golden-vector compatibility.

Instead make one project domain service the canonical owner of dice generation
at the MCP/session boundary, shaped conceptually as a pure transition:

```ts
rollGroups(
  request: RollDiceRequest,
  state: PlaySessionDiceState,
): Effect.Effect<
  { readonly result: RollDiceResult; readonly state: PlaySessionDiceState },
  DiceRollFailure
>
```

The exact TypeScript spelling should follow the owning package's Effect service
conventions, but these invariants should not change:

- only the owning dice service module imports DRDice package types;
- a boundary parser validates persisted seed/state/profile data once and passes
  a branded, narrowed `PlaySessionDiceState` forward;
- groups and dice are sampled in input order, adding one to each `[0, bound)`
  value;
- every `sample` result is exhaustively matched and mapped to a precise domain
  failure;
- the caller commits the returned successor state and all returned faces
  atomically, or commits neither;
- production removes `root.random`; there is no remaining `Random.Random` field
  or second PRNG in the Play Session root.

Effect remains useful for service construction, test layers, failure typing, and
transaction sequencing. It should not be the entropy implementation after this
change. The current roller synchronously installs the session's Effect random
stream and asks `nextIntBetween` once per face
([current implementation](../../packages/mcp/src/dice-tools.ts#L24-L82)); that
entire sampling path should be replaced, not wrapped around DRDice.

## Replay, persistence, and audit design

The current recoverable record stores a 64-character seed and command inputs
([schema](../../packages/mcp/src/play-session-repository.ts#L17-L52)), then
recreates an Effect stream and re-executes every operation
([reconstruction](../../packages/mcp/src/recoverable-play-session-support.ts#L41-L60)).
That proves only that stored commands still execute; it does not compare the
newly generated faces with the faces originally returned.

The new stored-session format should make the roll algorithm and outcome part of
one canonical event contract:

- exact `@drdice/dice` and `@drdice/prng` package versions;
- DRDice sequence profile and state schema version;
- the initial four-word seed;
- a stable roll-operation/idempotency key;
- the decoded structured request, returned ordered faces, and successor state
  (or a single versioned DRDice state snapshot associated with the committed
  repository revision);
- a repository revision or event ordinal that defines sequence order.

Do not maintain these as a parallel shadow log. Replace the current input-only
roll command member with a versioned roll event that owns the result/evidence.
During reconstruction, recompute from the prior canonical state and compare the
faces and successor state to the event. A mismatch is an
`invalidStoredRecord`/unsupported-algorithm failure, never a silently changed
historical result.

Upstream snapshots are useful but not sufficient algorithm identity. They
validate schema and sequence profile, while the upstream documentation still
requires the same package version for reproduction
([README](https://github.com/dearlordylord/drdice/blob/7a1d129bb40df70aac44b6176f58567a5dbe5581/packages/prng/README.md#L61-L67)).
Pin both direct dependencies exactly; the published `@drdice/dice` 0.3.4
manifest otherwise declares `@drdice/prng` as `^0.3.4`
([published manifest](https://registry.npmjs.org/@drdice/dice/0.3.4)). A lockfile
pins a deployment, but it does not tell a future binary which algorithm an old
database row expects.

An idempotency key fixes a separate issue from deterministic replay. It allows a
retried client request to return the already committed roll event without
consuming another section of the sequence. The present correlation UUID is
explicitly neither retained history nor an idempotency key
([output contract](../../packages/mcp/src/dice-tool-output.ts#L56-L65)).

Sequential state still means inserting an earlier roll changes all later
counterfactual results. That is normal for a single PRNG stream and should be an
explicit domain contract. If stable semantic draws under history insertion are
actually required, use a separately specified domain-separated seed derivation
(for example, a cryptographic KDF over a secret session seed and stable roll
operation identity) and initialize an independent DRDice stream per operation.
DRDice does not provide that derivation, and it should not be improvised as part
of the basic migration.

## Which previously identified issues this solves

| Issue                                                                      | Effect of this design                                                                                                                                                                               |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Effect collapses a 256-bit seed through an implementation-owned conversion | Solved: DRDice uses an explicit four-word/128-bit seed and named profile.                                                                                                                           |
| Modulo-based bounded sampling is not exactly uniform                       | Solved for successful samples by chunk rejection sampling.                                                                                                                                          |
| Dependency upgrades can silently change reconstructed faces                | Solved only if exact versions/profile/schema and original results/state are persisted and replay is compared. The package alone does not solve it.                                                  |
| Roll outputs are not retained as canonical history                         | Solved by replacing input-only roll commands with atomic versioned roll events.                                                                                                                     |
| Client retries can consume a second roll                                   | Solved by a persisted idempotency key, not by the PRNG.                                                                                                                                             |
| Adding/inserting a roll shifts later results                               | Documented by explicit state sequencing; not solved unless a separate domain-separated-per-operation design is required.                                                                            |
| No cryptographically verifiable fairness                                   | Not solved. DRDice explicitly is not cryptographic.                                                                                                                                                 |
| `DieRollResult` lacks a type-level upper bound                             | Not solved by the package. Keep the existing contextual output validation or redesign the project type; DRDice's `{ sideCount, face }` trace is runtime evidence, not a dependent TypeScript proof. |
| General Surface `DiceExpr` permits values beyond runtime support           | Not solved. Align the owning Surface schema/support profile separately rather than treating the package limit as a rule.                                                                            |

## Security and fairness boundary

`crypto.getRandomValues` supplies good host entropy for a seed, but all later
outputs are deterministic xoshiro outputs and are predictable to anyone who
knows the state. The upstream project explicitly excludes security decisions
and wagering
([project safety statement](https://github.com/dearlordylord/drdice/blob/7a1d129bb40df70aac44b6176f58567a5dbe5581/README.md#L77-L83)).

For ordinary game execution, server-side entropy plus exact replay evidence is
reasonable. For player-verifiable fairness, add a separate protocol: commit to
a server seed before play, incorporate an independently chosen client seed or
nonce, bind every roll to an ordinal/idempotency key, publish signed roll
receipts, and reveal enough material later for independent replay. The protocol
must also define aborted requests and ordering, otherwise a server can choose
which deterministic draw to expose. This is a product/security feature, not a
wrapper around `evaluate`.

## Packaging, compatibility, license, and maintenance risk

- Version 0.3.4 is ESM-only (`"type": "module"`) with a single root export and
  bundled declarations; the package marks itself side-effect-free and depends
  only on `@drdice/prng`
  ([manifest](https://github.com/dearlordylord/drdice/blob/7a1d129bb40df70aac44b6176f58567a5dbe5581/packages/dice/package.json#L1-L37)).
- The upstream workspace tests Node `>=20`, but that engine constraint is on the
  workspace root rather than the published package manifest
  ([workspace manifest](https://github.com/dearlordylord/drdice/blob/7a1d129bb40df70aac44b6176f58567a5dbe5581/package.json#L1-L11)).
- Exact literal result types require TypeScript 7.0.2; runtime-known inputs are
  documented to work with broader result types
  ([README](https://github.com/dearlordylord/drdice/blob/7a1d129bb40df70aac44b6176f58567a5dbe5581/README.md#L8-L48)). This repository
  already carries native TypeScript 7 for a separate lane but still uses
  TypeScript 5.9 generally, so a packed-artifact consumer typecheck under the
  actual MCP compiler must be an adoption gate.
- The license is MIT
  ([license](https://github.com/dearlordylord/drdice/blob/7a1d129bb40df70aac44b6176f58567a5dbe5581/LICENSE)).
- The package is extremely new: the npm registry records seven versions from
  initial publication on 2026-08-24 through 0.3.4 on 2026-08-26
  ([registry metadata](https://registry.npmjs.org/@drdice/dice)), and the release
  page shows all seven 0.x releases
  ([releases](https://github.com/dearlordylord/drdice/releases)). The registry
  lists one npm maintainer, while the repository currently shows no forks or
  stars. This is a high API, maintenance, and supply-continuity risk even though
  the implementation and verification evidence are unusually explicit for a
  new package.

Contain that risk inside the one owning dice service, with exact pins, copied
golden vectors as black-box conformance tests, fixture coverage for every
supported die size, large-group/exhaustion tests, and a stored-format migration
gate. Do not expose DRDice types through shared domain packages. Because the
license permits it, a reviewed fork is a viable contingency, but it should be
triggered by an actual maintenance or compatibility failure rather than created
in parallel now.

## Adoption gates

Before production migration:

1. Obtain or implement the structured-group state transition described above;
   do not use expression-string chunking.
2. Add exact versions with pnpm, never npm (for example,
   `pnpm add --filter @dnd/mcp --save-exact @drdice/dice@0.3.4 @drdice/prng@0.3.4`).
3. Confirm packed 0.3.4 artifacts typecheck in the MCP's real TypeScript 5.9 and
   native-TypeScript-7 lanes and execute on every deployed Node target.
4. Add pinned upstream seed/transition/sample vectors plus local vectors for d1,
   d2, d3, d6, d20, d65, and d100; verify exact face order and successor state.
5. Property-test all bounds `1..100`, grouped order, state continuity,
   transactional exhaustion, and reconstruction from persisted events.
6. Version and migrate recoverable Play Session storage; retain the old Effect
   algorithm identity for existing rows or deliberately invalidate them with a
   precise compatibility result.
7. Require explicit review of
   sequence profile, golden vectors, failure probabilities, and stored-format
   compatibility for every upgrade.
8. Decide whether audit replay is sufficient or whether commit/reveal fairness
   and domain-separated roll identity are product requirements.

These gates make DRDice an improvement to sampling and replay without allowing
the package's expression-oriented API or young release history to redefine the
project's existing dice domain.
