# Seeded dice evaluation in the TypeScript type system

> **Independent research note.** This is an investigation of TypeScript's type
> system as a computation medium. It is not tied to any application architecture
> or domain model.

Research checked: 2026-08-20.

Primary-source repositories inspected at fixed revisions:

- ArkType v2.2.3 at
  [`03b1f015d9b7c5af5dac2caed1aeedefaf705ab3`](https://github.com/arktypeio/arktype/tree/03b1f015d9b7c5af5dac2caed1aeedefaf705ab3);
- `pure-rand` at
  [`be10b22b05c22242eb077388b0eb97882e9bbf87`](https://github.com/dubzzz/pure-rand/tree/be10b22b05c22242eb077388b0eb97882e9bbf87);
- `typescript-types-minesweeper` at
  [`1ef7a063926e10eceb23b1f7d395da5268c2660f`](https://github.com/SheepWizard/typescript-types-minesweeper/tree/1ef7a063926e10eceb23b1f7d395da5268c2660f);
- Yossuli's type-level xorshift experiment at
  [`421807d481eed43960abf532f1519c0905828cba`](https://github.com/yossuli/vitePG/tree/421807d481eed43960abf532f1519c0905828cba);
- Haskell's `type-level-prng` at
  [`5250a161d28a252cced2cd813e337a075f099b57`](https://github.com/raehik/type-level-prng/tree/5250a161d28a252cced2cd813e337a075f099b57).

Only official specifications and documentation, algorithm papers and author-owned
source repositories are used below.

## Short answer

Yes: a parser, seeded pseudorandom generator, unbiased die sampler and expression
evaluator can all be written entirely as TypeScript type aliases. Given literal
inputs, the compiler can reduce something shaped like
`Roll<"2d6+1", Seed>` to a literal result and a successor seed.

The usual name is **PRNG**, a pseudorandom number generator. “Deterministic RNG” is
understandable but redundant when it means a seeded PRNG. **DRBG** is the NIST term
for a deterministic _bit_ generator, normally in a security construction that is
initially supplied from an entropy source. NIST notes that DRBG is also called PRNG
or deterministic RNG; a cryptographic DRBG additionally provides unpredictability
when its seed is unknown
([NIST glossary](https://csrc.nist.gov/glossary/term/deterministic_random_bit_generator),
[SP 800-90A Rev. 1](https://doi.org/10.6028/NIST.SP.800-90Ar1)). “DRNG” is not the
best label here.

The important qualification is that this is not fresh randomness. A fixed expression,
algorithm version and seed have exactly one answer. Type annotations are erased
([TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/2/basic-types.html#erased-types)).
The type checker also has no type-level clock, operating-system entropy API, mutable
global state or `Math.random()` call. Entropy must enter as an external seed. Without
a distribution over externally chosen seeds, the result is a deterministic value,
not a random variable.

## What is and is not possible

| Capability                                   | Verdict                             | Meaning                                                                                                                |
| -------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Parse a literal dice string                  | Demonstrated technique              | Template-literal conditional types can scan and reduce a string literal.                                               |
| Advance a seeded PRNG                        | Feasible; toy implementations exist | Fixed-width bits can be represented as tuples and transformed with shifts and XOR.                                     |
| Map words to an arbitrary-sided die          | Feasible                            | Rejection sampling adds no modulo bias when its candidate bits are uniform.                                            |
| Obtain fresh compile-time entropy            | Not available in the type system    | A seed must come from source text or an external build/runtime step.                                                   |
| Materialize the answer as emitted JavaScript | Not from a type alias               | Types disappear during emit; a runtime implementation or generator must create a value.                                |
| Build a practical general-purpose roller     | Possible but compiler-hostile       | Parsing is tractable; repeated arithmetic, rejection and large roll counts consume type-instantiation budgets quickly. |
| Obtain cryptographic randomness              | No                                  | A visible compile-time seed and a simple PRNG provide neither seed secrecy nor cryptographic unpredictability.         |

Thus “the compiler rolls the dice” means that it evaluates a deterministic pure
function. Rebuilding with the same inputs must yield the same type.

## Parsing is already established

TypeScript's template literal types can decompose and reconstruct literal strings,
while conditional types select the next reduction
([template-literal type documentation](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html)).
ArkType is a production-scale existence proof. Its `parseString` type takes a literal,
uses template matching for fast paths, then enters a recursive static parser; the
runtime `fullStringParse` and type-level `fullStringParse` sit beside one another
([`string.ts` lines 42–61 and 70–116](https://github.com/arktypeio/arktype/blob/03b1f015d9b7c5af5dac2caed1aeedefaf705ab3/ark/type/parser/string.ts#L42-L116)).
Its operand and operator modules likewise pair runtime branches with conditional-type
branches
([operand parser](https://github.com/arktypeio/arktype/blob/03b1f015d9b7c5af5dac2caed1aeedefaf705ab3/ark/type/parser/shift/operand/operand.ts#L14-L53),
[operator parser](https://github.com/arktypeio/arktype/blob/03b1f015d9b7c5af5dac2caed1aeedefaf705ab3/ark/type/parser/shift/operator/operator.ts#L18-L63)).

A small dice grammar is much easier. It can produce a tuple AST such as
`[[2, 6], "+", 1]`. The hard limitation is widening: `Parse<string>` cannot recover
characters that are no longer a literal, so an API must retain a `const` generic or
accept the expression as a type argument.

## Existing type-level “random” implementations

The bounded source search found demonstrations, but no maintained, tested package that
combines a type-level dice-string parser, a credible PRNG, unbiased range reduction and
state threading.

### A real type-level xorshift transition

Yossuli's experiment represents bits as a tuple and defines `Random<Seed>` from fixed
width fill/slice, left and right shifts, and XOR
([`random.ts`](https://github.com/yossuli/vitePG/blob/421807d481eed43960abf532f1519c0905828cba/pg1/src/3/random.ts)).
It is genuine type-level PRNG-style state transformation and therefore an existence
proof for the central operation. It is not a verified generator library: the width is
16 bits, the shift choices are not justified against a period analysis, the adjacent
test body is empty, and it only masks ranges whose size is a power of two. It should
not be cited as evidence of statistical quality or unbiased dice.

### A type-level game with a “random” helper

`typescript-types-minesweeper` performs an entire game computation in types. Its
`Rand<Min, Max, Seed>` is `Min + ((Seed * 12) mod Max)`
([`Util.ts` lines 94–98](https://github.com/SheepWizard/typescript-types-minesweeper/blob/1ef7a063926e10eceb23b1f7d395da5268c2660f/src/Util.ts#L94-L98)),
and its shuffle increments the seed at each step
([`minesweeper.ts` lines 286–307](https://github.com/SheepWizard/typescript-types-minesweeper/blob/1ef7a063926e10eceb23b1f7d395da5268c2660f/src/minesweeper.ts#L286-L307)).
This proves that seed-dependent selection can participate in a larger type-level
program. It is not a sound PRNG: common factors make outputs degenerate—modulo 6 it
has only one residue before adding `Min`.

The strongest type-level precedent found is in Haskell. The 2025 `type-level-prng`
package models a generator directly as `state -> (state, Natural)`
([`Common.hs` lines 8–23](https://github.com/raehik/type-level-prng/blob/5250a161d28a252cced2cd813e337a075f099b57/src/Data/TypeLevel/PRNG/Common.hs#L8-L23))
and implements type-level xorshift32 and xorshift64
([`Xorshift.hs` lines 12–24](https://github.com/raehik/type-level-prng/blob/5250a161d28a252cced2cd813e337a075f099b57/src/Data/TypeLevel/PRNG/Xorshift.hs#L12-L24)).
That is almost exactly the needed architecture. TypeScript lacks GHC's built-in
type-level natural-number arithmetic, so the same design is materially more expensive.

These findings establish **feasibility**, not a state of the art. A bounded GitHub code
search followed by source inspection found no integrated TypeScript library; that is
not proof that none exists.

## Which PRNG fits type-level TypeScript?

TypeScript has no arithmetic or bitwise operators in type positions. Every operation
must be encoded through tuple/string decomposition, mapped types and conditional types.
That changes the algorithm trade-off radically.

### Best proof-of-concept candidate: xorshift32

Marsaglia's 32-bit xorshift with shifts `(13, 17, 5)` advances a nonzero 32-bit word
using only three shift/XOR steps and has period `2^32 - 1`
([original paper](https://doi.org/10.18637/jss.v008.i14)). A fixed 32-element tuple of
`0 | 1` makes each operation structurally simple:

```text
x1 = x  XOR (x << 13)
x2 = x1 XOR (x1 >> 17)
x3 = x2 XOR (x2 << 5)
next state = output = x3
```

This is attractive because shifts can splice fixed tuples and XOR can be a mapped type;
no general multiplication or division is needed. Seed zero must be rejected because it
is an absorbing state. It is appropriate for a compiler experiment, deterministic test
vectors or non-security game outcomes—not cryptography. Marsaglia records a binary-rank
failure, and Panneton and L'Ecuyer found further statistical weaknesses in three-shift
xorshift generators ([paper](https://doi.org/10.1145/1113316.1113319)). Calling it
“cryptographically secure” would be incorrect.

### More modern algorithms are possible but expensive

- **TinyMT32** has a standardized seed-to-sequence contract, 127-bit state and test
  vectors. RFC 8682 requires identical output for a given seed across platforms and
  says it is not for cryptographic use
  ([RFC 8682 sections 1 and 2.3](https://www.rfc-editor.org/rfc/rfc8682.html#section-2.3)).
  Its four-word state, initialization multiplication and tempering make it a much larger
  type-level implementation.
- **PCG32** has a compact, well-specified transition and output permutation, but the
  canonical variant advances 64-bit LCG state and performs shifts/rotation. Its author
  describes the design as a congruential transition plus an output permutation
  ([PCG paper](https://www.pcg-random.org/paper.html),
  [minimal source](https://github.com/imneme/pcg-c-basic/blob/bc39cd76ac3d541e618606bcc6e1e5ba5e5e6aa3/pcg_basic.c)).
  Type-level 64-bit addition and multiplication dominate the cost.
- **xoroshiro/xoshiro-family generators** have stronger runtime appeal, but multiple
  words, rotation and addition enlarge each step. `pure-rand` recommends
  `xoroshiro128plus`
  ([README lines 109–124](https://github.com/dubzzz/pure-rand/blob/be10b22b05c22242eb077388b0eb97882e9bbf87/README.md#L109-L124)).
- A small **LCG** still needs full-width multiply/add/modulo and typically has weaker
  low bits; it is not cheaper in the checker than XOR/shift.

For a proof of concept, xorshift32 is the sensible engineering choice precisely because
the goal is to prove the type-level pipeline, not to claim best statistical quality.
For production random numbers, use a runtime generator with a published contract and
test vectors.

## Uniform dice and modulo bias

If a generator has `M` equally likely outputs, `x mod N` is uniform only when `N`
divides `M`. A 32-bit generator has `M = 2^32`; a d6 therefore cannot be mapped exactly
by naive modulo because six does not divide `2^32`.

The conventional fix rejects the incomplete tail. `pure-rand` computes
`floor(2^32 / range) * range`, redraws while the word is at or above that cutoff, and
only then takes modulo
([`uniformIntInternal.ts` lines 8–16](https://github.com/dubzzz/pure-rand/blob/be10b22b05c22242eb077388b0eb97882e9bbf87/src/distribution/internals/uniformIntInternal.ts#L8-L16)).
The PCG reference implementation uses the equivalent threshold strategy
([`pcg32_boundedrand_r`](https://github.com/imneme/pcg-c-basic/blob/bc39cd76ac3d541e618606bcc6e1e5ba5e5e6aa3/pcg_basic.c#L79-L107));
Lemire analyzes unbiased fixed-word range reduction more generally
([paper](https://arxiv.org/abs/1805.10941)).

A type-level implementation can use a simpler rejection reducer:

1. Let `k = ceil(log2(N))`.
2. Read the **high** `k` bits of the next PRNG word as candidate `c`.
3. If `c >= N`, advance the generator and retry.
4. Otherwise return `c + 1` and the state after the accepted draw.

If the extracted bit patterns are equiprobable, rejection leaves exactly one accepted
pattern per result and therefore adds no mapping bias; `N > 2^(k-1)` gives acceptance
probability greater than one half. Generator quality remains a separate question, and
xorshift32's nonzero state space is not literally all `2^32` words. This reducer avoids
type-level division and deliberately avoids selecting only the generator's low bits.
Every rejection must consume a new state; retrying the same state would never terminate.

Rejection has no fixed worst-case draw count. A compiler-facing API therefore needs a
fuel parameter and a precise `rejectionLimit` result rather than unbounded recursion.
That cap slightly limits which seeded computations can be evaluated, but it does not
bias successful results.

## State threading is the correct API shape

Every operation should return its value and successor state:

```ts
type Step<S extends Word32> = {
  readonly word: Word32;
  readonly state: Word32;
};

type RollDie<
  Sides extends PositiveInteger,
  State extends NonZeroWord32,
  Fuel extends readonly unknown[],
> =
  | { readonly ok: true; readonly value: number; readonly state: NonZeroWord32 }
  | { readonly ok: false; readonly reason: "rejectionLimit" };

type Evaluate<Ast, State extends NonZeroWord32> =
  | { readonly ok: true; readonly value: number; readonly state: NonZeroWord32 }
  | { readonly ok: false; readonly reason: ParseOrEvaluationError };
```

The crucial invariant is that the second die receives the first die's returned state.
Reusing the original seed would correlate the dice perfectly. Evaluation order is part
of the reproducibility contract.

`pure-rand` uses the same runtime shape: its pure dice flow returns
`[value, nextRng]` and feeds each successor into the next roll
([README lines 40–59](https://github.com/dubzzz/pure-rand/blob/be10b22b05c22242eb077388b0eb97882e9bbf87/README.md#L40-L59)).
The type-level version should mirror this state-passing protocol, even if it uses a
different experimental generator.

## Compiler limits and performance

Type-level computation is paid for in editor latency and compiler memory, not runtime
CPU. TypeScript 4.5 added tail-recursion elimination for some conditional types, while
explicitly retaining heuristics that stop very deep or expansive computation
([TypeScript 4.5 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-5.html#tail-recursion-elimination-on-conditional-types)).
In the TypeScript 5.9.3 compiler, `instantiateTypeWithAlias` rejects instantiation depth
100 or an instantiation count of five million
([pinned compiler source](https://github.com/microsoft/TypeScript/blob/c63de15a992d37f0d6cec03ac7631872838602cb/src/compiler/checker.ts#L20959-L20987)).
Those are implementation details, not stable language guarantees.

The main cost multipliers are:

- converting decimal source text into bit tuples;
- parsing each character and building intermediate tuple/string types;
- repeated 32-bit compare, increment and accumulation;
- advancing once per die and again for every rejected candidate;
- distributing over non-literal unions;
- diagnostics that force otherwise-lazy aliases to fully instantiate.

The design should accept only literal expressions and literal seeds, keep bit widths
fixed, use accumulator-style tail recursion, cap expression length/dice count/rejection
fuel, and return a named error type when a budget is exceeded. Benchmark compiler
instantiations and wall time on every supported TypeScript version. ArkType treats this
as a first-class concern: even its regex parser benchmarks assert explicit type
instantiation counts
([benchmark source](https://github.com/arktypeio/arktype/blob/03b1f015d9b7c5af5dac2caed1aeedefaf705ab3/ark/regex/__tests__/regex.bench.ts)).

## Proposed proof of concept (not implemented)

Keep the experiment deliberately small:

1. **Input:** expression grammar `Term (("+" | "-") Term)*`, where a term is a small
   unsigned literal or `NdM`; accept a seed as exactly 32 bits in a binary string.
2. **Parser:** a tail-recursive template-literal scanner producing a compact tuple AST
   and a named error literal. Set low maximums for source length, dice count and sides.
3. **Generator:** nonzero xorshift32 state represented as an MSB-first 32-bit tuple.
   Verify several hundred steps against a tiny runtime implementation and fixed vectors.
4. **Die reducer:** high-bit rejection using `ceil(log2(sides))`, with state threaded
   across rejection and an explicit fuel cap.
5. **Evaluator:** left-to-right state threading that returns `{ value, state }`.
6. **Parity harness:** for a matrix of expressions and seeds, require compile-time
   equality with literal expected results and compare the same cases to the runtime
   implementation. Add negative parser cases and deliberate budget-boundary cases.
7. **Measurements:** capture `tsc --extendedDiagnostics`, editor responsiveness and the
   largest expression that remains comfortable. Statistical tests apply to the runtime
   sequence, while exhaustive small-range checks can verify the range reducer.

This would answer the question without pretending it is a general library. A credible
claim would be “a bounded dice language and seeded rejection
sampling can be evaluated by TypeScript 5.x's checker,” not “TypeScript provides
randomness.”

## Runtime parity and practical alternatives

A callable function cannot get its runtime result from the type calculation because the
calculation is erased. There are three honest product shapes:

1. **Mirrored runtime and type-level implementations.** A runtime function returns the
   value while a type alias predicts its literal type. This offers the most striking API,
   but duplicates parser and PRNG semantics. It requires parity vectors, algorithm
   versioning, exact integer semantics and performance budgets. ArkType demonstrates the
   discipline needed for mirrored parsers; it does not remove the duplication.
2. **Runtime only, with const-literal validation.** Parse or validate the notation at the
   type level, but roll with a runtime seeded library. This keeps compile-time diagnostics
   without making arithmetic a type-checker workload. `pure-rand` already demonstrates
   seeded, reproducible dice and pure successor-state handling.
3. **Const code generation.** A prebuild tool uses one runtime implementation and writes
   `as const` results plus next states. This materializes literal values reproducibly;
   it is code generation, not type-system randomness.

For exploration, option 1 is worthwhile. For dependable software, option 2 is usually
the best default; option 3 is best when literal build artifacts are genuinely useful.

## Is this “state of the art”?

ArkType-style compile-time string parsing is near the practical frontier of TypeScript
library engineering: it provides useful inference and diagnostics at a boundary users
actually touch. Extending that technique to a PRNG is novel and feasible, but not an
advance in random-number generation. The underlying algorithm should still be judged by
period, uniformity, statistical tests, predictability, seeding and reproducibility—not
by the cleverness of its type encoding. RFC 8682 is a good example of a reproducibility
contract; NIST SP 800-90A is the relevant standard when cryptographic unpredictability is
required.

A full type-level dice roller is **advanced type-level programming and a compelling
deterministic-computation experiment**, not state-of-the-art production dice rolling.
Its reusable ideas are literal parsing, state threading, unbiased sampling, fixed
vectors and parity testing. Its type-level PRNG is intentionally the least practical part.

For comparison, the current TC39 seeded-random proposal is a Stage 1 **runtime** draft.
It specifies mutable, reproducible state and ChaCha12 output
([draft introduction](https://tc39.es/proposal-seeded-random/#sec-seeded-prng-objects)).
That is a useful signal about the direction of JavaScript RNG APIs, but ChaCha12 is far
beyond a sensible type-checker experiment and Stage 1 is not a shipping standard.
