# Code Review Rules

Code review agents must check all items below. These are quality gates, not optional style preferences.

## Comments

- No comments that repeat the code. If the code already says what it does, the comment is noise.
- Cast justifications must be technically accurate.
- Comments may document an unavoidable modeling assumption only if the code cannot encode it.

## Dead Code

Every function, type, constant, and export must have a current call site or consumer. No code "for future use" unless explicitly requested.

## Tests

- Do not write tests that only verify compile-time guarantees. If the compiler checks it, a test adds nothing.
- Tests must exercise runtime behavior, projection behavior, parity behavior, or boundary decoding.
- Do not update `qa_generated.qnt` during normal development review.

## SRD And Modeling Parity

For rules behavior, verify that every modeled rule traces to SRD 5.2.1 text in `.references/srd-5.2.1/` or to an explicit entry in `ASSUMPTIONS.md`.

Flag:
- homebrew or "reasonable extension" mechanics not present in the SRD;
- silent interpretation of ambiguous RAW;
- mixed provenance modeled as if it were one source;
- support-status metadata that has no type-system or runtime consequence;
- runtime projection facts stored as authored provenance.

## Quint And Runtime Parity

Review combat behavior against the authoritative Quint model.

Flag:
- XState or TypeScript behavior that diverges from `battle.qnt` without a corresponding spec change;
- changes to fields mapped by MBT bridges without checking the relevant parity tests;
- duplicated rule logic between Quint, TS, bridge code, and UI that should be shared, derived, or explicitly projected;
- exploratory battle MBT runs that violate the repo's MBT cost rules.

## Type Safety — Cast Review Checklist

For every `as T` cast, verify:
1. A comment explains why the cast is necessary.
2. The evidence supporting the cast is local and correct.
3. A generic type parameter, parser, branded constructor, or type guard could not eliminate the cast.
4. The cast does not hide a boundary parse that should happen once at the edge.

## TypeScript Type-System Terminology

Branded types are compile-time-only constructs and are erased during transpilation.

Flag:
- "branded at runtime";
- cast justifications that imply brands have runtime meaning;
- claims that two differently branded strings differ at runtime.

Correct pattern: "Brands are erased at runtime; both values are `string`, so this cast is safe because ..."

## State Space Minimality

For every product type, interface, type alias, Schema struct, Quint record, and machine context shape, verify: can every combination of field values occur in practice?

Flag:
- sentinel values such as `""`, `0`, `null`, or `undefined` meaning "not applicable";
- booleans alongside fields only meaningful for one boolean value;
- optional fields that must all be present-or-absent together;
- status enums or metadata labels with no type or runtime consequence;
- union variants whose names lie about part of their members;
- impossible provenance, ownership, support-status, or phase combinations.

Prefer discriminated unions, nested types, `Option`, branded/domain values, or stronger parser outputs that make invalid states unrepresentable.

## Connascence

Review every changed literal, branch condition, helper boundary, narrowed type, protocol step, and duplicated rule for connascence: code facts that must change together for correctness.

Flag distant or high-degree connascence, especially:
- magic strings/numbers whose validity depends on a separate parser, support gate, schema, spec, bridge, test fixture, or authored content convention;
- tuple/array index assumptions instead of named fields or narrowed tuple types;
- duplicated validation, projection, encoding, decoding, or execution algorithms;
- downstream code manually remembering what an upstream parser, support gate, schema, or type guard already proved;
- caller protocols requiring operations in a specific order when a single API or state-typed API could encode the sequence;
- duplicated default values, initial state, status meanings, sentinel semantics, hole IDs, phase keys, or action names.

Required reviewer questions:
1. What must change together if this line changes?
2. Is that coupling local and obvious, or distant and implicit?
3. Is the coupling weak enough for its distance? If not, require a refactor.

Preferred fixes:
- replace magic values with named constants, literal unions, branded/domain types, or derived values;
- replace positional conventions with records, named fields, or narrowed tuple types;
- centralize duplicated algorithms behind one implementation;
- pass narrowed/domain-specific values forward instead of rechecking or reinterpreting primitives;
- colocate unavoidable strong connascence in one helper/module named after the domain invariant.

Do not accept comments as the only fix when the relationship can be encoded in types, schemas, constants, helper structure, or the Quint model.

### Executable Assumptions

When changed code depends on an assumption for correctness, reviewers must verify that the assumption is executable at the boundary where it matters.

Flag:
- replacing a named assertion, parser, support gate, exhaustive match, or domain helper with code that merely follows a convention;
- code that would keep compiling and running if a future schema/type/support slice widened, but would silently ignore or misinterpret the new meaningful data;
- local algorithms that rely on "only one", "first", "current", "supported", "for now", ordering, cardinality, or phase boundaries without an assertion or exhaustive handling at that algorithm boundary;
- comments that state a correctness precondition while the code does not enforce it.

Accept:
- trusting a type/parser/narrowed value when future widening would make the code fail to compile or when the algorithm would remain semantically correct;
- removing an assertion only when the downstream algorithm now handles all cases the assertion previously excluded;
- keeping a local assertion even when the current type proves the fact, if future widening could otherwise compile and change the meaning silently.

Required reviewer question:
"If the upstream type or support gate admits more meaningful data later, does this line fail loudly, remain correct, or silently drop meaning?"

Preferred fixes:
- keep or add a named assertion at the semantic boundary;
- make the algorithm exhaustive over the widened shape;
- strengthen the domain type so invalid or unsupported shapes are unrepresentable at the call site;
- move the assertion into a helper named after the invariant when several call sites depend on the same assumption.

Examples:
- Do not replace `getOnlyOneStrict(supportedUnit.mechanics.phases)` with `const [phase] = supportedUnit.mechanics.phases` in a single-phase replay algorithm. Even if the current support-gate type narrows `phases` to `[ActivationPhase]`, future support for multi-phase units could still compile and silently execute only the first phase. Keep the named assertion unless the replay algorithm handles multiple phases.

## Boundary Typing

All data crossing system boundaries must be parsed or decoded at the boundary and represented with precise domain types afterward.

Flag:
- `any`, untyped JSON access, or raw external data beyond the boundary;
- passing weak `string`, `number`, or broad union values deeper after a stronger fact has been established;
- validation repeated downstream instead of parsing once and carrying the parsed type;
- authored Surface data, runtime projection data, and provenance collapsed into one type or field.

## No Bare Primitives For Domain Values

Function signatures and type definitions must not use bare `string`, `number`, or `boolean` where a domain-specific type, literal union, branded type, or alias exists or should exist.

Symptoms to flag:
- `(x: DomainType): string` where the return value has domain meaning;
- `ReadonlyMap<string, string>` where keys or values have known domains;
- numeric fields that represent HP, AC, spell slot level, phase index, die size, count, range, or action economy without a domain type or documented reason;
- string literals for hole IDs, subject tags, unit IDs, action names, condition names, damage types, or phase keys outside a central constructor/helper;
- type-narrowing helpers that accept primitives after a boundary parser could have produced the stronger type.

## Immutability

No `let` for conditional assignment. Use:
- `const` with a ternary for single-variable branches;
- a destructured struct or extracted function for multi-variable branches;
- `Either.gen` / `Effect.gen` when a branch needs monadic computation.

Legitimate mutation for accumulators or builder patterns must be local, obvious, and justified by the surrounding algorithm.
